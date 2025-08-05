
'use client'

import { MainAppLayout } from '@/components/main-app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Ear, Waves, Wind } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const sounds = [
    { name: 'Ocean Waves', icon: Waves, path: '/sounds/ocean-waves.mp3' },
    { name: 'Gentle Wind', icon: Wind, path: '/sounds/gentle-wind.mp3' },
    { name: 'White Noise', icon: Ear, path: '/sounds/white-noise.mp3' },
]

export default function CalmPage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeSound, setActiveSound] = useState<string | null>(null);

  useEffect(() => {
    // Initialize audio only once on the client side
    audioRef.current = new Audio();
    audioRef.current.loop = true;

    // Cleanup when component unmounts
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playSound = (soundPath: string) => {
    if (!audioRef.current) return;

    // If the same sound is clicked again, pause it and reset state
    if (activeSound === soundPath) {
      audioRef.current.pause();
      setActiveSound(null);
    } else {
      // Otherwise, set the new sound and play it
      audioRef.current.src = soundPath;
      audioRef.current.play().catch(e => console.error("Error playing audio:", e));
      setActiveSound(soundPath);
    }
  };

  return (
    <MainAppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="font-headline text-3xl font-bold text-foreground">Calming Tools</h1>
          <p className="text-muted-foreground">Find a moment of peace and tranquility.</p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Box Breathing</CardTitle>
              <CardDescription>Follow the animation to regulate your breath.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="relative flex h-48 w-48 items-center justify-center">
                <div className="absolute h-full w-full animate-box-breathing rounded-full bg-primary/20"></div>
                <p className="z-10 text-lg font-semibold text-primary animate-pulse">Breathe</p>
              </div>
              <p className="text-muted-foreground">
                Inhale for 4s, Hold for 4s, Exhale for 4s, Hold for 4s.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Grounding Exercise (5-4-3-2-1)</CardTitle>
              <CardDescription>Connect with the present moment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p><span className="font-bold text-foreground">5.</span> Acknowledge FIVE things you see around you.</p>
              <p><span className="font-bold text-foreground">4.</span> Acknowledge FOUR things you can touch.</p>
              <p><span className="font-bold text-foreground">3.</span> Acknowledge THREE things you can hear.</p>
              <p><span className="font-bold text-foreground">2.</span> Acknowledge TWO things you can smell.</p>
              <p><span className="font-bold text-foreground">1.</span> Acknowledge ONE thing you can taste.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>White Noise & Soundscapes</CardTitle>
              <CardDescription>Listen to calming sounds.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {sounds.map(sound => (
                <Button 
                    key={sound.name}
                    variant={activeSound === sound.path ? 'default' : 'outline'} 
                    className="h-20 flex-col gap-2"
                    onClick={() => playSound(sound.path)}
                >
                    <sound.icon />
                    <span>{sound.name}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainAppLayout>
  );
}
