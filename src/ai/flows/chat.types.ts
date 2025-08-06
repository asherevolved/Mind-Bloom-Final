
import {z} from 'genkit';

export const TherapistChatInputSchema = z.object({
  message: z.string().describe('The user message to respond to.'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']).describe('The role of the message sender.'),
    content: z.string().describe('The content of the message.'),
  })).optional().describe('The chat history.'),
  therapyTone: z.string().optional().describe("The user's preferred therapy tone (e.g., 'Reflective Listener', 'Motivational Coach')."),
});
export type TherapistChatInput = z.infer<typeof TherapistChatInputSchema>;
