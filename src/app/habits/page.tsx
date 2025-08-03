
import { MainAppLayout } from '@/components/main-app-layout';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { isToday, subDays } from 'date-fns';
import {HabitsClientPage} from './habits-client-page';


type Habit = {
  id: string;
  title: string;
  category: string;
  streak_count: number;
  last_completed: string | null;
  user_id: string;
};


async function getHabits(): Promise<Habit[]> {
    const cookieStore = cookies();
    const supabaseServer = createServerComponentClient({ cookies: () => cookieStore });
    
    const { data: { session } } = await supabaseServer.auth.getSession();
    if(!session) return [];

    const { data, error } = await supabaseServer
      .from('habits')
      .select('*')
      .eq('user_id', session.user.id);
      
    if (error || !data) {
        console.error("Error fetching habits", error);
        return [];
    }

    return data.map(h => ({
        ...h,
        streak_count: isToday(new Date(h.last_completed || '')) || isToday(subDays(new Date(h.last_completed || ''), -1)) ? h.streak_count : 0,
    }));
}


export default async function HabitsPage() {
    const habits = await getHabits();
    const cookieStore = cookies();
    const supabaseServer = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabaseServer.auth.getSession();


  return (
    <MainAppLayout>
        <HabitsClientPage initialHabits={habits} userId={session?.user.id || null} />
    </MainAppLayout>
  );
}

    