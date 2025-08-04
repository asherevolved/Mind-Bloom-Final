

import { MainAppLayout } from '@/components/main-app-layout';
import { TasksClientPage } from './tasks-client-page';
import { cookies } from 'next/headers';
import { auth, db } from '@/lib/firebase-admin';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';


export type Task = {
  id: string;
  title: string;
  category: string;
  is_completed: boolean;
};

export type SuggestedTask = {
    id: string;
    title: string;
    description: string;
    category: string;
}

async function getTasks(userId: string): Promise<Task[]> {
    if (!userId) return [];

    try {
        const tasksRef = collection(db, 'users', userId, 'tasks');
        const q = query(tasksRef, orderBy('createdAt', 'asc'));
        const tasksSnapshot = await getDocs(q);
        return tasksSnapshot.docs.map(doc => ({
            id: doc.id,
            title: doc.data().title,
            category: doc.data().category,
            is_completed: doc.data().is_completed,
        }));
    } catch(error) {
        console.error("Error fetching tasks from Firestore:", error);
        return [];
    }
};

async function getSuggestedTasks(): Promise<SuggestedTask[]> {
    // This is a placeholder. In a real app, you might have a global collection of suggestions.
    // For now, returning a static list.
    return [
        { id: 'suggest-1', title: '5-Minute Meditation', description: 'Clear your mind and find focus.', category: 'Mindfulness' },
        { id: 'suggest-2', title: 'Go for a Short Walk', description: 'Get some fresh air and move your body.', category: 'Exercise' },
        { id: 'suggest-3', title: 'Write Down 3 Things You\'re Grateful For', description: 'Cultivate a positive mindset.', category: 'Gratitude' },
    ];
}

export default async function TasksPage() {
    let userId: string | null = null;
    let tasks: Task[] = [];
    
    try {
        const cookieStore = cookies();
        const idToken = cookieStore.get('idToken')?.value;
        if (idToken) {
            const decodedToken = await auth.verifyIdToken(idToken);
            userId = decodedToken.uid;
            tasks = await getTasks(userId);
        }
    } catch (error) {
        console.log("Could not authenticate user on server", error);
    }
    
    const suggestedTasks = await getSuggestedTasks();

  return (
    <MainAppLayout>
        <TasksClientPage 
            initialTasks={tasks}
            initialSuggestedTasks={suggestedTasks}
            userId={userId}
        />
    </MainAppLayout>
  );
}

    
