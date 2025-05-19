
// src/components/chat/chat-assistant.tsx
"use client";

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, User, Bot, Settings } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { streamChatAssistant, type ChatMessage, type ChatStreamChunk } from '@/ai/flows/chat-assistant-flow';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { LifeInsightsLogo } from '@/components/icons/logo';
import { KnowledgeDialog } from './knowledge-dialog';
import useLocalStorage from '@/hooks/use-local-storage';

export function ChatAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userKnowledge, setUserKnowledge] = useLocalStorage<string>('chatUserKnowledge', '');
  const [isKnowledgeDialogOpen, setIsKnowledgeDialogOpen] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  useEffect(() => {
    if (inputRef.current && !isKnowledgeDialogOpen) { // Avoid refocusing if dialog is open
      inputRef.current.focus();
    }
  }, [isLoading, isKnowledgeDialogOpen]); // Focus on load changes or when dialog closes

   useEffect(() => {
    // Initial focus when component mounts and dialog is not open
    if (inputRef.current && !isKnowledgeDialogOpen) {
      inputRef.current.focus();
    }
  }, [isKnowledgeDialogOpen]);


  const handleSendMessage = async (e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const newUserMessage: ChatMessage = { role: 'user', parts: input.trim() };
    
    setMessages(prev => [...prev, newUserMessage, { role: 'model', parts: '' }]);
    const currentHistory = [...messages, newUserMessage]; 

    setInput('');
    setIsLoading(true);

    try {
      const readableStream = await streamChatAssistant({ history: currentHistory, knowledge: userKnowledge });
      const reader = readableStream.getReader();
      
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read(); 
        
        if (done) {
          break;
        }

        const chatChunk: ChatStreamChunk = value;

        if (chatChunk.error) {
          throw new Error(chatChunk.error);
        }

        if (chatChunk.text) {
          setMessages(prev => {
            const lastMessageIndex = prev.length - 1;
            if (lastMessageIndex >= 0 && prev[lastMessageIndex].role === 'model') {
              const updatedMessages = [...prev];
              updatedMessages[lastMessageIndex] = {
                ...updatedMessages[lastMessageIndex],
                parts: updatedMessages[lastMessageIndex].parts + chatChunk.text,
              };
              return updatedMessages;
            }
            return [...prev, { role: 'model', parts: chatChunk.text }];
          });
        }
      }
    } catch (error: any) {
      console.error("Erreur lors du streaming du chat (côté client):", error);
      const errorMessage = error?.message || "Désolé, une erreur est survenue. Veuillez réessayer.";
      toast({
        title: "Erreur de l'assistant",
        description: errorMessage,
        variant: "destructive",
      });
      setMessages(prev => {
         const lastMessageIndex = prev.length - 1;
         if (lastMessageIndex >=0 && prev[lastMessageIndex].role === 'model' && prev[lastMessageIndex].parts === '') {
            const updatedMessages = [...prev];
            updatedMessages[lastMessageIndex] = { ...updatedMessages[lastMessageIndex], parts: errorMessage };
            return updatedMessages;
         }
        return [...prev, { role: 'model', parts: errorMessage }];
      });
    } finally {
      setIsLoading(false);
      // setTimeout(() => inputRef.current?.focus(), 0); // Refocus handled by useEffect
    }
  };

  const handleSaveKnowledge = (newKnowledge: string) => {
    setUserKnowledge(newKnowledge);
    toast({
      title: "Connaissances sauvegardées",
      description: "L'assistant utilisera ces informations pour ses prochaines réponses.",
    });
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground items-center justify-center p-2 md:p-4">
      <Card className="w-full max-w-3xl h-full flex flex-col shadow-xl border rounded-lg overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <LifeInsightsLogo className="h-8 w-8 text-primary" />
            <CardTitle className="text-xl font-semibold">
              Assistant IA Personnalisé
            </CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsKnowledgeDialogOpen(true)} aria-label="Configurer les connaissances">
            <Settings className="h-5 w-5 text-primary" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-full">
            <div className="p-6 space-y-6">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-start gap-3 p-3.5 rounded-xl max-w-[85%] break-words shadow-md",
                    msg.role === 'user' 
                      ? 'ml-auto bg-primary text-primary-foreground' 
                      : 'mr-auto bg-card border text-card-foreground'
                  )}
                >
                  {msg.role === 'model' && <Bot className="h-7 w-7 shrink-0 mt-0.5 text-primary" />}
                  
                  {msg.role === 'model' && isLoading && index === messages.length - 1 && msg.parts === '' ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.parts}</p>
                  )}

                  {msg.role === 'user' && <User className="h-7 w-7 shrink-0 mt-0.5" />}
                </div>
              ))}
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                  <Bot size={56} className="mb-6 text-primary" />
                  <p className="text-xl font-medium mb-3">Comment puis-je vous aider aujourd'hui ?</p>
                  <p className="text-base">Posez une question à votre assistant IA ou personnalisez ses connaissances via l'icône <Settings className="inline h-4 w-4" /> en haut à droite.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="p-4 border-t bg-background shrink-0">
          <form onSubmit={handleSendMessage} className="flex w-full items-center gap-3">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Envoyez un message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1 py-3 px-4 text-base rounded-lg"
            />
            <Button type="submit" size="lg" disabled={isLoading || !input.trim()} aria-label="Envoyer" className="rounded-lg">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </form>
        </CardFooter>
      </Card>
      <KnowledgeDialog
        isOpen={isKnowledgeDialogOpen}
        onOpenChange={setIsKnowledgeDialogOpen}
        currentKnowledge={userKnowledge}
        onSaveKnowledge={handleSaveKnowledge}
      />
    </div>
  );
}
