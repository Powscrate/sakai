
import { config } from 'dotenv';
config();

import '@/ai/flows/chat-assistant-flow.ts';
import '@/ai/flows/generate-image-flow.ts';
import '@/ai/flows/generate-project-flow.ts'; 
// analyze-image-flow.ts and process-document-flow.ts are no longer imported
// as their functionality is now part of chat-assistant-flow.ts
