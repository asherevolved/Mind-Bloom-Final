'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Book, Plus, Tag } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';

const pastEntries = [
  {
    id: 1,
    title: 'A Moment of Clarity',
    mood: 'Grateful',
    date: 'July 21, 2024',
    content: 'Today felt different. I went for a walk without my phone and just noticed the world around me. The sun on my skin, the sound of birds... it was simple, but it made me feel incredibly present and grateful for the small things. I need to do this more often.'
  },
  {
    id: 2,
    title: 'Feeling Overwhelmed',
    mood: 'Anxious',
    date: 'July 19, 2024',
    content: 'Work has been piling up and I feel like I\'m drowning. I keep telling myself I can handle it, but inside I\'m panicking. Writing this down is the first time I\'ve admitted it, even to myself.'
  }
];

export default function JournalPage() {
  return (
    <MainAppLayout>
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
            <Input placeholder="Entry Title" />
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Mood Tag (e.g., Happy, Reflective)" className="pl-9" />
            </div>
            <Textarea placeholder="Write your thoughts here..." rows={6} />
            <Button className="w-full">Save Entry</Button>
          </CardContent>
        </Card>

        <section>
          <h2 className="font-headline text-2xl font-bold mb-4">Past Entries</h2>
          <Accordion type="single" collapsible className="w-full space-y-2">
            {pastEntries.map(entry => (
              <AccordionItem key={entry.id} value={`item-${entry.id}`} className="border-b-0">
                <Card>
                  <AccordionTrigger className="p-4 hover:no-underline">
                    <div className="flex-1 text-left">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-foreground">{entry.title}</h3>
                        <p className="text-xs text-muted-foreground hidden sm:block">{entry.date}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                         <Badge variant="secondary">{entry.mood}</Badge>
                         <p className="text-xs text-muted-foreground sm:hidden">{entry.date}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 pt-0">
                    <p className="text-muted-foreground whitespace-pre-wrap">{entry.content}</p>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </div>
    </MainAppLayout>
  );
}
