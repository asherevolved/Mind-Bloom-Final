// --- Voice functionality ---
const stopSpeaking = useCallback(() => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    speechSynthesis.cancel();
    setIsSpeaking(false);
    currentUtteranceRef.current = null;
  }
}, []);

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
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    setRecordingStatus('listening');
    setIsRecording(true);
  };

  recognition.onresult = (event: any) => {
    let transcript = '';
    let isFinal = false;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
      if (event.results[i].isFinal) isFinal = true;
    }

    setInput(transcript.trim());

    if (isFinal && transcript.trim()) {
      if (autoSendTimeoutRef.current) clearTimeout(autoSendTimeoutRef.current);
      autoSendTimeoutRef.current = setTimeout(() => {
        stopRecording();
        handleSend(transcript.trim());
      }, 700);
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
    if (isVoiceModeActive && !isSpeaking) {
      startRecording(); // Auto-resume if voice mode is still on
    } else {
      setIsRecording(false);
    }
  };

  return recognition;
}, [isVoiceModeActive, stopRecording, handleSend, toast]);

const startRecording = useCallback(() => {
  if (!recognitionRef.current) {
    recognitionRef.current = initializeSpeechRecognition();
  }
  if (recognitionRef.current && !isRecording) {
    if (isSpeaking) stopSpeaking();
    recognitionRef.current.start();
  }
}, [initializeSpeechRecognition, isRecording, isSpeaking, stopSpeaking]);

const stopRecording = useCallback(() => {
  if (recognitionRef.current && isRecording) {
    recognitionRef.current.stop();
    if (autoSendTimeoutRef.current) clearTimeout(autoSendTimeoutRef.current);
  }
}, [isRecording]);

const speakText = useCallback((text: string) => {
  if (typeof window === 'undefined') return;
  if (isSpeaking) stopSpeaking();

  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (isVoiceModeActive && !isLoading) {
        setTimeout(() => startRecording(), 1000);
      }
    };

    const voices = speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.includes('en-US')) || voices[0];
    if (preferred) utterance.voice = preferred;

    currentUtteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  }
}, [isVoiceModeActive, isLoading, isSpeaking, stopSpeaking, startRecording]);

const toggleVoiceMode = useCallback(() => {
  const newMode = !isVoiceModeActive;
  setIsVoiceModeActive(newMode);

  if (newMode) {
    toast({ title: 'Voice Mode Activated', description: 'Speak naturally - I will listen and respond automatically!' });
    if (!isSpeaking && !isLoading) {
      setTimeout(() => startRecording(), 800);
    }
  } else {
    stopRecording();
    stopSpeaking();
    toast({ title: 'Voice Mode Deactivated', description: 'Switched back to text mode.' });
  }
}, [isVoiceModeActive, isSpeaking, isLoading, startRecording, stopRecording, stopSpeaking, toast]);
