
'use server';
/**
 * @fileOverview Flux Genkit pour générer des images avec Gemini.
 *
 * - generateImage - Fonction pour générer une image à partir d'une invite.
 * - GenerateImageInput - Type d'entrée pour generateImage.
 * - GenerateImageOutput - Type de sortie pour generateImage.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';

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
  try {
    console.log(`generateImageFlow called with prompt: "${input.prompt}"`);
    const imageGenPrompt = input.prompt;

    if (!imageGenPrompt || imageGenPrompt.trim() === "") {
        return { error: "L'invite pour la génération d'image ne peut pas être vide." };
    }

    const {media, text, candidates} = await ai.generate({
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
      // Check if the response was blocked by safety settings or other reasons
      if (candidates && candidates.length > 0 && candidates[0].finishReason === 'SAFETY') {
        const safetyRatings = candidates[0].safetyRatings?.map(r => `${r.category} (${r.probability})`).join(', ') || 'Non spécifié';
        const errorMessage = `La génération d'image a été bloquée par les filtres de sécurité. Ratings: ${safetyRatings}. Veuillez ajuster votre invite.`;
        console.warn("Image generation blocked by safety settings:", candidates[0]);
        return { error: errorMessage };
      }
      const errorReason = text || "Aucune image n'a été générée ou l'URL est manquante. Le modèle n'a pas fourni de raison spécifique.";
      console.warn("Image generation failed, no media URL. Reason from model (if any):", errorReason);
      return { error: errorReason };
    }
  } catch (error: any) {
    console.error("Erreur lors de la génération de l'image (generateImageFlow):", error);
    let errorMessage = "Une erreur inattendue est survenue lors de la génération de l'image.";
    if (error.message) {
        if (error.message.includes('blocked by safety settings') || error.message.includes('SAFETY')) {
            errorMessage = 'La génération d\'image a été bloquée par les filtres de sécurité. Veuillez ajuster votre invite.';
        } else if (error.message.includes('upstream max user-project-qpm') || error.message.includes('quota')) {
            errorMessage = 'Limite de quota atteinte pour la génération d\'images. Veuillez réessayer plus tard.';
        } else if (error.message.includes('Invalid prompt parameter') || error.message.includes('Invalid input')) {
             errorMessage = 'L\'invite fournie n\'est pas valide ou est trop courte. Veuillez la vérifier.';
        } else {
            errorMessage = error.message; // Use the specific error message from the API if available
        }
    }
    return { error: errorMessage };
  }
}
    
