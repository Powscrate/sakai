
'use server';
/**
 * @fileOverview Flux Genkit pour générer un titre concis pour une session de chat.
 *
 * - generateChatTitle - Fonction pour générer le titre.
 * - GenerateChatTitleInput - Type d'entrée pour generateChatTitle.
 * - GenerateChatTitleOutput - Type de sortie pour generateChatTitle.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';

const GenerateChatTitleInputSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      parts: z.array(
        z.object({
          type: z.literal('text'), 
          text: z.string(),
        })
      ).min(1), 
    })
  ).min(1).describe("Les premiers messages de la conversation (au moins un)."),
});
export type GenerateChatTitleInput = z.infer<typeof GenerateChatTitleInputSchema>;

const GenerateChatTitleOutputSchema = z.object({
  title: z.string().describe("Le titre généré pour la session de chat (max 5-7 mots)."),
  error: z.string().optional().describe("Message d'erreur si la génération a échoué."),
});
export type GenerateChatTitleOutput = z.infer<typeof GenerateChatTitleOutputSchema>;


// Internal schema for the prompt, including the isUser flag
const PromptInputSchema = z.object({
    messages: z.array(
      z.object({
        role: z.enum(['user', 'model']),
        isUser: z.boolean(), 
        parts: z.array(
          z.object({
            type: z.literal('text'),
            text: z.string(),
          })
        ).min(1),
      })
    ).min(1),
  });


const generateChatTitlePrompt = ai.definePrompt({
  name: 'generateChatTitlePrompt',
  input: {schema: PromptInputSchema}, 
  output: {schema: GenerateChatTitleOutputSchema},
  prompt: `À partir de l'extrait de conversation suivant, génère un titre très concis et pertinent pour cette session de chat.
Le titre doit faire au maximum 5 à 7 mots. Réponds uniquement avec le titre. Ne formule pas de phrase d'introduction.

Extrait de conversation :
{{#each messages}}
{{#if isUser}}Utilisateur : {{else}}Sakai : {{/if}}{{#each parts}}{{{text}}} {{/each}}
{{/each}}

Titre :`,
});


export async function generateChatTitle(input: GenerateChatTitleInput): Promise<GenerateChatTitleOutput> {
  const fallbackOutput = { title: "Discussion" };
  try {
    const messagesForPrompt = input.messages.map(msg => ({
        role: msg.role,
        isUser: msg.role === 'user',
        parts: msg.parts.filter(part => part.type === 'text' && part.text.trim() !== '').map(part => ({type: 'text' as 'text', text: part.text}))
    })).filter(msg => msg.parts.length > 0);

    if (messagesForPrompt.length === 0) {
      console.warn("generateChatTitle: No valid text messages found after filtering. Returning default title.");
      return fallbackOutput;
    }
    
    // Log the input being sent to the prompt
    // console.log("Input to generateChatTitlePrompt:", JSON.stringify({messages: messagesForPrompt}, null, 2));

    const {output} = await generateChatTitlePrompt({messages: messagesForPrompt as any}); 
    
    if (output && output.title) {
        return { title: output.title.replace(/Titre\s*:\s*/i, '').trim() }; // Clean up potential prefix
    }
    return fallbackOutput;

  } catch (error: any) {
    console.error("Error in generateChatTitle (flow):", error);
    return { ...fallbackOutput, error: error.message || "Erreur lors de la génération du titre." };
  }
}
