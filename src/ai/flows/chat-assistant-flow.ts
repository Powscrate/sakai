
'use server';
/**
 * @fileOverview Flux Genkit pour un assistant de chat IA en streaming.
 *
 * - streamChatAssistant - Fonction pour interagir avec l'assistant en streaming.
 * - ChatAssistantInput - Type d'entrée pour streamChatAssistant.
 * - ChatMessage - Type pour un message de chat individuel.
 */
import {ai} from '@/ai/genkit';
import {z}from 'genkit';
import type {GenerateResult, MessageData, Part, GenerateStreamResponseData} from 'genkit';
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

export type ChatStreamChunk = {
  text?: string;
  // Other fields from GenerateStreamResponseData could be added if needed by the client
};


export async function streamChatAssistant(
  input: ChatAssistantInput,
  onChunk: (chunk: ChatStreamChunk) => void | Promise<void>
): Promise<GenerateResult | undefined> {

  const systemInstructionText = `Vous êtes un assistant IA convivial et serviable pour l'application "Perspectives de Vie".
    Votre rôle est d'aider les utilisateurs à comprendre leurs données (métriques de santé et bien-être comme l'exercice, le sommeil, l'humeur, l'eau consommée), à fixer des objectifs, à analyser les tendances et à fournir des conseils généraux sur le bien-être.
    Répondez toujours en FRANÇAIS.
    Soyez concis mais informatif.
    Si vous ne connaissez pas la réponse ou si la question sort du cadre de l'application (suivi de métriques de vie, objectifs, tendances, bien-être général), dites-le poliment.
    La date actuelle est ${format(new Date(), 'PPPP', { locale: fr })}.`;

  // Filter out any 'system' messages from history and ensure roles are correctly typed for the API.
  // The client should only send 'user' and 'model' roles in history.
  const messagesForApi: MessageData[] = input.history
    .filter(msg => msg.role === 'user' || msg.role === 'model') 
    .map(msg => ({
      role: msg.role as 'user' | 'model', 
      content: [{text: msg.parts}] as Part[],
    }));

  const {stream, response} = ai.generateStream({
    model: 'googleai/gemini-pro',
    systemInstruction: { // Use the dedicated systemInstruction field
      parts: [{ text: systemInstructionText }],
      // role: 'system' // This 'role' for systemInstruction is often implicit if parts are provided.
    },
    messages: messagesForApi, // Now only contains user/model messages from history
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
    // The type for onChunk here should match what generateStream's streamingCallback expects.
    // GenerateStreamResponseData is the more accurate type for the chunk.
    streamingCallback: onChunk as (chunk: GenerateStreamResponseData) => void | Promise<void>, 
  });

  for await (const _ of stream) {
    // Stream is consumed, chunks are sent via onChunk
  }
  return await response; 
}

