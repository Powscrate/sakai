'use server';
/**
 * @fileOverview Flux Genkit pour générer une pensée amusante pour la page de connexion.
 *
 * - generateLoginThought - Fonction pour générer la pensée.
 * - GenerateLoginThoughtInput - Type d'entrée.
 * - GenerateLoginThoughtOutput - Type de sortie.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateLoginThoughtInputSchema = z.object({
  emailFragment: z.string().optional().describe("Le fragment d'email actuellement tapé par l'utilisateur."),
});
export type GenerateLoginThoughtInput = z.infer<typeof GenerateLoginThoughtInputSchema>;

const GenerateLoginThoughtOutputSchema = z.object({
  thought: z.string().describe("Une pensée courte, amusante ou un commentaire pertinent."),
});
export type GenerateLoginThoughtOutput = z.infer<typeof GenerateLoginThoughtOutputSchema>;

export async function generateLoginThought(input: GenerateLoginThoughtInput): Promise<GenerateLoginThoughtOutput> {
  return generateLoginThoughtFlow(input);
}

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

const generateLoginThoughtFlow = ai.defineFlow(
  {
    name: 'generateLoginThoughtFlow',
    inputSchema: GenerateLoginThoughtInputSchema,
    outputSchema: GenerateLoginThoughtOutputSchema,
  },
  async (input) => {
    const {output} = await generateLoginThoughtPrompt(input);
    return output || { thought: "Prêt à discuter avec l'IA la plus cool ?" };
  }
);