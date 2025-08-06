'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Check, Flame, Plus, Trophy, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { isToday, isYesterday, format, subDays, getDay } from 'date-fns';
import type { Habit } from './page';
import { supabase } from '@/lib/supabase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
    const { data: existingBadge } = await supabase.from('user_badges').select('id').eq('user_id', userId).eq('badge_code', code).single();
    if (!existingBadge) {
        const { error } = await supabase.from('user_badges').insert({ user_id: userId, badge_code: code });
        if (!error) {
            toast({ title: 'Badge Unlocked!', description: `You've earned the "${name}" badge!`, action: <Trophy className="h-5 w-5 text-yellow-500" /> });
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
        const { error } = await supabase.from('habits').insert({ user_id: userId, title: newHabitTitle, category: 'General' });
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

  const handleDeleteHabit = async (habitId: string) => {
      if (!userId) return;
      try {
          await supabase.from('habits').delete().eq('id', habitId);
          toast({ title: 'Habit Deleted' });
          refetchHabits();
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error deleting habit', description: error.message });
      }
  }

  const handleMarkAsDone = async (habit: Habit) => {
      if (!userId) return;
      if (habit.last_completed && isToday(new Date(habit.last_completed))) return;

      const today = new Date();
      const newStreak = (habit.last_completed && isYesterday(new Date(habit.last_completed))) ? (habit.streak_count || 0) + 1 : 1;
      
      const { data, error } = await supabase.from('habit_completions').insert({ habit_id: habit.id, user_id: userId });
      if(error) {
        toast({ variant: 'destructive', title: 'Error marking habit', description: error.message });
        return;
      }

      try {
        const { error: updateError } = await supabase.from('habits').update({ streak_count: newStreak, last_completed: today.toISOString() }).eq('id', habit.id);
        if (updateError) throw updateError;
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
              <Input placeholder="e.g., Drink water" value={newHabitTitle} onChange={e => setNewHabitTitle(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddHabit()} disabled={isSubmitting || !userId} />
              <Button onClick={handleAddHabit} disabled={isSubmitting || !newHabitTitle.trim()}><Plus className="mr-2 h-4 w-4" /> Add Habit</Button>
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
                        <div className="flex items-center gap-1">
                            <Button variant={completedToday ? "default" : "outline"} onClick={() => handleMarkAsDone(habit)} disabled={completedToday}>
                                <Check className="mr-2 h-4 w-4" /> {completedToday ? "Done!" : "Mark as Done"}
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-muted-foreground"/></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Delete Habit?</AlertDialogTitle><AlertDialogDescription>This will delete the habit and its history. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteHabit(habit.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                            <div className="flex gap-4">
                                <div className="text-center p-3 rounded-md bg-accent/50 flex-1">
                                <div className="flex items-center justify-center gap-1 font-bold text-xl text-primary"><Flame />{habit.streak_count}</div>
                                <div className="text-xs text-muted-foreground">Current Streak</div>
                                </div>
                            </div>
                            <div className="flex-1 rounded-md border p-3 w-full">
                                <p className="text-xs text-center text-muted-foreground mb-2">Last 7 Days</p>
                                <div className="grid grid-cols-7 gap-2 text-center">
                                {[...Array(7)].map((_, dayIndex) => {
                                    const reversedIndex = 6 - dayIndex;
                                    const date = subDays(new Date(), reversedIndex);
                                    const isCompleted = habit.last_completed ? new Date(habit.last_completed) >= date : false; // This is a simplification
                                    return (
                                    <div key={dayIndex} className="flex flex-col items-center gap-1">
                                        <div className={cn("w-full aspect-square rounded-md flex items-center justify-center", isCompleted ? "bg-green-300" : "bg-muted/50")}>
                                          {isCompleted && <Check className="h-4 w-4 text-green-800"/>}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{format(date, 'eee')}</span>
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
