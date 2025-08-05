'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainAppLayout } from '@/components/main-app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Mic, MicOff, Send, PhoneOff, User, Volume2, Trophy } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { therapistChat } from '@/ai/flows/therapist-chat';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [therapyTone, setTherapyTone] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();


  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user;
      setUser(currentUser ?? null);
      if (currentUser) {
        setIsGuest(false);
        const { data } = await supabase
            .from('profiles')
            .select('therapy_tone')
            .eq('id', currentUser.id)
            .single();
        setTherapyTone(data?.therapy_tone || 'Reflective Listener');
      } else {
        const guestSession = sessionStorage.getItem('isGuest') === 'true';
        if (guestSession) {
          setIsGuest(true);
          setTherapyTone('Reflective Listener');
        } else {
          router.push('/');
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const awardBadge = async (code: string, name: string) => {
    if (!user) return;

    const { data: existingBadge } = await supabase
        .from('user_badges')
        .select('id')
        .eq('user_id', user.id)
        .eq('badge_code', code)
        .single();
    
    if (!existingBadge) {
        const { error } = await supabase
            .from('user_badges')
            .insert({ user_id: user.id, badge_code: code });

        if (!error) {
            toast({
                title: 'Badge Unlocked!',
                description: `You've earned the "${name}" badge!`,
                action: <Trophy className="h-5 w-5 text-yellow-500" />
            });
        }
    }
  }


  const handleSend = async () => {
    if (input.trim()) {
      if (messages.length === 0) {
        awardBadge('therapy_starter', 'Therapy Starter');
      }

      const newUserMessage: Message = { role: 'user', content: input };
      const newMessages = [...messages, newUserMessage];
      setMessages(newMessages);
      setInput('');
      setIsLoading(true);

      try {
        const chatHistory = newMessages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
        }));
        const response = await therapistChat({ message: input, chatHistory, therapyTone });
        
        let audioUrl: string | undefined = undefined;
        if(isVoiceMode) {
          const audioResponse = await textToSpeech({ text: response.response });
          audioUrl = audioResponse;
          awardBadge('conversationalist', 'Conversationalist');
        }

        const aiMessage: Message = { role: 'assistant', content: response.response, audioUrl };
        setMessages(prev => [...prev, aiMessage]);

        if (audioUrl) {
            const audio = new Audio(audioUrl);
            audio.play();
        }

      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to get response from AI. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleVoiceMode = () => {
    setIsVoiceMode(!isVoiceMode);
    toast({
        title: `Voice mode ${!isVoiceMode ? 'enabled' : 'disabled'}.`,
        description: !isVoiceMode ? 'Replies will now be spoken aloud.' : 'Replies will be text only.'
    });
  };
  
  const handleEndSession = async () => {
    if (messages.length === 0) {
      router.push('/dashboard');
      return;
    }
    
    sessionStorage.setItem('sessionData', JSON.stringify({ messages }));
    router.push('/analysis');
  };

  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play();
  };

  return (
    <MainAppLayout>
      <div className="flex h-[calc(100vh-57px)] flex-col">
        <header className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback><Bot /></AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-bold">AI Therapist</h1>
              <p className="text-xs text-green-500">Online</p>
            </div>
          </div>
           <div className="flex items-center gap-2">
            <Button size="icon" variant={isVoiceMode ? "default" : "outline"} onClick={toggleVoiceMode} disabled={isLoading}>
                {isVoiceMode ? <Mic /> : <MicOff />}
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                    <PhoneOff className="mr-2 h-4 w-4" /> End Session
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>End your session?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will end the current chat session and take you to the analysis page.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Continue Chat</AlertDialogCancel>
                    <AlertDialogAction onClick={handleEndSession}>End Session & Analyze</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-6">
           {messages.length === 0 && (
             <div className="text-center text-muted-foreground mt-8">
                <Bot className="mx-auto h-12 w-12" />
                <p className="mt-2">Hello! I'm here to listen. What's on your mind today?</p>
             </div>
           )}
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback><Bot /></AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-xs rounded-lg px-4 py-2 sm:max-w-md lg:max-w-lg ${
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.audioUrl && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 mt-1" onClick={() => playAudio(msg.audioUrl!)}>
                        <Volume2 className="h-4 w-4" />
                    </Button>
                )}
              </div>
               {msg.role === 'user' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback><User /></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-end gap-2 justify-start">
               <Avatar className="h-8 w-8"><AvatarFallback><Bot /></AvatarFallback></Avatar>
               <div className="rounded-lg px-4 py-2 bg-muted flex items-center gap-1">
                  <span className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce"></span>
               </div>
            </div>
          )}
           <div ref={messagesEndRef} />
        </main>

        <footer className="border-t p-4 bg-background">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder={'Type your message...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
              disabled={isLoading}
              className="flex-1"
            />
            <Button size="icon" onClick={handleSend} disabled={!input.trim() || isLoading}>
              <Send />
            </Button>
          </div>
        </footer>
      </div>
    </MainAppLayout>
  );
}
