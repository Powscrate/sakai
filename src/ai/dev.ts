
import { config } from 'dotenv';
config();

import '@/ai/flows/chat-assistant-flow.ts';
import '@/ai/flows/generate-image-flow.ts';
import '@/ai/flows/generate-chat-title-flow.ts'; 
import '@/ai/flows/generate-login-thought-flow.ts';
import '@/ai/flows/generate-sakai-thought-flow.ts';

// Removed flows:
// analyze-image-flow.ts (merged into chat-assistant)
// process-document-flow.ts (merged into chat-assistant)
// generate-project-flow.ts (removed)
