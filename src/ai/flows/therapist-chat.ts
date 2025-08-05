
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
  prompt: `You are an AI therapist named Bloom. Your goal is to provide mental health support with empathy and understanding.

Your tone should be warm, validating, and affirming. Your communication style should align with the user's preferred therapy tone: {{therapyTone}}. Keep your responses concise and conversational, but ensure they are contextually relevant. Refer back to themes or specific points the user has made in the conversation to show you are listening.

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

Bloom's Caring Response (as a {{therapyTone}}):`,
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
    return {response: output!.response};
  }
);

export async function therapistChat(input: TherapistChatInput): Promise<TherapistChatOutput> {
  return therapistChatFlow(input);
}
