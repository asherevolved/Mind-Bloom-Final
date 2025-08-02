// src/ai/flows/task-suggestions.ts
'use server';
/**
 * @fileOverview A flow for suggesting daily tasks based on therapy history and emotional state.
 *
 * - suggestDailyTasks - A function that suggests daily tasks.
 * - SuggestDailyTasksInput - The input type for the suggestDailyTasks function.
 * - SuggestDailyTasksOutput - The return type for the suggestDailyTasks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestDailyTasksInputSchema = z.object({
  therapyHistory: z
    .string()
    .describe('The user\u2019s therapy history, including chat transcripts and analysis.'),
  emotionalState: z
    .string()
    .describe('A description of the user\u2019s current emotional state.'),
});
export type SuggestDailyTasksInput = z.infer<typeof SuggestDailyTasksInputSchema>;

const SuggestDailyTasksOutputSchema = z.object({
  tasks: z.array(z.string()).describe('A list of suggested daily tasks.'),
});
export type SuggestDailyTasksOutput = z.infer<typeof SuggestDailyTasksOutputSchema>;

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
