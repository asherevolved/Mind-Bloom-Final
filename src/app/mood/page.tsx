
import { MainAppLayout } from '@/components/main-app-layout';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { MoodClientPage } from './mood-client-page';

export type MoodLog = {
  id: string;
  mood_score: number;
  tags: string[];
  note: string;
  created_at: string;
};

async function getMoods(): Promise<MoodLog[]> {
    const cookieStore = cookies();
    const supabaseServer = createServerComponentClient({ cookies: () => cookieStore });

    const { data: { session } } = await supabaseServer.auth.getSession();
    if(!session) return [];
    
    const { data, error } = await supabaseServer
      .from('mood_logs')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching moods', error);
        return [];
    }

    return data || [];
}


export default async function MoodPage() {
  const pastMoods = await getMoods();
  const cookieStore = cookies();
  const supabaseServer = createServerComponentClient({ cookies: () => cookieStore });
  const { data: { session } } = await supabaseServer.auth.getSession();
  
  return (
    <MainAppLayout>
        <MoodClientPage initialMoods={pastMoods} userId={session?.user.id || null} />
    </MainAppLayout>
  );
}

    