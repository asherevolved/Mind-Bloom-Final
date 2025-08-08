
'use server';
/**
 * @fileOverview A flow for generating a daily AI-powered wellness tip.
 *
 * - getAiTip - Generates a personalized wellness tip.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import Groq from 'groq-sdk';
import { GetAiTipInput, GetAiTipInputSchema, GetAiTipOutput, GetAiTipOutputSchema } from './chat.types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const promptTemplate = `You are a helpful and gentle wellness assistant. Your task is to provide a single, actionable wellness tip for the user's dashboard.

The tip should be:
- Concise (one sentence).
- Actionable and easy to do.
- Personalized based on the user's goals and recent mood.
- Encouraging and supportive in tone.

User's Information:
- Onboarding Goals: {{onboardingGoals}}
- Recent Mood Note: "{{recentMood}}"

Based on this information, provide one wellness tip. For example, if the user wants to work on Anxiety and their recent mood is "stressed about work", a good tip would be "Feeling overwhelmed? Try the 5-minute box breathing exercise in the Calm section to find your center."

Generate the tip now.`;


const getAiTipFlow = ai.defineFlow(
    {
      name: 'getAiTipFlow',
      inputSchema: GetAiTipInputSchema,
      outputSchema: GetAiTipOutputSchema,
    },
    async (input) => {
        const filledPrompt = promptTemplate
            .replace('{{onboardingGoals}}', input.onboardingGoals.join(', '))
            .replace('{{recentMood}}', input.recentMood);

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: filledPrompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            // @ts-ignore
            response_format: { type: 'json_object' },
        });

        const response = chatCompletion.choices[0]?.message?.content;
        if (!response) {
            throw new Error('No response from Groq API');
        }

        try {
            // Groq doesn't always perfectly adhere to the JSON object format, so we parse defensively
            const parsed = JSON.parse(response);
            return GetAiTipOutputSchema.parse(parsed);
        } catch (error) {
            console.error("Failed to parse Groq JSON response:", error);
            // Fallback: if parsing fails, try to extract the tip manually
            if (response.includes("tip")) {
              const match = response.match(/"tip"\s*:\s*"([^"]+)"/);
              if (match && match[1]) {
                return { tip: match[1] };
              }
            }
            // If all else fails, return a default tip
            return { tip: "Take a moment for yourself today. You've earned it." };
        }
    }
);


export async function getAiTip(input: GetAiTipInput): Promise<GetAiTipOutput> {
  return getAiTipFlow(input);
}
