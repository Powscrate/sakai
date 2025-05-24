
'use server';
/**
 * @fileOverview Flux Genkit pour générer une pensée amusante pour la page de connexion.
 *
 * - generateLoginThought - Fonction pour générer la pensée.
 * - GenerateLoginThoughtInput - Type d'entrée.
 * - GenerateLoginThoughtOutput - Type de sortie.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';

const GenerateLoginThoughtInputSchema = z.object({
  emailFragment: z.string().optional().describe("Le fragment d'email actuellement tapé par l'utilisateur."),
});
export type GenerateLoginThoughtInput = z.infer<typeof GenerateLoginThoughtInputSchema>;

const GenerateLoginThoughtOutputSchema = z.object({
  thought: z.string().describe("Une pensée courte, amusante ou un commentaire pertinent."),
  error: z.string().optional().describe("Message d'erreur si la génération a échoué."),
});
export type GenerateLoginThoughtOutput = z.infer<typeof GenerateLoginThoughtOutputSchema>;

const generateLoginThoughtPrompt = ai.definePrompt({
  name: 'generateLoginThoughtPrompt',
  input: { schema: GenerateLoginThoughtInputSchema },
  output: { schema: GenerateLoginThoughtOutputSchema },
  prompt: `Tu es Sakai, une IA un peu blagueuse qui observe quelqu'un taper une adresse email sur une page de connexion.
L'utilisateur est en train de taper : "{{emailFragment}}".

Génère une pensée très courte (10-15 mots max), amusante, ou un commentaire pertinent sur ce fragment d'email ou sur le fait de se connecter. Parle comme un jeune un peu cool.
Si l'entrée est vide, fais un commentaire général et amusant sur les pages de connexion ou les emails.
Réponds UNIQUEMENT avec la pensée. Pas de phrases d'introduction. Langue : Français.

Exemples si l'entrée est "test@gm": "Presque... le 'ail' manque à l'appel pour un bon 'gmail' !"
Exemples si l'entrée est vide: "Alors, on se connecte ou on admire l'interface ?"
Exemples si l'entrée est "john.doe": "Stylé le pseudo, mais il manque le domaine pour la magie d'Internet !"

Ta pensée :`,
});

export async function generateLoginThought(input: GenerateLoginThoughtInput): Promise<GenerateLoginThoughtOutput> {
  const fallbackOutput = { thought: "Prêt à discuter avec l'IA la plus cool ?" };
  try {
    const {output} = await generateLoginThoughtPrompt(input);
    if (output && output.thought) {
        return { thought: output.thought };
    }
    console.warn("generateLoginThought: Prompt did not return a thought. Using fallback.");
    return fallbackOutput;
  } catch (error: any) {
    console.error("Error in generateLoginThoughtFlow:", error);
    return { ...fallbackOutput, error: error.message || "Erreur lors de la génération de la pensée de connexion." };
  }
}
