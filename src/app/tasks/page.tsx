'use client';

import { useState, useEffect } from 'react';
import { MainAppLayout } from '@/components/main-app-layout';
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

type Task = {
  id: string;
  title: string;
  category: string;
  is_completed: boolean;
};

type SuggestedTask = {
    id: string;
    title: string;
    description: string;
    category: string;
}

export default function TasksPage() {
    const { toast } = useToast();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([]);
    const [newTaskText, setNewTaskText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserAndTasks = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUserId(session.user.id);
                fetchTasks(session.user.id);
                fetchSuggestedTasks();
            } else {
                setIsLoading(false);
            }
        };
        fetchUserAndTasks();
    }, []);

    const fetchTasks = async (currentUserId: string) => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: true });
        
        if (error) {
            toast({ variant: 'destructive', title: 'Error fetching tasks', description: error.message });
        } else if (data) {
            setTasks(data);
        }
        setIsLoading(false);
    };

    const fetchSuggestedTasks = async () => {
        const { data, error } = await supabase.from('suggested_tasks').select('*').limit(3);
         if (error) {
            toast({ variant: 'destructive', title: 'Error fetching suggestions', description: error.message });
        } else if (data) {
            setSuggestedTasks(data);
        }
    }

    const handleAddTask = async () => {
        if (!userId || !newTaskText.trim()) return;

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
        }
    };

    const handleAddSuggestedTask = async (task: SuggestedTask) => {
        if (!userId) {
            toast({ title: 'Task Added!', description: `(Guest) "${task.title}" has been added to your list.` });
            return;
        }

        const { data, error } = await supabase.from('tasks').insert({
            user_id: userId,
            title: task.title,
            category: task.category,
        }).select().single();

        if (error) {
            toast({ variant: 'destructive', title: 'Error adding task', description: error.message });
        } else if (data) {
            setTasks([...tasks, data]);
            toast({ title: "Task Added!", description: `"${task.title}" has been added to your list.` });
        }
    };

    const handleToggleTask = async (taskId: string, isCompleted: boolean) => {
        setTasks(tasks.map(t => t.id === taskId ? { ...t, is_completed: isCompleted } : t));
        if (!userId) return;

        await supabase.from('tasks').update({ is_completed: isCompleted }).eq('id', taskId);
    };

    const handleDeleteTask = async (taskId: string) => {
        setTasks(tasks.filter(t => t.id !== taskId));
        if (!userId) return;

        await supabase.from('tasks').delete().eq('id', taskId);
    };
    
    const completedCount = tasks.filter(t => t.is_completed).length;

  return (
    <MainAppLayout>
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
                    />
                  <Button size="icon" onClick={handleAddTask}><Plus /></Button>
                </div>
                <div className="space-y-3">
                  {isLoading ? (
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
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainAppLayout>
  );
}
