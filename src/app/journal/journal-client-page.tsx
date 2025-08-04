
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Tag, Trophy } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { JournalEntry } from './page';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';


interface JournalClientPageProps {
    initialEntries: JournalEntry[];
    userId: string | null;
}

export function JournalClientPage({ initialEntries, userId }: JournalClientPageProps) {
  const [title, setTitle] = useState('');
  const [moodTag, setMoodTag] = useState('');
  const [entry, setEntry] = useState('');
  const [pastEntries, setPastEntries] = useState<JournalEntry[]>(initialEntries);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  
  const handleSaveEntry = async () => {
    if (!userId) {
        toast({ variant: 'destructive', title: 'You must be logged in to save entries.'});
        return;
    }
    if (!title || !entry) {
        toast({ variant: 'destructive', title: 'Missing fields', description: 'Please provide a title and entry.' });
        return;
    }
    
    setIsLoading(true);
    try {
        const docRef = await addDoc(collection(db, 'users', userId, 'journal'), {
            title,
            mood_tag: moodTag,
            entry,
            createdAt: serverTimestamp()
        });
        
        const newEntry = {
            id: docRef.id,
            title,
            mood_tag: moodTag,
            entry,
            created_at: new Date().toISOString() // Approximate client-side time
        };

        toast({ title: 'Entry Saved!', description: 'Your journal has been updated.'});
        setPastEntries([newEntry, ...pastEntries]);
        setTitle('');
        setMoodTag('');
        setEntry('');
        await checkBadges();
        router.refresh();

    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Error saving entry', description: error.message});
    }
    setIsLoading(false);
  }
  
  const checkBadges = async () => {
      if (!userId) return;

      const badgeCode = 'thought_starter';
      const badgeRef = doc(db, 'users', userId, 'badges', badgeCode);
      const badgeDoc = await getDoc(badgeRef);

      if (!badgeDoc.exists()) {
          // In a real app you might check if entry count is 1
          await awardBadge(badgeCode, 'Thought Starter');
      }
  }

  const awardBadge = async (code: string, name: string) => {
    if (!userId) return;
    try {
        const badgeRef = doc(db, 'users', userId, 'badges', code);
        await setDoc(badgeRef, {
            badge_code: code,
            badge_name: name,
            unlockedAt: serverTimestamp(),
        });

        toast({
            title: 'Badge Unlocked!',
            description: `You've earned the "${name}" badge!`,
            action: <Trophy className="h-5 w-5 text-yellow-500" />
        });

    } catch (error: any) {
        // Don't bother user if badge award fails
        console.error("Failed to award badge", error);
    }
  }


  return (
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="font-headline text-3xl font-bold text-foreground">My Journal</h1>
          <p className="text-muted-foreground">A safe space for your thoughts and reflections.</p>
        </header>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plus /> New Entry</CardTitle>
            <CardDescription>What's on your mind today?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Entry Title" value={title} onChange={e => setTitle(e.target.value)} disabled={isLoading} />
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Mood Tag (e.g., Happy, Reflective)" className="pl-9" value={moodTag} onChange={e => setMoodTag(e.target.value)} disabled={isLoading} />
            </div>
            <Textarea placeholder="Write your thoughts here..." rows={6} value={entry} onChange={e => setEntry(e.target.value)} disabled={isLoading} />
            <Button className="w-full" onClick={handleSaveEntry} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Entry'}
            </Button>
          </CardContent>
        </Card>

        <section>
          <h2 className="font-headline text-2xl font-bold mb-4">Past Entries</h2>
          {isLoading && pastEntries.length === 0 ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
          ) : (
            <Accordion type="single" collapsible className="w-full space-y-2">
                {pastEntries.map(entry => (
                <AccordionItem key={entry.id} value={`item-${entry.id}`} className="border-b-0">
                    <Card>
                    <AccordionTrigger className="p-4 hover:no-underline">
                        <div className="flex-1 text-left">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-foreground">{entry.title}</h3>
                            <p className="text-xs text-muted-foreground hidden sm:block">{new Date(entry.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            {entry.mood_tag && <Badge variant="secondary">{entry.mood_tag}</Badge>}
                            <p className="text-xs text-muted-foreground sm:hidden">{new Date(entry.created_at).toLocaleDateString()}</p>
                        </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                        <p className="text-muted-foreground whitespace-pre-wrap">{entry.entry}</p>
                    </AccordionContent>
                    </Card>
                </AccordionItem>
                ))}
            </Accordion>
          )}
           {!isLoading && pastEntries.length === 0 && (
                <Card>
                    <CardContent className="p-10 text-center text-muted-foreground">
                        You haven't written any journal entries yet.
                    </CardContent>
                </Card>
            )}
        </section>
      </div>
  );
}
    
