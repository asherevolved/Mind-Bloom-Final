

import { MainAppLayout } from '@/components/main-app-layout';
import { JournalClientPage } from './journal-client-page';
import { cookies } from 'next/headers';
import { auth, db } from '@/lib/firebase-admin';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';


export type JournalEntry = {
  id: string;
  title: string;
  mood_tag: string;
  created_at: string; // ISO string
  entry: string;
};

async function getJournalEntries(userId: string): Promise<JournalEntry[]> {
    if(!userId) return [];
    
    try {
        const journalRef = collection(db, 'users', userId, 'journal');
        const q = query(journalRef, orderBy('createdAt', 'desc'));
        const journalSnapshot = await getDocs(q);
        
        return journalSnapshot.docs.map(doc => {
            const data = doc.data();
            const createdAtTimestamp = data.createdAt as Timestamp;
            return {
                id: doc.id,
                title: data.title,
                mood_tag: data.mood_tag,
                created_at: createdAtTimestamp.toDate().toISOString(),
                entry: data.entry,
            };
        });
    } catch (error) {
        console.error("Error fetching journal entries from Firestore:", error);
        return [];
    }
}

export default async function JournalPage() {
    let userId: string | null = null;
    let entries: JournalEntry[] = [];
    
    try {
        const cookieStore = cookies();
        const idToken = cookieStore.get('idToken')?.value;
        if (idToken) {
            const decodedToken = await auth.verifyIdToken(idToken);
            userId = decodedToken.uid;
            entries = await getJournalEntries(userId);
        }
    } catch(error){
        console.log("Could not authenticate user on server", error);
    }
  
  return (
    <MainAppLayout>
        <JournalClientPage initialEntries={entries} userId={userId} />
    </MainAppLayout>
  );
}

    
