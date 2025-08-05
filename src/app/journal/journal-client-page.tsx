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
import { supabase } from '@/lib/supabase';

interface JournalClientPageProps {
    initialEntries: JournalEntry[];
    userId: string | null;
    isLoading: boolean;
    refetchEntries: () => void;
}

export function JournalClientPage({ initialEntries, userId, isLoading, refetchEntries }: JournalClientPageProps) {
  const [title, setTitle] = useState('');
  const [moodTag, setMoodTag] = useState('');
  const [entry, setEntry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const awardBadge = async (code: string, name: string) => {
    if (!userId) return;

    const { data: existingBadge } = await supabase
        .from('user_badges')
        .select('id')
        .eq('user_id', userId)
        .eq('badge_code', code)
        .single();
    
    if (!existingBadge) {
        const { error } = await supabase
            .from('user_badges')
            .insert({ user_id: userId, badge_code: code });

        if (!error) {
            toast({
                title: 'Badge Unlocked!',
                description: `You've earned the "${name}" badge!`,
                action: <Trophy className="h-5 w-5 text-yellow-500" />
            });
        }
    }
  }

  const handleSaveEntry = async () => {
    if (!userId) {
        toast({ variant: 'destructive', title: 'You must be logged in to save entries.'});
        return;
    }
    if (!title || !entry) {
        toast({ variant: 'destructive', title: 'Missing fields', description: 'Please provide a title and entry.' });
        return;
    }
    
    setIsSubmitting(true);
    try {
        const { error } = await supabase.from('journal_entries').insert({
            user_id: userId,
            title,
            entry,
            mood_tag: moodTag || null
        });

        if (error) throw error;
        
        toast({ title: 'Entry Saved!', description: 'Your journal has been updated.'});
        setTitle('');
        setMoodTag('');
        setEntry('');
        await awardBadge('thought_starter', 'Thought Starter');
        refetchEntries();
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Error saving entry', description: error.message});
    }
    setIsSubmitting(false);
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
            <Input placeholder="Entry Title" value={title} onChange={e => setTitle(e.target.value)} disabled={isSubmitting} />
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Mood Tag (e.g., Happy, Reflective)" className="pl-9" value={moodTag} onChange={e => setMoodTag(e.target.value)} disabled={isSubmitting} />
            </div>
            <Textarea placeholder="Write your thoughts here..." rows={6} value={entry} onChange={e => setEntry(e.target.value)} disabled={isSubmitting} />
            <Button className="w-full" onClick={handleSaveEntry} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Entry'}
            </Button>
          </CardContent>
        </Card>

        <section>
          <h2 className="font-headline text-2xl font-bold mb-4">Past Entries</h2>
          {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
          ) : (
            <Accordion type="single" collapsible className="w-full space-y-2">
                {initialEntries.map(entry => (
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
           {!isLoading && initialEntries.length === 0 && (
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
