'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import { TasksClientPage } from './tasks-client-page';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type Task = {
  id: number;
  title: string;
  category: string;
  is_completed: boolean;
  user_id: string;
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
    const [userId, setUserId] = useState<string | null>(null);
    const [userTasks, setUserTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTasks = async (uid: string) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', uid)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUserTasks(data || []);
        } catch (error) {
            console.error("Error fetching tasks:", error);
            setUserTasks([]);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                await fetchTasks(user.uid);
            } else {
                setUserTasks([]);
                setIsLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

  return (
    <MainAppLayout>
        <TasksClientPage 
            initialTasks={userTasks}
            initialSuggestedTasks={suggestedTasksList}
            userId={userId}
            isLoading={isLoading}
            refetchTasks={() => { if(userId) fetchTasks(userId) }}
        />
    </MainAppLayout>
  );
}
