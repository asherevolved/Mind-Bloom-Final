'use client';

import { useState } from 'react';
import { MainAppLayout } from '@/components/main-app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Mic, MicOff, Send, PhoneOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';

type Message = {
  sender: 'user' | 'ai';
  text: string;
};

const initialMessages: Message[] = [
  { sender: 'ai', text: "Hello! I'm here to listen. What's on your mind today?" },
  { sender: 'user', text: "I've been feeling really overwhelmed with work lately." },
  { sender: 'ai', text: "I understand. It sounds like you're under a lot of pressure. Can you tell me more about what's been making you feel overwhelmed?" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { sender: 'user', text: input }]);
      // Simulate AI response
      setTimeout(() => {
        setMessages(prev => [...prev, { sender: 'ai', text: 'Thank you for sharing. Let\'s explore that further.' }]);
      }, 1000);
      setInput('');
    }
  };

  return (
    <MainAppLayout>
      <div className="flex h-screen flex-col">
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
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'ai' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback><Bot /></AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-xs rounded-lg px-4 py-2 sm:max-w-md lg:max-w-lg ${
                  msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                <p>{msg.text}</p>
              </div>
            </div>
          ))}
          {/* Typing indicator simulation */}
          {/* <div className="flex items-end gap-2 justify-start">
             <Avatar className="h-8 w-8"><AvatarFallback><Bot /></AvatarFallback></Avatar>
             <div className="rounded-lg px-4 py-2 bg-muted flex items-center gap-1">
                <span className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce"></span>
             </div>
          </div> */}
        </main>

        <footer className="border-t p-4">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder={isVoiceMode ? 'Recording... speak now' : 'Type your message...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              disabled={isVoiceMode}
              className="flex-1"
            />
            <Button size="icon" variant="ghost" onClick={() => setIsVoiceMode(!isVoiceMode)}>
              {isVoiceMode ? <MicOff /> : <Mic />}
            </Button>
            <Button size="icon" onClick={handleSend} disabled={!input.trim()}>
              <Send />
            </Button>
          </div>
        </footer>
      </div>
    </MainAppLayout>
  );
}
