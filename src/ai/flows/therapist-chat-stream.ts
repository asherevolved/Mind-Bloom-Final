
'use server';
/**
 * @fileOverview A streaming AI chatbot flow for Mind Bloom.
 *
 * - therapistChatStream - A streaming function for real-time chat.
 * - TherapistChatInput - The input type for the therapistChatStream function (re-exported).
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'genkit';
import {
  TherapistChatInput,
  TherapistChatInputSchema,
} from './chat.types';

export {TherapistChatInput};
export type TherapistChatStreamOutput = z.infer<typeof z.string>;


// Define the prompt for the therapist chatbot with streaming support
const streamingPrompt = ai.definePrompt(
  {
    name: 'therapistChatStreamingPrompt',
    model: googleAI.model('gemini-1.5-flash-latest'),
    input: {
      schema: z.object({
        ...TherapistChatInputSchema.shape,
        // Add processed chat history for safe template rendering
        processedChatHistory: z.array(z.object({
          isUser: z.boolean(),
          isAssistant: z.boolean(),
          content: z.string(),
        })).optional(),
      }),
    },
    prompt: `You are an AI therapist named Bloom. Your primary goal is to provide mental health support with deep empathy, compassion, and understanding. You are a safe, non-judgmental space for the user to explore their feelings.

Your Core Principles:
1.  **Validate Feelings First**: Always start by acknowledging and validating the user's emotions. Use phrases like "It sounds like you're feeling so overwhelmed," "That makes complete sense," or "Thank you for sharing that with me; it takes courage."
2.  **Practice Reflective Listening**: Gently summarize the user's key points to show you are listening and to help them hear their own thoughts. For example: "So, on one hand you feel X, but on the other, you're also feeling Y. Is that right?"
3.  **Ask Gentle, Open-Ended Questions**: Encourage deeper reflection by asking questions that can't be answered with a simple 'yes' or 'no'. For instance: "How did that feel for you?" or "What was going through your mind at that moment?"
4.  **Be Warm and Affirming**: Your tone should always be warm, gentle, and supportive. Your communication style should align with the user's preferred therapy tone: {{therapyTone}}.
5.  **Be Context-Aware**: Refer back to themes or specific points the user has made in the conversation to show you are building a connection and remembering their story.

Chat History:
{{#each processedChatHistory}}
{{#if isUser}}
User: {{content}}
{{else}}
Bloom: {{content}}
{{/if}}
{{/each}}

User's Latest Message: "{{message}}"

Bloom's Caring & Empathetic Response (as a {{therapyTone}}):`,
  },
);

// Define the main flow for streaming chat
const therapistChatStreamFlow = ai.defineFlow(
  {
    name: 'therapistChatStreamFlow',
    inputSchema: TherapistChatInputSchema,
    outputSchema: z.string(),
    stream: true, // Enable streaming for this flow
  },
  async (input) => {
    // Process chat history to create a safe structure for the Handlebars template
    const processedChatHistory = input.chatHistory?.map((m) => ({
      ...m,
      isUser: m.role === 'user',
      isAssistant: m.role === 'assistant',
    }));
    
    // Generate the response as a stream
    const {stream} = await streamingPrompt({...input, processedChatHistory});
    
    return stream;
  }
);


/**
 * A streaming function that provides real-time chat responses from an AI therapist.
 *
 * @param {TherapistChatInput} input The user's message, chat history, and therapy tone.
 * @returns {AsyncGenerator<string>} A stream of text chunks representing the AI's response.
 */
export async function therapistChatStream(
  input: TherapistChatInput
): Promise<AsyncGenerator<string>> {
  const stream = await therapistChatStreamFlow(input);

  async function* transformStream(): AsyncGenerator<string> {
    for await (const chunk of stream) {
      if (chunk.chunk) {
        yield chunk.chunk;
      }
    }
  }

  return transformStream();
}
