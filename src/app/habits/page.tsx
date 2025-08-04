

import { MainAppLayout } from '@/components/main-app-layout';
import { isToday, subDays } from 'date-fns';
import {HabitsClientPage} from './habits-client-page';
import { cookies } from 'next/headers';
import { auth, db } from '@/lib/firebase-admin'; // Using admin SDK for server-side
import { collection, getDocs, query, orderBy } from 'firebase/firestore';


type Habit = {
  id: string;
  title: string;
  category: string;
  streak_count: number;
  last_completed: string | null;
  userId: string;
};

// This function now uses Firebase Admin SDK to fetch data on the server
async function getHabits(userId: string): Promise<Habit[]> {
    if(!userId) return [];

    try {
        const habitsRef = collection(db, 'users', userId, 'habits');
        const q = query(habitsRef, orderBy('createdAt', 'desc'));
        const habitsSnapshot = await getDocs(q);

        if (habitsSnapshot.empty) {
            return [];
        }

        const habits = habitsSnapshot.docs.map(doc => {
            const data = doc.data();
            const lastCompleted = data.last_completed ? new Date(data.last_completed) : null;
            
            // Streak logic
            let streak = data.streak_count || 0;
            if (lastCompleted && !isToday(lastCompleted) && !isToday(subDays(lastCompleted, -1))) {
                streak = 0; // Reset streak if not completed yesterday or today
            }

            return {
                id: doc.id,
                title: data.title,
                category: data.category,
                streak_count: streak,
                last_completed: data.last_completed,
                userId: userId,
            }
        });
        
        return habits;

    } catch (error) {
        console.error("Error fetching habits with Admin SDK:", error);
        return [];
    }
}


export default async function HabitsPage() {
    let userId: string | null = null;
    let habits: Habit[] = [];

    // This block is a common pattern for getting the authenticated user on the server
    try {
        const cookieStore = cookies();
        const idToken = cookieStore.get('idToken')?.value;
        if (idToken) {
            const decodedToken = await auth.verifyIdToken(idToken);
            userId = decodedToken.uid;
            habits = await getHabits(userId);
        }
    } catch(error){
        // User not logged in or session expired
        console.log("Could not authenticate user on server", error);
    }


  return (
    <MainAppLayout>
        <HabitsClientPage initialHabits={habits} userId={userId} />
    </MainAppLayout>
  );
}
    
