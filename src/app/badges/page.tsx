'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Award, BookOpen, Check, HandHeart, MessageCircle, Star, Target, ThumbsUp, Trophy, Zap, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const allBadges = [
  { code: 'welcome_explorer', name: 'Welcome Explorer', icon: Star, criteria: 'Complete the onboarding flow' },
  { code: 'mood_starter', name: 'Mood Starter', icon: ThumbsUp, criteria: 'Log your mood for the first time' },
  { code: 'therapy_starter', name: 'Therapy Starter', icon: MessageCircle, criteria: 'Start your first AI chat session' },
  { code: 'thought_starter', name: 'Thought Starter', icon: BookOpen, criteria: 'Write your first journal entry' },
  { code: 'starter_tasker', name: 'Starter Tasker', icon: Target, criteria: 'Complete your first task' },
  { code: 'habit_initiator', name: 'Habit Initiator', icon: Award, criteria: 'Create your first habit' },
  { code: 'self_reflector', name: 'Self-Reflector', icon: Zap, criteria: 'View your first session analysis' },
  { code: 'help_seeker', name: 'Help Seeker', icon: HandHeart, criteria: 'Visit the crisis help page' },
  { code: 'mood_streaker', name: 'Mood Streaker', icon: Trophy, criteria: 'Log your mood for 3 days in a row' },
  { code: 'conversationalist', name: 'Conversationalist', icon: Bot, criteria: 'Use voice chat for a session' },
];

type Badge = typeof allBadges[0] & { unlocked: boolean };

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserAndBadges = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if(session) {
            const { data: unlockedBadges, error } = await supabase
                .from('badges')
                .select('badge_code')
                .eq('user_id', session.user.id);
            
            if (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your badges.' });
            } else {
                const unlockedCodes = unlockedBadges.map(b => b.badge_code);
                const badgeStatus = allBadges.map(b => ({
                    ...b,
                    unlocked: unlockedCodes.includes(b.code),
                }));
                setBadges(badgeStatus);
            }
        }
        setIsLoading(false);
    }
    fetchUserAndBadges();
  }, [toast]);
  
  const unlockedBadges = badges.filter(b => b.unlocked);
  const lockedBadges = badges.filter(b => !b.unlocked);
  
  return (
    <MainAppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="font-headline text-3xl font-bold text-foreground">Your Badges</h1>
          <p className="text-muted-foreground">Celebrate your progress and achievements!</p>
        </header>
        
        {isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {[...Array(5)].map((_,i) => <Skeleton key={i} className="h-48 w-full" />)}
            </div>
        ) : (
            <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="unlocked">Unlocked ({unlockedBadges.length})</TabsTrigger>
                    <TabsTrigger value="locked">Locked ({lockedBadges.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="mt-6">
                    <BadgeGrid badgeList={badges} />
                </TabsContent>
                <TabsContent value="unlocked" className="mt-6">
                    <BadgeGrid badgeList={unlockedBadges} />
                </TabsContent>
                <TabsContent value="locked" className="mt-6">
                    <BadgeGrid badgeList={lockedBadges} />
                </TabsContent>
            </Tabs>
        )}
      </div>
    </MainAppLayout>
  );
}

function BadgeGrid({ badgeList }: { badgeList: Badge[] }) {
  if (badgeList.length === 0) {
    return <p className="text-center text-muted-foreground py-10">No badges in this category.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {badgeList.map((badge, i) => (
        <Card key={i} className={cn("text-center transition-all", !badge.unlocked && "opacity-50 grayscale")}>
          <CardContent className="p-6 flex flex-col items-center gap-3">
            <div className={cn("relative h-20 w-20 rounded-full flex items-center justify-center bg-accent/30", badge.unlocked && "bg-primary/20")}>
              <badge.icon className={cn("h-10 w-10 text-accent-foreground", badge.unlocked && "text-primary")} />
              {badge.unlocked && (
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white">
                  <Check className="h-4 w-4" />
                </div>
              )}
            </div>
            <h3 className="font-semibold">{badge.name}</h3>
            <p className="text-xs text-muted-foreground">{badge.criteria}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
