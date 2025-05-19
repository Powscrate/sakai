
'use server';
/**
 * @fileOverview Flux Genkit pour analyser une image avec une invite textuelle.
 *
 * - analyzeImage - Fonction pour analyser une image.
 * - AnalyzeImageInput - Type d'entrée pour analyzeImage.
 * - AnalyzeImageOutput - Type de sortie pour analyzeImage.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeImageInputSchema = z.object({
  prompt: z.string().describe("L'invite textuelle pour guider l'analyse de l'image."),
  imageDataUri: z
    .string()
    .describe(
      "L'image à analyser, sous forme de Data URI (doit inclure le type MIME et l'encodage Base64, ex: 'data:image/png;base64,ENCODED_DATA')."
    ),
  mimeType: z.string().optional().describe("Le type MIME de l'image, ex: 'image/png' ou 'image/jpeg'. Inféré si non fourni pour les types communs.")
});
export type AnalyzeImageInput = z.infer<typeof AnalyzeImageInputSchema>;

const AnalyzeImageOutputSchema = z.object({
  analysis: z.string().optional().describe("Le texte résultant de l'analyse de l'image."),
  error: z.string().optional().describe("Un message d'erreur si l'analyse a échoué."),
});
export type AnalyzeImageOutput = z.infer<typeof AnalyzeImageOutputSchema>;

export async function analyzeImage(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
  return analyzeImageFlow(input);
}

const analyzeImageFlow = ai.defineFlow(
  {
    name: 'analyzeImageFlow',
    inputSchema: AnalyzeImageInputSchema,
    outputSchema: AnalyzeImageOutputSchema,
  },
  async (input) => {
    try {
      // Essayer d'inférer le mimeType si non fourni et si c'est un type commun
      let finalMimeType = input.mimeType;
      if (!finalMimeType && input.imageDataUri) {
        if (input.imageDataUri.startsWith('data:image/png;')) finalMimeType = 'image/png';
        else if (input.imageDataUri.startsWith('data:image/jpeg;')) finalMimeType = 'image/jpeg';
        else if (input.imageDataUri.startsWith('data:image/webp;')) finalMimeType = 'image/webp';
        // Ajoutez d'autres types si nécessaire
      }
      if (!finalMimeType) {
        // Si le mimeType ne peut pas être inféré et n'est pas fourni, cela peut poser problème au modèle.
        // Ou bien le modèle peut l'inférer, ou il faut le rendre obligatoire dans le schéma.
        // Pour l'instant, on laisse le modèle essayer.
        console.warn("MIME type for image analysis not provided and could not be inferred. Model performance may vary.");
      }

      const { text } = await ai.generate({
        model: 'googleai/gemini-1.5-flash-latest', // Modèle supportant l'analyse multimodale
        prompt: [
          { media: { url: input.imageDataUri, mimeType: finalMimeType } },
          { text: input.prompt },
        ],
        config: {
          temperature: 0.3, // Plus bas pour une analyse plus factuelle
          safetySettings: [
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
        return { error: "Aucune analyse textuelle n'a été générée." };
      }
    } catch (error: any) {
      console.error("Erreur lors de l'analyse de l'image:", error);
      return { error: error.message || "Une erreur est survenue lors de l'analyse de l'image." };
    }
  }
);
