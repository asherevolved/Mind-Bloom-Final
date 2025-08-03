
import { MainAppLayout } from '@/components/main-app-layout';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { TasksClientPage } from './tasks-client-page';

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

async function getTasks(): Promise<Task[]> {
    const cookieStore = cookies();
    const supabaseServer = createServerComponentClient({ cookies: () => cookieStore });

    const { data: { session } } = await supabaseServer.auth.getSession();
    if (!session) return [];

    const { data, error } = await supabaseServer
        .from('tasks')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });
    
    if (error) {
        console.error("Error fetching tasks", error);
        return [];
    }
    return data || [];
};

async function getSuggestedTasks(): Promise<SuggestedTask[]> {
    const cookieStore = cookies();
    const supabaseServer = createServerComponentClient({ cookies: () => cookieStore });
    const { data, error } = await supabaseServer.from('suggested_tasks').select('*').limit(3);
     if (error) {
        console.error("Error fetching suggested tasks", error);
        return [];
    }
    return data || [];
}

export default async function TasksPage() {
    const [tasks, suggestedTasks] = await Promise.all([getTasks(), getSuggestedTasks()]);
    const cookieStore = cookies();
    const supabaseServer = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabaseServer.auth.getSession();

  return (
    <MainAppLayout>
        <TasksClientPage 
            initialTasks={tasks}
            initialSuggestedTasks={suggestedTasks}
            userId={session?.user.id || null}
        />
    </MainAppLayout>
  );
}

    