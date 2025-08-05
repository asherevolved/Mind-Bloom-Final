'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import { JournalClientPage } from './journal-client-page';
import { supabase } from '@/lib/supabase';
import { useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';

export type JournalEntry = {
  id: number;
  title: string;
  mood_tag: string;
  created_at: string; // ISO string
  entry: string;
  user_id: string;
};

export default function JournalPage() {
    const [user, setUser] = useState<User | null>(null);
    const [userEntries, setUserEntries] = useState<JournalEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchEntries = useCallback(async (uid: string) => {
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
    }, []);

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            const currentUser = session?.user;
            setUser(currentUser ?? null);
            if (currentUser) {
                fetchEntries(currentUser.id);
            } else {
                setUserEntries([]);
                setIsLoading(false);
            }
        });
        
        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [fetchEntries]);
  
  return (
    <MainAppLayout>
        <JournalClientPage 
            initialEntries={userEntries} 
            userId={user?.id || null} 
            isLoading={isLoading}
            refetchEntries={() => { if(user) fetchEntries(user.id) }}
        />
    </MainAppLayout>
  );
}
