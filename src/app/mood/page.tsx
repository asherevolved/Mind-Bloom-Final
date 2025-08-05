'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import { MoodClientPage } from './mood-client-page';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
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
  const allMoods = useQuery(api.crud.list, userId ? { table: 'mood_logs' } : 'skip');
  const [userMoods, setUserMoods] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            setUserId(user.uid);
        } else {
            setUserMoods([]);
        }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if(userId && allMoods) {
      const sortedMoods = allMoods
        .filter((m: any) => m.userId === userId)
        .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUserMoods(sortedMoods);
    }
  }, [userId, allMoods]);
  
  return (
    <MainAppLayout>
        <MoodClientPage initialMoods={userMoods} userId={userId} />
    </MainAppLayout>
  );
}
