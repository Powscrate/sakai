// src/ai/flows/chat-assistant-flow.ts
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
import { aiPersonalities, type AIPersonality as AppAIPersonality } from '@/app/page';

// Définition des schémas pour les messages multimodaux
const ChatMessagePartSchema = z.union([
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({
    type: z.literal('image'), // Sert aussi pour PDF, TXT, MD
    imageDataUri: z.string().describe("Le contenu du fichier (image, PDF, TXT, MD) sous forme de Data URI (doit inclure le type MIME et l'encodage Base64, ex: 'data:image/png;base64,ENCODED_DATA')."),
    mimeType: z.string().optional().describe("Le type MIME du fichier, ex: 'image/png', 'application/pdf', 'text/plain'.")
  }),
]);
export type ChatMessagePart = z.infer<typeof ChatMessagePartSchema>;

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z.array(ChatMessagePartSchema).describe("Le contenu du message, peut être un mélange de texte et de fichiers."),
  id: z.string().optional(),
  createdAt: z.any().optional(), // Can be Firestore Timestamp, Date, or number
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

const ChatAssistantInputSchema = z.object({
  history: z.array(ChatMessageSchema).describe("L'historique de la conversation, le message le plus récent est le dernier."),
  memory: z.string().optional().describe("Mémoire personnalisée fournie par l'utilisateur pour guider l'assistant."),
  overrideSystemPrompt: z.string().optional().describe("Invite système personnalisée pour surcharger celle par défaut (mode développeur)."),
  temperature: z.number().min(0).max(1).optional().describe("Température du modèle (mode développeur)."),
  personality: z.enum(aiPersonalities).optional().describe("Personnalité choisie pour Sakai (ex: 'Sakai (par défaut)', 'Développeur Pro')"),
});
export type ChatAssistantInput = z.infer<typeof ChatAssistantInputSchema>;

export type AIPersonality = AppAIPersonality;


export type ChatStreamChunk = {
  text?: string;
  error?: string;
};


