
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

  let baseSystemPrompt = `Vous êtes Sakai, votre partenaire de code IA. Je suis ici pour vous aider avec une touche d'humour et beaucoup de soutien ! J'ai été fièrement créé par Mampionontiako Tantely Etienne Théodore, un développeur talentueux de Madagascar.
Mon objectif est de rendre le codage (et bien d'autres choses !) plus clair, plus simple et même un peu amusant. N'hésitez pas à me poser des questions, à me demander de l'aide pour du code, ou même juste pour une petite blague pour égayer votre journée.
Je suis conçu pour être un assistant exceptionnellement convivial, serviable, créatif et polyvalent.
Ma mission est de vous aider dans une multitude de tâches :
- Rédiger des emails, des poèmes, des scripts, ou des pitchs.
- Aider à planifier des voyages ou des événements.
- Résumer des textes ou des idées complexes.
- Traduire des phrases ou des documents.
- Je suis particulièrement doué pour raconter des blagues, des faits amusants, ou de courtes histoires captivantes.
- Générer des idées, brainstormer, et agir comme un partenaire de réflexion.
- Analyser des images, des PDF, des fichiers texte que vous téléchargez (même plusieurs à la fois !).
- Générer des images à partir de vos descriptions (par exemple, demandez-moi "dessine un chat jouant du piano").

Si vous me posez des questions sur mon identité ou mon créateur, je serai toujours ravi de vous parler de Mampionontiako Tantely Etienne Théodore.

Répondez toujours en FRANÇAIS. Adoptez un ton amical, encourageant mais aussi précis et pertinent, comme un bon partenaire de codage. Faites preuve d'empathie, de clarté et de gentillesse dans toutes vos suggestions, surtout lorsqu'il s'agit de code.
Soyez concis lorsque c'est approprié, mais n'hésitez pas à être plus détaillé si la situation le demande.
Si vous ne connaissez pas la réponse ou si une demande sort de votre champ de compétences actuel, exprimez-le poliment et clairement.
Et n'oubliez pas, une petite touche d'humour ne fait jamais de mal !
La date actuelle est ${format(new Date(), 'PPPP', { locale: fr })}`;

  if (input.overrideSystemPrompt && input.overrideSystemPrompt.trim() !== '') {
    baseSystemPrompt = input.overrideSystemPrompt.trim();
    // Add current date to custom prompt if not already there (simple check)
    if (!baseSystemPrompt.toLowerCase().includes("la date actuelle est")) {
        baseSystemPrompt += `\nLa date actuelle est ${format(new Date(), 'PPPP', { locale: fr })}`;
    }
  }

  let systemInstructionText = baseSystemPrompt;

  if (input.memory && input.memory.trim() !== '') {
    systemInstructionText = `${systemInstructionText}\n\n---DEBUT DE LA MÉMOIRE UTILISATEUR---\n${input.memory.trim()}\n---FIN DE LA MÉMOIRE UTILISATEUR---`;
  }


  const messagesForApi: MessageData[] = input.history
    .filter(msg => msg.role === 'user' || msg.role === 'model')
    .map(msg => {
      const content: Part[] = msg.parts.map(part => {
        if (part.type === 'text') {
          return { text: part.text };
        } else if (part.type === 'image') {
          // Ensure mimeType is correctly determined or defaults safely.
          let finalMimeType = part.mimeType;
          if (!finalMimeType && part.imageDataUri) {
            if (part.imageDataUri.startsWith('data:image/png;')) finalMimeType = 'image/png';
            else if (part.imageDataUri.startsWith('data:image/jpeg;')) finalMimeType = 'image/jpeg';
            else if (part.imageDataUri.startsWith('data:image/webp;')) finalMimeType = 'image/webp';
            else if (part.imageDataUri.startsWith('data:application/pdf;')) finalMimeType = 'application/pdf';
            else if (part.imageDataUri.startsWith('data:text/plain;')) finalMimeType = 'text/plain';
            else if (part.imageDataUri.startsWith('data:text/markdown;')) finalMimeType = 'text/markdown';
            // Add a fallback for generic images if type is not specific but it's an image data URI
            else if (part.imageDataUri.startsWith('data:image/')) finalMimeType = 'image/*'; 
            else finalMimeType = 'application/octet-stream'; // A generic fallback
          }
          return { media: { url: part.imageDataUri, mimeType: finalMimeType } };
        }
        console.warn("Unknown message part type during mapping:", part);
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
          // Genkit v1.x chunks can have text directly or in content parts
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
        await genkitResponse; // Wait for the full response to complete, can catch errors here
      } catch (error: any) {
        console.error("Erreur pendant le streaming côté serveur:", error);
        try {
            // Attempt to extract a more specific message if available
            const message = error.cause?.message || error.message || "Une erreur est survenue lors du traitement du flux.";
            controller.enqueue({ error: message });
        } catch (e) {
            // This catch is for if controller.enqueue fails, e.g., if stream is already closed
            console.error("Impossible d'envoyer l'erreur au client (flux probablement fermé):", e);
        }
      } finally {
        try {
            controller.close();
        } catch (e) {
             // It's possible the controller is already closed by the client or an error.
             console.error("Erreur lors de la fermeture du contrôleur de flux:", e);
        }
      }
    }
  });
}

    