'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Check, Flame, Plus, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const habits = [
  { name: 'Morning Meditation', category: 'Self-Care', streak: 4, longest: 10, completedToday: true, schedule: [1,1,1,1,1,0,0] }, // Mon-Fri
  { name: 'Evening Walk', category: 'Physical', streak: 12, longest: 12, completedToday: false, schedule: [1,1,1,1,1,1,1] }, // Everyday
  { name: 'No Social Media After 9 PM', category: 'Digital Wellness', streak: 0, longest: 5, completedToday: false, schedule: [1,1,1,1,1,1,1] }, // Everyday
];

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function HabitsPage() {
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
              <Input placeholder="e.g., Drink water" />
              <Button><Plus className="mr-2 h-4 w-4" /> Add Habit</Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          {habits.map((habit, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{habit.name}</CardTitle>
                    <CardDescription><Badge variant="outline" className="mt-1">{habit.category}</Badge></CardDescription>
                  </div>
                   <Button variant={habit.completedToday ? "default" : "outline"}>
                     <Check className="mr-2 h-4 w-4" /> {habit.completedToday ? "Done!" : "Mark as Done"}
                   </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex gap-4">
                    <div className="text-center p-3 rounded-md bg-accent/50 flex-1">
                      <div className="flex items-center justify-center gap-1 font-bold text-xl text-primary"><Flame />{habit.streak}</div>
                      <div className="text-xs text-muted-foreground">Current Streak</div>
                    </div>
                    <div className="text-center p-3 rounded-md bg-accent/50 flex-1">
                      <div className="flex items-center justify-center gap-1 font-bold text-xl"><Star />{habit.longest}</div>
                      <div className="text-xs text-muted-foreground">Longest Streak</div>
                    </div>
                  </div>
                  <div className="flex-1 rounded-md border p-3">
                     <div className="grid grid-cols-7 gap-2 text-center">
                      {daysOfWeek.map((day, dayIndex) => (
                        <div key={day} className="text-xs text-muted-foreground">{day}</div>
                      ))}
                      {habit.schedule.map((active, dayIndex) => (
                        <div key={dayIndex} className={cn(
                          "w-full aspect-square rounded-md flex items-center justify-center",
                          active ? 'bg-muted/50' : 'bg-muted/20'
                        )}>
                          {active && dayIndex < 5 && <Check className="h-4 w-4 text-green-500"/>}
                        </div>
                      ))}
                     </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainAppLayout>
  );
}
