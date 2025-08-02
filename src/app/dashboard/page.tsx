import { MainAppLayout } from '@/components/main-app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Bot, Book, ListTodo, Smile, Sparkles, Trophy } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <MainAppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="font-headline text-3xl font-bold text-foreground">
            Hello, Explorer!
          </h1>
          <p className="text-muted-foreground">Here's your wellness snapshot for today.</p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Card className="col-span-1 sm:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="text-primary" />
                <span>AI-Powered Tip</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">"Taking a few deep breaths can be a powerful anchor in a stormy mind. Try a 2-minute box breathing exercise now."</p>
               <Link href="/calm">
                <Button variant="link" className="px-0">Try now <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Smile /><span>Today's Mood</span></CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-2">Not logged yet.</p>
              <Link href="/mood">
                <Button className="w-full">Log Mood</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ListTodo /><span>Tasks Today</span></CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">3 <span className="text-base font-normal text-muted-foreground">/ 5 tasks left</span></p>
               <Link href="/tasks">
                <Button variant="outline" size="sm" className="mt-2">View Tasks <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Trophy /><span>Badges</span></CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">5 <span className="text-base font-normal text-muted-foreground">unlocked</span></p>
              <Link href="/badges">
                <Button variant="outline" size="sm" className="mt-2">View Badges <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bot /><span>AI Therapist</span></CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-2">Ready to listen. Start a new session anytime.</p>
              <Link href="/chat">
                <Button className="w-full">Start Chat</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Book /><span>Last Journal Entry</span></CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground truncate italic">"Feeling a bit overwhelmed today, but trying to focus on small wins..."</p>
              <Link href="/journal">
                <Button variant="outline" size="sm" className="mt-2">View Journal <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">🔥 Habit Streaks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Morning Meditation</span>
                <Badge variant="secondary">4 days</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Evening Walk</span>
                <Badge variant="secondary">12 days</Badge>
              </div>
              <Link href="/habits">
                <Button variant="outline" size="sm" className="mt-2">View Habits <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainAppLayout>
  );
}
