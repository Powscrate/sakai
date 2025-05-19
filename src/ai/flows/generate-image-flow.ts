
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
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', // Modèle spécifique pour la génération d'images
        prompt: input.prompt,
        config: {
          responseModalities: ['IMAGE', 'TEXT'], // Doit inclure TEXT même si on attend une image
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
          // Vous pouvez ajouter d'autres configurations ici comme le nombre d'images, la taille, etc.
          // Par exemple: generation_config: { candidate_count: 1 }
        },
      });

      if (media?.url) {
        return { imageUrl: media.url };
      } else {
        return { error: "Aucune image n'a été générée ou l'URL est manquante." };
      }
    } catch (error: any) {
      console.error("Erreur lors de la génération de l'image:", error);
      return { error: error.message || "Une erreur est survenue lors de la génération de l'image." };
    }
  }
);
