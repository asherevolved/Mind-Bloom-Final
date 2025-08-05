'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Check, Flame, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { isToday, subDays } from 'date-fns';
import { useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Habit = {
  _id: string;
  title: string;
  category: string;
  streak_count: number;
  last_completed: string | null;
  userId: string;
};

interface HabitsClientPageProps {
    initialHabits: Habit[];
    userId: string | null;
}

export function HabitsClientPage({ initialHabits, userId }: HabitsClientPageProps) {
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const insertHabit = useMutation(api.crud.insert);
  const updateHabit = useMutation(api.crud.update);

  useEffect(() => {
    setHabits(initialHabits);
  }, [initialHabits]);

  const handleAddHabit = async () => {
    if (!userId || !newHabitTitle.trim()) return;
    setIsLoading(true);
    try {
        await insertHabit({
          table: 'habits',
          data: {
            title: newHabitTitle,
            category: 'General',
            streak_count: 0,
            last_completed: null,
            createdAt: new Date().toISOString(),
            userId
          }
        });
        
        setNewHabitTitle('');
        toast({ title: 'Habit Added!', description: `You're now tracking "${newHabitTitle}".` });

    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Error adding habit', description: error.message });
    }
    setIsLoading(false);
  };

  const handleMarkAsDone = async (habit: Habit) => {
      if (!userId) return;
      if (habit.last_completed && isToday(new Date(habit.last_completed))) return;

      const newStreak = (habit.last_completed && isToday(subDays(new Date(), 1))) 
          ? (habit.streak_count || 0) + 1 
          : 1;

      const newLastCompleted = new Date().toISOString();
      
      try {
        await updateHabit({
          table: 'habits',
          id: habit._id,
          patch: {
            streak_count: newStreak,
            last_completed: newLastCompleted,
          }
        });
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
                disabled={isLoading}
                />
              <Button onClick={handleAddHabit} disabled={isLoading}><Plus className="mr-2 h-4 w-4" /> Add Habit</Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          {isLoading && habits.length === 0 ? (
            [...Array(2)].map((_,i) => <Skeleton key={i} className="h-40 w-full" />)
          ) : (
            habits.map((habit) => {
                const completedToday = habit.last_completed ? isToday(new Date(habit.last_completed)) : false;
                return (
                    <Card key={habit._id}>
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
           {!isLoading && habits.length === 0 && (
              <Card>
                  <CardContent className="p-10 text-center text-muted-foreground">
                      You haven't added any habits yet.
                  </CardContent>
              </Card>
            )}
        </div>
      </div>
  );
}
