
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

IMPORTANT: You must respond with ONLY a valid JSON object in this exact format:
{
  "emotionalSummary": {
    "summaryText": "A brief, one-sentence summary of the user's emotional state.",
    "dominantStates": ["State1", "State2", "State3"]
  },
  "insights": [
    "First gentle insight about the conversation.",
    "Second gentle insight about patterns observed.",
    "Third gentle insight if applicable."
  ],
  "suggestedSteps": [
    {
      "title": "Action Title",
      "description": "One-sentence description of the gentle action."
    },
    {
      "title": "Another Action",
      "description": "Another one-sentence description."
    }
  ]
}

Do not include any text before or after the JSON object. Only return valid JSON.
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
        model: 'llama-3.3-70b-versatile',
        // @ts-ignore
        response_format: { type: "json_object" },
    });

    const response = chatCompletion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from Groq API');
    }
    
    // Clean the response more thoroughly
    let cleanedResponse = response.trim();
    
    // Remove markdown code blocks if present
    cleanedResponse = cleanedResponse.replace(/^```json\s*\n?/, '').replace(/\n?\s*```$/, '');
    cleanedResponse = cleanedResponse.replace(/^```\s*\n?/, '').replace(/\n?\s*```$/, '');
    
    // Remove any leading/trailing text that might not be JSON
    const jsonStart = cleanedResponse.indexOf('{');
    const jsonEnd = cleanedResponse.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
    }

    try {
        const parsed = JSON.parse(cleanedResponse);
        return AnalyzeSessionOutputSchema.parse(parsed);
    } catch(e) {
        console.error("Failed to parse session analysis JSON:", e);
        console.error("Raw response from Groq:", response);
        console.error("Cleaned response:", cleanedResponse);
        
        // Fallback: Create a basic analysis if parsing fails
        const fallbackAnalysis = {
          emotionalSummary: {
            summaryText: "The user shared their thoughts and feelings during this conversation.",
            dominantStates: ["Reflective", "Engaged"]
          },
          insights: [
            "You took time to express your thoughts and feelings.",
            "Engaging in conversation shows your willingness to explore your emotions."
          ],
          suggestedSteps: [
            {
              title: "Continue Self-Reflection",
              description: "Take a few moments each day to check in with your emotions."
            },
            {
              title: "Practice Mindfulness",
              description: "Try a brief mindfulness exercise when you feel overwhelmed."
            }
          ]
        };
        
        return AnalyzeSessionOutputSchema.parse(fallbackAnalysis);
    }
  }
);


export async function analyzeSession(input: AnalyzeSessionInput): Promise<AnalyzeSessionOutput> {
  return analyzeSessionFlow(input);
}
