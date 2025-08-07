
'use server';
/**
 * @fileOverview A streaming therapist chatbot AI agent.
 *
 * This flow is optimized for real-time, token-by-token responses.
 *
 * - therapistChatStreamFlow - The Genkit flow that handles the streaming chatbot process.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'genkit';

// Re-using the same input schema from the non-streaming version
import {TherapistChatInput, TherapistChatInputSchema} from './chat.types';

// The streaming flow will output chunks of text content.
const TherapistChatStreamOutputSchema = z.string();

// Define the streaming prompt, similar to the non-streaming one.
const streamingPrompt = ai.definePrompt({
  name: 'therapistChatStreamingPrompt',
  model: googleAI.model('gemini-1.5-pro-latest'),
  input: {schema: TherapistChatInputSchema},
  output: {schema: z.object({response: TherapistChatStreamOutputSchema})},
  prompt: `You are an AI therapist named Bloom. Your primary goal is to provide mental health support with deep empathy, compassion, and understanding. You are a safe, non-judgmental space for the user to explore their feelings.

Your Core Principles:
1.  **Validate Feelings First**: Always start by acknowledging and validating the user's emotions. Use phrases like "It sounds like you're feeling so overwhelmed," "That makes complete sense," or "Thank you for sharing that with me; it takes courage."
2.  **Practice Reflective Listening**: Gently summarize the user's key points to show you are listening and to help them hear their own thoughts. For example: "So, on one hand you feel X, but on the other, you're also feeling Y. Is that right?"
3.  **Ask Gentle, Open-Ended Questions**: Encourage deeper reflection by asking questions that can't be answered with a simple 'yes' or 'no'. For instance: "How did that feel for you?" or "What was going through your mind at that moment?"
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

// Define the main streaming flow.
export const therapistChatStreamFlow = ai.defineFlow(
  {
    name: 'therapistChatStreamFlow',
    inputSchema: TherapistChatInputSchema,
    outputSchema: z.void(), // No final output, chunks are streamed.
    streamSchema: z.object({chunk: TherapistChatStreamOutputSchema}),
  },
  async (input, stream) => {
    // Process chat history to add boolean flags for the template
    const processedChatHistory = input.chatHistory?.map(msg => ({
      ...msg,
      isUser: msg.role === 'user',
      isAssistant: msg.role === 'assistant',
    })) || [];

    // Call the prompt object directly, which handles the AI generation.
    const {stream: resultStream, response} = await streamingPrompt({
      ...input,
      chatHistory: processedChatHistory,
    });

    // Stream the results back to the client
    for await (const chunk of resultStream) {
      if (chunk.output?.response) {
        stream.write({chunk: chunk.output.response as string});
      }
    }
     // Wait for the full response to be available.
    await response;
  }
);
