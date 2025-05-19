
import { config } from 'dotenv';
config();

import '@/ai/flows/chat-assistant-flow.ts';
import '@/ai/flows/generate-image-flow.ts';
import '@/ai/flows/analyze-image-flow.ts';
import '@/ai/flows/process-document-flow.ts'; // Ajout du nouveau flux

