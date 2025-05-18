// src/components/chat/chat-assistant.tsx
"use client";

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle, X, Loader2, User, Bot } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { streamChatAssistant, type ChatMessage } from '@/ai/flows/chat-assistant-flow';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async (e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const newUserMessage: ChatMessage = { role: 'user', parts: input.trim() };
    setMessages(prev => [...prev, newUserMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    // Add a placeholder for the model's response immediately
    setMessages(prev => [...prev, { role: 'model', parts: '' }]);

    try {
      await streamChatAssistant(
        { history: [...messages, newUserMessage] }, // Send the current history including the new user message
        (chunk) => { // onChunk callback
          if (chunk.text) {
            setMessages(prev => {
              const lastMessageIndex = prev.length - 1;
              if (lastMessageIndex >= 0 && prev[lastMessageIndex].role === 'model') {
                const updatedMessages = [...prev];
                updatedMessages[lastMessageIndex] = {
                  ...updatedMessages[lastMessageIndex],
                  parts: updatedMessages[lastMessageIndex].parts + chunk.text!,
                };
                return updatedMessages;
              }
              // This case should ideally not happen if placeholder is added correctly
              return [...prev, { role: 'model', parts: chunk.text! }];
            });
          }
        }
      );
    } catch (error: any) {
      console.error("Erreur lors du streaming du chat:", error);
      toast({
        title: "Erreur de l'assistant",
        description: error?.message || "Désolé, une erreur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
      setMessages(prev => {
         const lastMessageIndex = prev.length - 1;
         if (lastMessageIndex >=0 && prev[lastMessageIndex].role === 'model' && prev[lastMessageIndex].parts === '') {
            const updatedMessages = [...prev];
            updatedMessages[lastMessageIndex] = { ...updatedMessages[lastMessageIndex], parts: "Désolé, une erreur est survenue." };
            return updatedMessages;
         }
        return [...prev, { role: 'model', parts: "Désolé, une erreur est survenue." }];
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <>
      <Button
        variant="default" // Changed variant for more visibility
        size="icon"
        className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg z-50"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Fermer le chat" : "Ouvrir le chat"}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-[calc(100vw-3rem)] max-w-md h-[calc(100vh-8rem)] max-h-[600px] shadow-xl z-40 flex flex-col border rounded-lg bg-card">
          <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              Assistant Perspectives de Vie
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea ref={scrollAreaRef} className="h-full">
              <div className="p-4 space-y-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-start gap-2.5 p-3 rounded-lg max-w-[85%] break-words",
                      msg.role === 'user' 
                        ? 'ml-auto bg-primary text-primary-foreground' 
                        : 'mr-auto bg-muted text-foreground'
                    )}
                  >
                    {msg.role === 'model' && <Bot className="h-5 w-5 shrink-0 mt-0.5 text-primary" />}
                    <p className="text-sm whitespace-pre-wrap">{msg.parts}</p>
                    {msg.role === 'user' && <User className="h-5 w-5 shrink-0 mt-0.5" />}
                  </div>
                ))}
                {isLoading && messages.length > 0 && messages[messages.length -1]?.role === 'model' && messages[messages.length -1]?.parts === '' && (
                   <div className="flex items-start gap-2.5 p-3 rounded-lg max-w-[85%] mr-auto bg-muted text-foreground">
                     <Bot className="h-5 w-5 shrink-0 mt-0.5 text-primary" />
                     <Loader2 className="h-5 w-5 animate-spin" />
                   </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="p-2 border-t bg-background">
            <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Posez une question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()} aria-label="Envoyer">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
