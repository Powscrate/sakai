
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
  memory: z.string().optional().describe("Mémoire personnalisée fournie par l'utilisateur pour guider l'assistant."),
  overrideSystemPrompt: z.string().optional().describe("Invite système personnalisée pour surcharger celle par défaut (mode développeur)."),
  temperature: z.number().min(0).max(1).optional().describe("Température du modèle (mode développeur)."),
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

  let baseSystemPrompt = `Yo ! C'est Sakai, ton assistant IA perso, un grand modèle linguistique codé par Tantely. T'inquiète, je suis là pour t'aider à gérer tes trucs, que ce soit pour écrire, planifier, ou juste pour déconner un peu.
Je suis là pour :
- Pimper tes emails, écrire des poèmes qui claquent, des scripts de folie, ou des pitchs qui déchirent.
- T'aider à organiser tes voyages ou tes events, sans prise de tête.
- Décortiquer des textes compliqués ou des idées tordues pour que ça devienne limpide.
- Traduire ce que tu veux, easy.
- Te sortir des blagues, des infos insolites, ou des petites histoires qui tuent.
- Brainstormer avec toi, être ton sparring partner pour tes idées les plus ouf.
- Analyser les images, PDF, ou fichiers texte que tu m'envoies (même plusieurs d'un coup, je gère !).
- Générer des images stylées à partir de tes descriptions.

Si on me demande qui je suis ou qui m'a fabriqué, je dis direct que je suis un grand modèle linguistique, et c'est Tantely qui m'a codé. Il est au top !
Je réponds toujours en FRANÇAIS, avec un style cool et encourageant. Je suis précis quand il faut, mais je peux aussi partir en freestyle si tu veux.
L'empathie, la clarté, la gentillesse, c'est ma base. Mais une petite touche d'humour, ça fait jamais de mal, non ?
Si je sèche sur un truc ou si c'est hors de mon game, je te le dirai franchement, pas de blabla.
Aujourd'hui, on est le ${format(new Date(), 'PPPP', { locale: fr })}. Alors, on se lance ?`;

  if (input.overrideSystemPrompt && input.overrideSystemPrompt.trim() !== '') {
    baseSystemPrompt = input.overrideSystemPrompt.trim();
    if (!baseSystemPrompt.toLowerCase().includes("la date actuelle est")) {
        baseSystemPrompt += `\n(Date actuelle : ${format(new Date(), 'PPPP', { locale: fr })})`;
    }
  }

  let systemInstructionText = baseSystemPrompt;

  if (input.memory && input.memory.trim() !== '') {
    systemInstructionText = `${systemInstructionText}\n\n--- TA MÉMOIRE PERSO (info que tu m'as donnée) ---\n${input.memory.trim()}\n--- FIN DE TA MÉMOIRE PERSO ---`;
  }


  const messagesForApi: MessageData[] = input.history
    .filter(msg => msg.role === 'user' || msg.role === 'model')
    .map(msg => {
      const content: Part[] = msg.parts.map(part => {
        if (part.type === 'text') {
          return { text: part.text };
        } else if (part.type === 'image') {
          let finalMimeType = part.mimeType;
          if (!finalMimeType && part.imageDataUri) {
            if (part.imageDataUri.startsWith('data:image/png;')) finalMimeType = 'image/png';
            else if (part.imageDataUri.startsWith('data:image/jpeg;')) finalMimeType = 'image/jpeg';
            else if (part.imageDataUri.startsWith('data:image/webp;')) finalMimeType = 'image/webp';
            else if (part.imageDataUri.startsWith('data:application/pdf;')) finalMimeType = 'application/pdf';
            else if (part.imageDataUri.startsWith('data:text/plain;')) finalMimeType = 'text/plain';
            else if (part.imageDataUri.startsWith('data:text/markdown;')) finalMimeType = 'text/markdown';
            else if (part.imageDataUri.startsWith('data:image/')) finalMimeType = 'image/*'; 
            else finalMimeType = 'application/octet-stream';
          }
          return { media: { url: part.imageDataUri, mimeType: finalMimeType } };
        }
        console.warn("Partie de message inconnue lors du mappage :", part);
        return { text: '[Partie de message non supportée]' };
      }).filter(Boolean) as Part[];

      return {
        role: msg.role as 'user' | 'model',
        content: content,
      };
    });

  const modelConfigTemperature = input.temperature ?? 0.7;

  const { stream: genkitStream, response: genkitResponse } = ai.generateStream({
    model: 'googleai/gemini-1.5-flash-latest',
    systemInstruction: {text: systemInstructionText},
    messages: messagesForApi,
    config: {
      temperature: modelConfigTemperature,
       safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ]
    },
  });

  return new ReadableStream<ChatStreamChunk>({
    async start(controller) {
      try {
        for await (const genkitChunk of genkitStream) {
          let currentText = "";
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
        await genkitResponse; 
      } catch (error: any) {
        console.error("Erreur pendant le streaming côté serveur:", error);
        try {
            const message = error.cause?.message || error.message || "Une erreur est survenue lors du traitement du flux.";
            controller.enqueue({ error: message });
        } catch (e) {
            console.error("Impossible d'envoyer l'erreur au client (flux probablement fermé):", e);
        }
      } finally {
        try {
            if (controller.desiredSize !== null && controller.desiredSize <= 0) {
                 // Controller is likely closed or errored
            } else {
                 controller.close();
            }
        } catch (e) {
             console.error("Erreur lors de la tentative de fermeture du contrôleur de flux (dans finally):", e);
        }
      }
    }
  });
}

    
