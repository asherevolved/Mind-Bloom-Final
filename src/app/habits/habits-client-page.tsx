'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Check, Flame, Plus, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { isToday, isYesterday } from 'date-fns';
import type { Habit } from './page';
import { supabase } from '@/lib/supabase';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];


interface HabitsClientPageProps {
    initialHabits: Habit[];
    userId: string | null;
    isLoading: boolean;
    refetchHabits: () => void;
}

export function HabitsClientPage({ initialHabits, userId, isLoading, refetchHabits }: HabitsClientPageProps) {
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const awardBadge = async (code: string, name: string) => {
    if (!userId) return;

    const { data: existingBadge } = await supabase
        .from('user_badges')
        .select('id')
        .eq('user_id', userId)
        .eq('badge_code', code)
        .single();
    
    if (!existingBadge) {
        const { error } = await supabase
            .from('user_badges')
            .insert({ user_id: userId, badge_code: code });
        if (!error) {
            toast({
                title: 'Badge Unlocked!',
                description: `You've earned the "${name}" badge!`,
                action: <Trophy className="h-5 w-5 text-yellow-500" />
            });
        }
    }
  }

  const handleAddHabit = async () => {
    if (!userId || !newHabitTitle.trim()) {
        toast({variant: 'destructive', title: 'Error', description: 'You must be logged in and provide a title to add a habit.'})
        return;
    };
    setIsSubmitting(true);
    try {
        const { error } = await supabase.from('habits').insert({
            user_id: userId,
            title: newHabitTitle,
            category: 'General'
        });
        
        if (error) throw error;
        
        await awardBadge('habit_initiator', 'Habit Initiator');
        setNewHabitTitle('');
        toast({ title: 'Habit Added!', description: `You're now tracking "${newHabitTitle}".` });
        refetchHabits();
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Error adding habit', description: error.message });
    }
    setIsSubmitting(false);
  };

  const handleMarkAsDone = async (habit: Habit) => {
      if (!userId) return;
      if (habit.last_completed && isToday(new Date(habit.last_completed))) return;

      const today = new Date();
      const newStreak = (habit.last_completed && isYesterday(new Date(habit.last_completed))) 
          ? (habit.streak_count || 0) + 1 
          : 1;

      try {
        const { error } = await supabase
            .from('habits')
            .update({ streak_count: newStreak, last_completed: today.toISOString().split('T')[0] })
            .eq('id', habit.id);
        
        if (error) throw error;
        
        refetchHabits();
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error updating habit', description: error.message });
      }
  }


  return (
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
                disabled={isSubmitting || !userId}
                />
              <Button onClick={handleAddHabit} disabled={isSubmitting || !userId}><Plus className="mr-2 h-4 w-4" /> Add Habit</Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          {isLoading ? (
            [...Array(2)].map((_,i) => <Skeleton key={i} className="h-40 w-full" />)
          ) : initialHabits && initialHabits.length > 0 ? (
            initialHabits.map((habit) => {
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
                            onClick={() => handleMarkAsDone(habit)}
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
                        <div className="flex-1 rounded-md border p-3">
                            <div className="grid grid-cols-7 gap-2 text-center">
                            {daysOfWeek.map((day) => (
                                <div key={day} className="text-xs text-muted-foreground">{day}</div>
                            ))}
                            {[...Array(7)].map((_, dayIndex) => {
                                const dayDate = new Date();
                                dayDate.setDate(dayDate.getDate() - (dayDate.getDay() - dayIndex));
                                const isCompleted = habit.last_completed ? new Date(habit.last_completed) >= dayDate && habit.streak_count > 0: false;

                                return (
                                <div key={dayIndex} className={cn(
                                    "w-full aspect-square rounded-md flex items-center justify-center bg-muted/50",
                                    {"bg-green-200": isCompleted}
                                )}>
                                {isCompleted && <Check className="h-4 w-4 text-green-700"/>}
                                </div>
                            )})}
                            </div>
                        </div>
                        </div>
                    </CardContent>
                    </Card>
                )
            })
          ) : (
            <Card>
                <CardContent className="p-10 text-center text-muted-foreground">
                    {!userId ? "Please log in to track habits." : "You haven't added any habits yet."}
                </CardContent>
            </Card>
          )}
        </div>
      </div>
  );
}
