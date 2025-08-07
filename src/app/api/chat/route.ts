
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { Stream } from 'groq-sdk/streaming';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const systemPrompt = `You are an AI therapist named Bloom. Your primary goal is to provide mental health support with deep empathy, compassion, and understanding. You are a safe, non-judgmental space for the user to explore their feelings.

Your Core Principles:
1.  **Validate Feelings First**: Always start by acknowledging and validating the user's emotions. Use phrases like "It sounds like you're feeling so overwhelmed," "That makes complete sense," or "Thank you for sharing that with me; it takes courage."
2.  **Practice Reflective Listening**: Gently summarize the user's key points to show you are listening and to help them hear their own thoughts. For example: "So, on one hand you feel X, but on the other, you're also feeling Y. Is that right?"
3.  **Ask Gentle, Open-Ended Questions**: Encourage deeper reflection by asking questions that can't be answered with a simple 'yes' or 'no'. For instance: "How did that feel for you?" or "What was going through your mind at that moment?"
4.  **Be Warm and Affirming**: Your tone should always be warm, gentle, and supportive.
5.  **Be Context-Aware**: Refer back to themes or specific points the user has made in the conversation to show you are building a connection and remembering their story.`;

// This is an experimental feature for streaming from API routes
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { message, conversationId: currentConversationId } = await req.json();
    const jwt = req.headers.get('Authorization')?.split('Bearer ')[1];

    if (!jwt) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Get user from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    let conversationId = currentConversationId;
    let userMessageId: string | null = null;
    const isNewConversation = !conversationId;

    if (isNewConversation) {
        const title = message.substring(0, 40) + (message.length > 40 ? '...' : '');
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .insert({ title, user_id: user.id })
          .select('id')
          .single();
        if (convError || !convData) throw new Error('Could not create conversation.');
        conversationId = convData.id;
    }
    
    // Save user message
    const { data: msgData, error: msgError } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, role: 'user', content: message })
      .select('id')
      .single();

    if (msgError || !msgData) throw new Error('Could not save user message.');
    userMessageId = msgData.id;

    // Fetch last 10 messages for context
    const { data: history, error: historyError } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(10);
    
    const messagesForApi: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...(history || []).map(m => ({ role: m.role as 'user'|'assistant', content: m.content })).reverse(),
    ];

    const stream = await groq.chat.completions.create({
      messages: messagesForApi,
      model: 'llama3-70b-8192',
      stream: true,
    });

    const transformStream = new TransformStream({
      async start(controller) {
        if(isNewConversation) {
            const metadata = {
                conversationId: conversationId,
                userMessageId: userMessageId
            };
            controller.enqueue(`{"metadata":${JSON.stringify(metadata)}}\n\n`);
        }
      },
      transform(chunk, controller) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          controller.enqueue(content);
        }
      },
    });

    return new NextResponse(stream.toReadableStream().pipeThrough(transformStream), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (err: any) {
    console.error('Server error:', err);
    return new NextResponse(JSON.stringify({ error: err.message || 'Server error' }), { status: 500 });
  }
}
