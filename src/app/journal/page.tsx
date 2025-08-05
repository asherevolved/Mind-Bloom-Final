'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import { JournalClientPage } from './journal-client-page';
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
    const [userEntries, setUserEntries] = useState<JournalEntry[]>([]);
    const [sortedEntries, setSortedEntries] = useState<JournalEntry[]>([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                // Fetch entries from Supabase here.
                // For now, setting to empty array.
                setUserEntries([]);
            } else {
                setSortedEntries([]);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if(userEntries) {
            const sorted = [...userEntries].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setSortedEntries(sorted as JournalEntry[]);
        }
    }, [userEntries]);
  
  return (
    <MainAppLayout>
        <JournalClientPage initialEntries={sortedEntries} userId={userId} />
    </MainAppLayout>
  );
}
