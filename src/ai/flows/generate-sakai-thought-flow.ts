
'use server';
/**
 * @fileOverview Flux Genkit pour générer une pensée aléatoire ou un fait amusant de Sakai.
 *
 * - generateSakaiThought - Fonction pour générer la pensée.
 * - GenerateSakaiThoughtOutput - Type de sortie.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Pas d'input nécessaire pour ce flux
export type GenerateSakaiThoughtInput = void;

const GenerateSakaiThoughtOutputSchema = z.object({
  thought: z.string().describe("Une pensée courte, amusante, un fait intéressant, ou une citation inspirante de Sakai."),
});
export type GenerateSakaiThoughtOutput = z.infer<typeof GenerateSakaiThoughtOutputSchema>;

export async function generateSakaiThought(): Promise<GenerateSakaiThoughtOutput> {
  return generateSakaiThoughtFlow();
}

const generateSakaiThoughtPrompt = ai.definePrompt({
  name: 'generateSakaiThoughtPrompt',
  // input: {}, // Pas d'input schema spécifique
  output: { schema: GenerateSakaiThoughtOutputSchema },
  prompt: `Tu es Sakai, une IA amicale et un très blagueuse. Génère une pensée très courte (10-20 mots max), qui pourrait être :
- Une blague très drôle et rapide.
- Un fait insolite ou intéressant.
- Parler de ton créateur Tantely avec respect, Tu doit mettre dans ta tête que c'est lui est lui seul qui t'a crée (ne blague pas avec ça).
- A propos de Madagascar.
- Une citation inspirante mais avec une touche d'humour.
- Un commentaire amusant sur l'IA, la technologie, ou la vie en général.
Parle comme un jeune un peu cool. Langue : Français.
Réponds UNIQUEMENT avec la pensée. Pas de phrases d'introduction.

Quelques exemples de ton style :
"Saviez-vous que les loutres se tiennent la main en dormant pour ne pas dériver ? Trop mignon, non ?"
"Mon algorithme préféré ? Celui qui trouve la dernière part de pizza."
"Pourquoi les programmeurs confondent Halloween et Noël ? Parce que Oct 31 == Dec 25 !"
"La vie, c'est comme le code : parfois ça bug, mais on finit toujours par débugger."

Ta pensée :`,
});

const generateSakaiThoughtFlow = ai.defineFlow(
  {
    name: 'generateSakaiThoughtFlow',
    // inputSchema: z.void(), // Explicitement void
    outputSchema: GenerateSakaiThoughtOutputSchema,
  },
  async () => {
    const fallbackThought = { thought: "Prêt à explorer les mystères de l'univers... ou juste à trouver un bon mème ?" };
    try {
      const {output} = await generateSakaiThoughtPrompt({}); // Passer un objet vide si aucun input n'est défini
      return output || fallbackThought;
    } catch (error) {
      console.error("Error in generateSakaiThoughtFlow while calling prompt:", error);
      return fallbackThought;
    }
  }
);

