'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import {HabitsClientPage} from './habits-client-page';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type Habit = {
  id: number;
  title: string;
  category: string;
  streak_count: number;
  last_completed: string | null;
  user_id: string;
};

export default function HabitsPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const [userHabits, setUserHabits] = useState<Habit[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchHabits = async (uid: string) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('habits')
                .select('*')
                .eq('user_id', uid)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUserHabits(data || []);
        } catch (error) {
            console.error("Error fetching habits:", error);
            setUserHabits([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                await fetchHabits(user.uid);
            } else {
                setUserHabits([]);
                setIsLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);
  
  return (
    <MainAppLayout>
        <HabitsClientPage 
            initialHabits={userHabits} 
            userId={userId}
            isLoading={isLoading}
            refetchHabits={() => { if(userId) fetchHabits(userId) }}
        />
    </MainAppLayout>
  );
}
