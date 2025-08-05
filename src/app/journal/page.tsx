'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import { JournalClientPage } from './journal-client-page';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type JournalEntry = {
  id: number;
  title: string;
  mood_tag: string;
  created_at: string; // ISO string
  entry: string;
  user_id: string;
};

export default function JournalPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const [userEntries, setUserEntries] = useState<JournalEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchEntries = async (uid: string) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('journal_entries')
                .select('*')
                .eq('user_id', uid)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUserEntries(data || []);
        } catch (error) {
            console.error('Error fetching journal entries:', error);
            setUserEntries([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                await fetchEntries(user.uid);
            } else {
                setUserEntries([]);
                setIsLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);
  
  return (
    <MainAppLayout>
        <JournalClientPage 
            initialEntries={userEntries} 
            userId={userId} 
            isLoading={isLoading}
            refetchEntries={() => { if(userId) fetchEntries(userId) }}
        />
    </MainAppLayout>
  );
}
