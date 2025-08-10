
'use client'

import { MainAppLayout } from '@/components/main-app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Ear, Waves, Wind, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';

const sounds = [
    { name: 'Ocean Waves', icon: Waves, path: '/sounds/Ocean_Waves.m4a' },
    { name: 'Gentle Wind', icon: Wind, path: '/sounds/Wind_Breeze.mp3' }, // Assuming "Gentle Wind" corresponds to "Wind_Breeze.mp3"
    { name: 'White Noise', icon: Ear, path: '/sounds/White_Noise.mp3' },
];

export default function CalmPage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeSoundPath, setActiveSoundPath] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([50]);

  // Correctly initialize the Audio object on the client side
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.loop = true;

    const audio = audioRef.current;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    // Cleanup when component unmounts
    return () => {
      if (audio) {
        audio.pause();
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audioRef.current = null;
      }
    };
  }, []);
  
  // Effect to handle volume changes
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = volume[0] / 100;
    }
  }, [volume]);

  // Effect to play audio when the source changes
  useEffect(() => {
    if (audioRef.current && activeSoundPath) {
      const audio = audioRef.current;
      audio.pause(); // pause current if playing
      audio.src = activeSoundPath;
      audio.load();  // ensure browser processes the new source
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => {
          console.error("Error playing audio:", e);
          setIsPlaying(false);
        });
    } else if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [activeSoundPath]);


  const selectSound = (soundPath: string) => {
    if (activeSoundPath === soundPath) {
      // If the same sound is clicked, toggle play/pause
      togglePlayPause();
    } else {
      // If a new sound is selected, set it as active, which triggers the useEffect
      setActiveSoundPath(soundPath);
    }
  };

  const togglePlayPause = () => {
      if (!audioRef.current) return;
      
      if (isPlaying) {
          audioRef.current.pause();
      } else {
          audioRef.current
            .play()
            .then(() => setIsPlaying(true))
            .catch((e) => {
                console.error("Error playing audio:", e);
                setIsPlaying(false);
            });
      }
  }

  const getSoundName = (path: string | null) => {
    return sounds.find(s => s.path === path)?.name || null;
  }

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
            <CardContent className="flex flex-col gap-4">
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {sounds.map(sound => (
                    <Button 
                        key={sound.name}
                        variant={activeSoundPath === sound.path ? 'default' : 'outline'} 
                        className="h-20 flex-col gap-2"
                        onClick={() => selectSound(sound.path)}
                    >
                        <sound.icon />
                        <span>{sound.name}</span>
                    </Button>
                ))}
              </div>

               {activeSoundPath && (
                <div className="mt-4 p-4 rounded-md border bg-accent/20">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Now Playing</p>
                            <h4 className="font-semibold">{getSoundName(activeSoundPath)}</h4>
                        </div>
                        <Button variant="ghost" size="icon" onClick={togglePlayPause}>
                            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                        {volume[0] > 0 ? <Volume2 className="h-5 w-5"/> : <VolumeX className="h-5 w-5"/>}
                        <Slider
                            defaultValue={[50]}
                            max={100}
                            step={1}
                            value={volume}
                            onValueChange={setVolume}
                            className="w-full"
                        />
                    </div>
                </div>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainAppLayout>
  );
}
