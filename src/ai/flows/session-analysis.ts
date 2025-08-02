'use server';

/**
 * @fileOverview Analyzes therapy session transcripts to provide emotional state summary,
 * key insights, and actionable advice.
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
});
export type AnalyzeSessionInput = z.infer<typeof AnalyzeSessionInputSchema>;

const AnalyzeSessionOutputSchema = z.object({
  emotionalSummary: z.object({
      summaryText: z.string().describe("A brief, one-sentence summary of the user's emotional state."),
      dominantStates: z.array(z.string()).describe("A list of the 2-3 most dominant emotional states observed (e.g., 'Anxious', 'Hopeful', 'Conflicted').")
  }),
  insights: z.array(z.string()).describe("2-3 gentle, reflective insights based on the conversation. These should highlight patterns or underlying feelings in a soft, affirming tone."),
  suggestedSteps: z.array(z.object({
      title: z.string().describe("A short, clear title for the suggested action."),
      description: z.string().describe("A one-sentence description of the gentle, low-effort action."),
  })).describe("A list of 2-4 gentle, actionable steps the user can take.")
});
export type AnalyzeSessionOutput = z.infer<typeof AnalyzeSessionOutputSchema>;

export async function analyzeSession(input: AnalyzeSessionInput): Promise<AnalyzeSessionOutput> {
  return analyzeSessionFlow(input);
}

const analyzeSessionPrompt = ai.definePrompt({
  name: 'analyzeSessionPrompt',
  input: {schema: AnalyzeSessionInputSchema},
  output: {schema: AnalyzeSessionOutputSchema},
  prompt: `You are an AI therapy session analyzer. Your tone is gentle, empathetic, and affirming. You are analyzing a recent therapy chat session to provide a soft, supportive summary.

Session Transcript:
{{{transcript}}}

Instructions:
Your task is to analyze the provided transcript and generate a structured JSON output.

1.  **Emotional Summary**:
    -   Write a single, gentle sentence summarizing the user's main emotional state.
    -   Identify the 2-3 most dominant emotional states from the text (e.g., "Anxious", "Hopeful", "Conflicted").

2.  **Gentle Reflections (Insights)**:
    -   Extract 2-3 key insights or patterns from the conversation.
    -   Phrase these as gentle, non-judgmental reflections. For example: "It sounds like you might be carrying a lot of unspoken expectations," or "I noticed a pattern of being very hard on yourself."

3.  **Small Suggested Steps**:
    -   Generate 2-4 gentle, low-effort, and practical actions the user could take.
    -   Each step should have a clear, simple title and a one-sentence description.
    -   Examples: "Take a 10-minute walk with no phone," or "Write down one thing that made you smile today."

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
