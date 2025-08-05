
'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Bot, Book, ListTodo, Smile, Sparkles, Trophy, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { getAiTip } from '@/ai/flows/dashboard-tip';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { isToday } from 'date-fns';
import { User } from '@supabase/supabase-js';

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

export default function DashboardPage() {
    const [user, setUser] = useState<User | null>(null);
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

     const processData = useCallback(async (currentUser: User) => {
        setIsLoading(true);
        setError(null);
        try {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('name, onboarding_complete, support_tags, email')
                .eq('id', currentUser.id)
                .single();

            if (profileError) throw profileError;
            if (!profileData.onboarding_complete) {
                router.push('/onboarding');
                return;
            }

            const [
                moodResult,
                tasksResult,
                badgesResult,
                journalResult,
                habitsResult
            ] = await Promise.all([
                supabase
                    .from('mood_logs')
                    .select('created_at, note')
                    .eq('user_id', currentUser.id)
                    .order('created_at', { ascending: false })
                    .limit(1),
                supabase
                    .from('tasks')
                    .select('*')
                    .eq('user_id', currentUser.id),
                supabase
                    .from('user_badges')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', currentUser.id),
                supabase
                    .from('journal_entries')
                    .select('entry')
                    .eq('user_id', currentUser.id)
                    .order('created_at', { ascending: false })
                    .limit(1),
                supabase
                    .from('habits')
                    .select('*')
                    .eq('user_id', currentUser.id)
            ]);

            if (moodResult.error) throw moodResult.error;
            if (tasksResult.error) throw tasksResult.error;
            if (badgesResult.error) throw badgesResult.error;
            if (journalResult.error) throw journalResult.error;
            if (habitsResult.error) throw habitsResult.error;

            const moodData = moodResult.data;
            const tasksData = tasksResult.data;
            const badgesCount = badgesResult.count;
            const journalData = journalResult.data;
            const habitsData = habitsResult.data;
            
            const lastMood = moodData?.[0] ? new Date(moodData[0].created_at) : null;
            const moodLoggedToday = lastMood ? isToday(lastMood) : false;
            
            const tip = await getAiTip({
                onboardingGoals: profileData.support_tags || [],
                recentMood: moodData?.[0]?.note || 'neutral',
            });
            
            const sortedHabits = habitsData?.sort((a,b) => b.streak_count - a.streak_count).slice(0, 2) || [];

            setData({
                name: profileData.name || profileData.email || 'Explorer',
                moodLogged: moodLoggedToday,
                tasksLeft: tasksData?.filter(t => !t.is_completed).length || 0,
                totalTasks: tasksData?.length || 0,
                badgesUnlocked: badgesCount || 0,
                lastJournalEntry: journalData?.[0]?.entry || null,
                habitStreaks: sortedHabits.map(h => ({ name: h.title, streak: h.streak_count })),
                aiTip: tip.tip,
            });

        } catch (error: any) {
            console.error("Error fetching dashboard data:", error);
            setError("We couldn't load your dashboard. Please try refreshing the page.");
        } finally {
            setIsLoading(false);
        }
    }, [router]);


    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            const currentUser = session?.user;
            setUser(currentUser ?? null);
            if (currentUser) {
                processData(currentUser);
            } else {
                router.push('/');
            }
        });
        
        return () => {
          authListener.subscription.unsubscribe();
        };

    }, [router, processData]);

    if (isLoading || (!data && !error)) {
        return (
            <MainAppLayout>
                <div className="p-4 sm:p-6 lg:p-8">
                     <Skeleton className="h-10 w-1/2 mb-8" />
                     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        <Skeleton className="h-48 col-span-1 sm:col-span-2" />
                        <Skeleton className="h-48" />
                        <Skeleton className="h-48" />
                        <Skeleton className="h-48" />
                        <Skeleton className="h-48" />
                        <Skeleton className="h-48" />
                        <Skeleton className="h-48" />
                     </div>
                </div>
            </MainAppLayout>
        );
    }

    if(error){
        return (
             <MainAppLayout>
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Something Went Wrong</h1>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <Button onClick={() => user && processData(user)}>
                        Try Again
                    </Button>
                </div>
            </MainAppLayout>
        )
    }
    
  if (!data) return null; // Should not happen if error handling is correct
  
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
