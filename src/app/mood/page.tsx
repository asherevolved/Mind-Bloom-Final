

import { MainAppLayout } from '@/components/main-app-layout';
import { MoodClientPage } from './mood-client-page';
import { cookies } from 'next/headers';
import { auth, db } from '@/lib/firebase-admin';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';


export type MoodLog = {
  id: string;
  mood_score: number;
  tags: string[];
  note: string;
  created_at: string; // ISO String
};

async function getMoods(userId: string): Promise<MoodLog[]> {
    if(!userId) return [];
    
    try {
        const moodsRef = collection(db, 'users', userId, 'mood_logs');
        const q = query(moodsRef, orderBy('createdAt', 'desc'));
        const moodsSnapshot = await getDocs(q);

        return moodsSnapshot.docs.map(doc => {
            const data = doc.data();
            const createdAtTimestamp = data.createdAt as Timestamp;
            return {
                id: doc.id,
                mood_score: data.mood_score,
                tags: data.tags || [],
                note: data.note || '',
                created_at: createdAtTimestamp.toDate().toISOString(),
            };
        });
    } catch(error) {
        console.error('Error fetching moods from Firestore:', error);
        return [];
    }
}


export default async function MoodPage() {
  let userId: string | null = null;
  let pastMoods: MoodLog[] = [];

  try {
      const cookieStore = cookies();
      const idToken = cookieStore.get('idToken')?.value;
      if (idToken) {
          const decodedToken = await auth.verifyIdToken(idToken);
          userId = decodedToken.uid;
          pastMoods = await getMoods(userId);
      }
  } catch(error) {
      console.log("Could not authenticate user on server", error);
  }
  
  return (
    <MainAppLayout>
        <MoodClientPage initialMoods={pastMoods} userId={userId} />
    </MainAppLayout>
  );
}

    
