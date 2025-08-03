
import { MainAppLayout } from '@/components/main-app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Bot, Book, ListTodo, Smile, Sparkles, Trophy } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

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

async function getDashboardData(): Promise<DashboardData> {
    const cookieStore = cookies();
    const supabaseServer = createServerComponentClient({ cookies: () => cookieStore });
    
    const { data: { session } } = await supabaseServer.auth.getSession();
    
    if (session?.user) {
        const { data: userProfile } = await supabaseServer.from('users').select('id, name').eq('auth_uid', session.user.id).single();
        if (!userProfile) { 
             return {
                name: "Guest",
                moodLogged: false,
                tasksLeft: 0,
                totalTasks: 0,
                badgesUnlocked: 0,
                lastJournalEntry: null,
                habitStreaks: [],
                aiTip: "Welcome! Explore the app to start your wellness journey."
            };
        }

        const userId = userProfile.id;
        
        // Parallel fetching
        const [mood, tasks, badges, journal, habits, onboarding] = await Promise.all([
            supabaseServer.from('mood_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('created_at', new Date().toISOString().slice(0, 10)),
            supabaseServer.from('tasks').select('is_completed', { count: 'exact' }).eq('user_id', userId),
            supabaseServer.from('badges').select('id', { count: 'exact', head: true }).eq('user_id', userId),
            supabaseServer.from('journal').select('entry').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single(),
            supabaseServer.from('habits').select('title, streak_count').eq('user_id', userId).order('streak_count', { ascending: false }).limit(2),
            supabaseServer.from('onboarding').select('support_tags').eq('user_id', userId).single(),
        ]);

        const tasksLeft = tasks.data ? tasks.data.filter(t => !t.is_completed).length : 0;
        const totalTasks = tasks.count || 0;
        const aiTip = onboarding.data?.support_tags?.includes('Anxiety') 
            ? "Feeling anxious? Try a 5-minute grounding exercise from the Calm page."
            : "Taking a few deep breaths can be a powerful anchor. Try a 2-minute box breathing exercise now.";

        return {
            name: userProfile.name || "Explorer",
            moodLogged: (mood.count || 0) > 0,
            tasksLeft,
            totalTasks,
            badgesUnlocked: badges.count || 0,
            lastJournalEntry: journal.data?.entry || null,
            habitStreaks: habits.data?.map(h => ({ name: h.title, streak: h.streak_count })) || [],
            aiTip,
        };

    } else {
        return {
            name: "Guest",
            moodLogged: false,
            tasksLeft: 0,
            totalTasks: 0,
            badgesUnlocked: 0,
            lastJournalEntry: null,
            habitStreaks: [],
            aiTip: "Welcome! Explore the app to start your wellness journey."
        };
    }
}


export default async function DashboardPage() {
  const data = await getDashboardData();

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

    