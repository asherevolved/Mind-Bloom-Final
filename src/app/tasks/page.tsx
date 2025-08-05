'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import { TasksClientPage } from './tasks-client-page';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';

export type Task = {
  _id: string;
  title: string;
  category: string;
  is_completed: boolean;
  userId: string;
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
    const allTasks = useQuery(api.crud.list, { table: 'tasks' }) || [];
    const [userTasks, setUserTasks] = useState([]);
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if(userId && allTasks) {
            setUserTasks(allTasks.filter((t: any) => t.userId === userId));
        }
    }, [userId, allTasks]);

  return (
    <MainAppLayout>
        <TasksClientPage 
            initialTasks={userTasks}
            initialSuggestedTasks={suggestedTasksList}
            userId={userId}
        />
    </MainAppLayout>
  );
}
