'use client';

import { MainAppLayout } from '@/components/main-app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HeartPulse, MapPin, Phone, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';


export default function CrisisPage() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string|null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const awardBadge = async () => {
        if (!userId) return;

        const badgeCode = 'help_seeker';
        
        const { data: existingBadge } = await supabase
            .from('user_badges')
            .select('id')
            .eq('user_id', userId)
            .eq('badge_code', badgeCode)
            .single();

        if (!existingBadge) {
            const { error } = await supabase
                .from('user_badges')
                .insert({ user_id: userId, badge_code: badgeCode });
            if (!error) {
                toast({
                    title: 'Badge Unlocked!',
                    description: `You've earned the "Help Seeker" badge. It's okay to ask for help.`,
                    action: <Trophy className="h-5 w-5 text-yellow-500" />
                });
            }
        }
    };

    awardBadge();
  }, [userId, toast]);


  return (
    <MainAppLayout>
      <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center bg-background p-4 text-center">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader>
            <CardTitle className="font-headline text-3xl text-destructive">
              Need Urgent Help?
            </CardTitle>
            <CardDescription>
              If you are in a crisis or any other person may be in danger, please use these resources immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <a href="tel:988" className="block">
              <Button className="w-full h-16 text-lg" variant="destructive">
                <Phone className="mr-4 h-6 w-6" /> Call 988 Crisis Line
              </Button>
            </a>
             <a href="https://www.google.com/maps/search/therapists+near+me" target="_blank" rel="noopener noreferrer" className="block">
              <Button className="w-full h-16 text-lg" variant="outline">
                <MapPin className="mr-4 h-6 w-6" /> Find Help Near Me
              </Button>
            </a>
            <Link href="/calm" className="block">
              <Button className="w-full h-16 text-lg" variant="secondary">
                <HeartPulse className="mr-4 h-6 w-6" /> Use a Calming Tool
              </Button>
            </Link>
          </CardContent>
        </Card>
        <p className="mt-8 text-sm text-muted-foreground">
            Remember, it's okay to ask for help. You are not alone.
        </p>
      </div>
    </MainAppLayout>
  );
}
