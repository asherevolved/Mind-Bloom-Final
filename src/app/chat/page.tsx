
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, PhoneOff, User, Trophy, Trash2, Plus, MessageSquare, Square, BarChart3, Mic, Volume2 } from 'lucide-react';
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

  // Auto-send effect for voice mode (now handled directly in recognition)
  useEffect(() => {
    // This is now handled directly in the speech recognition onresult
    // Keeping this for backward compatibility but it's not needed for the new flow
  }, []);

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
    recognition.continuous = true; // More like ChatGPT - keeps listening
    recognition.interimResults = true; // Show partial results
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1; // Only need best result

    recognition.onstart = () => {
      setRecordingStatus('listening');
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      let isFinal = false;
      
      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
          isFinal = true;
        } else {
          // Show interim results for better UX
          transcript += event.results[i][0].transcript;
        }
      }
      
      setInput(transcript.trim());
      
      // Only process final results
      if (isFinal && transcript.trim()) {
        setRecordingStatus('processing');
        recognition.stop(); // Stop listening after getting final result
        
        // Auto-send in voice mode immediately (like ChatGPT)
        if (isVoiceModeActive) {
          // Store the transcript and trigger auto-send
          const finalTranscript = transcript.trim();
          setInput(finalTranscript);
          
          // Small delay to ensure state updates, then auto-send
          setTimeout(() => {
            if (finalTranscript && user) {
              handleSend(finalTranscript);
            }
          }, 500);
        }
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
    if (typeof window === 'undefined') return;

    // Stop any current speech
    stopSpeaking();

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // More human-like voice settings
      utterance.rate = 1.0; // Natural speed
      utterance.pitch = 1.0; // Natural pitch
      utterance.volume = 0.95; // Clear volume

      // Wait for voices to load if not already loaded
      const setVoiceAndSpeak = () => {
        const voices = speechSynthesis.getVoices();
        
        // Prioritize the most human-like voices
        let preferredVoice = null;
        
        // First choice: Neural voices (most human-like)
        preferredVoice = voices.find(voice => 
          (voice.name.includes('Neural') || voice.name.includes('Premium') || voice.name.includes('Natural')) && 
          (voice.lang.includes('en-US') || voice.lang.includes('en-GB'))
        );
        
        // Second choice: Google voices (usually good quality)
        if (!preferredVoice) {
          preferredVoice = voices.find(voice => 
            voice.name.includes('Google') && 
            (voice.lang.includes('en-US') || voice.lang.includes('en-GB'))
          );
        }
        
        // Third choice: Microsoft voices
        if (!preferredVoice) {
          preferredVoice = voices.find(voice => 
            voice.name.includes('Microsoft') && 
            (voice.lang.includes('en-US') || voice.lang.includes('en-GB'))
          );
        }
        
        // Fourth choice: Any English voice
        if (!preferredVoice) {
          preferredVoice = voices.find(voice => 
            voice.lang.includes('en-US') || voice.lang.includes('en-GB')
          );
        }
        
        // Last resort: Any English voice
        if (!preferredVoice) {
          preferredVoice = voices.find(voice => voice.lang.includes('en'));
        }
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
          console.log('Selected voice:', preferredVoice.name, 'Language:', preferredVoice.lang);
          
          // Adjust settings based on voice type for more human sound
          if (preferredVoice.name.includes('Neural') || preferredVoice.name.includes('Premium')) {
            utterance.rate = 0.95; // Slightly slower for premium voices
          } else if (preferredVoice.name.includes('Google')) {
            utterance.rate = 1.0; // Normal rate for Google voices
          } else {
            utterance.rate = 0.9; // Slightly slower for other voices
          }
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          // In voice mode, start listening for the next input after AI finishes speaking (like ChatGPT)
          if (isVoiceModeActive && !isLoading) {
            setTimeout(() => {
              startRecording();
            }, 1000); // Natural delay for conversation flow
          }
        };
        utterance.onerror = () => setIsSpeaking(false);

        currentUtteranceRef.current = utterance;
        speechSynthesis.speak(utterance);
      };

      // Check if voices are already loaded
      if (speechSynthesis.getVoices().length > 0) {
        setVoiceAndSpeak();
      } else {
        // Wait for voices to load
        speechSynthesis.onvoiceschanged = () => {
          setVoiceAndSpeak();
          speechSynthesis.onvoiceschanged = null; // Remove listener
        };
      }
    }
  }, [isVoiceModeActive, isLoading, startRecording]);

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
        description: 'Speak naturally - I will listen and respond automatically!' 
      });
      // Start listening immediately in voice mode (like ChatGPT)
      setTimeout(() => {
        if (!isLoading && !isSpeaking) {
          startRecording();
        }
      }, 800);
    } else {
      stopRecording();
      stopSpeaking();
      toast({ 
        title: 'Voice Mode Deactivated', 
        description: 'Switched back to text mode.' 
      });
    }
  }, [isVoiceModeActive, isLoading, isSpeaking, startRecording, stopRecording, stopSpeaking, toast]);

  const handleSend = async (messageContent?: string) => {
    const contentToSend = messageContent || input;
    if (!contentToSend.trim() || !user) return;
  
    const currentInput = contentToSend;
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

      // Handle JSON response (non-streaming)
      const data = await response.json();
      let aiResponse = typeof data === 'string' ? data : (data.content ?? '');
      let newConversationId: string | null = activeConversationId;
      if (data?.metadata?.conversationId) {
        newConversationId = data.metadata.conversationId;
      }

      if (!aiResponse) {
        throw new Error('Empty AI response');
      }

      // Update the assistant message in one go
      setMessages(prev => {
        const updated = [...prev];
        const lastMessage = updated[updated.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content = aiResponse;
        }
        return updated;
      });

      if (isNewConversation && newConversationId) {
         await fetchConversations(user.id);
         setActiveConversationId(newConversationId);
         await awardBadge('therapy_starter', 'Therapy Starter');
       } else if (activeConversationId) {
          // The messages are already saved by the API route's flush method,
          // but we refetch to get the persisted IDs and timestamps.
          await fetchMessages(activeConversationId);
       }

       // Award voice badge if voice mode was used
       if (isVoiceModeActive) {
         await awardBadge('conversationalist', 'Conversationalist');
       }

       // Speak the AI response if voice mode is active
       if (isVoiceModeActive && aiResponse.trim()) {
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
    if (!user) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'Please log in to analyze conversations.' });
        return;
    }
    
    if (!conversationId) {
        toast({ variant: 'destructive', title: 'No Conversation Selected', description: 'Please select a conversation to analyze.' });
        return;
    }
    
    setIsEndingSession(true);
    toast({ title: "Analyzing conversation...", description: "Please wait while we analyze the conversation." });

    try {
        console.log('Starting analysis for conversation:', conversationId);
        console.log('User:', user.id);
        console.log('Should end session:', shouldEndSession);
        
        // Fetch messages for the specific conversation
        const { data: conversationMessages, error: messagesError } = await supabase
            .from('messages')
            .select('role, content')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        console.log('Messages query completed');
        console.log('Messages fetched:', conversationMessages?.length || 0, 'messages');
        console.log('Messages error:', messagesError);

        if (messagesError) {
            console.error('Error fetching messages:', messagesError);
            toast({ variant: 'destructive', title: 'Database Error', description: `Failed to fetch messages: ${messagesError.message}` });
            return;
        }

        if (!conversationMessages || conversationMessages.length === 0) {
            toast({ variant: 'destructive', title: 'Cannot analyze empty chat', description: "This conversation has no messages to analyze. Please send at least one message before analyzing."});
            return;
        }

        console.log('Messages sample:', conversationMessages.slice(0, 2));

        // Update conversation status to ended if requested
        if (shouldEndSession) {
            const { error: updateError } = await supabase
                .from('conversations')
                .update({ status: 'ended', updated_at: new Date().toISOString() })
                .eq('id', conversationId);
            if (updateError) throw updateError;
        }
        
        const transcript = conversationMessages.map((msg: any) => `${msg.role === 'user' ? 'User' : 'Bloom'}: ${msg.content}`).join('\n');
        
        console.log('Starting session analysis with transcript length:', transcript.length);
        console.log('Transcript preview:', transcript.substring(0, 200) + '...');
        
        let analysisResult;
        try {
            analysisResult = await analyzeSession({ transcript });
            console.log('Session analysis completed successfully:', analysisResult);
        } catch (analysisError) {
            console.error('Analysis failed:', analysisError);
            
            // Create a fallback analysis if the AI analysis fails
            console.log('Creating fallback analysis...');
            analysisResult = {
                emotionalSummary: {
                    summaryText: "You shared your thoughts and feelings in this conversation, taking time for self-reflection.",
                    dominantStates: ["Reflective", "Engaged", "Open"]
                },
                insights: [
                    "You took the initiative to engage in a therapeutic conversation, which shows self-awareness.",
                    "Expressing your thoughts and feelings is an important step in personal growth.",
                    "Your willingness to explore your emotions demonstrates emotional courage."
                ],
                suggestedSteps: [
                    {
                        title: "Continue Self-Reflection",
                        description: "Take a few minutes each day to check in with your emotions and thoughts."
                    },
                    {
                        title: "Practice Mindfulness",
                        description: "Try a brief mindfulness exercise when you feel overwhelmed or stressed."
                    },
                    {
                        title: "Journal Your Thoughts",
                        description: "Write down your feelings to better understand your emotional patterns."
                    }
                ]
            };
            
            toast({ 
                title: "Analysis Generated", 
                description: "Created a basic analysis. AI analysis temporarily unavailable." 
            });
        }

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

                console.log('Analysis workflow completed successfully');
        await awardBadge('self_reflector', 'Self-Reflector');
        
        console.log('Storing analysis in sessionStorage:', analysisResult);
        try {
            sessionStorage.setItem('sessionAnalysis', JSON.stringify(analysisResult));
            console.log('Successfully stored in sessionStorage');
        } catch (storageError) {
            console.error('Failed to store in sessionStorage:', storageError);
            // Continue anyway - we can still show the analysis
        }
        
        // Update the conversations list
        try {
            await fetchConversations(user.id);
            console.log('Conversations refreshed');
        } catch (fetchError) {
            console.error('Failed to refresh conversations:', fetchError);
            // Non-critical error, continue with analysis
        }
        
        if (shouldEndSession) {
            setActiveConversationId(null);
            setMessages([]);
            console.log('Session ended, cleared active conversation');
        }

        console.log('Navigating to analysis page...');
        
        // Ensure everything is ready before navigation
        setTimeout(() => {
            try {
                router.push('/analysis');
                console.log('Navigation to analysis page initiated');
            } catch (navError) {
                console.error('Navigation failed:', navError);
                toast({ 
                    variant: 'destructive', 
                    title: 'Navigation Error', 
                    description: 'Analysis completed but could not navigate to results page.' 
                });
            }
        }, 200);

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
    console.log('=== handleEndSession called ===');
    console.log('activeConversationId:', activeConversationId);
    console.log('user:', user?.id);
    console.log('messages.length:', messages.length);
    console.log('conversations:', conversations.length);
    
    if (!activeConversationId) {
      console.log('ERROR: No active conversation ID');
      toast({ variant: 'destructive', title: 'No Active Conversation', description: "Please start a conversation first."});
      return;
    }
    
    if (!user) {
      console.log('ERROR: No user');
      toast({ variant: 'destructive', title: 'Authentication Required', description: "Please log in to analyze conversations."});
      return;
    }
    
    if (messages.length === 0) {
      console.log('ERROR: No messages');
      toast({ variant: 'destructive', title: 'Cannot analyze empty chat', description: "Please send a few messages first."});
      return;
    }
    
    const currentConversation = conversations.find(c => c.id === activeConversationId);
    const isActiveConversation = currentConversation?.status !== 'ended';
    
    console.log('currentConversation:', currentConversation);
    console.log('isActiveConversation:', isActiveConversation);
    
    // For active conversations, end them and analyze
    // For ended conversations, just analyze them
    console.log('Calling handleAnalyzeConversation...');
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
            {/* Voice Status - Simplified */}
            {(recordingStatus === 'listening' || isSpeaking) && (
              <div className="mb-3 p-2 bg-muted rounded-lg text-sm text-center">
                {recordingStatus === 'listening' && (
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <Mic className="h-4 w-4 animate-pulse" />
                    <span>Listening...</span>
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
                
                {/* Voice Controls - Simplified */}
                <div className="flex items-center gap-2">
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
                      isRecording && "bg-blue-500 hover:bg-blue-600 text-white"
                    )}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>

                  {/* Voice Mode Toggle - ChatGPT Style */}
                  <Button
                    size="icon"
                    variant={isVoiceModeActive ? "default" : "outline"}
                    onClick={toggleVoiceMode}
                    disabled={isLoading || isEndingSession || !user || conversations.find(c => c.id === activeConversationId)?.status === 'ended'}
                    title={isVoiceModeActive ? "Exit voice conversation mode" : "Enter voice conversation mode"}
                    className={cn(
                      "relative transition-colors",
                      isVoiceModeActive && "bg-purple-500 hover:bg-purple-600 text-white"
                    )}
                  >
                    <div className="relative">
                      <Volume2 className="h-4 w-4" />
                      {isVoiceModeActive && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      )}
                    </div>
                  </Button>
                </div>
                
                {/* Send/Stop Button */}
                 {isLoading ? (
                    <Button size="icon" variant="outline" onClick={handleStopGenerating}>
                        <Square className="h-4 w-4"/>
                    </Button>
                ) : (
                    <Button size="icon" onClick={() => handleSend()} disabled={!input.trim() || isEndingSession || !user || conversations.find(c => c.id === activeConversationId)?.status === 'ended'}>
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
