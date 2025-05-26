'use server';
/**
 * @fileOverview Outil Genkit simulé pour la recherche web.
 *
 * - webSearchTool - Outil pour effectuer une recherche web simulée.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const WebSearchInputSchema = z.object({
  query: z.string().describe('La requête de recherche pour le web.'),
});

const WebSearchResultSchema = z.object({
  title: z.string().describe('Le titre du résultat de recherche.'),
  link: z.string().url().describe("L'URL du résultat de recherche."),
  snippet: z.string().describe('Un court extrait du contenu de la page.'),
});

const WebSearchOutputSchema = z.object({
  results: z
    .array(WebSearchResultSchema)
    .describe(
      'Une liste de résultats de recherche. Peut être vide si aucun résultat pertinent.'
    ),
  error: z.string().optional().describe("Message d'erreur si la recherche a échoué."),
});

export const webSearchTool = ai.defineTool(
  {
    name: 'webSearchTool',
    description:
      "Effectue une recherche sur le web pour trouver des informations récentes ou spécifiques que tu ne connais pas. Utilise ceci si la question de l'utilisateur semble nécessiter des connaissances actuelles ou externes à ta base de données.",
    inputSchema: WebSearchInputSchema,
    outputSchema: WebSearchOutputSchema,
  },
  async (input) => {
    console.log(`SACAI_TOOL: webSearchTool a été appelé avec la requête: "${input.query}"`);
    // === SIMULATION D'UNE RECHERCHE WEB ===
    // Dans une vraie application, vous appelleriez ici une API de recherche (Google, Serper, etc.)
    // Pour l'instant, nous retournons des résultats simulés.

    if (input.query.toLowerCase().includes('météo à paris')) {
      return {
        results: [
          {
            title: 'Météo Paris - Aujourd\'hui et Prévisions',
            link: 'https://www.meteo-paris-example.com',
            snippet:
              'La météo actuelle à Paris est ensoleillée avec 22°C. Des averses sont prévues pour ce soir.',
          },
          {
            title: 'Quel temps fait-il à Paris ? - Guide Voyage',
            link: 'https://www.guide-voyage-paris-example.com/meteo',
            snippet:
              'Paris bénéficie d\'un climat tempéré. L\'été est généralement chaud et l\'hiver peut être froid avec de la neige occasionnelle.',
          },
        ],
      };
    }

    if (input.query.toLowerCase().includes('qui a gagné roland garros 2024')) {
        return {
            results: [
                {
                    title: "Carlos Alcaraz remporte Roland-Garros 2024",
                    link: "https://www.rolandgarros.com/fr-fr/article/rg24-finale-messieurs-carlos-alcaraz-alexander-zverev-resume",
                    snippet: "L'Espagnol Carlos Alcaraz a remporté son premier titre à Roland-Garros en battant Alexander Zverev en finale de l'édition 2024."
                }
            ]
        }
    }


    // Résultat par défaut si la requête n'est pas gérée par les simulations ci-dessus
    return {
      results: [
        {
          title: `Résultats simulés pour : ${input.query}`,
          link: `https://www.example-search.com/search?q=${encodeURIComponent(input.query)}`,
          snippet: `Ceci est un extrait simulé pour la recherche "${input.query}". Dans une application réelle, de vrais résultats seraient affichés ici.`,
        },
      ],
    };
  }
);
