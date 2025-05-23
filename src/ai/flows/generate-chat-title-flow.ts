
'use server';
/**
 * @fileOverview Flux Genkit pour générer un titre concis pour une session de chat.
 *
 * - generateChatTitle - Fonction pour générer le titre.
 * - GenerateChatTitleInput - Type d'entrée pour generateChatTitle.
 * - GenerateChatTitleOutput - Type de sortie pour generateChatTitle.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { ChatMessage } from './chat-assistant-flow'; // Reuse ChatMessage type

const GenerateChatTitleInputSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      parts: z.array(
        z.object({
          type: z.literal('text'), // For title generation, only consider text parts
          text: z.string(),
        })
      ),
    })
  ).min(1).describe("Les premiers messages de la conversation (au moins un)."),
});
export type GenerateChatTitleInput = z.infer<typeof GenerateChatTitleInputSchema>;

const GenerateChatTitleOutputSchema = z.object({
  title: z.string().describe("Le titre généré pour la session de chat (max 5-7 mots)."),
});
export type GenerateChatTitleOutput = z.infer<typeof GenerateChatTitleOutputSchema>;

export async function generateChatTitle(input: GenerateChatTitleInput): Promise<GenerateChatTitleOutput> {
  return generateChatTitleFlow(input);
}

const generateChatTitlePrompt = ai.definePrompt({
  name: 'generateChatTitlePrompt',
  input: {schema: GenerateChatTitleInputSchema},
  output: {schema: GenerateChatTitleOutputSchema},
  prompt: `À partir de l'extrait de conversation suivant, génère un titre très concis et pertinent pour cette session de chat.
Le titre doit faire au maximum 5 à 7 mots. Réponds uniquement avec le titre. Ne formule pas de phrase d'introduction.

Extrait de conversation :
{{#each messages}}
{{#if isUser}}Utilisateur : {{else}}Sakai : {{/if}}
{{#each parts}}{{{text}}}{{/each}}
{{/each}}

Titre :`,
});


const generateChatTitleFlow = ai.defineFlow(
  {
    name: 'generateChatTitleFlow',
    inputSchema: GenerateChatTitleInputSchema,
    outputSchema: GenerateChatTitleOutputSchema,
  },
  async (input) => {
    // Pre-process messages to add an isUser flag for easier templating
    const messagesForPrompt = input.messages.map(msg => ({
        role: msg.role,
        isUser: msg.role === 'user', // Add isUser flag
        parts: msg.parts.filter(part => part.type === 'text').map(part => ({type: 'text' as 'text', text: part.text}))
    })).filter(msg => msg.parts.length > 0);

    if (messagesForPrompt.length === 0) {
      return { title: "Discussion" }; // Fallback title
    }

    const {output} = await generateChatTitlePrompt({messages: messagesForPrompt as any}); // Pass augmented messages
    return output || { title: "Discussion" };
  }
);
