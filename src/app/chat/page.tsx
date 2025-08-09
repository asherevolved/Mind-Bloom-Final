
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, PhoneOff, User, Trophy, Trash2, Plus, MessageSquare, Square, BarChart3, Mic, MicOff, Volume2, VolumeX, Play, Pause } from 'lucide-react';
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
  
  // Voice-related state
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'listening' | 'processing'>('idle');
  const [shouldAutoSend, setShouldAutoSend] = useState(false);
  
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Voice-related refs
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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
      .select('id, title, created_at, status')
      .eq('user_id', currentUserId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Could not fetch conversations:', error);
      setConversations([]);
    } else {
      setConversations(data as Conversation[]);
    }
    setIsLoadingConversations(false);
  }, []);

  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      setMessages([]);
      return;
    };
    setIsLoading(true);
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
    setIsLoading(false);
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
    // Cleanup voice functionality on unmount
    return () => {
      authListener.subscription.unsubscribe();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
    };
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

  // Auto-send effect for voice mode
  useEffect(() => {
    if (shouldAutoSend && input.trim() && user) {
      setShouldAutoSend(false);
      setTimeout(() => {
        handleSend();
      }, 500);
    }
  }, [shouldAutoSend, input, user]);

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
  };

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
    }
  };

  // Voice functionality
  const initializeSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ 
        variant: 'destructive', 
        title: 'Speech Recognition Not Supported', 
        description: 'Your browser does not support speech recognition. Please use Chrome or Edge.' 
      });
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setRecordingStatus('listening');
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setRecordingStatus('processing');
      
      // Auto-send in voice mode
      if (isVoiceModeActive) {
        setShouldAutoSend(true);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setRecordingStatus('idle');
      setIsRecording(false);
      toast({ 
        variant: 'destructive', 
        title: 'Speech Recognition Error', 
        description: 'Could not recognize speech. Please try again.' 
      });
    };

    recognition.onend = () => {
      setRecordingStatus('idle');
      setIsRecording(false);
    };

    return recognition;
  }, [isVoiceModeActive, toast]);

  const startRecording = useCallback(() => {
    if (!recognitionRef.current) {
      recognitionRef.current = initializeSpeechRecognition();
    }
    
    if (recognitionRef.current && !isRecording) {
      // Stop any current speech
      stopSpeaking();
      recognitionRef.current.start();
    }
  }, [initializeSpeechRecognition, isRecording]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  }, [isRecording]);

  const speakText = useCallback((text: string) => {
    if (!voiceEnabled || typeof window === 'undefined') return;

    // Stop any current speech
    stopSpeaking();

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;

      // Try to use a more natural voice
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') && voice.lang.includes('en')
      ) || voices.find(voice => voice.lang.includes('en'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        // In voice mode, start listening for the next input after AI finishes speaking
        if (isVoiceModeActive && !isLoading) {
          setTimeout(() => {
            startRecording();
          }, 1000);
        }
      };
      utterance.onerror = () => setIsSpeaking(false);

      currentUtteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
    }
  }, [voiceEnabled, isVoiceModeActive, isLoading, startRecording]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      currentUtteranceRef.current = null;
    }
  }, []);

  const toggleVoiceMode = useCallback(() => {
    const newVoiceMode = !isVoiceModeActive;
    setIsVoiceModeActive(newVoiceMode);
    
    if (newVoiceMode) {
      toast({ 
        title: 'Voice Mode Activated', 
        description: 'Speak naturally - I will listen and respond with voice!' 
      });
      // Start listening immediately in voice mode
      setTimeout(() => {
        if (!isLoading && !isSpeaking) {
          startRecording();
        }
      }, 1000);
    } else {
      stopRecording();
      stopSpeaking();
      toast({ 
        title: 'Voice Mode Deactivated', 
        description: 'Switched back to text mode.' 
      });
    }
  }, [isVoiceModeActive, isLoading, isSpeaking, startRecording, stopRecording, stopSpeaking, toast]);

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
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error('Could not get user session.');
      }
      const token = sessionData.session.access_token;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: currentInput,
          conversationId: activeConversationId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
         let errorText = 'The AI failed to respond.';
        try {
            const errorData = await response.json();
            errorText = errorData.error || errorText;
        } catch (e) {
             errorText = "An unexpected error occurred. The API may have crashed.";
        }
        throw new Error(errorText);
      }

      // Handle streaming response
      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';
      let newConversationId: string | null = activeConversationId;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          
          // Check if this chunk contains metadata (for new conversations)
          if (chunk.startsWith('{"metadata":')) {
            try {
              const metadataLine = chunk.split('\n')[0];
              const metadata = JSON.parse(metadataLine);
              if (metadata.metadata?.conversationId) {
                newConversationId = metadata.metadata.conversationId;
              }
            } catch (e) {
              // Ignore metadata parsing errors
            }
            continue;
          }

          // Add chunk to AI response
          aiResponse += chunk;
          
          // Update the assistant message in real-time
          setMessages(prev => {
            const updated = [...prev];
            const lastMessage = updated[updated.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = aiResponse;
            }
            return updated;
          });
        }
      } finally {
        reader.releaseLock();
      }

      if (isNewConversation && newConversationId) {
         await fetchConversations(user.id);
         setActiveConversationId(newConversationId);
         await awardBadge('therapy_starter', 'Therapy Starter');
      } else if (activeConversationId) {
         // The messages are already saved by the API route's flush method,
         // but we refetch to get the persisted IDs and timestamps.
         await fetchMessages(activeConversationId);
      }

      // Speak the AI response if voice is enabled
      if (voiceEnabled && aiResponse.trim()) {
        speakText(aiResponse);
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast({ title: 'Generation stopped' });
        // After stopping, we still need to "save" the partial response
        // which the API route now does automatically. We just need to refetch.
        if (activeConversationId) await fetchMessages(activeConversationId);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to get response from AI.' });
        // remove the local messages on error
        setMessages(prev => prev.filter(m => m.id !== newUserMessage.id && m.id !== assistantMessageId));
        setInput(currentInput);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };


  const handleAnalyzeConversation = async (conversationId: string, shouldEndSession: boolean = false) => {
    if (!user) return;
    
    setIsEndingSession(true);
    toast({ title: "Analyzing conversation...", description: "Please wait while we analyze the conversation." });

    try {
        // Fetch messages for the specific conversation
        const { data: conversationMessages, error: messagesError } = await supabase
            .from('messages')
            .select('role, content')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (messagesError || !conversationMessages || conversationMessages.length === 0) {
            toast({ variant: 'destructive', title: 'Cannot analyze empty chat', description: "This conversation has no messages to analyze."});
            return;
        }

        // Update conversation status to ended if requested
        if (shouldEndSession) {
            const { error: updateError } = await supabase
                .from('conversations')
                .update({ status: 'ended', updated_at: new Date().toISOString() })
                .eq('id', conversationId);
            if (updateError) throw updateError;
        }
        
        const transcript = conversationMessages.map((msg: any) => `${msg.role === 'user' ? 'User' : 'Bloom'}: ${msg.content}`).join('\n');
        
        console.log('Starting session analysis with transcript:', transcript);
        const analysisResult = await analyzeSession({ transcript });
        console.log('Session analysis completed:', analysisResult);

        // Check if analysis already exists for this conversation
        const { data: existingAnalysis } = await supabase
            .from('conversation_analyses')
            .select('id')
            .eq('conversation_id', conversationId)
            .single();

        if (existingAnalysis) {
            // Update existing analysis
            const { error: analysisError } = await supabase
                .from('conversation_analyses')
                .update({
                    summary: analysisResult.emotionalSummary.summaryText,
                    mood: { dominantStates: analysisResult.emotionalSummary.dominantStates },
                    insights: analysisResult.insights,
                    suggestions: analysisResult.suggestedSteps,
                    updated_at: new Date().toISOString()
                })
                .eq('conversation_id', conversationId);
            if (analysisError) throw analysisError;
        } else {
            // Create new analysis
            const { error: analysisError } = await supabase
                .from('conversation_analyses')
                .insert({
                    conversation_id: conversationId,
                    user_id: user.id,
                    summary: analysisResult.emotionalSummary.summaryText,
                    mood: { dominantStates: analysisResult.emotionalSummary.dominantStates },
                    insights: analysisResult.insights,
                    suggestions: analysisResult.suggestedSteps,
                });
            if (analysisError) throw analysisError;
        }

        await awardBadge('self_reflector', 'Self-Reflector');
        
        console.log('Storing analysis in sessionStorage:', analysisResult);
        sessionStorage.setItem('sessionAnalysis', JSON.stringify(analysisResult));
        
        await fetchConversations(user.id);
        
        if (shouldEndSession) {
            setActiveConversationId(null);
            setMessages([]);
        }

        console.log('Navigating to analysis page');
        router.push('/analysis');

    } catch(err) {
        console.error("Failed to analyze session:", err);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not complete the session analysis.' });
        if(shouldEndSession && conversationId) {
            await supabase.from('conversations').update({ status: 'active' }).eq('id', conversationId);
        }
    } finally {
        setIsEndingSession(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeConversationId || !user || messages.length === 0) {
      toast({ variant: 'destructive', title: 'Cannot analyze empty chat', description: "Please send a few messages first."});
      return;
    }
    
    const currentConversation = conversations.find(c => c.id === activeConversationId);
    const isActiveConversation = currentConversation?.status !== 'ended';
    
    // For active conversations, end them and analyze
    // For ended conversations, just analyze them
    await handleAnalyzeConversation(activeConversationId, isActiveConversation);
  };
  
  const handleDeleteConversation = async (conversationId: string) => {
      if (!user) return;
      
      try {
        // Must delete dependent records first
        await supabase.from('conversation_analyses').delete().eq('conversation_id', conversationId);
        await supabase.from('messages').delete().eq('conversation_id', conversationId);
        const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
        if(error) throw error;
        
        toast({ title: "Conversation Deleted" });
        
        if (activeConversationId === conversationId) {
            setActiveConversationId(null);
            setMessages([]);
        }
        await fetchConversations(user.id);


      } catch (error: any) {
         toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to delete conversation.'});
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
                                        "block w-full text-left truncate p-2 pr-20 rounded-md text-sm transition-colors",
                                        activeConversationId === convo.id ? "bg-primary/20 text-primary-foreground" : "hover:bg-muted"
                                    )}
                                >
                                    {convo.title || "New Conversation"}
                                </button>
                                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAnalyzeConversation(convo.id, false);
                                        }}
                                        title="Analyze this conversation"
                                    >
                                        <BarChart3 className="h-4 w-4 text-muted-foreground"/>
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7">
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
                <h1 className="font-bold">Therapist</h1>
                <p className="text-xs text-green-500">Online</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={messages.length === 0 || !activeConversationId || isEndingSession}>
                        {isEndingSession ? "Analyzing..." : <><PhoneOff className="mr-2"/> {conversations.find(c => c.id === activeConversationId)?.status === 'ended' ? 'Analyze' : 'End & Analyze'}</>}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {conversations.find(c => c.id === activeConversationId)?.status === 'ended' ? 'Analyze this conversation?' : 'End your session?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {conversations.find(c => c.id === activeConversationId)?.status === 'ended' 
                                ? 'This will analyze the conversation and provide insights and suggestions.' 
                                : 'This will end the current chat, save the analysis, and you can start a new one.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleEndSession}>
                            {conversations.find(c => c.id === activeConversationId)?.status === 'ended' ? 'Analyze' : 'End & Analyze'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
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
            {/* Voice Mode Status */}
            {(isVoiceModeActive || recordingStatus !== 'idle' || isSpeaking) && (
              <div className="mb-3 p-2 bg-muted rounded-lg text-sm text-center">
                {isVoiceModeActive && (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <Volume2 className="h-4 w-4" />
                    <span>Voice Mode Active</span>
                  </div>
                )}
                {recordingStatus === 'listening' && (
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <Mic className="h-4 w-4 animate-pulse" />
                    <span>Listening...</span>
                  </div>
                )}
                {recordingStatus === 'processing' && (
                  <div className="flex items-center justify-center gap-2 text-yellow-600">
                    <div className="h-4 w-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                )}
                {isSpeaking && (
                  <div className="flex items-center justify-center gap-2 text-purple-600">
                    <Volume2 className="h-4 w-4 animate-pulse" />
                    <span>Bloom is speaking...</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-2">
                <Input
                type="text"
                placeholder={isVoiceModeActive ? "Voice mode active - speak to chat..." : "Type your message..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                disabled={isLoading || isEndingSession || !user || conversations.find(c => c.id === activeConversationId)?.status === 'ended'}
                className="flex-1"
                />
                
                {/* Voice Controls */}
                <div className="flex items-center gap-1">
                  {/* Hold to Speak Button */}
                  <Button
                    size="icon"
                    variant={isRecording ? "default" : "outline"}
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    disabled={isLoading || isEndingSession || !user || conversations.find(c => c.id === activeConversationId)?.status === 'ended'}
                    title="Hold to speak"
                    className={cn(
                      "transition-colors",
                      isRecording && "bg-red-500 hover:bg-red-600 text-white"
                    )}
                  >
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>

                  {/* Voice Mode Toggle */}
                  <Button
                    size="icon"
                    variant={isVoiceModeActive ? "default" : "outline"}
                    onClick={toggleVoiceMode}
                    disabled={isLoading || isEndingSession || !user || conversations.find(c => c.id === activeConversationId)?.status === 'ended'}
                    title={isVoiceModeActive ? "Exit voice mode" : "Enter voice mode"}
                    className={cn(
                      "transition-colors",
                      isVoiceModeActive && "bg-green-500 hover:bg-green-600 text-white"
                    )}
                  >
                    {isVoiceModeActive ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>

                  {/* Voice Enable/Disable */}
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    title={voiceEnabled ? "Disable voice responses" : "Enable voice responses"}
                    className={cn(
                      "transition-colors",
                      !voiceEnabled && "bg-gray-500 hover:bg-gray-600 text-white"
                    )}
                  >
                    {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>

                  {/* Stop Speaking Button */}
                  {isSpeaking && (
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={stopSpeaking}
                      title="Stop speaking"
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {/* Send/Stop Button */}
                {isLoading ? (
                    <Button size="icon" variant="outline" onClick={handleStopGenerating}>
                        <Square className="h-4 w-4"/>
                    </Button>
                ) : (
                    <Button size="icon" onClick={handleSend} disabled={!input.trim() || isEndingSession || !user || conversations.find(c => c.id === activeConversationId)?.status === 'ended'}>
                        <Send />
                    </Button>
                )}
            </div>
            </footer>
        </div>
      </div>
    </MainAppLayout>
  );
}
