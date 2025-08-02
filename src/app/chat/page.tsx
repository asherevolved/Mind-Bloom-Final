'use client';

import { useState, useRef, useEffect } from 'react';
import { MainAppLayout } from '@/components/main-app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Mic, MicOff, Send, PhoneOff, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { therapistChat, TherapistChatInput } from '@/ai/flows/therapist-chat';
import { useToast } from '@/hooks/use-toast';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (input.trim()) {
      const newUserMessage: Message = { role: 'user', content: input };
      setMessages(prev => [...prev, newUserMessage]);
      setInput('');
      setIsLoading(true);

      try {
        const chatHistory = messages.slice(-5); // Use last 5 messages for context
        const response = await therapistChat({ message: input, chatHistory });
        const aiMessage: Message = { role: 'assistant', content: response.response };
        setMessages(prev => [...prev, aiMessage]);
      } catch (error) {
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
    if (!isVoiceMode) {
        // TODO: Start recording logic
        setIsRecording(true);
        setInput("Recording... tap mic to stop.")
    } else {
        // TODO: Stop recording logic
        setIsRecording(false);
        setInput("I heard you, processing...")
        // TODO: Transcribe and send
        setTimeout(() => {
          setInput("");
        }, 1500)
    }
  };

  return (
    <MainAppLayout>
      <div className="flex h-[calc(100vh-80px)] flex-col">
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
          <Link href="/analysis" passHref>
            <Button variant="destructive" size="sm">
              <PhoneOff className="mr-2 h-4 w-4" /> End Session
            </Button>
          </Link>
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
                <p>{msg.content}</p>
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

        <footer className="border-t p-4">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder={isRecording ? 'Recording... speak now' : 'Type your message...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
              disabled={isRecording || isLoading}
              className="flex-1"
            />
            <Button size="icon" variant="ghost" onClick={toggleVoiceMode} disabled={isLoading}>
              {isRecording ? <MicOff className="text-destructive" /> : <Mic />}
            </Button>
            <Button size="icon" onClick={handleSend} disabled={!input.trim() || isLoading}>
              <Send />
            </Button>
          </div>
        </footer>
      </div>
    </MainAppLayout>
  );
}
