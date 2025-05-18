// trend-explanation.ts
'use server';
/**
 * @fileOverview Agent IA pour l'explication des tendances.
 *
 * - trendExplanation - Une fonction qui gère le processus d'explication des tendances.
 * - TrendExplanationInput - Le type d'entrée pour la fonction trendExplanation.
 * - TrendExplanationOutput - Le type de retour pour la fonction trendExplanation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TrendExplanationInputSchema = z.object({
  metricsData: z.string().describe("Les données des métriques de vie de l'utilisateur au format JSON."),
  trendDescription: z.string().describe("La description de la tendance et la période concernée. Inclut aussi la date actuelle pour contexte et la langue de réponse souhaitée."),
});
export type TrendExplanationInput = z.infer<typeof TrendExplanationInputSchema>;

const TrendExplanationOutputSchema = z.object({
  explanation: z.string().describe("L'explication en langage naturel de la tendance, en français."),
});
export type TrendExplanationOutput = z.infer<typeof TrendExplanationOutputSchema>;

export async function trendExplanation(input: TrendExplanationInput): Promise<TrendExplanationOutput> {
  return trendExplanationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'trendExplanationPrompt',
  input: {schema: TrendExplanationInputSchema},
  output: {schema: TrendExplanationOutputSchema},
  prompt: `Vous êtes un assistant IA spécialisé dans l'explication des tendances des données de métriques de vie.
  Vous devez impérativement répondre en FRANÇAIS.

  Vous recevrez des données de métriques de vie et une description d'une tendance dans ces données, incluant la période et la date actuelle.
  Vous fournirez une explication en langage naturel de la tendance, la rendant facile à comprendre pour l'utilisateur. Soyez perspicace et mettez en évidence les points clés.

  Données des Métriques de Vie (JSON): {{{metricsData}}}
  Description de la Tendance: {{{trendDescription}}}

  Explication (en français): `,
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
