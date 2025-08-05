'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Angry, Annoyed, Frown, Laugh, Meh, Smile as SmileIcon, Tag, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { MoodLog } from './page';
import { supabase } from '@/lib/supabase';

const moodIcons = [
  { icon: Angry, color: 'text-red-400' },
  { icon: Annoyed, color: 'text-orange-400' },
  { icon: Frown, color: 'text-amber-400' },
  { icon: Meh, color: 'text-yellow-400' },
  { icon: SmileIcon, color: 'text-lime-400' },
  { icon: Laugh, color: 'text-green-400' },
];

const moodTags = ['Anxious', 'Happy', 'Grateful', 'Tired', 'Stressed', 'Productive'];


interface MoodClientPageProps {
    initialMoods: MoodLog[];
    userId: string | null;
    isLoading: boolean;
    refetchMoods: () => void;
}

export function MoodClientPage({ initialMoods, userId, isLoading, refetchMoods }: MoodClientPageProps) {
  const [mood, setMood] = useState([5]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
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
  };

  const handleLogMood = async () => {
    if (!userId) {
      toast({ variant: 'destructive', title: 'You must be logged in to log your mood.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('mood_logs').insert({
        user_id: userId,
        mood_score: mood[0],
        tags: selectedTags,
        note: note
      });

      if (error) throw error;
      
      toast({ title: 'Mood Logged!', description: 'Your mood has been saved.' });
      setMood([5]);
      setSelectedTags([]);
      setNote('');
      await awardBadge('mood_starter', 'Mood Starter');
      refetchMoods();
    } catch(error: any) {
      toast({ variant: 'destructive', title: 'Error logging mood', description: error.message });
    }
    setIsSubmitting(false);
  };
  
  const CurrentMoodIcon = moodIcons[Math.floor((mood[0] / 10) * (moodIcons.length - 1))];

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };
  
  return (
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="font-headline text-3xl font-bold text-foreground">Mood Tracker</h1>
          <p className="text-muted-foreground">Log your feelings to understand yourself better.</p>
        </header>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>How are you feeling right now?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <CurrentMoodIcon.icon className={cn("w-20 h-20 transition-colors", CurrentMoodIcon.color)} />
              <Slider value={mood} onValueChange={setMood} max={10} step={1} disabled={isSubmitting || !userId}/>
            </div>
            
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Tag className="w-4 h-4"/> <span>Add tags (optional)</span></div>
                <div className="flex flex-wrap gap-2">
                    {moodTags.map(tag => (
                        <Button key={tag} variant={selectedTags.includes(tag) ? "default" : "outline"} size="sm" onClick={() => toggleTag(tag)} disabled={isSubmitting || !userId}>{tag}</Button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium text-muted-foreground">Add a note (optional)</label>
                <Textarea id="notes" placeholder="What's on your mind?" value={note} onChange={(e) => setNote(e.target.value)} disabled={isSubmitting || !userId} />
            </div>

            <Button className="w-full" onClick={handleLogMood} disabled={isSubmitting || !userId}>
                {isSubmitting ? 'Logging...' : 'Log Mood'}
            </Button>
          </CardContent>
        </Card>

        <section>
          <h2 className="font-headline text-2xl font-bold mb-4">Your Mood History</h2>
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-4">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : initialMoods && initialMoods.length > 0 ? (
              <ul className="divide-y divide-border">
                {initialMoods.map(log => {
                  const LogIcon = moodIcons[Math.floor((log.mood_score / 10) * (moodIcons.length - 1))];
                  return (
                    <li key={log.id} className="p-4 flex items-start gap-4">
                      <LogIcon.icon className={cn("w-10 h-10 mt-1 shrink-0", LogIcon.color)} />
                      <div className="flex-grow">
                        <div className="flex justify-between items-start">
                           <p className="font-semibold text-foreground">Mood level: {log.mood_score}/10</p>
                           <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleDateString()}</p>
                        </div>
                        {log.note && <p className="text-sm text-muted-foreground italic">"{log.note}"</p>}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {log.tags && log.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
              ) : (
                <Card>
                    <CardContent className="p-10 text-center text-muted-foreground">
                       {!userId ? "Please log in to see your mood history." : "You haven't logged your mood yet."}
                    </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
  );
}
