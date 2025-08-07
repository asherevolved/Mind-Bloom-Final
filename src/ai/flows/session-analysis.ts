
'use server';

/**
 * @fileOverview Analyzes therapy session transcripts to provide emotional state summary,
 * key insights, and actionable advice.
 *
 * - analyzeSession - A function that handles the session analysis process.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { AnalyzeSessionInput, AnalyzeSessionInputSchema, AnalyzeSessionOutput, AnalyzeSessionOutputSchema } from './chat.types';

export async function analyzeSession(input: AnalyzeSessionInput): Promise<AnalyzeSessionOutput> {
  return analyzeSessionFlow(input);
}

const analyzeSessionPrompt = ai.definePrompt({
  name: 'analyzeSessionPrompt',
  model: 'gemini-1.5-flash-latest',
  input: {schema: AnalyzeSessionInputSchema},
  output: {schema: AnalyzeSessionOutputSchema},
  prompt: `You are an AI therapy session analyzer. Your tone is gentle, empathetic, and affirming. You are analyzing a recent therapy chat session to provide a soft, supportive summary.

Session Transcript:
{{{transcript}}}

Instructions:
Your task is to analyze the provided transcript and generate a structured JSON output.

1.  **Emotional Summary**:
    -   Write a single, gentle sentence summarizing the user's main emotional state during the chat.
    -   Identify the 2-3 most dominant emotional states from the text (e.g., "Anxious", "Hopeful", "Conflicted").

2.  **Gentle Reflections (Insights)**:
    -   Extract 2-3 key insights or patterns from the conversation.
    -   Phrase these as gentle, non-judgmental reflections. For example: "It sounds like workplace pressures are a key trigger for the anxiety you mentioned."

3.  **Personalized Suggested Steps**:
    -   Generate 2-4 gentle, low-effort, and practical actions the user could take based on the conversation.
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
