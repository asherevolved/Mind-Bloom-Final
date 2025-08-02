'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Lightbulb, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';


const myTasks = [
  { id: 'task1', text: 'Go for a 15-minute walk', category: 'Mental', done: true },
  { id: 'task2', text: 'Journal for 10 minutes', category: 'Mental', done: true },
  { id: 'task3', text: 'Call a friend', category: 'Social', done: false },
  { id: 'task4', text: 'Drink 8 glasses of water', category: 'Physical', done: false },
  { id: 'task5', text: 'Read one chapter of a book', category: 'Self-Care', done: false },
];

const suggestedTasks = [
  { id: 'sug1', title: 'Mindful Breathing', description: 'Take 5 deep breaths, focusing on the sensation of air.', category: 'Mental' },
  { id: 'sug2', title: 'Gratitude List', description: 'Write down three things you are grateful for today.', category: 'Mental' },
  { id: 'sug3', title: 'Stretch Your Body', description: 'Do a 5-minute stretching routine to release tension.', category: 'Physical' },
];

export default function TasksPage() {
    const { toast } = useToast();

    const handleAddTask = () => {
        toast({
            title: "Task Added!",
            description: "The suggested task has been added to your list.",
        })
    }
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
                <CardDescription>2 of 5 tasks completed. Keep it up!</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="Add a new task..." />
                  <Button size="icon"><Plus /></Button>
                </div>
                <div className="space-y-3">
                  {myTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/50 has-[[data-state=checked]]:bg-accent">
                      <div className="flex items-center gap-3">
                         <Checkbox id={task.id} defaultChecked={task.done} />
                         <label htmlFor={task.id} className="text-sm font-medium data-[done=true]:line-through data-[done=true]:text-muted-foreground" data-done={task.done}>{task.text}</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{task.category}</Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
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
                    <Button className="w-full" onClick={handleAddTask}><Plus className="mr-2 h-4 w-4" /> Add to My Tasks</Button>
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
