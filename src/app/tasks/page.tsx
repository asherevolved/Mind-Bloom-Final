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
  reminder_interval: number | null;
  sub_tasks: SubTask[];
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
            const { data, error } = await supabase
                .rpc('get_tasks_with_subtasks', { user_id_param: uid });

            if (error) throw error;
            
            const processedTasks = data.map((task: any) => {
                const subTasks = task.sub_tasks || [];
                const totalSubTasks = subTasks.length;
                const completedSubTasks = subTasks.filter((st: SubTask) => st.is_completed).length;
                return {
                    ...task,
                    sub_tasks: subTasks,
                    is_completed: totalSubTasks > 0 ? completedSubTasks === totalSubTasks : task.is_completed
                }
            });

            setUserTasks(processedTasks || []);
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
