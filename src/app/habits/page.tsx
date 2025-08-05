'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import {HabitsClientPage} from './habits-client-page';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';

type Habit = {
  _id: string;
  title: string;
  category: string;
  streak_count: number;
  last_completed: string | null;
  userId: string;
};

export default function HabitsPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const [userHabits, setUserHabits] = useState<Habit[]>([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                // Fetch habits from Supabase here
                // For now, returning empty array
                setUserHabits([]);
            } else {
                setUserHabits([]);
            }
        });
        return () => unsubscribe();
    }, []);
  
  return (
    <MainAppLayout>
        <HabitsClientPage initialHabits={userHabits} userId={userId} />
    </MainAppLayout>
  );
}
