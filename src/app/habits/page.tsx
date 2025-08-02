'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Check, Flame, Plus, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { isToday, subDays } from 'date-fns';

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Habit = {
  id: string;
  title: string;
  category: string;
  streak_count: number;
  last_completed: string | null;
};

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchUserAndHabits = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        fetchHabits(session.user.id);
      } else {
        setIsLoading(false);
      }
    };
    fetchUserAndHabits();
  }, []);

  const fetchHabits = async (currentUserId: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', currentUserId);
      
    if (error) {
      toast({ variant: 'destructive', title: 'Error fetching habits', description: error.message });
    } else if (data) {
      setHabits(data.map(h => ({
          ...h,
          // This is a simplified streak logic. A robust implementation would be done on the backend.
          streak_count: isToday(new Date(h.last_completed || '')) || isToday(subDays(new Date(h.last_completed || ''), -1)) ? h.streak_count : 0,
      })));
    }
    setIsLoading(false);
  };

  const handleAddHabit = async () => {
    if (!userId || !newHabitTitle.trim()) return;

    const { data, error } = await supabase.from('habits').insert({
        user_id: userId,
        title: newHabitTitle,
        category: 'General'
    }).select().single();

    if (error) {
        toast({ variant: 'destructive', title: 'Error adding habit', description: error.message });
    } else if (data) {
        setHabits([...habits, data]);
        setNewHabitTitle('');
        toast({ title: 'Habit Added!', description: `You're now tracking "${data.title}".` });
    }
  };

  const handleMarkAsDone = async (habitId: string) => {
      if (!userId) return;

      const habit = habits.find(h => h.id === habitId);
      if (!habit || (habit.last_completed && isToday(new Date(habit.last_completed)))) return;

      const newStreak = (habit.last_completed && isToday(subDays(new Date(habit.last_completed), -1))) 
          ? (habit.streak_count || 0) + 1 
          : 1;

      const newLastCompleted = new Date().toISOString();

      setHabits(habits.map(h => h.id === habitId ? { ...h, streak_count: newStreak, last_completed: newLastCompleted } : h));

      const { error } = await supabase.from('habits').update({
          streak_count: newStreak,
          last_completed: newLastCompleted,
      }).eq('id', habitId);

      if (error) {
          toast({ variant: 'destructive', title: 'Error updating habit', description: error.message });
          // Revert optimistic update
          fetchHabits(userId);
      }
  }


  return (
    <MainAppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="font-headline text-3xl font-bold text-foreground">Habit Tracker</h1>
          <p className="text-muted-foreground">Cultivate habits that help you bloom.</p>
        </header>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New Habit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input 
                placeholder="e.g., Drink water" 
                value={newHabitTitle} 
                onChange={e => setNewHabitTitle(e.target.value)} 
                onKeyPress={e => e.key === 'Enter' && handleAddHabit()}
                />
              <Button onClick={handleAddHabit}><Plus className="mr-2 h-4 w-4" /> Add Habit</Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          {isLoading ? (
            [...Array(2)].map((_,i) => <Skeleton key={i} className="h-40 w-full" />)
          ) : (
            habits.map((habit) => {
                const completedToday = habit.last_completed ? isToday(new Date(habit.last_completed)) : false;
                return (
                    <Card key={habit.id}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>{habit.title}</CardTitle>
                            <CardDescription><Badge variant="outline" className="mt-1">{habit.category}</Badge></CardDescription>
                        </div>
                        <Button 
                            variant={completedToday ? "default" : "outline"} 
                            onClick={() => handleMarkAsDone(habit.id)}
                            disabled={completedToday}
                        >
                            <Check className="mr-2 h-4 w-4" /> {completedToday ? "Done!" : "Mark as Done"}
                        </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex gap-4">
                            <div className="text-center p-3 rounded-md bg-accent/50 flex-1">
                            <div className="flex items-center justify-center gap-1 font-bold text-xl text-primary"><Flame />{habit.streak_count}</div>
                            <div className="text-xs text-muted-foreground">Current Streak</div>
                            </div>
                        </div>
                        {/* A full calendar implementation is complex, so this is a simplified visual */}
                        <div className="flex-1 rounded-md border p-3">
                            <div className="grid grid-cols-7 gap-2 text-center">
                            {daysOfWeek.map((day) => (
                                <div key={day} className="text-xs text-muted-foreground">{day}</div>
                            ))}
                            {[...Array(7)].map((_, dayIndex) => (
                                <div key={dayIndex} className={cn(
                                "w-full aspect-square rounded-md flex items-center justify-center bg-muted/50"
                                )}>
                                {dayIndex < (new Date().getDay() + 6) % 7 && habit.streak_count > ((new Date().getDay() + 6) % 7 - dayIndex -1) && <Check className="h-4 w-4 text-green-500"/>}
                                </div>
                            ))}
                            </div>
                        </div>
                        </div>
                    </CardContent>
                    </Card>
                )
            })
          )}
        </div>
      </div>
    </MainAppLayout>
  );
}
