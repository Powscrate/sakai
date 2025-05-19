
'use server';
/**
 * @fileOverview Flux Genkit pour un assistant de chat IA en streaming.
 *
 * - streamChatAssistant - Fonction pour interagir avec l'assistant en streaming.
 * - ChatAssistantInput - Type d'entrée pour streamChatAssistant.
 * - ChatMessage - Type pour un message de chat individuel (peut être multimodal).
 * - ChatMessagePart - Type pour une partie d'un message (texte ou image).
 * - ChatStreamChunk - Type pour un morceau de données en streaming pour l'UI.
 */
import {ai} from '@/ai/genkit';
import {z}from 'genkit';
import type { MessageData, Part } from 'genkit';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Définition des schémas pour les messages multimodaux
const ChatMessagePartSchema = z.union([
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({ 
    type: z.literal('image'), 
    imageDataUri: z.string().describe("L'image sous forme de Data URI (doit inclure le type MIME et l'encodage Base64, ex: 'data:image/png;base64,ENCODED_DATA')."),
    mimeType: z.string().optional().describe("Le type MIME de l'image, ex: 'image/png' ou 'image/jpeg'.")
  }),
]);
export type ChatMessagePart = z.infer<typeof ChatMessagePartSchema>;

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z.array(ChatMessagePartSchema).describe("Le contenu du message, peut être un mélange de texte et d'images."),
  id: z.string().optional(),
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
    .map(msg => {
      const content: Part[] = msg.parts.map(part => {
        if (part.type === 'text') {
          return { text: part.text };
        } else if (part.type === 'image') {
          return { media: { url: part.imageDataUri, mimeType: part.mimeType } };
        }
        // Fallback pour les types de parts inconnus, bien que le schéma devrait l'empêcher
        return { text: '' }; 
      });
      return {
        role: msg.role as 'user' | 'model',
        content: content,
      };
    });

  const { stream: genkitStream, response: genkitResponse } = ai.generateStream({ // Renommé response à genkitResponse
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
          // La structure de genkitChunk peut varier. Si elle a un champ 'text' direct ou un champ 'content' avec des 'parts'
          if (genkitChunk.text) {
            currentText = genkitChunk.text;
          } else if (genkitChunk.content) {
            for (const part of genkitChunk.content) {
              if (part.text) {
                currentText += part.text;
              }
            }
          }
          
          if (currentText) {
            controller.enqueue({ text: currentText });
          }
        }
        await genkitResponse; // Attendre la réponse complète pour la gestion des erreurs potentielles
      } catch (error: any) {
        console.error("Erreur pendant le streaming côté serveur:", error);
        try {
            // Essayez d'extraire un message d'erreur plus utile si disponible
            const message = error.cause?.message || error.message || "Une erreur est survenue lors du traitement du flux.";
            controller.enqueue({ error: message });
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
