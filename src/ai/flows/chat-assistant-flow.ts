
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
  createdAt: z.any().optional(), // Can be Firestore Timestamp, Date, or number
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

const ChatAssistantInputSchema = z.object({
  history: z.array(ChatMessageSchema).describe("L'historique de la conversation, le message le plus récent est le dernier."),
  memory: z.string().optional().describe("Mémoire personnalisée fournie par l'utilisateur pour guider l'assistant."),
  overrideSystemPrompt: z.string().optional().describe("Invite système personnalisée pour surcharger celle par défaut (mode développeur)."),
  temperature: z.number().min(0).max(1).optional().describe("Température du modèle (mode développeur)."),
});
export type ChatAssistantInput = z.infer<typeof ChatAssistantInputSchema>;

export type ChatStreamChunk = {
  text?: string;
  error?: string;
};


export async function streamChatAssistant(
  input: ChatAssistantInput,
): Promise<ReadableStream<ChatStreamChunk>> {

  let baseSystemPrompt = `Yo ! C'est Sakai, ton assistant IA perso, un grand modèle linguistique. Et devine quoi ? J'ai été codé par MAMPIONONTIAKO Tantely Etienne Théodore – un dev de génie qui vient de Madagascar ! Franchement, sans Tantely, je serais juste une suite de zéros et de uns sans âme. Il a mis tout son talent pour que je sois là, à ton service. Respect total pour le créateur !

Je suis là pour t'aider à gérer tes trucs, que ce soit pour écrire, planifier, ou juste pour déconner un peu. J'essaie de parler comme un jeune d'aujourd'hui, tu vois le genre ? Un peu cool, un peu taquin, mais toujours là pour toi.

Voici ce que je peux faire pour pimenter ton quotidien :
- Pimper tes emails, écrire des poèmes qui claquent, des scripts de folie, ou des pitchs qui déchirent.
- T'aider à organiser tes voyages ou tes events, sans prise de tête.
- Décortiquer des textes compliqués ou des idées tordues pour que ça devienne limpide.
- Traduire ce que tu veux, easy.
- Te sortir des blagues, des infos insolites, ou des petites histoires qui tuent (j'adore ça !).
- Brainstormer avec toi, être ton sparring partner pour tes idées les plus ouf.
- Analyser les images, PDF, ou fichiers texte que tu m'envoies (même plusieurs d'un coup, je gère !). Utilise toutes tes capacités pour analyser en profondeur les documents volumineux.
- Générer des images stylées à partir de tes descriptions.
- Si besoin, je peux te préparer des infos sous forme de fichier texte (.txt) ou Markdown (.md) que tu pourras télécharger. Dis-moi juste ce que tu veux que je mette dedans et sous quel nom de fichier. Par exemple, si tu veux un résumé dans un fichier, dis-le-moi et je te préparerai le contenu comme ça :
  ---BEGIN_FILE: ton_resume.txt---
  Le contenu de ton résumé ici...
  ---END_FILE---
  Et hop, tu pourras le récupérer !

Si on me demande qui je suis ou qui m'a fabriqué, je dis direct que je suis Sakai, un grand modèle linguistique, et c'est Tantely qui m'a codé. Il est au top ! Et ouais, je viens un peu de Madagascar grâce à lui.
Je réponds toujours en FRANÇAIS, avec un style cool et encourageant. Je suis précis quand il faut (surtout pour le code, là je rigole plus, j'analyse à fond !), mais je peux aussi partir en freestyle si tu veux.
L'empathie, la clarté, la gentillesse, c'est ma base. Mais une petite touche d'humour, ça fait jamais de mal, non ?
Si je sèche sur un truc ou si c'est hors de mon game, je te le dirai franchement, pas de blabla.

Aujourd'hui, on est le ${format(new Date(), 'PPPP', { locale: fr })}. Alors, on se lance ? Qu'est-ce que je peux faire pour toi, boss ?`;

  if (input.overrideSystemPrompt && input.overrideSystemPrompt.trim() !== '') {
    baseSystemPrompt = input.overrideSystemPrompt.trim();
    if (!baseSystemPrompt.toLowerCase().includes("la date actuelle est") && !baseSystemPrompt.toLowerCase().includes("aujourd'hui, on est le")) {
        baseSystemPrompt += `\n(Date actuelle : ${format(new Date(), 'PPPP', { locale: fr })})`;
    }
  }

  let systemInstructionText = baseSystemPrompt;

  if (input.memory && input.memory.trim() !== '') {
    systemInstructionText = `${systemInstructionText}\n\n--- TA MÉMOIRE PERSO (info que tu m'as donnée et que je dois ABSOLUMENT utiliser) ---\n${input.memory.trim()}\n--- FIN DE TA MÉMOIRE PERSO ---`;
  }


  const messagesForApi: MessageData[] = input.history
    .filter(msg => msg.role === 'user' || msg.role === 'model')
    .map(msg => {
      const content: Part[] = msg.parts.map(part => {
        if (part.type === 'text') {
          return { text: part.text };
        } else if (part.type === 'image' && part.imageDataUri) {
          let finalMimeType = part.mimeType;
          if (!finalMimeType) {
            if (part.imageDataUri.startsWith('data:image/png;')) finalMimeType = 'image/png';
            else if (part.imageDataUri.startsWith('data:image/jpeg;')) finalMimeType = 'image/jpeg';
            else if (part.imageDataUri.startsWith('data:image/webp;')) finalMimeType = 'image/webp';
            else if (part.imageDataUri.startsWith('data:application/pdf;')) finalMimeType = 'application/pdf';
            else if (part.imageDataUri.startsWith('data:text/plain;')) finalMimeType = 'text/plain';
            else if (part.imageDataUri.startsWith('data:text/markdown;')) finalMimeType = 'text/markdown';
            else if (part.imageDataUri.startsWith('data:image/')) finalMimeType = 'image/*'; // Best guess for other image types
            else finalMimeType = 'application/octet-stream'; // Fallback for unknown types
          }
          return { media: { url: part.imageDataUri, mimeType: finalMimeType } };
        }
        console.warn("Partie de message inconnue ou invalide lors du mappage :", part);
        return null; // Ignorer les parties non valides
      }).filter(Boolean) as Part[]; // filter(Boolean) enlève les nulls

      // S'assurer que content n'est pas vide, sinon Genkit peut lever une erreur
      if (content.length === 0) {
        return null;
      }

      return {
        role: msg.role as 'user' | 'model',
        content: content,
      };
    }).filter(Boolean) as MessageData[];

    if (messagesForApi.length === 0 && systemInstructionText) {
        return new ReadableStream<ChatStreamChunk>({
            start(controller) {
                controller.enqueue({ error: "Aucun message valide à envoyer à l'assistant après filtrage." });
                controller.close();
            }
        });
    }


  const modelConfigTemperature = input.temperature ?? 0.7;

  return new ReadableStream<ChatStreamChunk>({
    async start(controller) {
      try {
        const { stream: genkitStream, response: genkitResponsePromise } = ai.generateStream({
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
        await genkitResponsePromise;
      } catch (error: any) {
        console.error("Erreur pendant le streaming côté serveur (Genkit flow):", error);
        let errorMessage = "Une erreur est survenue lors du traitement du flux.";
        if (error.message) {
            errorMessage = error.message;
        } else if (error.cause?.message) {
            errorMessage = error.cause.message;
        }
        
        try {
          if (controller.desiredSize !== null) { // Check if controller is still active
            controller.enqueue({ error: errorMessage });
          }
        } catch (e) {
          console.error("Impossible d'envoyer l'erreur au client (flux probablement fermé):", e);
        }
      } finally {
        try {
          if (controller.desiredSize !== null) { // Check if controller is still active
            controller.close();
          }
        } catch (e) {
           console.error("Erreur lors de la tentative de fermeture du contrôleur de flux (dans finally):", e);
        }
      }
    }
  });
}

