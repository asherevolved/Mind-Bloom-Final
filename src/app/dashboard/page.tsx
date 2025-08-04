

import { MainAppLayout } from '@/components/main-app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Bot, Book, ListTodo, Smile, Sparkles, Trophy } from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { auth, db } from '@/lib/firebase-admin';
import { collection, getDocs, limit, query, where, orderBy } from 'firebase/firestore';
import { getAiTip } from '@/ai/flows/dashboard-tip';

type DashboardData = {
    name: string;
    moodLogged: boolean;
    tasksLeft: number;
    totalTasks: number;
    badgesUnlocked: number;
    lastJournalEntry: string | null;
    habitStreaks: { name: string; streak: number }[];
    aiTip: string;
};

async function getDashboardData(userId: string): Promise<DashboardData> {
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    const userData = userDoc.data();

    // Mood
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const moodQuery = query(
        collection(db, 'users', userId, 'mood_logs'),
        where('createdAt', '>=', today),
        limit(1)
    );
    const moodSnapshot = await getDocs(moodQuery);
    const moodLogged = !moodSnapshot.empty;

    // Tasks
    const tasksQuery = collection(db, 'users', userId, 'tasks');
    const tasksSnapshot = await getDocs(tasksQuery);
    const totalTasks = tasksSnapshot.size;
    const completedTasks = tasksSnapshot.docs.filter(doc => doc.data().is_completed).length;
    const tasksLeft = totalTasks - completedTasks;

    // Badges
    const badgesQuery = collection(db, 'users', userId, 'badges');
    const badgesSnapshot = await getDocs(badgesQuery);
    const badgesUnlocked = badgesSnapshot.size;

    // Journal
    const journalQuery = query(collection(db, 'users', userId, 'journal'), orderBy('createdAt', 'desc'), limit(1));
    const journalSnapshot = await getDocs(journalQuery);
    const lastJournalEntry = journalSnapshot.empty ? null : journalSnapshot.docs[0].data().entry;
    
    // Habits
    const habitsQuery = query(collection(db, 'users', userId, 'habits'), orderBy('streak_count', 'desc'), limit(2));
    const habitsSnapshot = await getDocs(habitsQuery);
    const habitStreaks = habitsSnapshot.docs.map(doc => ({ name: doc.data().title, streak: doc.data().streak_count }));
    
    // AI Tip
    const aiTip = await getAiTip({
      onboardingGoals: userData?.supportTags || [],
      recentMood: moodSnapshot.docs[0]?.data().note || 'neutral',
    });

    return {
        name: userData?.name || 'Explorer',
        moodLogged,
        tasksLeft,
        totalTasks,
        badgesUnlocked,
        lastJournalEntry,
        habitStreaks,
        aiTip: aiTip.tip,
    };
}


export default async function DashboardPage() {
  let userId: string | null = null;
  const cookieStore = cookies();
  const idToken = cookieStore.get('idToken')?.value;
  if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken);
        userId = decodedToken.uid;
      } catch (error) {
        // Not a valid token, user is not logged in.
        userId = null
      }
  }

  // Handle case where user is not logged in
  if (!userId) {
     return (
        <MainAppLayout>
          <div className="p-8 text-center">
            <h1 className="text-2xl font-bold">Welcome to Mind Bloom</h1>
            <p className="text-muted-foreground mb-4">Please log in to see your dashboard.</p>
            <Link href="/"><Button>Login</Button></Link>
          </div>
        </MainAppLayout>
      );
  }
  
  const data = await getDashboardData(userId);

  return (
    <MainAppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="font-headline text-3xl font-bold text-foreground">
            Hello, {data.name}!
          </h1>
          <p className="text-muted-foreground">Here's your wellness snapshot for today.</p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Card className="col-span-1 sm:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="text-primary" />
                <span>AI-Powered Tip</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">"{data.aiTip}"</p>
               <Link href="/calm">
                <Button variant="link" className="px-0">Try now <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Smile /><span>Today's Mood</span></CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-2">{data.moodLogged ? "Logged for today!" : "Not logged yet."}</p>
              <Link href="/mood">
                <Button className="w-full">{data.moodLogged ? "View Mood" : "Log Mood"}</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ListTodo /><span>Tasks Today</span></CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{data.tasksLeft} <span className="text-base font-normal text-muted-foreground">/ {data.totalTasks} tasks left</span></p>
               <Link href="/tasks">
                <Button variant="outline" size="sm" className="mt-2">View Tasks <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Trophy /><span>Badges</span></CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{data.badgesUnlocked} <span className="text-base font-normal text-muted-foreground">unlocked</span></p>
              <Link href="/badges">
                <Button variant="outline" size="sm" className="mt-2">View Badges <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bot /><span>AI Therapist</span></CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-2">Ready to listen. Start a new session anytime.</p>
              <Link href="/chat">
                <Button className="w-full">Start Chat</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Book /><span>Last Journal Entry</span></CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground truncate italic">{data.lastJournalEntry ? `"${data.lastJournalEntry}"` : "No entries yet."}</p>
              <Link href="/journal">
                <Button variant="outline" size="sm" className="mt-2">View Journal <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">🔥 Habit Streaks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.habitStreaks.length > 0 ? data.habitStreaks.map(habit => (
                <div key={habit.name} className="flex justify-between items-center">
                  <span>{habit.name}</span>
                  <Badge variant="secondary">{habit.streak} days</Badge>
                </div>
              )) : <p className="text-muted-foreground text-sm">No habits tracked yet.</p>}
              <Link href="/habits">
                <Button variant="outline" size="sm" className="mt-2">View Habits <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainAppLayout>
  );
}
    
