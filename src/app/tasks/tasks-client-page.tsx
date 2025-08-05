'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Lightbulb, Plus, Trash2, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { Task, SuggestedTask } from './page';
import { supabase } from '@/lib/supabase';

interface TasksClientPageProps {
    initialTasks: Task[];
    initialSuggestedTasks: SuggestedTask[];
    userId: string | null;
    isLoading: boolean;
    refetchTasks: () => void;
}

export function TasksClientPage({ initialTasks, initialSuggestedTasks, userId, isLoading, refetchTasks }: TasksClientPageProps) {
    const { toast } = useToast();
    const [newTaskText, setNewTaskText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
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
    };

    const handleAddTask = async (title: string, category: string = 'General') => {
        if (!userId || !title.trim()){
            toast({variant: 'destructive', title: 'Error', description: 'You must be logged in and provide a title to add a task.'});
            return
        };
        setIsSubmitting(true);

        try {
            const { error } = await supabase
                .from('tasks')
                .insert({ user_id: userId, title, category });

            if (error) throw error;
            
            toast({ title: 'Task Added!', description: `"${title}" has been added.` });
            if (title === newTaskText) {
                setNewTaskText('');
            }
            refetchTasks();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error adding task', description: error.message });
        }
        setIsSubmitting(false);
    };

    const handleAddSuggestedTask = async (task: SuggestedTask) => {
        if (!userId) {
            toast({ title: 'Task Added!', description: `(Guest) "${task.title}" has been added to your list. Sign up to save.` });
            return;
        }
        await handleAddTask(task.title, task.category);
    };

    const handleToggleTask = async (taskId: number, isCompleted: boolean) => {
        if (!userId) return;

        try {
            const { error } = await supabase
                .from('tasks')
                .update({ is_completed: isCompleted })
                .eq('id', taskId);

            if (error) throw error;
            
            if (isCompleted) {
                await awardBadge('starter_tasker', 'Starter Tasker');
            }

            refetchTasks();
        } catch(error: any) {
             toast({ variant: 'destructive', title: 'Error updating task', description: error.message });
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        if (!userId) return;

        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId);
            
            if (error) throw error;
            refetchTasks();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error deleting task', description: error.message });
        }
    };
    
    const completedCount = initialTasks.filter(t => t.is_completed).length;

  return (
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="font-headline text-3xl font-bold text-foreground">Task Planner</h1>
          <p className="text-muted-foreground">Stay on track with your wellness goals.</p>
        </header>

        <Tabs defaultValue="my-tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
            <TabsTrigger value="suggested-tasks">
              <Lightbulb className="mr-2 h-4 w-4" /> Suggested
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-tasks" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Today's Focus</CardTitle>
                <CardDescription>{completedCount} of {initialTasks.length} tasks completed. Keep it up!</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Add a new task..." 
                    value={newTaskText} 
                    onChange={(e) => setNewTaskText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTask(newTaskText)}
                    disabled={isSubmitting || !userId}
                    />
                  <Button size="icon" onClick={() => handleAddTask(newTaskText)} disabled={isSubmitting || !newTaskText.trim() || !userId}><Plus /></Button>
                </div>
                <div className="space-y-3">
                  {isLoading ? (
                    [...Array(3)].map((_,i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)
                  ) : initialTasks && initialTasks.length > 0 ? (
                    initialTasks.map(task => (
                      <div key={task.id} className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/50 has-[[data-state=checked]]:bg-accent">
                        <div className="flex items-center gap-3">
                           <Checkbox id={task.id.toString()} checked={task.is_completed} onCheckedChange={(checked) => handleToggleTask(task.id, !!checked)} />
                           <label htmlFor={task.id.toString()} className="text-sm font-medium data-[done=true]:line-through data-[done=true]:text-muted-foreground" data-done={task.is_completed}>{task.title}</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{task.category}</Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteTask(task.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground p-8">
                      {!userId ? "Please log in to manage your tasks." : "You have no tasks. Add one above!"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suggested-tasks" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {initialSuggestedTasks.map(task => (
                <Card key={task.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>{task.title}</CardTitle>
                      <Badge variant="secondary">{task.category}</Badge>
                    </div>
                    <CardDescription>{task.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <Button className="w-full" onClick={() => handleAddSuggestedTask(task)}><Plus className="mr-2 h-4 w-4" /> Add to My Tasks</Button>
                  </CardContent>
                </Card>
              ))}
              {initialSuggestedTasks.length === 0 && (
                 <Card className="md:col-span-3">
                    <CardContent className="p-10 text-center text-muted-foreground">
                        No suggested tasks available right now.
                    </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
  );
}
