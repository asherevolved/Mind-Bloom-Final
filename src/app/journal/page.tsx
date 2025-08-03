
import { MainAppLayout } from '@/components/main-app-layout';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import {JournalClientPage} from './journal-client-page';

export type JournalEntry = {
  id: string;
  title: string;
  mood_tag: string;
  created_at: string;
  entry: string;
};

async function getJournalEntries(): Promise<JournalEntry[]> {
    const cookieStore = cookies();
    const supabaseServer = createServerComponentClient({ cookies: () => cookieStore });
    
    const { data: { session } } = await supabaseServer.auth.getSession();
    if(!session) return [];

    const { data, error } = await supabaseServer
      .from('journal')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching journal", error);
      return [];
    }
    return data || [];
};

export default async function JournalPage() {
    const entries = await getJournalEntries();
    const cookieStore = cookies();
    const supabaseServer = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabaseServer.auth.getSession();

  return (
    <MainAppLayout>
        <JournalClientPage initialEntries={entries} userId={session?.user.id || null} />
    </MainAppLayout>
  );
}

    