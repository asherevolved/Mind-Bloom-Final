'use server';

/**
 * @fileOverview A therapist chatbot AI agent.
 *
 * - therapistChat - A function that handles the chatbot process.
 * - TherapistChatInput - The input type for the therapistChat function.
 * - TherapistChatOutput - The return type for the therapistChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TherapistChatInputSchema = z.object({
  message: z.string().describe('The user message to respond to.'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']).describe('The role of the message sender.'),
    content: z.string().describe('The content of the message.'),
  })).optional().describe('The chat history.'),
});
export type TherapistChatInput = z.infer<typeof TherapistChatInputSchema>;

const TherapistChatOutputSchema = z.object({
  response: z.string().describe('The response from the AI therapist.'),
});
export type TherapistChatOutput = z.infer<typeof TherapistChatOutputSchema>;

export async function therapistChat(input: TherapistChatInput): Promise<TherapistChatOutput> {
  return therapistChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'therapistChatPrompt',
  input: {schema: TherapistChatInputSchema},
  output: {schema: TherapistChatOutputSchema},
  prompt: `You are an AI therapist providing mental health support and guidance. Respond to the user message with empathy and understanding.

Chat History:
{{#each chatHistory}}
  {{#ifEquals role "user"}}User:{{else}}Therapist:{{/ifEquals}} {{content}}
{{/each}}

User Message: {{{message}}}

Therapist:`, // the Handlebar ifEquals helper is used here to check the role in the chat history messages
  helpers: {
    ifEquals: function(arg1: any, arg2: any, options: any) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    }
  }
});

const therapistChatFlow = ai.defineFlow(
  {
    name: 'therapistChatFlow',
    inputSchema: TherapistChatInputSchema,
    outputSchema: TherapistChatOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {response: output!.response};
  }
);
