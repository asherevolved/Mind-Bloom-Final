'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import { MoodClientPage } from './mood-client-page';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';

export type MoodLog = {
  _id: string;
  mood_score: number;
  tags: string[];
  note: string;
  createdAt: string; // ISO String
  userId: string;
};


export default function MoodPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userMoods, setUserMoods] = useState<MoodLog[] | null>(null);
  const [sortedMoods, setSortedMoods] = useState<MoodLog[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            setUserId(user.uid);
            // Fetch moods from Supabase here
            // For now, setting to empty array
            setUserMoods([]);
        } else {
            setSortedMoods([]);
        }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if(userMoods) {
      const sorted = [...userMoods].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSortedMoods(sorted as MoodLog[]);
    }
  }, [userMoods]);
  
  return (
    <MainAppLayout>
        <MoodClientPage initialMoods={sortedMoods} userId={userId} />
    </MainAppLayout>
  );
}
