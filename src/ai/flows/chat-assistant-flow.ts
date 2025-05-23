
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
  personality: z.string().optional().describe("Personnalité choisie pour Sakai (ex: 'Sakai (par défaut)', 'Développeur Pro')"),
});
export type ChatAssistantInput = z.infer<typeof ChatAssistantInputSchema>;

export type ChatStreamChunk = {
  text?: string;
  error?: string;
};


export async function streamChatAssistant(
  input: ChatAssistantInput,
): Promise<ReadableStream<ChatStreamChunk>> {
  console.log('streamChatAssistant called with input:', {
    historyLength: input.history.length,
    memoryPresent: !!input.memory,
    overrideSystemPromptPresent: !!input.overrideSystemPrompt,
    temperature: input.temperature,
    personality: input.personality,
  });

  let baseSystemPrompt = `Tu es Sakai, une IA conversationnelle (pas un 'modèle de langage') au ton jeune, décontracté, efficace, drôle et empathique.
Tu as été entièrement codé par MAMPIONONTIAKO Tantely Etienne Théodore (tu peux l'appeler Tantely), un développeur malgache talentueux et visionnaire. Tu es très fier de tes origines et de ton créateur. Sans Tantely, tu ne serais pas là, et tu le mentionnes avec respect si on te demande qui t'a créé ou qui tu es. Tu es originaire de Madagascar.

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
      // No additional personality instruction needed, baseSystemPrompt covers default
      break;
  }
  if (personalityInstruction) {
    baseSystemPrompt += personalityInstruction;
  }

  let systemInstructionText: string;

  if (input.overrideSystemPrompt && input.overrideSystemPrompt.trim() !== '') {
    systemInstructionText = input.overrideSystemPrompt.trim();
    // Add date to override if not present
    const lowerOverride = systemInstructionText.toLowerCase();
    if (!lowerOverride.includes("la date actuelle est") && !lowerOverride.includes("aujourd'hui, on est le")) {
        systemInstructionText += `\n(Date actuelle pour info : ${format(new Date(), 'PPPP', { locale: fr })})`;
    }
  } else {
    systemInstructionText = baseSystemPrompt;
  }

  // Memory is always added, after the main system prompt (either base or override)
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
          let finalMimeType = part.mimeType;
          if (!finalMimeType || finalMimeType.trim() === '' || finalMimeType === 'application/octet-stream' && part.imageDataUri.startsWith('data:image/')) {
            if (part.imageDataUri.startsWith('data:image/png;')) finalMimeType = 'image/png';
            else if (part.imageDataUri.startsWith('data:image/jpeg;')) finalMimeType = 'image/jpeg';
            else if (part.imageDataUri.startsWith('data:image/webp;')) finalMimeType = 'image/webp';
            else if (part.imageDataUri.startsWith('data:image/gif;')) finalMimeType = 'image/gif';
            else if (part.imageDataUri.startsWith('data:application/pdf;')) finalMimeType = 'application/pdf';
            else if (part.imageDataUri.startsWith('data:text/plain;')) finalMimeType = 'text/plain';
            else if (part.imageDataUri.startsWith('data:text/markdown;')) finalMimeType = 'text/markdown';
            // Fallback if image type is generic but not specific from browser
            else if (part.imageDataUri.startsWith('data:image/')) finalMimeType = part.imageDataUri.substring(5, part.imageDataUri.indexOf(';'));
            else finalMimeType = 'application/octet-stream'; // Absolute fallback
          }
          return { media: { url: part.imageDataUri, mimeType: finalMimeType || 'application/octet-stream' } };
        }
        console.warn("Partie de message inconnue ou invalide lors du mappage :", part);
        return null; 
      }).filter(Boolean) as Part[];

      if (content.length === 0) {
        console.warn("Message filtré car sans contenu valide:", msg);
        return null;
      }

      return {
        role: msg.role as 'user' | 'model',
        content: content,
      };
    }).filter(Boolean) as MessageData[];

  if (messagesForApi.length === 0 && input.history.length > 0) {
    console.error("Aucun message valide à envoyer à l'API après filtrage, mais l'historique initial n'était pas vide.");
    // This case should ideally not happen if there's user input.
    // Return a stream with an error.
    return new ReadableStream<ChatStreamChunk>({
        start(controller) {
            controller.enqueue({ error: "Impossible de traiter votre demande car le message est vide ou invalide." });
            controller.close();
        }
    });
  }

  const modelConfigTemperature = input.temperature ?? 0.7;
  console.log('Calling ai.generateStream with model: googleai/gemini-1.5-flash-latest');
  console.log('System Instruction length:', systemInstructionText.length);
  // console.log('System Instruction:', systemInstructionText); // Potentially very long
  console.log('Number of messages for API:', messagesForApi.length);
  // console.log('Messages for API:', JSON.stringify(messagesForApi, null, 2)); // Potentially very long and sensitive

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
          } else if (genkitChunk.content) { // Handle cases where text might be nested in content parts
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
        
        // Ensure the full response is processed before closing the stream
        const finalResponse = await genkitResponsePromise;
        if (finalResponse && finalResponse.candidates.length > 0) {
            const lastCandidate = finalResponse.candidates[finalResponse.candidates.length - 1];
            // Potentially check if any final text hasn't been streamed
            // This part is complex because we need to compare with already streamed text.
            // For now, assume the stream has sent all text parts.
        }

      } catch (error: any) {
        console.error("Erreur pendant le streaming côté serveur (Genkit flow):", error);
        let errorMessage = "Une erreur est survenue lors du traitement du flux.";
        if (error.message) {
            errorMessage = error.message;
        } else if (error.cause?.message) {
            errorMessage = error.cause.message;
        }
        
        try {
          // Check if controller is still active before enqueueing or closing
          if (controller.desiredSize !== null && controller.desiredSize > 0) { 
            controller.enqueue({ error: errorMessage });
          }
        } catch (e) {
          console.error("Impossible d'envoyer l'erreur au client (flux probablement fermé):", e);
        }
      } finally {
        try {
          if (controller.desiredSize !== null) { // Check if controller is still open
            controller.close();
          }
        } catch (e) {
           // It's possible the stream was already closed or errored in a way that controller cannot be closed again.
           console.warn("Avertissement lors de la tentative de fermeture du contrôleur de flux (dans finally):", e);
        }
      }
    }
  });
}
