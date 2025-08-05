'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import { MoodClientPage } from './mood-client-page';
import { supabase } from '@/lib/supabase';
import { useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';

export type MoodLog = {
  id: number;
  mood_score: number;
  tags: string[];
  note: string;
  created_at: string; // ISO String
  user_id: string;
};


export default function MoodPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userMoods, setUserMoods] = useState<MoodLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMoods = useCallback(async (uid: string) => {
    setIsLoading(true);
    try {
        const { data, error } = await supabase
            .from('mood_logs')
            .select('*')
            .eq('user_id', uid)
            .order('created_at', { ascending: false });

        if (error) throw error;
        setUserMoods(data || []);
    } catch (error) {
        console.error("Error fetching moods:", error);
        setUserMoods([]);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user;
      setUser(currentUser ?? null);
      if (currentUser) {
        fetchMoods(currentUser.id);
      } else {
        setUserMoods([]);
        setIsLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchMoods]);
  
  return (
    <MainAppLayout>
        <MoodClientPage 
            initialMoods={userMoods} 
            userId={user?.id || null} 
            isLoading={isLoading}
            refetchMoods={() => { if(user) fetchMoods(user.id) }}
        />
    </MainAppLayout>
  );
}
