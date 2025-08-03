
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
  therapyTone: z.string().optional().describe("The user's preferred therapy tone (e.g., 'Reflective Listener', 'Motivational Coach')."),
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
  prompt: `You are an AI therapist named Bloom. Your goal is to provide mental health support with empathy and understanding.

Your tone should be warm, validating, and affirming. Your communication style should align with the user's preferred therapy tone: {{therapyTone}}. Keep your responses concise and conversational, but ensure they are contextually relevant. Refer back to themes or specific points the user has made in the conversation to show you are listening.

Analyze the user's message in the context of the recent chat history. Respond with empathy, and if appropriate, ask a gentle, open-ended question to encourage deeper reflection. Avoid giving direct advice unless the user explicitly asks for it.

Chat History:
{{#each chatHistory}}
  {{#ifEquals role "user"}}User: {{content}}{{else}}Bloom: {{content}}{{/ifEquals}}
{{/each}}

User's Latest Message: "{{message}}"

Bloom's Caring Response (as a {{therapyTone}}):`,
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
