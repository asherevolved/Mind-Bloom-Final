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
    .describe('The complete transcript of the therapy session (text and voice).'),
});
export type AnalyzeSessionInput = z.infer<typeof AnalyzeSessionInputSchema>;

const AnalyzeSessionOutputSchema = z.object({
  moodAnalysis: z
    .string()
    .describe(
      'A summary of the emotional state expressed in the session, including identified mood words and emotional categories (e.g., 50% anxious).'
    ),
  keyInsights: z
    .string()
    .describe(
      'Key themes and insights extracted from the session, such as frequently mentioned topics or recurring concerns.'
    ),
  advice: z
    .string()
    .describe(
      '2-3 actionable pieces of advice generated from the session analysis, such as journaling or reaching out to a friend.'
    ),
});
export type AnalyzeSessionOutput = z.infer<typeof AnalyzeSessionOutputSchema>;

export async function analyzeSession(input: AnalyzeSessionInput): Promise<AnalyzeSessionOutput> {
  return analyzeSessionFlow(input);
}

const analyzeSessionPrompt = ai.definePrompt({
  name: 'analyzeSessionPrompt',
  input: {schema: AnalyzeSessionInputSchema},
  output: {schema: AnalyzeSessionOutputSchema},
  prompt: `You are an AI therapy session analyzer.  You are provided with the
transcript of a therapy session, and your goal is to provide a summary of the
user's emotional state, key insights, and actionable advice.

Transcript:
{{transcript}}

Instructions:
1. Mood Analysis: Summarize the emotional state expressed in the session. Include
   identified mood words and emotional categories (e.g., 50% anxious).
2. Key Insights: Extract key themes and insights from the session, such as
   frequently mentioned topics or recurring concerns.
3. Advice: Generate 2-3 actionable pieces of advice based on the session analysis,
   such as journaling or reaching out to a friend.

Ensure that the advice is practical and easy to implement in the user's daily life.

Output in the following format:
{
  "moodAnalysis": "...",
  "keyInsights": "...",
  "advice": "..."
}
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
