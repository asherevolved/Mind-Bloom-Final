
'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import { TasksClientPage } from './tasks-client-page';
import { supabase } from '@/lib/supabase';
import { useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';

type SubTask = {
  id: number;
  title: string;
  is_completed: boolean;
};

export type Task = {
  id: number;
  title: string;
  category: string;
  is_completed: boolean;
  user_id: string;
  sub_tasks: SubTask[];
  task_datetime: string | null;
  duration_minutes: number | null;
};

export type SuggestedTask = {
    id: string;
    title: string;
    description: string;
    category: string;
}

const suggestedTasksList: SuggestedTask[] = [
    { id: 'suggest-1', title: '5-Minute Meditation', description: 'Clear your mind and find focus.', category: 'Mindfulness' },
    { id: 'suggest-2', title: 'Go for a Short Walk', description: 'Get some fresh air and move your body.', category: 'Exercise' },
    { id: 'suggest-3', title: 'Write Down 3 Things You\'re Grateful For', description: 'Cultivate a positive mindset.', category: 'Gratitude' },
];

export default function TasksPage() {
    const [user, setUser] = useState<User | null>(null);
    const [userTasks, setUserTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTasks = useCallback(async (uid: string) => {
        setIsLoading(true);
        try {
            // Fetch main tasks
            const { data: tasksData, error: tasksError } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', uid)
                .order('created_at', { ascending: false });

            if (tasksError) throw tasksError;

            // Fetch all sub-tasks for the user
            const { data: subTasksData, error: subTasksError } = await supabase
                .from('sub_tasks')
                .select('*')
                .eq('user_id', uid);
            
            if (subTasksError) throw subTasksError;

            // Map sub-tasks to their parent tasks
            const tasksWithSubtasks = tasksData.map(task => {
                const subTasks = subTasksData.filter(st => st.task_id === task.id);
                const isCompleted = subTasks.length > 0 
                    ? subTasks.every(st => st.is_completed) 
                    : task.is_completed;

                return {
                    ...task,
                    sub_tasks: subTasks,
                    is_completed: isCompleted,
                };
            });

            setUserTasks(tasksWithSubtasks || []);
        } catch (error) {
            console.error("Error fetching tasks:", error);
            setUserTasks([]);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            const currentUser = session?.user;
            setUser(currentUser ?? null);
            if (currentUser) {
                fetchTasks(currentUser.id);
            } else {
                setUserTasks([]);
                setIsLoading(false);
            }
        });
        
        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [fetchTasks]);

  return (
    <MainAppLayout>
        <TasksClientPage 
            initialTasks={userTasks}
            initialSuggestedTasks={suggestedTasksList}
            userId={user?.id || null}
            isLoading={isLoading}
            refetchTasks={() => { if(user) fetchTasks(user.id) }}
        />
    </MainAppLayout>
  );
}
