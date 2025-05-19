// src/app/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { ChatAssistant } from '@/components/chat/chat-assistant';
import { Loader2 } from 'lucide-react';

export default function ChatPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // You can render a loader here or null
    // Returning a simple loader to indicate something is happening
    return (
      <div className="flex flex-col h-screen bg-background text-foreground items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Chargement de Sakai...</p>
      </div>
    );
  }

  return <ChatAssistant />;
}
