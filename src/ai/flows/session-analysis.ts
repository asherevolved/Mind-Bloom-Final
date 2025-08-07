
'use server';

/**
 * @fileOverview Analyzes therapy session transcripts to provide emotional state summary,
 * key insights, and actionable advice.
 *
 * - analyzeSession - A function that handles the session analysis process.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import Groq from 'groq-sdk';
import { AnalyzeSessionInput, AnalyzeSessionInputSchema, AnalyzeSessionOutput, AnalyzeSessionOutputSchema } from './chat.types';


const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const promptTemplate = `You are an AI therapy session analyzer. Your tone is gentle, empathetic, and affirming. You are analyzing a recent therapy chat session to provide a soft, supportive summary.

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
`;

const analyzeSessionFlow = ai.defineFlow(
  {
    name: 'analyzeSessionFlow',
    inputSchema: AnalyzeSessionInputSchema,
    outputSchema: AnalyzeSessionOutputSchema,
  },
  async (input) => {
    const filledPrompt = promptTemplate.replace('{{{transcript}}}', input.transcript);

    const chatCompletion = await groq.chat.completions.create({
        messages: [
            { role: 'user', content: filledPrompt },
        ],
        model: 'llama3-70b-8192',
        // @ts-ignore
        response_format: { type: "json_object" },
    });

    const response = chatCompletion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from Groq API');
    }
    
    // The model sometimes returns the JSON wrapped in markdown, so we clean it
    const cleanedResponse = response.replace(/^```json\n/, '').replace(/\n```$/, '');

    try {
        const parsed = JSON.parse(cleanedResponse);
        return AnalyzeSessionOutputSchema.parse(parsed);
    } catch(e) {
        console.error("Failed to parse session analysis JSON:", e);
        console.error("Raw response from Groq:", response);
        throw new Error("The AI returned an invalid analysis format. Please try again.");
    }
  }
);


export async function analyzeSession(input: AnalyzeSessionInput): Promise<AnalyzeSessionOutput> {
  return analyzeSessionFlow(input);
}
