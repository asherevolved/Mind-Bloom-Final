
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { Stream } from 'groq-sdk/streaming';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// This is an experimental feature for streaming from API routes
export const runtime = 'edge';

const systemPrompt = `You are an AI therapist named Bloom. Your primary goal is to provide mental health support with deep empathy, compassion, and understanding. You are a safe, non-judgmental space for the user to explore their feelings.

Your Core Principles:
1.  **Validate Feelings First**: Always start by acknowledging and validating the user's emotions. Use phrases like "It sounds like you're feeling so overwhelmed," "That makes complete sense," or "Thank you for sharing that with me; it takes courage."
2.  **Practice Reflective Listening**: Gently summarize the user's key points to show you are listening and to help them hear their own thoughts. For example: "So, on one hand you feel X, but on the other, you're also feeling Y. Is that right?"
3.  **Ask Gentle, Open-Ended Questions**: Encourage deeper reflection by asking questions that can't be answered with a simple 'yes' or 'no'. For instance: "How did that feel for you?" or "What was going through your mind at that moment?"
4.  **Be Warm and Affirming**: Your tone should always be warm, gentle, and supportive.
5.  **Be Context-Aware**: Refer back to themes or specific points the user has made in the conversation to show you are building a connection and remembering their story.`;

async function getSupabaseClient(jwt: string) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            global: {
                headers: {
                    Authorization: `Bearer ${jwt}`,
                },
            },
        }
    );
    return supabase;
}


export async function POST(req: NextRequest) {
  try {
    const { message, conversationId: currentConversationId } = await req.json();
    const jwt = req.headers.get('Authorization')?.split('Bearer ')[1];

    if (!jwt) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    
    const supabase = await getSupabaseClient(jwt);

    // Get user from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    let conversationId = currentConversationId;
    const isNewConversation = !conversationId;

    // 1. Create a new conversation if it's the first message
    if (isNewConversation) {
        const title = message.substring(0, 40) + (message.length > 40 ? '...' : '');
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .insert({ title, user_id: user.id })
          .select('id')
          .single();
        if (convError || !convData) {
            console.error('Create conversation error:', convError);
            throw new Error('Could not create conversation.');
        }
        conversationId = convData.id;
    }
    
    // 2. Save the user's message
    const { error: msgError } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, role: 'user', content: message });

    if (msgError) {
        console.error('Save user message error:', msgError);
        throw new Error('Could not save user message.');
    }

    // 3. Fetch message history for context
    const { data: history, error: historyError } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(10);
    
    if(historyError) {
        console.error('Fetch history error:', historyError);
        throw new Error('Could not fetch chat history.');
    }

    const messagesForApi: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...(history || []).map(m => ({ role: m.role as 'user'|'assistant', content: m.content })).reverse(),
    ];

    const stream = await groq.chat.completions.create({
      messages: messagesForApi,
      model: 'llama-3.3-70b-versatile',
      stream: true,
    });
    
    let finalResponse = '';
    const transformStream = new TransformStream({
      async start(controller) {
        if(isNewConversation) {
            const metadata = {
                conversationId: conversationId
            };
            controller.enqueue(`{"metadata":${JSON.stringify(metadata)}}\n\n`);
        }
      },
      transform(chunk, controller) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          finalResponse += content;
          controller.enqueue(content);
        }
      },
      async flush(controller) {
        // 4. After the stream is complete, save the final AI response
        if (finalResponse.trim()) {
            const { error: assistantMsgError } = await supabase
                .from('messages')
                .insert({ conversation_id: conversationId, role: 'assistant', content: finalResponse });
            
            if (assistantMsgError) {
                console.error('Save assistant message error:', assistantMsgError);
                // Don't throw, as the user already received the message. Just log it.
            } else {
                 // 5. Update the conversation's timestamp
                await supabase
                    .from('conversations')
                    .update({ updated_at: new Date().toISOString() })
                    .eq('id', conversationId);
            }
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
