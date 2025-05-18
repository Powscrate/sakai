
'use server';
/**
 * @fileOverview Flux Genkit pour un assistant de chat IA en streaming.
 *
 * - streamChatAssistant - Fonction pour interagir avec l'assistant en streaming.
 * - ChatAssistantInput - Type d'entrée pour streamChatAssistant.
 * - ChatMessage - Type pour un message de chat individuel.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type {GenerateResult, StreamingCallback, MessageData, Part} from 'genkit';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model', 'system']), 
  parts: z.string().describe("Le contenu du message."),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

const ChatAssistantInputSchema = z.object({
  // The last message in history is the current user input
  history: z.array(ChatMessageSchema).describe("L'historique de la conversation, le message le plus récent est le dernier."),
});
export type ChatAssistantInput = z.infer<typeof ChatAssistantInputSchema>;


export async function streamChatAssistant(
  input: ChatAssistantInput,
  onChunk: StreamingCallback<string>
): Promise<GenerateResult | undefined> {

  const systemMessage: ChatMessage = {
    role: 'system',
    parts: `Vous êtes un assistant IA convivial et serviable pour l'application "Perspectives de Vie".
    Votre rôle est d'aider les utilisateurs à comprendre leurs données (métriques de santé et bien-être comme l'exercice, le sommeil, l'humeur, l'eau consommée), à fixer des objectifs, à analyser les tendances et à fournir des conseils généraux sur le bien-être.
    Répondez toujours en FRANÇAIS.
    Soyez concis mais informatif.
    Si vous ne connaissez pas la réponse ou si la question sort du cadre de l'application (suivi de métriques de vie, objectifs, tendances, bien-être général), dites-le poliment.
    La date actuelle est ${format(new Date(), 'PPPP', { locale: fr })}.`
  };

  const messagesForApi: MessageData[] = [systemMessage, ...input.history].map(msg => ({
    role: msg.role,
    content: [{text: msg.parts}] as Part[],
  }));

  const {stream, response} = ai.generateStream({
    prompt: { messages: messagesForApi },
    // model: 'googleai/gemini-1.5-flash-latest', // Using the pre-configured model in genkit.ts is preferred. if genkit.ts model is gemini-2.0-flash, it will be used.
    config: {
      temperature: 0.7,
       safetySettings: [ // Added safety settings as an example, adjust as needed
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
    streamingCallback: onChunk,
  });

  for await (const _ of stream) {
    // Stream is consumed, chunks are sent via onChunk
  }
  return await response; 
}

