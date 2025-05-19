
// src/components/chat/chat-assistant.tsx
"use client";

import { useState, useRef, useEffect, FormEvent } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, User, Bot, Settings, Brain, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { streamChatAssistant, type ChatMessage, type ChatStreamChunk } from '@/ai/flows/chat-assistant-flow';
import { generateImage, type GenerateImageInput, type GenerateImageOutput } from '@/ai/flows/generate-image-flow';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { LifeInsightsLogo } from '@/components/icons/logo'; // Remplacé par SakaiLogo plus tard si nécessaire
import { KnowledgeDialog } from './knowledge-dialog';
import useLocalStorage from '@/hooks/use-local-storage';

// Simple SVG Logo for Sakai
function SakaiLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="currentColor"
      {...props}
    >
      <path d="M50 10C27.9 10 10 27.9 10 50s17.9 40 40 40 40-17.9 40-40S72.1 10 50 10zm0 72c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32z" />
      <path d="M50 30c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20zm0 32c-6.6 0-12-5.4-12-12s5.4-12 12-12 12 5.4 12 12-5.4 12-12 12z" />
      <circle cx="50" cy="50" r="8" />
    </svg>
  );
}


export function ChatAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [userKnowledge, setUserKnowledge] = useLocalStorage<string>('sakaiUserKnowledge', '');
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

  useEffect(scrollToBottom, [messages, isLoading, isGeneratingImage]);

  useEffect(() => {
    if (inputRef.current && !isKnowledgeDialogOpen && !isLoading && !isGeneratingImage) { 
      inputRef.current.focus();
    }
  }, [isLoading, isKnowledgeDialogOpen, isGeneratingImage]); 

   useEffect(() => {
    if (inputRef.current && !isKnowledgeDialogOpen) {
      inputRef.current.focus();
    }
  }, [isKnowledgeDialogOpen]);

  const handleImageGeneration = async (prompt: string) => {
    setIsGeneratingImage(true);
    setMessages(prev => [...prev, { role: 'model', parts: `Sakai génère une image pour : "${prompt}"...` }]);
    
    try {
      const result: GenerateImageOutput = await generateImage({ prompt });
      if (result.imageUrl) {
        setMessages(prev => {
          const updatedMessages = [...prev];
          const lastMsgIndex = updatedMessages.length -1;
          if(updatedMessages[lastMsgIndex].role === 'model'){
             updatedMessages[lastMsgIndex].parts = result.imageUrl; // Store data URI
          } else {
             updatedMessages.push({role: 'model', parts: result.imageUrl});
          }
          return updatedMessages;
        });
      } else {
        throw new Error(result.error || "La génération d'image a échoué.");
      }
    } catch (error: any) {
      console.error("Erreur de génération d'image (client):", error);
      const errorMessage = error?.message || "Désolé, une erreur est survenue lors de la génération de l'image.";
      toast({
        title: "Erreur de génération d'image",
        description: errorMessage,
        variant: "destructive",
      });
      setMessages(prev => {
        const updatedMessages = [...prev];
        const lastMsgIndex = updatedMessages.length -1;
        if(updatedMessages[lastMsgIndex].role === 'model'){
           updatedMessages[lastMsgIndex].parts = `Erreur : ${errorMessage}`;
        } else {
           updatedMessages.push({role: 'model', parts: `Erreur : ${errorMessage}`});
        }
        return updatedMessages;
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSendMessage = async (e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading || isGeneratingImage) return;

    const userInput = input.trim();
    const newUserMessage: ChatMessage = { role: 'user', parts: userInput };
    
    setMessages(prev => [...prev, newUserMessage]);
    setInput('');

    if (userInput.toLowerCase().startsWith('/image ')) {
      const imagePrompt = userInput.substring(7).trim();
      if (imagePrompt) {
        await handleImageGeneration(imagePrompt);
      } else {
        setMessages(prev => [...prev, { role: 'model', parts: "Veuillez fournir une description pour l'image après la commande /image." }]);
      }
      return;
    }
    
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'model', parts: '' }]); // Placeholder for AI response
    const currentHistory = [...messages, newUserMessage]; 

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
    }
  };

  const handleSaveKnowledge = (newKnowledge: string) => {
    setUserKnowledge(newKnowledge);
    toast({
      title: "Connaissances sauvegardées",
      description: "Sakai utilisera ces informations pour ses prochaines réponses.",
    });
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground items-center justify-center p-2 md:p-4">
      <Card className="w-full max-w-3xl h-full flex flex-col shadow-xl border rounded-lg overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b shrink-0 bg-card">
          <div className="flex items-center gap-3">
            <SakaiLogo className="h-8 w-8 text-primary" />
            <CardTitle className="text-xl font-semibold">
              Sakai Assistant IA
            </CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsKnowledgeDialogOpen(true)} aria-label="Configurer les connaissances">
            <Brain className="h-5 w-5 text-primary hover:text-primary/80" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-full bg-background">
            <div className="p-4 sm:p-6 space-y-6">
              {messages.map((msg, index) => {
                const isImageMessage = msg.role === 'model' && msg.parts.startsWith('data:image/');
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex items-start gap-3 max-w-[85%] break-words",
                      msg.role === 'user' 
                        ? 'ml-auto' 
                        : 'mr-auto'
                    )}
                  >
                    {msg.role === 'model' && <Bot className="h-7 w-7 shrink-0 mt-0.5 text-primary" />}
                    
                    <div className={cn(
                       "p-3.5 rounded-xl shadow-md",
                       msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border text-card-foreground',
                       isImageMessage && "p-0 bg-transparent shadow-none border-none" // Special styling for image bubbles
                    )}>
                      {(isLoading && msg.role === 'model' && index === messages.length - 1 && msg.parts === '' && !isGeneratingImage) || 
                       (isGeneratingImage && msg.role === 'model' && msg.parts.startsWith('Sakai génère une image')) ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" /> 
                          <span className="text-sm">{msg.parts.startsWith('Sakai génère une image') ? msg.parts : ''}</span>
                        </div>
                      ) : isImageMessage ? (
                        <Image 
                          src={msg.parts} 
                          alt="Image générée par Sakai" 
                          width={300} // Adjust as needed
                          height={300} // Adjust as needed
                          className="rounded-lg object-contain"
                          data-ai-hint="generated art"
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.parts}</p>
                      )}
                    </div>

                    {msg.role === 'user' && <User className="h-7 w-7 shrink-0 mt-0.5" />}
                  </div>
                );
              })}
              {messages.length === 0 && !isLoading && !isGeneratingImage && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                  <Bot size={64} className="mb-6 text-primary" />
                  <p className="text-2xl font-medium mb-4">Bonjour ! Je suis Sakai. Comment puis-je vous aider ?</p>
                  <p className="text-base max-w-md">
                    Posez une question, demandez une blague, une histoire, ou générez une image avec la commande `/image votre_description`.
                    Personnalisez mes connaissances via l'icône <Brain className="inline-block align-middle h-5 w-5 mx-1 text-primary" /> en haut à droite.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="p-4 border-t bg-card shrink-0">
          <form onSubmit={handleSendMessage} className="flex w-full items-center gap-3">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Envoyez un message ou /image pour générer..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading || isGeneratingImage}
              className="flex-1 py-3 px-4 text-sm rounded-lg bg-background focus-visible:ring-primary/50" 
            />
            <Button type="submit" size="lg" disabled={isLoading || isGeneratingImage || !input.trim()} aria-label="Envoyer" className="rounded-lg px-6">
              {(isLoading || isGeneratingImage) ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
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
