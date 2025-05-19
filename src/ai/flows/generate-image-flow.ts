
'use server';
/**
 * @fileOverview Flux Genkit pour générer des images avec Gemini.
 *
 * - generateImage - Fonction pour générer une image à partir d'une invite.
 * - GenerateImageInput - Type d'entrée pour generateImage.
 * - GenerateImageOutput - Type de sortie pour generateImage.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input schema simplified: only prompt is needed from the client now.
const GenerateImageInputSchema = z.object({
  prompt: z.string().describe("L'invite textuelle pour la génération de l'image."),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageUrl: z.string().optional().describe("L'URL de l'image générée (data URI)."),
  error: z.string().optional().describe("Un message d'erreur si la génération a échoué."),
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
  return generateImageFlow(input);
}

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async (input) => {
    try {
      // Style and aspect ratio are no longer passed directly from UI in this simplified version.
      // The core prompt itself will be used.
      // Advanced prompt engineering could be done here if needed, or inferred by the model.
      const imageGenPrompt = input.prompt;

      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: imageGenPrompt,
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        },
      });

      if (media?.url) {
        return { imageUrl: media.url };
      } else {
        // Try to get more specific error if available (e.g., from text part of response)
        // const textResponse = await ai.generate({ model: 'googleai/gemini-1.5-flash-latest', prompt: `Explique pourquoi la génération d'image pour "${imageGenPrompt}" pourrait avoir échoué sans retourner d'image.` });
        // const errorReason = textResponse.text ? ` Raison possible: ${textResponse.text}` : "";
        return { error: "Aucune image n'a été générée ou l'URL est manquante." /*+ errorReason*/ };
      }
    } catch (error: any) {
      console.error("Erreur lors de la génération de l'image:", error);
       if (error.message && error.message.includes('blocked by safety settings')) {
        return { error: 'La génération d\'image a été bloquée par les filtres de sécurité. Veuillez ajuster votre invite.'}
      }
      if (error.message && error.message.includes('upstream max user-project-qpm')) {
        return { error: 'Limite de quota atteinte pour la génération d\'images. Veuillez réessayer plus tard.'}
      }
      return { error: error.message || "Une erreur est survenue lors de la génération de l'image." };
    }
  }
);

    