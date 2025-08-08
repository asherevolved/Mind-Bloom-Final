
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, PhoneOff, User, Trophy, Trash2, Plus, MessageSquare } from 'lucide-react';
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
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';
import { MainAppLayout } from '@/components/main-app-layout';
import type { ChatMessage, Conversation } from '@/ai/flows/chat.types';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);

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
        await fetchConversations(currentUser.id);
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

  const handleSend = async () => {
    if (!input.trim() || !user) return;
  
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    const isNewConversation = !activeConversationId;

    const newUserMessage: ChatMessage = { role: 'user', content: currentInput, id: `local-user-${Date.now()}` };
    setMessages(prev => [...prev, newUserMessage]);
    
    const assistantMessageId = `local-assistant-${Date.now()}`;
    setMessages(prev => [...prev, { role: 'assistant', content: '', id: assistantMessageId }]);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("User is not authenticated.");
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message: currentInput,
          conversationId: activeConversationId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'The AI failed to respond.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let finalResponse = '';
      let receivedMetadata = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        let chunk = decoder.decode(value, { stream: true });
        
        const metadataPrefix = '{"metadata":';
        const endOfMetadata = '}\n\n';
        if (isNewConversation && !receivedMetadata && chunk.startsWith(metadataPrefix)) {
            const endOfJson = chunk.indexOf(endOfMetadata);
            if (endOfJson !== -1) {
              try {
                const metadataStr = chunk.substring(0, endOfJson + 1);
                const { metadata } = JSON.parse(metadataStr);
                
                if (metadata.conversationId) {
                    setActiveConversationId(metadata.conversationId);
                    await awardBadge('therapy_starter', 'Therapy Starter');
                }
                
                if (metadata.userMessageId) {
                    setMessages(prev => prev.map(msg => 
                        msg.id === newUserMessage.id ? {...msg, id: metadata.userMessageId } : msg
                    ));
                }

                chunk = chunk.substring(endOfJson + endOfMetadata.length);
                receivedMetadata = true;
              } catch (e) {
                  console.error("Error parsing metadata chunk:", e);
              }
            }
        }

        finalResponse += chunk;

        setMessages(prev => {
            return prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: finalResponse } 
                : msg
            );
        });
      }
      
      const convoIdToSave = activeConversationId;
      if (convoIdToSave) {
         await supabase.from('messages').insert({ conversation_id: convoIdToSave, role: 'assistant', content: finalResponse });
         if (isNewConversation) {
            await fetchConversations(user.id);
         }
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast({ title: 'Stream Canceled' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to get response from AI.' });
        setMessages(prev => prev.filter(m => m.id !== newUserMessage.id && m.id !== assistantMessageId));
        setInput(currentInput);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
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
        if(activeConversationId) {
            await supabase.from('conversations').update({ status: 'active' }).eq('id', activeConversationId);
        }
    } finally {
        setIsEndingSession(false);
    }
  };
  
  const handleDeleteConversation = async (conversationId: string) => {
      if (!user) return;
      
      const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
      
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete conversation.'});
      } else {
        toast({ title: "Conversation Deleted" });
        await fetchConversations(user.id);
        if (activeConversationId === conversationId) {
            setActiveConversationId(null);
            setMessages([]);
        }
      }
  }

  const handleDeleteMessage = async (messageId?: string) => {
    if (!messageId || messageId.startsWith('local-')) return;
    setMessages(prev => prev.filter(m => m.id !== messageId));
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete message. Please refresh.' });
        if (activeConversationId) fetchMessages(activeConversationId);
    }
  };

  return (
    <MainAppLayout>
      <div className="flex-1 grid grid-cols-[auto_1fr] h-[calc(100vh_-_57px)]">
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
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" disabled={msg.id?.startsWith('local-')}>
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Message?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This will permanently delete this message. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteMessage(msg.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
                
                <div className={`max-w-xs rounded-lg px-4 py-2 sm:max-w-md lg:max-w-lg ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {msg.content ? (
                         <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                        <div className="flex items-center gap-1">
                            <span className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce"></span>
                        </div>
                    )}
                </div>

                {msg.role === 'user' && <Avatar className="h-8 w-8"><AvatarFallback><User /></AvatarFallback></Avatar>}
                </div>
            ))}
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
