'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import {HabitsClientPage} from './habits-client-page';
import { supabase } from '@/lib/supabase';
import { useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';

export type Habit = {
  id: string; // Changed to string for UUID
  title: string;
  category: string;
  streak_count: number;
  last_completed: string | null;
  user_id: string;
  created_at: string;
};

export default function HabitsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [userHabits, setUserHabits] = useState<Habit[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchHabits = useCallback(async (uid: string) => {
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
    }, []);

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            const currentUser = session?.user;
            setUser(currentUser ?? null);
            if (currentUser) {
                fetchHabits(currentUser.id);
            } else {
                setUserHabits([]);
                setIsLoading(false);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [fetchHabits]);
  
  return (
    <MainAppLayout>
        <HabitsClientPage 
            initialHabits={userHabits} 
            userId={user?.id || null}
            isLoading={isLoading}
            refetchHabits={() => { if(user) fetchHabits(user.id) }}
        />
    </MainAppLayout>
  );
}