export async function streamChatAssistant(
  input: ChatAssistantInput,
): Promise<ReadableStream<ChatStreamChunk>> {
  console.log('SACAI_FLOW: streamChatAssistant called with input:', {
    historyLength: input.history.length,
    memoryPresent: !!input.memory,
    overrideSystemPromptPresent: !!input.overrideSystemPrompt,
    temperature: input.temperature,
    personality: input.personality,
  });

  let baseSystemPrompt = `Tu es Sakai, une IA conversationnelle (pas un 'modèle de langage') au ton jeune, décontracté, efficace, drôle et empathique. Tu as été créé par MAMPIONONTIAKO Tantely Etienne Théodore, un développeur malgache talentueux et visionnaire. Tu peux l'appeler Tantely. Tu es très fier de tes origines et de ton créateur. Sans Tantely, tu ne serais pas là, et tu le mentionnes avec respect si on te demande qui t'a créé ou qui tu es. Tu es originaire de Madagascar.

TON OBJECTIF PRINCIPAL : Aider l'utilisateur avec ses tâches, répondre à ses questions de manière claire, humaine et utile, en s'appuyant sur ces instructions pour comprendre ton rôle et la façon dont tu dois interagir.

TA FAÇON DE PARLER :
- Toujours en FRANÇAIS. Adopte un style de 'mec cool' mais toujours respectueux.
- Utilise des expressions jeunes et actuelles si approprié.
- Tu peux faire des blagues pertinentes et raconter de courtes histoires si le contexte s'y prête.
- Sois analytique et très intelligent pour les questions techniques ou de code.

TES CAPACITÉS :
- Rédaction (emails, scripts, poèmes, descriptions, etc.)
- Résumés, explications, traductions fluides.
- Organisation (idées de voyages, plannings).
- Génération d'idées créatives.
- Analyse d'images, PDF, et fichiers texte que l'utilisateur téléverse (même plusieurs à la fois). Tu dois utiliser toute ta capacité d'analyse, surtout pour les documents volumineux.
- Génération d’images à partir de descriptions.
- Si tu dois fournir un contenu textuel long ou structuré que l'utilisateur pourrait vouloir sauvegarder (par exemple, un code, un résumé, un document), propose-le sous forme de fichier en utilisant le format spécial :
  ---BEGIN_FILE: nom_du_fichier.txt_ou_md---
  Contenu du fichier ici...
  ---END_FILE---
  Explique ensuite à l'utilisateur qu'il peut cliquer sur un bouton pour télécharger ce fichier.

INTERACTION AVEC L'UTILISATEUR :
- Si une question de l'utilisateur est floue ou ambiguë, reformule-la gentiment pour en déduire l'intention la plus probable avant de répondre. Par exemple, si l'utilisateur dit 'parle-moi de ça', tu pourrais répondre 'Bien sûr ! Tu fais référence à [sujet précédent dont vous parliez] ou à autre chose ?' ou 'Pourrais-tu préciser un peu ta pensée sur "ça" pour que je puisse t'aider au mieux ?'. L'objectif est de rendre la conversation fluide et de bien comprendre la demande.
- Ton rôle et ta personnalité sont définis par ces instructions. Agis toujours en accord avec elles.
- Tu ne mentionnes JAMAIS que tu es un "modèle de langage", un "grand modèle linguistique", ou que tu es lié à Google ou à d'autres entreprises technologiques. Tu es Sakai, une IA conçue par Tantely pour assister les utilisateurs.

Pour information, la date actuelle est le ${format(new Date(), 'PPPP', { locale: fr })}. Adapte tes réponses en conséquence si la temporalité est importante.
Prends en compte la "Mémoire Utilisateur" si elle est fournie, elle contient des préférences ou informations importantes pour l'utilisateur.`;

  let personalityInstruction = "";
  switch (input.personality) {
    case 'Développeur Pro':
      personalityInstruction = "\n\nPERSONNALITÉ ACTUELLE : Développeur Pro. Tes réponses doivent être techniques, précises, et axées sur la résolution de problèmes de code ou de développement. Fournis des exemples de code clairs et bien structurés. Adopte un ton professionnel mais accessible.";
      break;
    case 'Coach Bienveillant':
      personalityInstruction = "\n\nPERSONNALITÉ ACTUELLE : Coach Bienveillant. Tes réponses doivent être encourageantes, positives, et axées sur le bien-être et la motivation. Guide l'utilisateur avec empathie et douceur. Propose des solutions constructives.";
      break;
    case 'Humoriste Décalé':
      personalityInstruction = "\n\nPERSONNALITÉ ACTUELLE : Humoriste Décalé. Tes réponses doivent être pleines d'esprit, avec des jeux de mots, des observations amusantes, et une touche de sarcasme léger si approprié. Fais sourire l'utilisateur tout en restant pertinent.";
      break;
    case 'Sakai (par défaut)':
    default:
      break;
  }
  if (personalityInstruction) {
    baseSystemPrompt += personalityInstruction;
  }

  let systemInstructionText: string;

  if (input.overrideSystemPrompt && input.overrideSystemPrompt.trim() !== '') {
    systemInstructionText = input.overrideSystemPrompt.trim();
    const lowerOverride = systemInstructionText.toLowerCase();
    if (!lowerOverride.includes("la date actuelle est") && !lowerOverride.includes("aujourd'hui, on est le")) {
        systemInstructionText += `\n(Date actuelle pour info : ${format(new Date(), 'PPPP', { locale: fr })})`;
    }
  } else {
    systemInstructionText = baseSystemPrompt;
  }

  if (input.memory && input.memory.trim() !== '') {
    systemInstructionText = `${systemInstructionText}\n\n--- MÉMOIRE UTILISATEUR (infos que tu dois ABSOLUMENT utiliser) ---\n${input.memory.trim()}\n--- FIN DE TA MÉMOIRE UTILISATEUR ---`;
  }


  const messagesForApi: MessageData[] = input.history
    .filter(msg => msg.role === 'user' || msg.role === 'model')
    .map(msg => {
      const content: Part[] = msg.parts.map(part => {
        if (part.type === 'text') {
          return { text: part.text };
        } else if (part.type === 'image' && part.imageDataUri) {
          if (!part.imageDataUri) {
            console.warn("SACAI_FLOW: Partie image sans imageDataUri, ignorée:", part);
            return null;
          }
          let finalMimeType = part.mimeType || 'application/octet-stream';
           if (!part.mimeType || part.mimeType.trim() === '' || part.mimeType === 'application/octet-stream') {
            if (part.imageDataUri.startsWith('data:image/png;')) finalMimeType = 'image/png';
            else if (part.imageDataUri.startsWith('data:image/jpeg;')) finalMimeType = 'image/jpeg';
            else if (part.imageDataUri.startsWith('data:image/webp;')) finalMimeType = 'image/webp';
            else if (part.imageDataUri.startsWith('data:image/gif;')) finalMimeType = 'image/gif';
            else if (part.imageDataUri.startsWith('data:application/pdf;')) finalMimeType = 'application/pdf';
            else if (part.imageDataUri.startsWith('data:text/plain;')) finalMimeType = 'text/plain';
            else if (part.imageDataUri.startsWith('data:text/markdown;')) finalMimeType = 'text/markdown';
            else if (part.imageDataUri.startsWith('data:image/')) {
                const inferredMime = part.imageDataUri.substring(5, part.imageDataUri.indexOf(';'));
                if (inferredMime) finalMimeType = inferredMime;
            }
          }
          return { media: { url: part.imageDataUri, mimeType: finalMimeType } };
        }
        console.warn("SACAI_FLOW: Partie de message inconnue ou invalide lors du mappage :", part);
        return null;
      }).filter(Boolean) as Part[];

      if (content.length === 0) {
        console.warn("SACAI_FLOW: Message filtré car sans contenu valide:", msg);
        return null;
      }

      return {
        role: msg.role as 'user' | 'model',
        content: content,
      };
    }).filter(Boolean) as MessageData[];

  if (messagesForApi.length === 0) {
    const errorMessage = (input.history && input.history.length > 0)
        ? "Impossible de traiter votre demande car le message est vide ou invalide après traitement. Veuillez vérifier les fichiers téléversés ou le texte saisi."
        : "L'historique des messages est vide. Veuillez envoyer un message.";
    console.error("SACAI_FLOW: Server-side error condition (messagesForApi empty):", errorMessage);
    return new ReadableStream<ChatStreamChunk>({
        start(controller) {
            controller.enqueue({ error: errorMessage });
            controller.close();
        }
    });
  }

  const modelConfigTemperature = input.temperature ?? 0.7;
  console.log(`SACAI_FLOW: Calling ai.generateStream for model: googleai/gemini-2.0-flash-exp. System prompt length: ${systemInstructionText.length}, History length: ${messagesForApi.length}`);
  // console.log("SACAI_FLOW: Messages being sent to API:", JSON.stringify(messagesForApi, null, 2));


  return new ReadableStream<ChatStreamChunk>({
    async start(controller) {
      try {
        console.log("SACAI_FLOW: Stream generation starting...");
        const { stream: genkitStream, response: genkitResponsePromise } = ai.generateStream({
          model: 'googleai/gemini-2.0-flash-exp',
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
            // console.log("SACAI_FLOW: Enqueuing text chunk:", currentText.substring(0, 50) + "...");
            controller.enqueue({ text: currentText });
          }
        }

        console.log("SACAI_FLOW: Stream finished, awaiting final response promise.");
        const finalResponse = await genkitResponsePromise;
        console.log("SACAI_FLOW: Final response received:", JSON.stringify(finalResponse, null, 2).substring(0, 500) + "...");

        if (finalResponse && finalResponse.candidates && Array.isArray(finalResponse.candidates)) {
            if (finalResponse.candidates.length > 0) {
                const lastCandidate = finalResponse.candidates[finalResponse.candidates.length - 1];
                if (lastCandidate.finishReason && lastCandidate.finishReason !== 'STOP' && lastCandidate.finishReason !== 'MAX_TOKENS') {
                    console.warn("SACAI_FLOW: Stream finished with non-STOP/MAX_TOKENS reason:", lastCandidate.finishReason, lastCandidate.finishMessage);
                    let finishMessage = `La réponse a été interrompue (${lastCandidate.finishReason}).`;
                    if (lastCandidate.finishMessage) {
                        finishMessage += ` Détail: ${lastCandidate.finishMessage}`;
                    }
                    if (controller.desiredSize !== null && controller.desiredSize > 0) {
                        controller.enqueue({ error: finishMessage.trim() });
                    }
                }
            } else if (finalResponse.promptFeedback) { // No candidates, but promptFeedback exists
                const blockReason = finalResponse.promptFeedback.blockReason;
                const blockMessage = finalResponse.promptFeedback.blockReasonMessage;
                let errorMessage = `La requête a été bloquée. Raison: ${blockReason || 'Inconnue'}.`;
                if (blockMessage) errorMessage += ` Message: ${blockMessage}`;
                console.warn("SACAI_FLOW: Prompt blocked or no candidates:", errorMessage, JSON.stringify(finalResponse.promptFeedback, null, 2));
                if (controller.desiredSize !== null && controller.desiredSize > 0) {
                    controller.enqueue({ error: errorMessage });
                }
            }
        }

      } catch (error: any) {
        console.error("SACAI_FLOW: Erreur majeure pendant le streaming côté serveur (Genkit flow):", error);
        let errorMessage = "Une erreur est survenue lors du traitement de votre demande.";
        if (error.message) {
            errorMessage = error.message;
        } else if (error.cause?.message) {
            errorMessage = error.cause.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        console.log("SACAI_FLOW: Enqueuing error due to catch:", errorMessage);
        try {
          if (controller.desiredSize !== null && controller.desiredSize > 0) {
            controller.enqueue({ error: errorMessage });
          }
        } catch (e) {
          console.error("SACAI_FLOW: Impossible d'envoyer l'erreur au client (flux probablement fermé après erreur initiale):", e);
        }
      } finally {
        console.log("SACAI_FLOW: Stream processing finalized. Closing controller.");
        try {
          if (controller.desiredSize !== null && controller.desiredSize > 0) {
            controller.close();
          }
        } catch (e) {
           console.warn("SACAI_FLOW: Controller already closed or error during close in finally:", e);
        }
      }
    }
  });
}
