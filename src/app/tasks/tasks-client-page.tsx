
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Lightbulb, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import type { Task, SuggestedTask } from './page';

interface TasksClientPageProps {
    initialTasks: Task[];
    initialSuggestedTasks: SuggestedTask[];
    userId: string | null;
}

export function TasksClientPage({ initialTasks, initialSuggestedTasks, userId }: TasksClientPageProps) {
    const { toast } = useToast();
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [suggestedTasks] = useState<SuggestedTask[]>(initialSuggestedTasks);
    const [newTaskText, setNewTaskText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleAddTask = async () => {
        if (!userId || !newTaskText.trim()) return;
        setIsLoading(true);

        const { data, error } = await supabase.from('tasks').insert({
            user_id: userId,
            title: newTaskText,
            category: 'Manual',
        }).select().single();

        if (error) {
            toast({ variant: 'destructive', title: 'Error adding task', description: error.message });
        } else if (data) {
            setTasks([...tasks, data]);
            setNewTaskText('');
            router.refresh();
        }
        setIsLoading(false);
    };

    const handleAddSuggestedTask = async (task: SuggestedTask) => {
        if (!userId) {
            toast({ title: 'Task Added!', description: `(Guest) "${task.title}" has been added to your list.` });
            return;
        }

        const optimisticTask: Task = {
            id: `optimistic-${Date.now()}`,
            title: task.title,
            category: task.category,
            is_completed: false,
        };
        setTasks([...tasks, optimisticTask]);

        const { data, error } = await supabase.from('tasks').insert({
            user_id: userId,
            title: task.title,
            category: task.category,
        }).select().single();

        if (error) {
            toast({ variant: 'destructive', title: 'Error adding task', description: error.message });
            setTasks(tasks => tasks.filter(t => t.id !== optimisticTask.id)); // Revert
        } else if (data) {
            toast({ title: "Task Added!", description: `"${task.title}" has been added to your list.` });
            router.refresh(); // Refresh to get the real data from the server
        }
    };

    const handleToggleTask = async (taskId: string, isCompleted: boolean) => {
        setTasks(tasks.map(t => t.id === taskId ? { ...t, is_completed: isCompleted } : t));
        if (!userId) return;

        const { error } = await supabase.from('tasks').update({ is_completed: isCompleted }).eq('id', taskId);
        if (error) {
            // Revert optimistic update
             setTasks(tasks.map(t => t.id === taskId ? { ...t, is_completed: !isCompleted } : t));
             toast({ variant: 'destructive', title: 'Error updating task' });
        } else {
            router.refresh();
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        const originalTasks = tasks;
        setTasks(tasks.filter(t => t.id !== taskId));
        if (!userId) return;

        const { error } = await supabase.from('tasks').delete().eq('id', taskId);
        if (error) {
            setTasks(originalTasks);
            toast({ variant: 'destructive', title: 'Error deleting task' });
        } else {
            router.refresh();
        }
    };
    
    const completedCount = tasks.filter(t => t.is_completed).length;

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
                <CardDescription>{completedCount} of {tasks.length} tasks completed. Keep it up!</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Add a new task..." 
                    value={newTaskText} 
                    onChange={(e) => setNewTaskText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                    disabled={isLoading}
                    />
                  <Button size="icon" onClick={handleAddTask} disabled={isLoading}><Plus /></Button>
                </div>
                <div className="space-y-3">
                  {isLoading && tasks.length === 0 ? (
                    [...Array(3)].map((_,i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)
                  ) : (
                    tasks.map(task => (
                      <div key={task.id} className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/50 has-[[data-state=checked]]:bg-accent">
                        <div className="flex items-center gap-3">
                           <Checkbox id={task.id} checked={task.is_completed} onCheckedChange={(checked) => handleToggleTask(task.id, !!checked)} />
                           <label htmlFor={task.id} className="text-sm font-medium data-[done=true]:line-through data-[done=true]:text-muted-foreground" data-done={task.is_completed}>{task.title}</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{task.category}</Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteTask(task.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                  {!isLoading && tasks.length === 0 && (
                    <div className="text-center text-muted-foreground p-8">You have no tasks. Add one above!</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suggested-tasks" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {suggestedTasks.map(task => (
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
              {suggestedTasks.length === 0 && (
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

    