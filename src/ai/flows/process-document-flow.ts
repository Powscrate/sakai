
'use server';
/**
 * @fileOverview Flux Genkit pour analyser un document texte ou PDF avec une invite.
 *
 * - processDocument - Fonction pour analyser un document.
 * - ProcessDocumentInput - Type d'entrée pour processDocument.
 * - ProcessDocumentOutput - Type de sortie pour processDocument.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProcessDocumentInputSchema = z.object({
  prompt: z.string().describe("L'invite textuelle pour guider l'analyse du document."),
  documentDataUri: z
    .string()
    .describe(
      "Le document à analyser, sous forme de Data URI (doit inclure le type MIME et l'encodage Base64, ex: 'data:application/pdf;base64,ENCODED_DATA')."
    ),
  mimeType: z.string().describe("Le type MIME du document, ex: 'application/pdf', 'text/plain', 'text/markdown'.")
});
export type ProcessDocumentInput = z.infer<typeof ProcessDocumentInputSchema>;

const ProcessDocumentOutputSchema = z.object({
  analysis: z.string().optional().describe("Le texte résultant de l'analyse du document."),
  error: z.string().optional().describe("Un message d'erreur si l'analyse a échoué."),
});
export type ProcessDocumentOutput = z.infer<typeof ProcessDocumentOutputSchema>;

export async function processDocument(input: ProcessDocumentInput): Promise<ProcessDocumentOutput> {
  return processDocumentFlow(input);
}

const processDocumentFlow = ai.defineFlow(
  {
    name: 'processDocumentFlow',
    inputSchema: ProcessDocumentInputSchema,
    outputSchema: ProcessDocumentOutputSchema,
  },
  async (input) => {
    try {
      const { text } = await ai.generate({
        model: 'googleai/gemini-1.5-flash-latest', // Modèle supportant l'analyse multimodale de documents
        prompt: [
          { media: { url: input.documentDataUri, mimeType: input.mimeType } },
          { text: input.prompt },
        ],
        config: {
          temperature: 0.4, // Température modérée pour une analyse factuelle mais comprehensive
          safetySettings: [ // Configuration de sécurité standard
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        },
      });

      if (text) {
        return { analysis: text };
      } else {
        return { error: "Aucune analyse textuelle n'a été générée pour le document." };
      }
    } catch (error: any) {
      console.error("Erreur lors de l'analyse du document:", error);
      return { error: error.message || "Une erreur est survenue lors de l'analyse du document." };
    }
  }
);
