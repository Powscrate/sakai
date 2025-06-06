
'use server';
/**
 * @fileOverview Outil Genkit pour la recherche web utilisant le scraping.
 *
 * - webSearchTool - Outil pour effectuer une recherche web.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as cheerio from 'cheerio';

const WebSearchInputSchema = z.object({
  query: z.string().describe('La requête de recherche pour le web ou une URL directe.'),
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

// Helper function to check if a string is a valid URL
function isValidHttpUrl(string: string) {
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

async function scrapeUrl(url: string): Promise<Omit<WebSearchOutputSchema, 'error'>> {
  try {
    console.log(`SACAI_TOOL: Tentative de scraping de l'URL: ${url}`);
    const response = await fetch(url, { headers: { 'User-Agent': 'SakaiSearchBot/1.0' } });
    if (!response.ok) {
      console.warn(`SACAI_TOOL: Échec de la récupération de ${url}. Statut: ${response.status}`);
      return { results: [] };
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('title').first().text() || $('h1').first().text() || url;
    
    let snippet = '';
    // Prioritize <article> or <main> content, then common content tags
    const mainContent = $('article').text() || $('main').text();
    if (mainContent.trim()) {
        snippet = mainContent.replace(/\s\s+/g, ' ').trim().substring(0, 500);
    } else {
        $('p, h2, h3, li').each((i, el) => {
          if (snippet.length < 450) { // Leave some room for ellipsis
            snippet += $(el).text().replace(/\s\s+/g, ' ').trim() + ' ';
          }
        });
        snippet = snippet.trim().substring(0, 500);
    }
    if (snippet.length === 500) snippet += '...';


    console.log(`SACAI_TOOL: Scraping de ${url} réussi. Titre: ${title.substring(0,50)}... Snippet: ${snippet.substring(0,50)}...`);
    return { results: [{ title, link: url, snippet }] };

  } catch (err: any) {
    console.error(`SACAI_TOOL: Erreur lors du scraping de l'URL ${url}:`, err);
    return { results: [] }; // Return empty results on error, error will be handled by the main tool
  }
}


export const webSearchTool = ai.defineTool(
  {
    name: 'webSearchTool',
    description:
      "Effectue une recherche sur le web ou récupère le contenu d'une URL spécifique pour trouver des informations récentes ou spécifiques que tu ne connais pas. Utilise ceci si la question de l'utilisateur semble nécessiter des connaissances actuelles, fait référence à une URL, ou demande des informations externes à ta base de données.",
    inputSchema: WebSearchInputSchema,
    outputSchema: WebSearchOutputSchema,
  },
  async (input) => {
    console.log(`SACAI_TOOL: webSearchTool a été appelé avec la requête: "${input.query}"`);

    if (isValidHttpUrl(input.query)) {
      console.log(`SACAI_TOOL: La requête est une URL valide. Tentative de scraping direct.`);
      const scrapeResult = await scrapeUrl(input.query);
      if (scrapeResult.results.length > 0) {
        return { results: scrapeResult.results };
      } else {
        return { results: [], error: `Impossible de récupérer ou de traiter le contenu de l'URL: ${input.query}` };
      }
    } else {
      // Utiliser DuckDuckGo HTML pour les requêtes de recherche générales
      console.log(`SACAI_TOOL: La requête n'est pas une URL. Recherche sur DuckDuckGo HTML pour: "${input.query}"`);
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(input.query)}`;
      try {
        const response = await fetch(searchUrl, { headers: { 'User-Agent': 'SakaiSearchBot/1.0 (+http://example.com/bot)' } }); // Soyez un bon citoyen du web
        if (!response.ok) {
          return { results: [], error: `Échec de la recherche web. Statut: ${response.status}` };
        }
        const html = await response.text();
        const $ = cheerio.load(html);
        const searchResults: WebSearchResultSchema[] = [];

        $('div.result').slice(0, 3).each((i, el) => { // Limiter à 3 résultats pour commencer
          const titleElement = $(el).find('h2.result__title a.result__a');
          const title = titleElement.text().trim();
          let link = titleElement.attr('href');
          const snippet = $(el).find('a.result__snippet').text().trim();

          if (title && link && snippet) {
            // Les liens de DuckDuckGo sont souvent des redirections. Essayons de les normaliser.
            const urlParams = new URLSearchParams(link.substring(link.indexOf('?') + 1));
            const actualUrl = urlParams.get('uddg');
            if (actualUrl) {
                link = decodeURIComponent(actualUrl);
            }
            
            searchResults.push({
              title,
              link,
              snippet,
            });
          }
        });
        
        if (searchResults.length === 0) {
            console.log("SACAI_TOOL: Aucun résultat trouvé sur DuckDuckGo HTML ou impossible de les parser.");
            return { results: [], error: "Aucun résultat pertinent trouvé ou impossible d'analyser les résultats de recherche." };
        }
        console.log(`SACAI_TOOL: Recherche DuckDuckGo HTML réussie. ${searchResults.length} résultats trouvés.`);
        return { results: searchResults };

      } catch (error: any) {
        console.error(`SACAI_TOOL: Erreur lors de la recherche web avec DuckDuckGo pour "${input.query}":`, error);
        return { results: [], error: `Erreur lors de la recherche web : ${error.message}` };
      }
    }
  }
);
