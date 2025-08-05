
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Lightbulb, Plus, Trash2, Trophy, List, X, ChevronDown, ChevronUp, CalendarPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { Task, SuggestedTask } from './page';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
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

interface TasksClientPageProps {
    initialTasks: Task[];
    initialSuggestedTasks: SuggestedTask[];
    userId: string | null;
    isLoading: boolean;
    refetchTasks: () => void;
}

export function TasksClientPage({ initialTasks, initialSuggestedTasks, userId, isLoading, refetchTasks }: TasksClientPageProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // New Task Dialog State
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newSubTasks, setNewSubTasks] = useState<{ title: string }[]>([]);
    const [newSubTaskInput, setNewSubTaskInput] = useState('');
    const [newTaskDate, setNewTaskDate] = useState('');
    const [newTaskTime, setNewTaskTime] = useState('');
    const [newDuration, setNewDuration] = useState<number | undefined>(undefined);
    
    const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

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

    const resetDialog = () => {
        setNewTaskTitle('');
        setNewSubTasks([]);
        setNewSubTaskInput('');
        setNewTaskDate('');
        setNewTaskTime('');
        setNewDuration(undefined);
    };

    const handleAddSubTask = () => {
        if (newSubTaskInput.trim()) {
            setNewSubTasks([...newSubTasks, { title: newSubTaskInput.trim() }]);
            setNewSubTaskInput('');
        }
    };
    
    const handleRemoveSubTask = (index: number) => {
        setNewSubTasks(newSubTasks.filter((_, i) => i !== index));
    };

    const handleCreateTask = async () => {
        if (!userId || !newTaskTitle.trim()){
            toast({variant: 'destructive', title: 'Error', description: 'You must be logged in and provide a title to add a task.'});
            return
        };
        setIsSubmitting(true);
        
        const taskDateTime = (newTaskDate && newTaskTime) ? `${newTaskDate}T${newTaskTime}:00` : null;

        const taskToInsert: any = {
            user_id: userId, 
            title: newTaskTitle, 
            category: 'General', 
        };

        if (taskDateTime) {
            taskToInsert.task_datetime = taskDateTime;
        }

        if (newDuration) {
            taskToInsert.duration_minutes = newDuration;
        }


        try {
            const { data: taskData, error } = await supabase
                .from('tasks')
                .insert(taskToInsert)
                .select('id')
                .single();

            if (error) throw error;

            const taskId = taskData.id;
            
            if (newSubTasks.length > 0) {
                const subTasksToInsert = newSubTasks.map(st => ({
                    task_id: taskId,
                    user_id: userId,
                    title: st.title
                }));
                const { error: subTaskError } = await supabase.from('sub_tasks').insert(subTasksToInsert);
                if (subTaskError) throw subTaskError;
            }
            
            toast({ title: 'Task Added!', description: `"${newTaskTitle}" has been added.` });
            resetDialog();
            setIsDialogOpen(false);
            refetchTasks();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error adding task', description: error.message });
        }
        setIsSubmitting(false);
    };

    const handleAddToCalendar = (task: Task) => {
        if (!task.task_datetime) {
            toast({ variant: 'destructive', title: 'No date set', description: 'This task does not have a date and time set.' });
            return;
        }

        const baseUrl = "https://www.google.com/calendar/render?action=TEMPLATE";

        const startDate = parseISO(task.task_datetime);
        const endDate = new Date(startDate.getTime() + (task.duration_minutes || 30) * 60000);
        
        // Format YYYYMMDDTHHMMSSZ
        const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        const text = encodeURIComponent(task.title);
        const dates = `${formatDate(startDate)}/${formatDate(endDate)}`;
        
        const subtaskDetails = task.sub_tasks.map(st => `- ${st.title}`).join('\\n');
        const details = encodeURIComponent(subtaskDetails);
        
        const calendarUrl = `${baseUrl}&text=${text}&dates=${dates}&details=${details}`;
        window.open(calendarUrl, '_blank');
    };

    const handleToggleTaskComplete = async (taskId: number, isCompleted: boolean) => {
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
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error updating task', description: error.message });
        }
    };

    const handleToggleSubTask = async (subTaskId: number, isCompleted: boolean) => {
        if (!userId) return;
        try {
            const { error } = await supabase
                .from('sub_tasks')
                .update({ is_completed: isCompleted })
                .eq('id', subTaskId);
            
            if(error) throw error;

            if (isCompleted) {
                await awardBadge('starter_tasker', 'Starter Tasker');
            }

            refetchTasks(); // Refetch to update progress bar
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error updating sub-task', description: error.message });
        }
    };
    
    const toggleTaskExpansion = (taskId: number) => {
        setExpandedTasks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) {
                newSet.delete(taskId);
            } else {
                newSet.add(taskId);
            }
            return newSet;
        });
    };

    const handleDeleteTask = async (taskId: number) => {
        if (!userId) return;

        try {
            // First delete sub-tasks due to foreign key constraint
            await supabase.from('sub_tasks').delete().eq('task_id', taskId);
            // Then delete the main task
            await supabase.from('tasks').delete().eq('id', taskId);
            
            refetchTasks();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error deleting task', description: error.message });
        }
    };
    
    const handleClearCompleted = async () => {
        if (!userId) return;

        const completedTaskIds = initialTasks.filter(t => t.is_completed).map(t => t.id);
        if (completedTaskIds.length === 0) {
            toast({ description: "No completed tasks to clear."});
            return;
        }

        try {
             // We need to delete sub-tasks first if they exist
            await supabase.from('sub_tasks').delete().in('task_id', completedTaskIds);
            await supabase.from('tasks').delete().in('id', completedTaskIds);
            
            refetchTasks();
            toast({ title: 'Tasks Cleared!', description: `Removed ${completedTaskIds.length} completed tasks.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error clearing tasks', description: error.message });
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
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Today's Focus</CardTitle>
                        <CardDescription>{completedCount} of {initialTasks.length} tasks completed. Keep it up!</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {completedCount > 0 && (
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline"><Trash2 className="mr-2 h-4 w-4"/> Clear Completed</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete {completedCount} completed task(s). This action cannot be undone.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleClearCompleted}>Clear Tasks</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
                            setIsDialogOpen(isOpen);
                            if (!isOpen) resetDialog();
                        }}>
                            <DialogTrigger asChild>
                                <Button disabled={!userId}><Plus className="mr-2 h-4 w-4"/> New Task</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Create New Task</DialogTitle>
                                    <DialogDescription>Fill out the details for your new task.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Task Name</Label>
                                        <Input id="title" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="date">Date (optional)</Label>
                                            <Input id="date" type="date" value={newTaskDate} onChange={e => setNewTaskDate(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="time">Time (optional)</Label>
                                            <Input id="time" type="time" value={newTaskTime} onChange={e => setNewTaskTime(e.target.value)} />
                                        </div>
                                    </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="duration">Duration (minutes, optional)</Label>
                                        <Input id="duration" type="number" value={newDuration === undefined ? '' : newDuration} onChange={e => setNewDuration(e.target.value === '' ? undefined : parseInt(e.target.value))} />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label htmlFor="subtasks">Sub-tasks (optional)</Label>
                                        <div className="space-y-2">
                                            {newSubTasks.map((st, index) => (
                                                <div key={index} className="flex items-center gap-2">
                                                    <Input value={st.title} readOnly className="bg-muted"/>
                                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveSubTask(index)}><X className="h-4 w-4"/></Button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <Input id="subtasks" placeholder="Add a sub-task..." value={newSubTaskInput} onChange={(e) => setNewSubTaskInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddSubTask()} />
                                            <Button onClick={handleAddSubTask}>Add</Button>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleCreateTask} disabled={isSubmitting || !newTaskTitle.trim()}>
                                        {isSubmitting ? 'Creating...' : 'Create Task'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                    [...Array(3)].map((_,i) => <Skeleton key={i} className="h-24 w-full rounded-md" />)
                ) : initialTasks && initialTasks.length > 0 ? (
                    initialTasks.map(task => {
                        const subTasks = task.sub_tasks || [];
                        const completedSubTasks = subTasks.filter(st => st.is_completed).length;
                        const totalSubTasks = subTasks.length;
                        const progress = totalSubTasks > 0 ? (completedSubTasks / totalSubTasks) * 100 : task.is_completed ? 100 : 0;
                        const isExpanded = expandedTasks.has(task.id);

                        return (
                            <Card key={task.id} className={cn("p-4 hover:bg-accent/50 transition-colors", task.is_completed && 'bg-muted/50')}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 flex-1">
                                        <Checkbox 
                                            id={`task-${task.id}`}
                                            checked={task.is_completed}
                                            onCheckedChange={(checked) => handleToggleTaskComplete(task.id, !!checked)}
                                            disabled={totalSubTasks > 0}
                                            className="mt-1"
                                        />
                                        <div className="flex-1 space-y-2">
                                            <p className={cn("font-medium", task.is_completed && 'line-through text-muted-foreground')}>{task.title}</p>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                {totalSubTasks > 0 && (
                                                    <span>{completedSubTasks} of {totalSubTasks} steps</span>
                                                )}
                                                {task.task_datetime && (
                                                    <span className="font-mono">{format(parseISO(task.task_datetime), 'PPp')}</span>
                                                )}
                                            </div>
                                            {totalSubTasks > 0 && <Progress value={progress} className="h-2" />}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 ml-4">
                                        {task.task_datetime && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAddToCalendar(task)}>
                                                <CalendarPlus className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {totalSubTasks > 0 && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleTaskExpansion(task.id)}>
                                                {isExpanded ? <ChevronUp /> : <ChevronDown />}
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteTask(task.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                {isExpanded && totalSubTasks > 0 && (
                                    <div className="mt-4 pl-4 border-l-2 ml-2 space-y-2">
                                        {subTasks.map(subtask => (
                                            <div key={subtask.id} className="flex items-center gap-3">
                                                <Checkbox 
                                                    id={`subtask-${subtask.id}`} 
                                                    checked={subtask.is_completed} 
                                                    onCheckedChange={(checked) => handleToggleSubTask(subtask.id, !!checked)} 
                                                />
                                                <label 
                                                    htmlFor={`subtask-${subtask.id}`} 
                                                    className={cn("text-sm font-medium transition-colors", subtask.is_completed && "line-through text-muted-foreground")}
                                                >
                                                    {subtask.title}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        )
                    })
                ) : (
                    <div className="text-center text-muted-foreground p-8">
                      {!userId ? "Please log in to manage your tasks." : "You have no tasks. Add one above!"}
                    </div>
                )}
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
                    <Button className="w-full" onClick={() => {
                        resetDialog();
                        setIsDialogOpen(true);
                        setNewTaskTitle(task.title);
                    }}><Plus className="mr-2 h-4 w-4" /> Add to My Tasks</Button>
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
