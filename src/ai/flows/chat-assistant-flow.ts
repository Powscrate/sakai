
'use server';
/**
 * @fileOverview Flux Genkit pour un assistant de chat IA en streaming.
 *
 * - streamChatAssistant - Fonction pour interagir avec l'assistant en streaming.
 * - ChatAssistantInput - Type d'entrée pour streamChatAssistant.
 * - ChatMessage - Type pour un message de chat individuel.
 * - ChatStreamChunk - Type pour un morceau de données en streaming pour l'UI.
 */
import {ai} from '@/ai/genkit';
import {z}from 'genkit';
import type { MessageData, Part } from 'genkit';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model', 'system']),
  parts: z.string().describe("Le contenu du message."),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

const ChatAssistantInputSchema = z.object({
  history: z.array(ChatMessageSchema).describe("L'historique de la conversation, le message le plus récent est le dernier."),
  knowledge: z.string().optional().describe("Connaissances fournies par l'utilisateur pour guider l'assistant."),
});
export type ChatAssistantInput = z.infer<typeof ChatAssistantInputSchema>;

// This is the simplified chunk structure the UI will receive
export type ChatStreamChunk = {
  text?: string;
  error?: string; // For propagating stream errors
};


export async function streamChatAssistant(
  input: ChatAssistantInput,
): Promise<ReadableStream<ChatStreamChunk>> {

  let systemInstructionText = `Vous êtes Sakai, un assistant IA convivial, serviable et créatif.
Vous pouvez raconter des blagues, de courtes histoires si on vous le demande, et aider avec diverses tâches créatives.
Répondez toujours en FRANÇAIS.
Soyez concis mais informatif.
Si vous ne connaissez pas la réponse ou si la question sort du cadre des connaissances fournies ou de l'aide générale et créative, dites-le poliment.
La date actuelle est ${format(new Date(), 'PPPP', { locale: fr })}`;

  if (input.knowledge && input.knowledge.trim() !== '') {
    systemInstructionText = `Vous êtes Sakai, un assistant IA convivial, serviable et créatif.
L'utilisateur a fourni les informations suivantes pour guider vos réponses et définir votre contexte spécifique. Veuillez les prendre en compte prioritairement lorsque cela est pertinent :
---DEBUT DES CONNAISSANCES UTILISATEUR---
${input.knowledge}
---FIN DES CONNAISSANCES UTILISATEUR---

Votre rôle général est d'aider les utilisateurs et d'être créatif. Vous pouvez raconter des blagues et de courtes histoires.
Répondez toujours en FRANÇAIS.
Soyez concis mais informatif.
Si vous ne connaissez pas la réponse ou si la question sort du cadre des connaissances fournies ou de l'aide générale et créative, dites-le poliment.
La date actuelle est ${format(new Date(), 'PPPP', { locale: fr })}`;
  }


  const messagesForApi: MessageData[] = input.history
    .filter(msg => msg.role === 'user' || msg.role === 'model')
    .map(msg => ({
      role: msg.role as 'user' | 'model',
      content: [{text: msg.parts}] as Part[],
    }));

  const { stream: genkitStream } = ai.generateStream({
    model: 'googleai/gemini-1.5-flash-latest',
    systemInstruction: systemInstructionText,
    messages: messagesForApi,
    config: {
      temperature: 0.7,
       safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
      ]
    },
  });

  return new ReadableStream<ChatStreamChunk>({
    async start(controller) {
      try {
        for await (const genkitChunk of genkitStream) { 
          let currentText = "";
          if (genkitChunk.content) {
            for (const part of genkitChunk.content) {
              if (part.text) {
                currentText += part.text;
              }
            }
          } else if (genkitChunk.text) { 
            currentText += genkitChunk.text;
          }
          
          if (currentText) {
            controller.enqueue({ text: currentText });
          }
        }
      } catch (error: any) {
        console.error("Erreur pendant le streaming côté serveur:", error);
        try {
            controller.enqueue({ error: error.message || "Une erreur est survenue lors du traitement du flux." });
        } catch (e) {
            console.error("Impossible d'envoyer l'erreur au client:", e);
        }
      } finally {
        try {
            controller.close();
        } catch (e) {
            console.error("Erreur lors de la fermeture du contrôleur de flux:", e);
        }
      }
    }
  });
}
