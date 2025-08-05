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
    const userHabits = useQuery(api.crud.listByUser, userId ? { table: 'habits', userId: userId } : 'skip');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
            }
        });
        return () => unsubscribe();
    }, []);
  
  return (
    <MainAppLayout>
        <HabitsClientPage initialHabits={userHabits || []} userId={userId} />
    </MainAppLayout>
  );
}
