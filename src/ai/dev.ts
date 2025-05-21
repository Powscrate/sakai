
import { config } from 'dotenv';
config();

import '@/ai/flows/chat-assistant-flow.ts';
import '@/ai/flows/generate-image-flow.ts';
import '@/ai/flows/generate-chat-title-flow.ts'; // Added
import '@/ai/flows/generate-login-thought-flow.ts'; // Added

// generate-project-flow.ts import removed
// analyze-image-flow.ts and process-document-flow.ts are no longer imported
// as their functionality is now part of chat-assistant-flow.ts
