
// src/ai/flows/task-suggestions.ts
'use server';
/**
 * @fileOverview A flow for suggesting daily tasks based on therapy history and emotional state.
 *
 * - suggestDailyTasks - A function that suggests daily tasks.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { SuggestDailyTasksInput, SuggestDailyTasksInputSchema, SuggestDailyTasksOutput, SuggestDailyTasksOutputSchema } from './chat.types';

export async function suggestDailyTasks(input: SuggestDailyTasksInput): Promise<SuggestDailyTasksOutput> {
  return suggestDailyTasksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDailyTasksPrompt',
  input: {schema: SuggestDailyTasksInputSchema},
  output: {schema: SuggestDailyTasksOutputSchema},
  prompt: `Based on the user's therapy history and current emotional state, suggest 3-5 daily tasks to improve their mental well-being.

Therapy History: {{{therapyHistory}}}
Emotional State: {{{emotionalState}}}

Tasks:`,
});

const suggestDailyTasksFlow = ai.defineFlow(
  {
    name: 'suggestDailyTasksFlow',
    inputSchema: SuggestDailyTasksInputSchema,
    outputSchema: SuggestDailyTasksOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
