
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Logo } from '@/components/logo';
import { Angry, Annoyed, Frown, Laugh, Meh, Smile as SmileIcon, Hand, Heart, Brain, Zap, Check, Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';


const totalSteps = 4;

const moodIcons = [
  { icon: Angry, color: 'text-red-500' },
  { icon: Annoyed, color: 'text-orange-500' },
  { icon: Frown, color: 'text-amber-500' },
  { icon: Meh, color: 'text-yellow-500' },
  { icon: SmileIcon, color: 'text-lime-500' },
  { icon: Laugh, color: 'text-green-500' },
];

const supportOptions = [
  { id: 'anxiety', label: 'Anxiety', icon: Zap },
  { id: 'focus', label: 'Focus', icon: Brain },
  { id: 'confidence', label: 'Confidence', icon: Heart },
  { id: 'relationships', label: 'Relationships', icon: Hand },
];

const therapyPersonalities = [
  { id: 'Reflective Listener', title: 'Reflective Listener', description: 'Empathetic and understanding, helps you explore your thoughts.' },
  { id: 'Motivational Coach', title: 'Motivational Coach', description: 'Energetic and encouraging, pushes you towards your goals.' },
  { id: 'Practical Solver', title: 'Practical Solver', description: 'Action-oriented, provides concrete steps and strategies.' },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState([5]);
  const [sleepQuality, setSleepQuality] = useState<string | null>(null);
  const [supportTags, setSupportTags] = useState<string[]>([]);
  const [therapyTone, setTherapyTone] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const guest = sessionStorage.getItem('isGuest') === 'true';
    setIsGuest(guest);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else if (!guest) {
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);


  const CurrentMoodIcon = moodIcons[Math.floor((mood[0] / 10) * (moodIcons.length - 1))];

  const handleNext = () => setStep((s) => Math.min(s + 1, totalSteps));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));
  
  const handleSupportTagChange = (id: string) => {
    setSupportTags(prev => 
      prev.includes(id) ? prev.filter(tag => tag !== id) : [...prev, id]
    );
  };
  
  const awardBadge = async (currentUserId: string, code: string, name: string) => {
    const badgeRef = doc(db, 'users', currentUserId, 'badges', code);
    const badgeDoc = await getDoc(badgeRef);
    if (!badgeDoc.exists()) {
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
    }
  }

  const handleFinish = async () => {
    if (isGuest) {
        sessionStorage.setItem('onboardingComplete', 'true');
        router.push('/dashboard');
        return;
    }

    if (!userId) {
        toast({variant: 'destructive', title: 'Error', description: 'User not found. Please log in again.'});
        router.push('/');
        return;
    }
    
    try {
        const userDocRef = doc(db, 'users', userId);
        
        const onboardingData = {
            moodBaseline: mood[0],
            sleepQuality: sleepQuality,
            supportTags: supportTags,
            therapyTone: therapyTone,
            onboardingComplete: true
        };
        
        await setDoc(userDocRef, onboardingData, { merge: true });

        await awardBadge(userId, 'welcome_explorer', 'Welcome Explorer');

        router.push('/dashboard');
    } catch (error: any) {
        toast({variant: 'destructive', title: 'Onboarding Error', description: error.message});
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <header className="flex flex-col items-center mb-4">
          <Logo />
          <Progress value={(step / totalSteps) * 100} className="w-full mt-4 h-2" />
          <p className="text-sm text-muted-foreground mt-2">Step {step} of {totalSteps}</p>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline text-center">How are you feeling now?</CardTitle>
                  <CardDescription className="text-center">Let's get a baseline for your mood.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-8">
                  <CurrentMoodIcon.icon className={cn("w-24 h-24 transition-colors", CurrentMoodIcon.color)} />
                  <Slider value={mood} onValueChange={setMood} max={10} step={1} />
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline text-center">How did you sleep last night?</CardTitle>
                   <CardDescription className="text-center">Sleep is a cornerstone of mental wellness.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-around">
                  {['Poor', 'Okay', 'Great'].map((quality) => (
                    <Button key={quality} variant={sleepQuality === quality ? 'default' : 'outline'} size="lg" onClick={() => setSleepQuality(quality)}>
                      {quality}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline text-center">What do you want to work on?</CardTitle>
                  <CardDescription className="text-center">Select your main areas of focus.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {supportOptions.map((option) => (
                    <div key={option.id} className="flex items-center space-x-3 rounded-md border p-4 hover:bg-accent/50 has-[[data-state=checked]]:bg-accent">
                      <Checkbox id={option.id} onCheckedChange={() => handleSupportTagChange(option.label)} checked={supportTags.includes(option.label)} />
                      <label htmlFor={option.id} className="flex items-center gap-3 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        <option.icon className="h-6 w-6 text-primary" />
                        {option.label}
                      </label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {step === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline text-center">Choose your therapist's style</CardTitle>
                  <CardDescription className="text-center">How would you like your AI to communicate?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {therapyPersonalities.map((p) => (
                     <Card 
                      key={p.id} 
                      onClick={() => setTherapyTone(p.title)} 
                      className={cn("cursor-pointer transition-all hover:shadow-md", therapyTone === p.title && "border-primary ring-2 ring-primary")}
                    >
                       <CardContent className="p-4 flex items-center justify-between">
                         <div>
                          <h3 className="font-bold">{p.title}</h3>
                          <p className="text-sm text-muted-foreground">{p.description}</p>
                         </div>
                         {therapyTone === p.title && <Check className="h-5 w-5 text-primary" />}
                       </CardContent>
                     </Card>
                  ))}
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
        
        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={handleBack} disabled={step === 1}>
            Back
          </Button>
          {step < totalSteps ? (
            <Button onClick={handleNext}>Next</Button>
          ) : (
            <Button onClick={handleFinish}>Let's Begin!</Button>
          )}
        </div>
      </div>
    </div>
  );
}
