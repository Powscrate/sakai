// trend-explanation.ts
'use server';
/**
 * @fileOverview Trend explanation AI agent.
 *
 * - trendExplanation - A function that handles the trend explanation process.
 * - TrendExplanationInput - The input type for the trendExplanation function.
 * - TrendExplanationOutput - The return type for the trendExplanation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TrendExplanationInputSchema = z.object({
  metricsData: z.string().describe('The user life metrics data in JSON format.'),
  trendDescription: z.string().describe('The description of the trend.'),
});
export type TrendExplanationInput = z.infer<typeof TrendExplanationInputSchema>;

const TrendExplanationOutputSchema = z.object({
  explanation: z.string().describe('The natural language explanation of the trend.'),
});
export type TrendExplanationOutput = z.infer<typeof TrendExplanationOutputSchema>;

export async function trendExplanation(input: TrendExplanationInput): Promise<TrendExplanationOutput> {
  return trendExplanationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'trendExplanationPrompt',
  input: {schema: TrendExplanationInputSchema},
  output: {schema: TrendExplanationOutputSchema},
  prompt: `You are an AI assistant specialized in explaining trends in life metrics data.

  You will receive life metrics data and a description of a trend in that data.
  You will provide a natural language explanation of the trend, making it easy for the user to understand.

  Life Metrics Data: {{{metricsData}}}
  Trend Description: {{{trendDescription}}}

  Explanation: `,
});

const trendExplanationFlow = ai.defineFlow(
  {
    name: 'trendExplanationFlow',
    inputSchema: TrendExplanationInputSchema,
    outputSchema: TrendExplanationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
