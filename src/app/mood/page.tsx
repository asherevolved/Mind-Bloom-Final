'use client';

import { useState } from 'react';
import { MainAppLayout } from '@/components/main-app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Angry, Annoyed, Frown, Laugh, Meh, Smile as SmileIcon, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const moodIcons = [
  { icon: Angry, color: 'text-red-400' },
  { icon: Annoyed, color: 'text-orange-400' },
  { icon: Frown, color: 'text-amber-400' },
  { icon: Meh, color: 'text-yellow-400' },
  { icon: SmileIcon, color: 'text-lime-400' },
  { icon: Laugh, color: 'text-green-400' },
];

const moodTags = ['Anxious', 'Happy', 'Grateful', 'Tired', 'Stressed', 'Productive'];

const pastMoods = [
    { id: 1, score: 8, tags: ['Happy', 'Productive'], note: 'Had a great day at work!', date: '2024-07-22T10:00:00Z' },
    { id: 2, score: 4, tags: ['Anxious', 'Tired'], note: 'Feeling worried about the upcoming presentation.', date: '2024-07-21T21:30:00Z' },
    { id: 3, score: 6, tags: ['Grateful'], note: '', date: '2024-07-20T18:00:00Z' },
];

export default function MoodPage() {
  const [mood, setMood] = useState([5]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const CurrentMoodIcon = moodIcons[Math.floor((mood[0] / 10) * (moodIcons.length - 1))];

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };
  
  return (
    <MainAppLayout>
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
              <Slider value={mood} onValueChange={setMood} max={10} step={1} />
            </div>
            
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Tag className="w-4 h-4"/> <span>Add tags (optional)</span></div>
                <div className="flex flex-wrap gap-2">
                    {moodTags.map(tag => (
                        <Button key={tag} variant={selectedTags.includes(tag) ? "default" : "outline"} size="sm" onClick={() => toggleTag(tag)}>{tag}</Button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium text-muted-foreground">Add a note (optional)</label>
                <Textarea id="notes" placeholder="What's on your mind?" />
            </div>

            <Button className="w-full">Log Mood</Button>
          </CardContent>
        </Card>

        <section>
          <h2 className="font-headline text-2xl font-bold mb-4">Your Mood History</h2>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {pastMoods.map(log => {
                  const LogIcon = moodIcons[Math.floor((log.score / 10) * (moodIcons.length - 1))];
                  return (
                    <li key={log.id} className="p-4 flex items-start gap-4">
                      <LogIcon.icon className={cn("w-10 h-10 mt-1 shrink-0", LogIcon.color)} />
                      <div className="flex-grow">
                        <div className="flex justify-between items-start">
                           <p className="font-semibold text-foreground">Mood level: {log.score}/10</p>
                           <p className="text-xs text-muted-foreground">{new Date(log.date).toLocaleDateString()}</p>
                        </div>
                        {log.note && <p className="text-sm text-muted-foreground italic">"{log.note}"</p>}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {log.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>
    </MainAppLayout>
  );
}
