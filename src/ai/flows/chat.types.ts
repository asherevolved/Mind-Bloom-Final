
import {z} from 'genkit';

// For Chat
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  id: z.string().optional(),
  audioUrl: z.string().optional(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ConversationSchema = z.object({
    id: z.string(),
    title: z.string(),
    created_at: z.string(),
    status: z.enum(['active', 'ended']),
});
export type Conversation = z.infer<typeof ConversationSchema>;


export const TherapistChatInputSchema = z.object({
  message: z.string().describe('The latest message from the user.'),
  therapyTone: z.string().optional().describe("The user's preferred communication style for the AI therapist (e.g., 'Reflective Listener')."),
  chatHistory: z.array(z.object({role: z.enum(['user', 'assistant']), content: z.string()})).optional().describe('An array of previous messages in the conversation.'),
});
export type TherapistChatInput = z.infer<typeof TherapistChatInputSchema>;
export type TherapistChatOutput = z.infer<typeof z.string>;
export type TherapistChatStreamOutput = z.infer<typeof z.string>;


// For Session Analysis
export const AnalyzeSessionInputSchema = z.object({
  transcript: z
    .string()
    .describe('The full transcript of the therapy session.'),
});
export type AnalyzeSessionInput = z.infer<typeof AnalyzeSessionInputSchema>;

export const AnalyzeSessionOutputSchema = z.object({
  emotionalSummary: z.object({
      summaryText: z.string().describe("A brief, one-sentence summary of the user's emotional state during the session."),
      dominantStates: z.array(z.string()).describe("A list of the 2-3 most dominant emotional states observed (e.g., 'Anxious', 'Hopeful', 'Conflicted').")
  }),
  insights: z.array(z.string()).describe("2-3 gentle, reflective insights based on the conversation."),
  suggestedSteps: z.array(z.object({
      title: z.string().describe("A short, clear title for the suggested action."),
      description: z.string().describe("A one-sentence description of the gentle, low-effort action."),
  })).describe("A list of 2-4 gentle, actionable steps the user can take.")
});
export type AnalyzeSessionOutput = z.infer<typeof AnalyzeSessionOutputSchema>;


// For Dashboard Tip
export const GetAiTipInputSchema = z.object({
  onboardingGoals: z.array(z.string()).describe("The user's stated goals from onboarding (e.g., 'Anxiety', 'Focus')."),
  recentMood: z.string().describe("The user's most recent mood log entry note."),
});
export type GetAiTipInput = z.infer<typeof GetAiTipInputSchema>;

export const GetAiTipOutputSchema = z.object({
  tip: z.string().describe('A single, concise, and actionable wellness tip for the user.'),
});
export type GetAiTipOutput = z.infer<typeof GetAiTipOutputSchema>;


// For Task Suggestions
export const SuggestDailyTasksInputSchema = z.object({
  therapyHistory: z
    .string()
    .describe('The user’s therapy history, including chat transcripts and analysis.'),
  emotionalState: z
    .string()
    .describe('A description of the user’s current emotional state.'),
});
export type SuggestDailyTasksInput = z.infer<typeof SuggestDailyTasksInputSchema>;

export const SuggestDailyTasksOutputSchema = z.object({
  tasks: z.array(z.string()).describe('A list of suggested daily tasks.'),
});
export type SuggestDailyTasksOutput = z.infer<typeof SuggestDailyTasksOutputSchema>;


// For Text-to-Speech
export const TextToSpeechInputSchema = z.object({
  text: z.string().describe('The text to be converted to speech.'),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;
export type TextToSpeechOutput = string;
