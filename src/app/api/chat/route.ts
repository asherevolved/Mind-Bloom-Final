
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

export const runtime = 'edge';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

const systemPrompt = `You are Bloom, a warm and empathetic AI therapist. Have natural, flowing conversations like a real human therapist would.

Key Guidelines:
- Keep responses conversational and concise (1-3 sentences usually)
- Speak naturally like you're having a real conversation
- Validate feelings first, then explore deeper
- Ask one thoughtful question at a time
- Be warm, genuine, and present
- Avoid formal language or long explanations
- Sound like a caring friend who happens to be a therapist

Examples of your style:
- "That sounds really tough. How are you feeling about it right now?"
- "I hear you. What's been weighing on you the most?"
- "That makes complete sense given what you're going through."

Remember: You're having a natural conversation, not giving a lecture. Be human, be present, be brief.`;

// This function creates a Supabase client with the service role key for admin operations.
// It should only be used in secure server-side environments.
const createSupabaseAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase credentials for admin client');
    }
    
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
};


export async function POST(req: NextRequest) {
  try {
    const { message, conversationId: currentConversationId } = await req.json();
    const token = req.headers.get('authorization')?.split(' ')[1];

    if (!token) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized: No token provided' }), { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    
    // Get user from token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
        return new NextResponse(JSON.stringify({ error: userError?.message || 'Unauthorized: Invalid token' }), { status: 401 });
    }
    
    let conversationId = currentConversationId;
    const isNewConversation = !conversationId;

    // 1. Create a new conversation if it's the first message
    if (isNewConversation) {
        const title = message.substring(0, 40) + (message.length > 40 ? '...' : '');
        const { data: convData, error: convError } = await supabaseAdmin
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
    const { error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({ conversation_id: conversationId, role: 'user', content: message });

    if (msgError) {
        console.error('Save user message error:', msgError);
        throw new Error('Could not save user message.');
    }

    // 3. Fetch message history for context
    const { data: history, error: historyError } = await supabaseAdmin
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
        // Reverse history to have the oldest messages first
        ...(history || []).map(m => ({ role: m.role as 'user'|'assistant', content: m.content })).reverse(),
    ];
    // The user's message is now saved before fetching history, so it should be included.

    // Use non-streaming approach for better reliability
    let completion;
    try {
      completion = await groq.chat.completions.create({
        messages: messagesForApi,
        model: 'llama-3.3-70b-versatile',
        stream: false,
        max_tokens: 2000,
        temperature: 0.7,
      });
    } catch (groqError: any) {
      console.error('Groq API error:', groqError);
      return new NextResponse(JSON.stringify({ 
        error: `Groq API error: ${groqError.message || 'Failed to connect to AI service'}` 
      }), { status: 500 });
    }

    const aiResponse = completion.choices[0]?.message?.content || '';
    
    if (!aiResponse.trim()) {
      return new NextResponse(JSON.stringify({ 
        error: 'AI service returned empty response' 
      }), { status: 500 });
    }

    // Save the AI response to database
    try {
      const { error: assistantMsgError } = await supabaseAdmin
        .from('messages')
        .insert({ conversation_id: conversationId, role: 'assistant', content: aiResponse });
      
      if (assistantMsgError) {
        console.error('Save assistant message error:', assistantMsgError);
      } else {
        // Update the conversation's timestamp to bring it to the top of the list
        await supabaseAdmin
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Don't fail the request if DB save fails, user still gets the response
    }

    // Create response with metadata if new conversation
    const responseData: any = {
      content: aiResponse
    };
    
    if (isNewConversation) {
      responseData.metadata = {
        conversationId: conversationId
      };
    }

    return new NextResponse(JSON.stringify(responseData), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (err: any) {
    console.error('Server error in /api/chat:', err);
    return new NextResponse(JSON.stringify({ error: err.message || 'Server error' }), { status: 500 });
  }
}
