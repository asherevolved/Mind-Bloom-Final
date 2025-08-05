'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import {HabitsClientPage} from './habits-client-page';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';

export default function HabitsPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const allHabits = useQuery(api.crud.list, userId ? { table: 'habits' } : 'skip');
    const [userHabits, setUserHabits] = useState([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                setUserHabits([]);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if(userId && allHabits) {
            setUserHabits(allHabits.filter((h: any) => h.userId === userId));
        }
    }, [userId, allHabits]);
  
  return (
    <MainAppLayout>
        <HabitsClientPage initialHabits={userHabits} userId={userId} />
    </MainAppLayout>
  );
}
