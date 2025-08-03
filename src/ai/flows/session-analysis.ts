
'use server';

/**
 * @fileOverview Analyzes therapy session transcripts to provide emotional state summary,
 * key insights, and actionable advice, personalized with onboarding data.
 *
 * - analyzeSession - A function that handles the session analysis process.
 * - AnalyzeSessionInput - The input type for the analyzeSession function.
 * - AnalyzeSessionOutput - The return type for the analyzeSession function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeSessionInputSchema = z.object({
  transcript: z
    .string()
    .describe('The transcript of the last 10 messages of the therapy session.'),
  onboardingData: z.object({
      moodBaseline: z.number().optional().describe("User's initial mood score from onboarding."),
      supportTags: z.array(z.string()).optional().describe("User's stated areas of focus from onboarding (e.g., 'Anxiety', 'Focus')."),
      therapyTone: z.string().optional().describe("User's preferred therapy communication style."),
  }).optional().describe("Data from the user's onboarding quiz.")
});
export type AnalyzeSessionInput = z.infer<typeof AnalyzeSessionInputSchema>;

const AnalyzeSessionOutputSchema = z.object({
  emotionalSummary: z.object({
      summaryText: z.string().describe("A brief, one-sentence summary of the user's emotional state during the session."),
      dominantStates: z.array(z.string()).describe("A list of the 2-3 most dominant emotional states observed (e.g., 'Anxious', 'Hopeful', 'Conflicted').")
  }),
  insights: z.array(z.string()).describe("2-3 gentle, reflective insights based on the conversation, connecting back to the user's stated goals from onboarding."),
  suggestedSteps: z.array(z.object({
      title: z.string().describe("A short, clear title for the suggested action."),
      description: z.string().describe("A one-sentence description of the gentle, low-effort action, tailored to their onboarding goals."),
  })).describe("A list of 2-4 gentle, actionable steps the user can take, personalized based on their onboarding data.")
});
export type AnalyzeSessionOutput = z.infer<typeof AnalyzeSessionOutputSchema>;

export async function analyzeSession(input: AnalyzeSessionInput): Promise<AnalyzeSessionOutput> {
  return analyzeSessionFlow(input);
}

const analyzeSessionPrompt = ai.definePrompt({
  name: 'analyzeSessionPrompt',
  input: {schema: AnalyzeSessionInputSchema},
  output: {schema: AnalyzeSessionOutputSchema},
  prompt: `You are an AI therapy session analyzer. Your tone is gentle, empathetic, and affirming, matching the user's preferred style: {{onboardingData.therapyTone}}. You are analyzing a recent therapy chat session to provide a soft, supportive summary, keeping the user's onboarding goals in mind.

User's Onboarding Profile:
- Initial Mood Score: {{onboardingData.moodBaseline}}
- Stated Goals: {{#each onboardingData.supportTags}}{{{this}}}{{/each}}
- Preferred Style: {{onboardingData.therapyTone}}

Session Transcript:
{{{transcript}}}

Instructions:
Your task is to analyze the provided transcript and generate a structured JSON output.

1.  **Emotional Summary**:
    -   Write a single, gentle sentence summarizing the user's main emotional state during the chat.
    -   Identify the 2-3 most dominant emotional states from the text (e.g., "Anxious", "Hopeful", "Conflicted").

2.  **Gentle Reflections (Insights)**:
    -   Extract 2-3 key insights from the conversation.
    -   Phrase these as gentle, non-judgmental reflections.
    -   **Crucially, connect these insights back to the user's stated goals ({{#each onboardingData.supportTags}}{{{this}}}{{/each}}).** For example, if a goal is "Anxiety" and they discuss work stress, an insight could be: "It sounds like workplace pressures are a key trigger for the anxiety you wanted to work on."

3.  **Personalized Suggested Steps**:
    -   Generate 2-4 gentle, low-effort, and practical actions the user could take.
    -   **Tailor these steps to their stated goals.** If they want to work on 'Focus', suggest a task like "Try a 5-minute single-task exercise."
    -   Each step must have a clear, simple title and a one-sentence description.

Produce a valid JSON object based on the output schema.
`,
});

const analyzeSessionFlow = ai.defineFlow(
  {
    name: 'analyzeSessionFlow',
    inputSchema: AnalyzeSessionInputSchema,
    outputSchema: AnalyzeSessionOutputSchema,
  },
  async input => {
    const {output} = await analyzeSessionPrompt(input);
    return output!;
  }
);
