
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Mic, Send, PhoneOff, User, Trophy, Trash2, Plus, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { analyzeSession } from '@/ai/flows/session-analysis';
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
import { therapistChatStreamFlow } from '@/ai/flows/therapist-chat-stream';
import { MainAppLayout } from '@/components/main-app-layout';

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
  status: 'active' | 'ended';
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
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
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Could not fetch conversations:', error);
      setConversations([]);
    } else {
      setConversations(data as Conversation[]);
      const lastActiveId = localStorage.getItem('activeConversationId');
      if (lastActiveId && data.some(c => c.id === lastActiveId)) {
        setActiveConversationId(lastActiveId);
      } else if (data.length > 0) {
        setActiveConversationId(data[0].id);
      } else {
        setActiveConversationId(null);
        setMessages([]);
      }
    }
    setIsLoadingConversations(false);
  }, []);

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
      setMessages(data.map(m => ({id: m.id, role: m.role as 'user' | 'assistant', content: m.content})));
    }
  }, [toast]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user;
      setUser(currentUser ?? null);
      if (currentUser) {
        const { data } = await supabase.from('profiles').select('therapy_tone').eq('id', currentUser.id).single();
        setTherapyTone(data?.therapy_tone || 'Reflective Listener');
        await fetchConversations(currentUser.id);
      } else {
        // If no user, redirect to login. This page is not for guests.
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
  
  const createNewConversation = async (firstMessage: string): Promise<string | null> => {
      if (!user) return null;
      const title = firstMessage.substring(0, 40) + (firstMessage.length > 40 ? '...' : '');
      const { data, error } = await supabase
        .from('conversations')
        .insert({ title, user_id: user.id })
        .select('id')
        .single();
      
      if (error || !data) {
        console.error('Create conversation error:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not create a new conversation.' });
        return null;
      }
      
      await fetchConversations(user.id);
      return data.id;
  };

  const handleSend = async () => {
    if (!input.trim() || !user || isEndingSession) return;

    const currentInput = input;
    setInput('');

    // Optimistically add user message to UI
    const newUserMessage: Message = { role: 'user', content: currentInput };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    let currentConversationId = activeConversationId;
    
    // Create new conversation if needed
    if (!currentConversationId) {
        const newId = await createNewConversation(currentInput);
        if (!newId) {
             setIsLoading(false);
             setMessages(prev => prev.slice(0, -1)); // Clear optimistic message
             setInput(currentInput); // Restore input
             return;
        };
        currentConversationId = newId;
        setActiveConversationId(newId);
    }
    
    // Save user message in the background. Don't block the AI call.
    supabase.from('messages').insert({ conversation_id: currentConversationId, role: 'user', content: currentInput }).then(({data, error}) => {
        if(error) console.error("Error saving user message:", error);
        else if (data) {
            // Update the optimistic message with the real ID from the DB
            setMessages(prev => prev.map(msg => msg === newUserMessage ? {...msg, id: data?.[0]?.id} : msg));
        }
    });
    
    // Add an empty assistant message to start streaming into.
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
        if (messages.length === 0) {
            await awardBadge('therapy_starter', 'Therapy Starter');
        }

        const chatHistoryForAI = [...messages, newUserMessage].slice(-10).map(m => ({ role: m.role, content: m.content }));
        
        const stream = await therapistChatStreamFlow({ message: currentInput, chatHistory: chatHistoryForAI, therapyTone });
        
        let finalResponse = '';

        for await (const chunk of stream) {
            finalResponse += chunk.chunk;

            setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.role === 'assistant') {
                    lastMessage.content = finalResponse;
                }
                return newMessages;
            });
        }
        
        // After streaming is complete, save the final assistant message
        if (currentConversationId) {
            await supabase.from('messages').insert({ conversation_id: currentConversationId, role: 'assistant', content: finalResponse });
        }

        if (isVoiceMode) {
            const audioResponse = await textToSpeech({ text: finalResponse });
            const audioUrl = audioResponse;
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.role === 'assistant') {
                    lastMessage.audioUrl = audioUrl;
                }
                return newMessages;
            });
            new Audio(audioUrl).play();
            awardBadge('conversationalist', 'Conversationalist');
        }

    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to get response from AI. Please try again.' });
      setMessages(prev => prev.slice(0, -2)); // Remove user message and empty assistant message
      setInput(currentInput);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeConversationId || !user || messages.length === 0) {
      toast({ variant: 'destructive', title: 'Cannot analyze empty chat', description: "Please send a few messages first."});
      return;
    }
    
    setIsEndingSession(true);
    toast({ title: "Ending session...", description: "Please wait while we analyze your conversation." });

    try {
        const { error: updateError } = await supabase
            .from('conversations')
            .update({ status: 'ended', updated_at: new Date().toISOString() })
            .eq('id', activeConversationId);
        if (updateError) throw updateError;
        
        const transcript = messages.map((msg: any) => `${msg.role === 'user' ? 'User' : 'Bloom'}: ${msg.content}`).join('\n');
        
        const analysisResult = await analyzeSession({ transcript });

        const { error: analysisError } = await supabase
            .from('conversation_analyses')
            .insert({
                conversation_id: activeConversationId,
                user_id: user.id,
                summary: analysisResult.emotionalSummary.summaryText,
                mood: { dominantStates: analysisResult.emotionalSummary.dominantStates },
                insights: analysisResult.insights,
                suggestions: analysisResult.suggestedSteps,
            });

        if (analysisError) throw analysisError;

        await awardBadge('self_reflector', 'Self-Reflector');
        sessionStorage.setItem('sessionAnalysis', JSON.stringify(analysisResult));
        
        await fetchConversations(user.id);
        setActiveConversationId(null);
        setMessages([]);

        router.push('/analysis');

    } catch(err) {
        console.error("Failed to end and analyze session:", err);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not finalize the session analysis.' });
        await supabase.from('conversations').update({ status: 'active' }).eq('id', activeConversationId);
    } finally {
        setIsEndingSession(false);
    }
  };
  
  const handleDeleteConversation = async (conversationId: string) => {
      if (!user) return;
      
      // Cascade delete is setup in Supabase, so this deletes messages too.
      const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
      
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete conversation.'});
      } else {
        toast({ title: "Conversation Deleted" });
        // Refetch conversations to update the sidebar
        await fetchConversations(user.id);
        // If the deleted one was active, reset the chat view
        if (activeConversationId === conversationId) {
            setActiveConversationId(null);
            setMessages([]);
        }
      }
  }

  const handleDeleteMessage = async (messageId?: string) => {
    if (!messageId) return;

    // Optimistically remove from UI
    setMessages(prev => prev.filter(m => m.id !== messageId));

    const { error } = await supabase.from('messages').delete().eq('id', messageId);

    if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete message. Please refresh.' });
        // Re-fetch messages to restore state if delete failed
        if (activeConversationId) {
            fetchMessages(activeConversationId);
        }
    }
  };

  return (
    <MainAppLayout>
      <div className="flex-1 grid grid-cols-[auto_1fr] h-[calc(100vh_-_57px)]">
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
                                <button
                                    onClick={() => setActiveConversationId(convo.id)}
                                    className={cn(
                                        "block w-full text-left truncate p-2 rounded-md text-sm transition-colors",
                                        activeConversationId === convo.id ? "bg-primary/20 text-primary-foreground" : "hover:bg-muted"
                                    )}
                                >
                                    {convo.title || "New Conversation"}
                                </button>
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
                                            This will permanently delete this conversation and all of its messages. This action cannot be undone.
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
                    <div className="p-4 text-center text-sm text-muted-foreground">No active conversations.</div>
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
                <Button size="icon" variant={isVoiceMode ? "default" : "outline"} onClick={() => setIsVoiceMode(!isVoiceMode)} disabled={isLoading}><Mic /></Button>
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={messages.length === 0 || !activeConversationId || isEndingSession}>
                        {isEndingSession ? "Analyzing..." : <><PhoneOff className="mr-2"/> End & Analyze</>}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>End your session?</AlertDialogTitle><AlertDialogDescription>This will end the current chat, save the analysis, and start a new chat session.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Continue Chat</AlertDialogCancel><AlertDialogAction onClick={handleEndSession}>End & Analyze</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
            </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-6">
            {!activeConversationId && messages.length === 0 && !isLoading && (
                <div className="text-center text-muted-foreground mt-8 h-full flex flex-col justify-center items-center">
                    <MessageSquare className="mx-auto h-12 w-12" />
                    <p className="mt-2">Start a new conversation or select one from the list.</p>
                </div>
            )}
            {messages.map((msg, index) => (
                <div key={msg.id || index} className={`group flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && <Avatar className="h-8 w-8"><AvatarFallback><Bot /></AvatarFallback></Avatar>}
                
                {msg.role === 'user' && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteMessage(msg.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                )}
                
                <div className={`max-w-xs rounded-lg px-4 py-2 sm:max-w-md lg:max-w-lg ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.audioUrl && <Button variant="ghost" size="icon" className="h-7 w-7 mt-1" onClick={() => new Audio(msg.audioUrl!).play()}><User className="h-4 w-4" /></Button>}
                </div>

                {msg.role === 'user' && <Avatar className="h-8 w-8"><AvatarFallback><User /></AvatarFallback></Avatar>}
                </div>
            ))}
            {isLoading && messages[messages.length -1]?.role === 'assistant' && messages[messages.length -1]?.content === '' && (
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
                disabled={isLoading || isEndingSession || !user}
                className="flex-1"
                />
                <Button size="icon" onClick={handleSend} disabled={!input.trim() || isLoading || isEndingSession || !user}><Send /></Button>
            </div>
            </footer>
        </div>
      </div>
    </MainAppLayout>
  );
}
