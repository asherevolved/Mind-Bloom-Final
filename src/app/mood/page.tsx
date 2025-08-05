'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import { MoodClientPage } from './mood-client-page';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type MoodLog = {
  id: number;
  mood_score: number;
  tags: string[];
  note: string;
  created_at: string; // ISO String
  user_id: string;
};


export default function MoodPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userMoods, setUserMoods] = useState<MoodLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMoods = async (uid: string) => {
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
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            setUserId(user.uid);
            await fetchMoods(user.uid);
        } else {
            setUserMoods([]);
            setIsLoading(false);
        }
    });
    return () => unsubscribe();
  }, []);
  
  return (
    <MainAppLayout>
        <MoodClientPage 
            initialMoods={userMoods} 
            userId={userId} 
            isLoading={isLoading}
            refetchMoods={() => { if(userId) fetchMoods(userId) }}
        />
    </MainAppLayout>
  );
}
