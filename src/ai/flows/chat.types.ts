
import {z} from 'genkit';

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const TherapistChatInputSchema = z.object({
  message: z.string().describe('The latest message from the user.'),
  therapyTone: z.string().optional().describe("The user's preferred communication style for the AI therapist (e.g., 'Reflective Listener')."),
  chatHistory: z.array(ChatMessageSchema).optional().describe('An array of previous messages in the conversation.'),
});
export type TherapistChatInput = z.infer<typeof TherapistChatInputSchema>;
