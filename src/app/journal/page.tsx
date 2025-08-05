'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import { JournalClientPage } from './journal-client-page';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';

export type JournalEntry = {
  _id: string;
  title: string;
  mood_tag: string;
  createdAt: string; // ISO string
  entry: string;
  userId: string;
};

export default function JournalPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const allEntries = useQuery(api.crud.list, { table: 'journal' }) || [];
    const [userEntries, setUserEntries] = useState([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if(userId && allEntries) {
            setUserEntries(allEntries.filter((e: any) => e.userId === userId));
        }
    }, [userId, allEntries]);
  
  return (
    <MainAppLayout>
        <JournalClientPage initialEntries={userEntries} userId={userId} />
    </MainAppLayout>
  );
}
