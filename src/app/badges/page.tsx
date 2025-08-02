import { MainAppLayout } from '@/components/main-app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, BookOpen, Check, HandHeart, MessageCircle, Star, Target, ThumbsUp, Trophy, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const badges = [
  { name: 'Welcome Explorer', icon: Star, unlocked: true, criteria: 'Complete the onboarding flow' },
  { name: 'Mood Starter', icon: ThumbsUp, unlocked: true, criteria: 'Log your mood for the first time' },
  { name: 'Therapy Starter', icon: MessageCircle, unlocked: true, criteria: 'Start your first AI chat session' },
  { name: 'Thought Starter', icon: BookOpen, unlocked: true, criteria: 'Write your first journal entry' },
  { name: 'Starter Tasker', icon: Target, unlocked: true, criteria: 'Complete your first task' },
  { name: 'Habit Initiator', icon: Award, unlocked: false, criteria: 'Create your first habit' },
  { name: 'Self-Reflector', icon: Zap, unlocked: false, criteria: 'View your first session analysis' },
  { name: 'Help Seeker', icon: HandHeart, unlocked: false, criteria: 'Visit the crisis help page' },
  { name: 'Mood Streaker', icon: Trophy, unlocked: false, criteria: 'Log your mood for 3 days in a row' },
];

export default function BadgesPage() {
  const unlockedBadges = badges.filter(b => b.unlocked);
  const lockedBadges = badges.filter(b => !b.unlocked);
  
  return (
    <MainAppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="font-headline text-3xl font-bold text-foreground">Your Badges</h1>
          <p className="text-muted-foreground">Celebrate your progress and achievements!</p>
        </header>

        <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unlocked">Unlocked</TabsTrigger>
                <TabsTrigger value="locked">Locked</TabsTrigger>
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
      </div>
    </MainAppLayout>
  );
}

function BadgeGrid({ badgeList }: { badgeList: typeof badges }) {
  if (badgeList.length === 0) {
    return <p className="text-center text-muted-foreground">No badges in this category.</p>;
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
