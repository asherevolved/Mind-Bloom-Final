'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainAppLayout } from '@/components/main-app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, BarChart3, ClipboardCheck, ArrowRight, MessageSquareQuote, Bot, Trophy, Plus, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { analyzeSession, AnalyzeSessionOutput, AnalyzeSessionInput } from '@/ai/flows/session-analysis';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';


export default function AnalysisPage() {
  const [analysis, setAnalysis] = useState<AnalyzeSessionOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [hasAwardedBadge, setHasAwardedBadge] = useState(false);

  const insertAnalysis = useMutation(api.crud.insert);
  const updateBadge = useMutation(api.crud.update);
  const listBadges = useMutation(api.crud.list);
  const insertTask = useMutation(api.crud.insert);
  const getUser = useMutation(api.crud.get);
  const getSession = useMutation(api.crud.get);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        setUserId(user.uid);
      } else {
        const guestSession = sessionStorage.getItem('sessionData');
        if (!guestSession) {
            router.push('/chat');
        } else {
            setUserId('guest'); // Special id for guest
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    const processSession = async () => {
      const sessionId = sessionStorage.getItem('sessionId');
      let transcript = '';
      let onboardingData: AnalyzeSessionInput['onboardingData'] = {};

      if (userId && userId !== 'guest') {
        const userDoc: any = await getUser({table: 'users', id: userId});
        if (userDoc) {
            onboardingData = {
                moodBaseline: userDoc.moodBaseline,
                supportTags: userDoc.supportTags,
                therapyTone: userDoc.therapyTone,
            };
        }
      }

      if (sessionId && userId && userId !== 'guest') {
        const sessionDoc: any = await getSession({table: 'therapy_sessions', id: sessionId });
        if (!sessionDoc || sessionDoc.userId !== userId) {
          setError('Could not retrieve session data. Please try again.');
          setIsLoading(false);
          return;
        }
        const messages = sessionDoc.messages || [];
        transcript = messages.map((msg: any) => `${msg.role === 'user' ? 'User' : 'Bloom'}: ${msg.content}`).join('\n');
      } else {
        const guestSession = sessionStorage.getItem('sessionData');
        if (guestSession) {
            const messages = JSON.parse(guestSession).messages || [];
            transcript = messages.map((msg: any) => `${msg.role === 'user' ? 'User' : 'Bloom'}: ${msg.content}`).join('\n');
        }
      }

      if (!transcript) {
        setError('No session transcript found. Please start a new chat session.');
        setIsLoading(false);
        return;
      }

      try {
        const result = await analyzeSession({ transcript, onboardingData });
        setAnalysis(result);

        if (userId && userId !== 'guest' && sessionId) {
          const analysisData = {
              userId,
              sessionId,
              summary: result.emotionalSummary.summaryText,
              emotionalInsights: result.insights,
              suggestedSteps: result.suggestedSteps,
              createdAt: new Date().toISOString(),
          };
          await insertAnalysis({ table: 'analysis', data: analysisData });
          await awardBadge('self_reflector', 'Self-Reflector', userId);
        }

      } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to analyze the session: ${errorMessage}`);
      } finally {
        setIsLoading(false);
        sessionStorage.removeItem('sessionId');
        sessionStorage.removeItem('sessionData');
      }
    };

    processSession();
  }, [userId, getUser, getSession, insertAnalysis]);

  const awardBadge = async (code: string, name: string, currentUserId: string) => {
    if (currentUserId === 'guest') return;
    const userBadges: any[] = await listBadges({table: 'badges'}) || [];
    const badgeDoc = userBadges.find(b => b.userId === currentUserId && b.badge_code === code);

    if (!badgeDoc) { 
        await insertAnalysis({table: 'badges', data: {
            userId: currentUserId,
            badge_code: code,
            badge_name: name,
            unlockedAt: new Date().toISOString(),
        }});
        setHasAwardedBadge(true);
        toast({
            title: 'Badge Unlocked!',
            description: `You've earned the "${name}" badge!`,
            action: <Trophy className="h-5 w-5 text-yellow-500" />
        });
    }
  }


  const handleAddTask = async (title: string) => {
    if (!userId || userId === 'guest') {
        toast({ title: 'Task Added!', description: `(Guest) "${title}" has been added to your list. Sign up to save tasks.` });
        return;
    }
    try {
        await insertTask({table: 'tasks', data: {
            userId: userId,
            title: title,
            category: 'AI-Suggested',
            is_completed: false,
            createdAt: new Date().toISOString()
        }});
        toast({
            title: 'Task Added!',
            description: `"${title}" has been added to your list. 💪`,
        });
    } catch(error: any){
        toast({variant: 'destructive', title: 'Error', description: 'Failed to add task.'});
    }
  };

  if (error) {
    return (
      <MainAppLayout>
        <div className="p-8 text-center">
          <Bot className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 text-2xl font-bold">An Error Occurred</h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button onClick={() => router.push('/chat')} className="mt-4">
            <ChevronLeft className="mr-2 h-4 w-4" /> Start New Chat
          </Button>
        </div>
      </MainAppLayout>
    );
  }

  return (
    <MainAppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="font-headline text-3xl font-bold text-foreground">Session Analysis</h1>
          <p className="text-muted-foreground">
            {isLoading ? 'Analyzing your session...' : "Here's a gentle reflection on our chat."}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 /> Emotional Summary</CardTitle>
                <CardDescription>A look at the key feelings from our conversation.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-24 rounded-full" />
                      <Skeleton className="h-8 w-28 rounded-full" />
                    </div>
                  </div>
                ) : analysis ? (
                  <>
                    <p className="font-medium text-foreground mb-3">{analysis.emotionalSummary.summaryText}</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.emotionalSummary.dominantStates.map((state, i) => (
                        <Badge key={i} variant="secondary" className="text-base py-1 px-3">{state}</Badge>
                      ))}
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lightbulb /> Gentle Reflections</CardTitle>
                <CardDescription>Some patterns and insights that seemed to emerge.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="h-5 w-5 rounded-full mt-1" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ))
                ) : analysis ? (
                  analysis.insights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <MessageSquareQuote className="h-5 w-5 text-primary mt-1 shrink-0" />
                      <p className="text-muted-foreground">{insight}</p>
                    </div>
                  ))
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-primary/10 border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ClipboardCheck /> Small Steps You Can Try</CardTitle>
                <CardDescription>Some gentle, actionable ideas based on our chat.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                   Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                       <Skeleton className="h-5 w-3/4" />
                       <Skeleton className="h-4 w-full" />
                       <Skeleton className="h-10 w-full mt-2" />
                    </div>
                  ))
                ) : analysis ? (
                  analysis.suggestedSteps.map((step, i) => (
                    <div key={i} className="space-y-1">
                      <h3 className="font-semibold">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                       <Button size="sm" variant="secondary" className="w-full mt-1" onClick={() => handleAddTask(step.title)}>
                        <Plus className="mr-2 h-4 w-4" /> Add to My Tasks
                      </Button>
                    </div>
                  ))
                ) : null}
              </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>What's Next?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p className="text-muted-foreground mb-3">You're doing great. Let's keep the momentum going.</p>
                    <Link href="/chat">
                      <Button variant="outline" className="w-full">Continue Therapy</Button>
                    </Link>
                    <Link href="/dashboard">
                        <Button className="w-full mt-2">
                            Back to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </CardContent>
             </Card>

             {hasAwardedBadge && (
                <div className="flex justify-center">
                    <Badge variant="outline" className="p-2 px-4 text-sm animate-in fade-in duration-500">
                        <Trophy className="h-4 w-4 mr-2 text-yellow-500"/> You've unlocked the "Self-Reflector" badge!
                    </Badge>
                </div>
             )}
          </div>
        </div>
      </div>
    </MainAppLayout>
  );
}
