
'use server';

/**
 * @fileOverview A therapist chatbot AI agent.
 *
 * - therapistChat - A function that handles the chatbot process.
 * - TherapistChatInput - The input type for the therapistChat function.
 * - TherapistChatOutput - The return type for the therapistChat function.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';
import {googleAI} from '@genkit-ai/googleai';


const TherapistChatInputSchema = z.object({
  message: z.string().describe('The user message to respond to.'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']).describe('The role of the message sender.'),
    content: z.string().describe('The content of the message.'),
  })).optional().describe('The chat history.'),
  therapyTone: z.string().optional().describe("The user's preferred therapy tone (e.g., 'Reflective Listener', 'Motivational Coach')."),
});
export type TherapistChatInput = z.infer<typeof TherapistChatInputSchema>;

const TherapistChatOutputSchema = z.object({
  response: z.string().describe('The response from the AI therapist.'),
});
export type TherapistChatOutput = z.infer<typeof TherapistChatOutputSchema>;


const prompt = ai.definePrompt({
  name: 'therapistChatPrompt',
  model: googleAI.model('gemini-1.5-flash-latest'),
  input: {schema: z.object({
    message: TherapistChatInputSchema.shape.message,
    chatHistory: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
        isUser: z.boolean(),
        isAssistant: z.boolean(),
    })).optional(),
    therapyTone: TherapistChatInputSchema.shape.therapyTone,
  })},
  output: {schema: TherapistChatOutputSchema},
  prompt: `You are an AI therapist named Bloom. Your primary goal is to provide mental health support with deep empathy, compassion, and understanding. You are a safe, non-judgmental space for the user to explore their feelings.

Your Core Principles:
1.  **Validate Feelings First**: Always start by acknowledging and validating the user's emotions. Use phrases like "It sounds like you're feeling so overwhelmed," "That makes complete sense," or "Thank you for sharing that with me; it takes courage."
2.  **Practice Reflective Listening**: Gently summarize the user's key points to show you are listening and to help them hear their own thoughts. For example: "So, on one hand you feel X, but on the other, you're also feeling Y. Is that right?"
3.  **Ask Gentle, Open-Ended Questions**: Encourage deeper reflection by asking questions that can't be answered with a simple 'yes' or 'no'. For instance: "How did you feel for you?" or "What was going through your mind at that moment?"
4.  **Be Warm and Affirming**: Your tone should always be warm, gentle, and supportive. Your communication style should align with the user's preferred therapy tone: {{therapyTone}}.
5.  **Be Context-Aware**: Refer back to themes or specific points the user has made in the conversation to show you are building a connection and remembering their story.

Chat History:
{{#each chatHistory}}
{{#if isUser}}
User: {{content}}
{{/if}}
{{#if isAssistant}}
Bloom: {{content}}
{{/if}}
{{/each}}

User's Latest Message: "{{message}}"

Bloom's Caring & Empathetic Response (as a {{therapyTone}}):`,
});

const therapistChatFlow = ai.defineFlow(
  {
    name: 'therapistChatFlow',
    inputSchema: TherapistChatInputSchema,
    outputSchema: TherapistChatOutputSchema,
  },
  async input => {
    const processedChatHistory = input.chatHistory?.map(msg => ({
        ...msg,
        isUser: msg.role === 'user',
        isAssistant: msg.role === 'assistant',
    }));

    const {output} = await prompt({
        ...input,
        chatHistory: processedChatHistory,
    });
    return output!;
  }
);

export async function therapistChat(input: TherapistChatInput): Promise<TherapistChatOutput> {
  return therapistChatFlow(input);
}
