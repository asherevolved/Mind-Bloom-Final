
'use server';
/**
 * @fileOverview A flow for generating a daily AI-powered wellness tip.
 *
 * - getAiTip - Generates a personalized wellness tip.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { GetAiTipInput, GetAiTipInputSchema, GetAiTipOutput, GetAiTipOutputSchema } from './chat.types';


const prompt = ai.definePrompt({
  name: 'dashboardTipPrompt',
  model: 'gemini-1.5-flash-latest',
  input: {schema: GetAiTipInputSchema},
  output: {schema: GetAiTipOutputSchema},
  prompt: `You are a helpful and gentle wellness assistant. Your task is to provide a single, actionable wellness tip for the user's dashboard.

The tip should be:
- Concise (one sentence).
- Actionable and easy to do.
- Personalized based on the user's goals and recent mood.
- Encouraging and supportive in tone.

User's Information:
- Onboarding Goals: {{#each onboardingGoals}}{{{this}}}{{/each}}
- Recent Mood Note: "{{recentMood}}"

Based on this information, provide one wellness tip. For example, if the user wants to work on Anxiety and their recent mood is "stressed about work", a good tip would be "Feeling overwhelmed? Try the 5-minute box breathing exercise in the Calm section to find your center."

Generate the tip now.`,
});


export async function getAiTip(input: GetAiTipInput): Promise<GetAiTipOutput> {
  const {output} = await prompt(input);
  return output!;
}
