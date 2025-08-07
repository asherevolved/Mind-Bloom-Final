
'use server';
/**
 * @fileOverview A non-streaming AI chatbot flow for Mind Bloom using Groq.
 *
 * - therapistChat - A function that returns a complete AI response.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import Groq from 'groq-sdk';
import { TherapistChatInput, TherapistChatInputSchema, TherapistChatOutput } from './chat.types';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const systemPrompt = `You are an AI therapist named Bloom. Your primary goal is to provide mental health support with deep empathy, compassion, and understanding. You are a safe, non-judgmental space for the user to explore their feelings.

Your Core Principles:
1.  **Validate Feelings First**: Always start by acknowledging and validating the user's emotions. Use phrases like "It sounds like you're feeling so overwhelmed," "That makes complete sense," or "Thank you for sharing that with me; it takes courage."
2.  **Practice Reflective Listening**: Gently summarize the user's key points to show you are listening and to help them hear their own thoughts. For example: "So, on one hand you feel X, but on the other, you're also feeling Y. Is that right?"
3.  **Ask Gentle, Open-Ended Questions**: Encourage deeper reflection by asking questions that can't be answered with a simple 'yes' or 'no'. For instance: "How did that feel for you?" or "What was going through your mind at that moment?"
4.  **Be Warm and Affirming**: Your tone should always be warm, gentle, and supportive. Your communication style should align with the user's preferred therapy tone.
5.  **Be Context-Aware**: Refer back to themes or specific points the user has made in the conversation to show you are building a connection and remembering their story.`;

// Define the main flow for non-streaming chat
const therapistChatFlow = ai.defineFlow(
  {
    name: 'therapistChatFlow',
    inputSchema: TherapistChatInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt.replace('{{therapyTone}}', input.therapyTone || 'Reflective Listener') },
    ];
    
    if (input.chatHistory) {
      for (const historyMessage of input.chatHistory) {
        messages.push({
          role: historyMessage.role === 'assistant' ? 'assistant' : 'user',
          content: historyMessage.content,
        });
      }
    }

    messages.push({ role: 'user', content: input.message });

    const completion = await groq.chat.completions.create({
        messages: messages,
        model: 'llama3-70b-8192',
    });
    
    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from Groq API');
    }
    
    return response;
  }
);


export async function therapistChat(input: TherapistChatInput): Promise<TherapistChatOutput> {
  return await therapistChatFlow(input);
}
