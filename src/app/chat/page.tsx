
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MainAppLayout } from '@/components/main-app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Mic, MicOff, Send, PhoneOff, User, Volume2, Trophy, Trash2, Plus, MessageSquare, Loader2, MoreHorizontal } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import Link from 'next/link';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  id?: string;
};

type Conversation = {
  id: string;
  title: string;
  created_at: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [therapyTone, setTherapyTone] = useState<string | undefined>(undefined);

  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const awardBadge = async (code: string, name: string) => {
    if (!user) return;
    const { data: existingBadge } = await supabase.from('user_badges').select('id').eq('user_id', user.id).eq('badge_code', code).single();
    if (!existingBadge) {
      const { error } = await supabase.from('user_badges').insert({ user_id: user.id, badge_code: code });
      if (!error) {
        toast({ title: 'Badge Unlocked!', description: `You've earned the "${name}" badge!`, action: <Trophy className="h-5 w-5 text-yellow-500" /> });
      }
    }
  };

  const fetchConversations = useCallback(async (currentUserId: string) => {
    setIsLoadingConversations(true);
    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, created_at')
      .eq('user_id', currentUserId)

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch conversations.' });
    } else {
      // Sort on the client side for robustness
      const sortedConversations = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setConversations(sortedConversations);
      const lastActiveId = localStorage.getItem('activeConversationId');
      if (lastActiveId && data.some(c => c.id === lastActiveId)) {
        setActiveConversationId(lastActiveId);
      } else if (sortedConversations.length > 0) {
        setActiveConversationId(sortedConversations[0].id);
      } else {
        setActiveConversationId(null);
        setMessages([]);
      }
    }
    setIsLoadingConversations(false);
  }, [toast]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      setMessages([]);
      return;
    };
    const { data, error } = await supabase
      .from('messages')
      .select('id, role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch messages.' });
      setMessages([]);
    } else {
      setMessages(data as Message[]);
    }
  }, [toast]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user;
      setUser(currentUser ?? null);
      if (currentUser) {
        const { data } = await supabase.from('profiles').select('therapy_tone').eq('id', currentUser.id).single();
        setTherapyTone(data?.therapy_tone || 'Reflective Listener');
        fetchConversations(currentUser.id);
      } else {
        router.push('/');
      }
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, [router, fetchConversations]);

  useEffect(() => {
    if (activeConversationId) {
      localStorage.setItem('activeConversationId', activeConversationId);
      fetchMessages(activeConversationId);
    } else {
      localStorage.removeItem('activeConversationId');
      setMessages([]);
    }
  }, [activeConversationId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
  };
  
  const createNewConversation = async (currentUserId: string, firstMessage: string): Promise<string | null> => {
      const title = firstMessage.substring(0, 40) + (firstMessage.length > 40 ? '...' : '');
      const { data, error } = await supabase
        .from('conversations')
        .insert({ user_id: currentUserId, title })
        .select('id')
        .single();
      
      if (error || !data) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not create a new conversation.' });
        return null;
      }
      
      await fetchConversations(currentUserId);
      return data.id;
  };

  const handleSend = async () => {
    if (!input.trim() || !user) return;

    if (messages.length === 0) awardBadge('therapy_starter', 'Therapy Starter');

    const newUserMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);

    let currentConversationId = activeConversationId;
    
    try {
        if (!currentConversationId) {
            currentConversationId = await createNewConversation(user.id, input);
            if (!currentConversationId) {
                 setIsLoading(false);
                 setMessages([]); // Clear the optimistic user message
                 return;
            };
            setActiveConversationId(currentConversationId);
        }

        // Save user message
        await supabase.from('messages').insert({ conversation_id: currentConversationId, role: 'user', content: input });
        
        const chatHistoryForAI = [...messages, newUserMessage].slice(-10).map(m => ({ role: m.role, content: m.content }));
        const response = await therapistChat({ message: input, chatHistory: chatHistoryForAI, therapyTone });
        
        let audioUrl: string | undefined = undefined;
        if (isVoiceMode) {
            const audioResponse = await textToSpeech({ text: response.response });
            audioUrl = audioResponse;
            awardBadge('conversationalist', 'Conversationalist');
        }

        const aiMessage: Message = { role: 'assistant', content: response.response, audioUrl };
        setMessages(prev => [...prev, aiMessage]);
        
        // Save AI message
        await supabase.from('messages').insert({ conversation_id: currentConversationId, role: 'assistant', content: response.response });
        await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', currentConversationId);

        if (audioUrl) {
            new Audio(audioUrl).play();
        }

    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to get response from AI. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoiceMode = () => {
    setIsVoiceMode(!isVoiceMode);
    toast({ title: `Voice mode ${!isVoiceMode ? 'enabled' : 'disabled'}.` });
  };
  
  const handleEndSession = async () => {
    if (messages.length === 0) {
      toast({ variant: 'destructive', title: 'Cannot analyze empty chat', description: "Please send a few messages first."});
      return;
    }
    // The chat is already saved, so just pass the current message history to analysis.
    sessionStorage.setItem('sessionData', JSON.stringify({ messages }));
    router.push('/analysis');
  };
  
  const handleDeleteConversation = async (conversationId: string) => {
      if (!user) return;
      // Delete messages first due to foreign key constraint
      await supabase.from('messages').delete().eq('conversation_id', conversationId);
      await supabase.from('conversations').delete().eq('id', conversationId);
      
      toast({ title: "Conversation Deleted" });

      if (activeConversationId === conversationId) {
          setActiveConversationId(null);
          setMessages([]);
      }
      await fetchConversations(user.id);
  }

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r bg-background flex flex-col">
        <div className="p-4 border-b">
            <Button className="w-full" onClick={handleNewChat}><Plus className="mr-2"/> New Chat</Button>
        </div>
        <div className="flex-1 overflow-y-auto">
            {isLoadingConversations ? (
                <div className="p-4 space-y-2">
                    {[...Array(5)].map((_, i) => <div key={i} className="h-10 w-full bg-muted rounded animate-pulse" />)}
                </div>
            ) : conversations.length > 0 ? (
                <nav className="p-2">
                    {conversations.map(convo => (
                        <div key={convo.id} className="relative group">
                            <Link href="#"
                                onClick={(e) => { e.preventDefault(); setActiveConversationId(convo.id);}}
                                className={cn(
                                    "block w-full text-left truncate p-2 rounded-md text-sm transition-colors",
                                    activeConversationId === convo.id ? "bg-primary/20 text-primary-foreground" : "hover:bg-muted"
                                )}
                            >
                                {convo.title || "New Conversation"}
                            </Link>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100">
                                        <Trash2 className="h-4 w-4 text-muted-foreground"/>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete this conversation and all of its messages.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteConversation(convo.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    ))}
                </nav>
            ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">No conversations yet.</div>
            )}
        </div>
        <div className="p-4 border-t text-xs text-muted-foreground">Mind Bloom v1.0</div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            <Avatar><AvatarFallback><Bot /></AvatarFallback></Avatar>
            <div>
              <h1 className="font-bold">AI Therapist</h1>
              <p className="text-xs text-green-500">Online</p>
            </div>
          </div>
           <div className="flex items-center gap-2">
            <Button size="icon" variant={isVoiceMode ? "default" : "outline"} onClick={toggleVoiceMode} disabled={isLoading}><Mic /></Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={messages.length === 0}><PhoneOff className="mr-2"/> End & Analyze</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>End your session?</AlertDialogTitle><AlertDialogDescription>This will end the current chat and take you to the analysis page.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Continue Chat</AlertDialogCancel><AlertDialogAction onClick={handleEndSession}>End & Analyze</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-6">
           {!activeConversationId && messages.length === 0 && !isLoading && (
             <div className="text-center text-muted-foreground mt-8 h-full flex flex-col justify-center items-center">
                <MessageSquare className="mx-auto h-12 w-12" />
                <p className="mt-2">Start a new conversation by typing below.</p>
             </div>
           )}
          {messages.map((msg, index) => (
            <div key={msg.id || index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && <Avatar className="h-8 w-8"><AvatarFallback><Bot /></AvatarFallback></Avatar>}
              <div className={`max-w-xs rounded-lg px-4 py-2 sm:max-w-md lg:max-w-lg ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.audioUrl && <Button variant="ghost" size="icon" className="h-7 w-7 mt-1" onClick={() => new Audio(msg.audioUrl!).play()}><Volume2 className="h-4 w-4" /></Button>}
              </div>
              {msg.role === 'user' && <Avatar className="h-8 w-8"><AvatarFallback><User /></AvatarFallback></Avatar>}
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
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
              disabled={isLoading}
              className="flex-1"
            />
            <Button size="icon" onClick={handleSend} disabled={!input.trim() || isLoading}><Send /></Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

    