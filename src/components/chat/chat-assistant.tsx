// src/components/chat/chat-assistant.tsx
"use client";

import { useState, useRef, useEffect, FormEvent } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, User, Bot, Mic, Zap, MessageSquarePlus, HelpCircle, Languages } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { streamChatAssistant, type ChatMessage, type ChatStreamChunk } from '@/ai/flows/chat-assistant-flow';
import { generateImage } from '@/ai/flows/generate-image-flow';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { SakaiLogo } from '@/components/icons/logo';
import { KnowledgeDialog } from './knowledge-dialog';
import useLocalStorage from '@/hooks/use-local-storage';
import { ThemeToggleButton } from './theme-toggle-button'; // Import the new theme toggle button

interface QuickAction {
  label: string;
  prompt: string;
  icon: React.ElementType;
}

const quickActions: QuickAction[] = [
  { label: "Raconte une blague", prompt: "Raconte-moi une blague.", icon: MessageSquarePlus },
  { label: "Fait amusant", prompt: "Donne-moi un fait amusant.", icon: HelpCircle },
  { label: "Génère un chat", prompt: "/image un chaton explorant une bibliothèque magique", icon: Zap },
  { label: "Traduis 'Bonjour'", prompt: "Traduis 'Bonjour le monde' en espagnol.", icon: Languages },
];

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
    const imageGenPlaceholderId = `img-gen-${Date.now()}`;
    setMessages(prev => [...prev, { role: 'model', parts: `Sakai génère une image pour : "${prompt}"...`, id: imageGenPlaceholderId }]);
    
    try {
      const result = await generateImage({ prompt });
      if (result.imageUrl) {
        setMessages(prev => prev.map(msg => msg.id === imageGenPlaceholderId ? {...msg, parts: result.imageUrl} : msg));
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
      setMessages(prev => prev.map(msg => msg.id === imageGenPlaceholderId ? {...msg, parts: `Erreur : ${errorMessage}`} : msg));
    } finally {
      setIsGeneratingImage(false);
    }
  };
  
  const handleSendMessage = async (e?: FormEvent<HTMLFormElement> | string) => {
    if (typeof e === 'object' && e?.preventDefault) e.preventDefault();
    
    const currentInput = (typeof e === 'string' ? e : input).trim();
    if (!currentInput || isLoading || isGeneratingImage) return;

    const newUserMessage: ChatMessage = { role: 'user', parts: currentInput, id: `user-${Date.now()}` };
    
    setMessages(prev => [...prev, newUserMessage]);
    if (typeof e !== 'string') {
      setInput('');
    }

    if (currentInput.toLowerCase().startsWith('/image ')) {
      const imagePrompt = currentInput.substring(7).trim();
      if (imagePrompt) {
        await handleImageGeneration(imagePrompt);
      } else {
        setMessages(prev => [...prev, { role: 'model', parts: "Veuillez fournir une description pour l'image après la commande /image.", id: `model-${Date.now()}` }]);
      }
      return;
    }
    
    setIsLoading(true);
    const assistantMessageId = `model-${Date.now()}`;
    setMessages(prev => [...prev, { role: 'model', parts: '', id: assistantMessageId }]);
    const currentHistory = [...messages, newUserMessage]; 

    try {
      const readableStream = await streamChatAssistant({ history: currentHistory, knowledge: userKnowledge });
      const reader = readableStream.getReader();
      
      let accumulatedText = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read(); 
        
        if (done) break;

        const chatChunk: ChatStreamChunk = value;

        if (chatChunk.error) throw new Error(chatChunk.error);

        if (chatChunk.text) {
          accumulatedText += chatChunk.text;
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, parts: accumulatedText } 
                : msg
            )
          );
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
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, parts: errorMessage } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    // Optionally, auto-send the message after setting the input
    // For now, user needs to press send or enter
    inputRef.current?.focus();
  };

  const handleSaveKnowledge = (newKnowledge: string) => {
    setUserKnowledge(newKnowledge);
    toast({
      title: "Connaissances sauvegardées",
      description: "Sakai utilisera ces informations pour ses prochaines réponses.",
    });
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 transition-colors duration-300">
      <Card className="w-full max-w-2xl h-full flex flex-col shadow-2xl border rounded-2xl overflow-hidden bg-card">
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <SakaiLogo className="h-9 w-9 text-primary" />
            <CardTitle className="text-2xl font-semibold text-foreground">
              Sakai
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsKnowledgeDialogOpen(true)} aria-label="Configurer les connaissances">
              <Bot className="h-[1.3rem] w-[1.3rem] text-primary hover:text-primary/80 transition-colors" />
            </Button>
            <ThemeToggleButton />
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-full bg-background/30 dark:bg-background/50">
            <div className="p-4 sm:p-6 space-y-6">
              {messages.length === 0 && !isLoading && !isGeneratingImage && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 space-y-6">
                  <SakaiLogo className="h-24 w-24 text-primary opacity-80" />
                  <p className="text-3xl font-medium">Bonjour ! Je suis Sakai.</p>
                  <p className="text-lg max-w-md">
                    Comment puis-je vous aider aujourd'hui ? Essayez une action rapide ci-dessous ou tapez votre question.
                  </p>
                </div>
              )}
              {messages.map((msg, index) => {
                const isImageMessage = msg.role === 'model' && msg.parts.startsWith('data:image/');
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id || index}
                    className={cn(
                      "flex items-end gap-3 max-w-[85%] break-words",
                      isUser ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'
                    )}
                  >
                    {isUser ? <User className="h-8 w-8 shrink-0 text-muted-foreground/80 mb-1" /> : <Bot className="h-8 w-8 shrink-0 text-primary mb-1" />}
                    
                    <div className={cn(
                       "p-3.5 rounded-2xl shadow-md transition-all duration-200 ease-out",
                       isUser 
                         ? 'bg-primary text-primary-foreground rounded-br-none' 
                         : 'bg-card border text-card-foreground rounded-bl-none',
                       isImageMessage && "p-0 bg-transparent shadow-none border-none"
                    )}>
                      {(isLoading && msg.role === 'model' && msg.id?.startsWith('model-') && msg.parts === '' && index === messages.length -1 && !isGeneratingImage) || 
                       (isGeneratingImage && msg.role === 'model' && msg.parts.startsWith('Sakai génère une image')) ? (
                        <div className="flex items-center gap-2 p-2">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" /> 
                          <span className="text-sm">{msg.parts.startsWith('Sakai génère une image') ? "Génération d'image..." : "Sakai réfléchit..."}</span>
                        </div>
                      ) : isImageMessage ? (
                        <Image 
                          src={msg.parts} 
                          alt="Image générée par Sakai" 
                          width={300}
                          height={300}
                          className="rounded-lg object-contain"
                          data-ai-hint="generated art"
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.parts}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="p-4 border-t bg-card shrink-0 flex flex-col gap-3">
          {messages.length === 0 && (
             <div className="w-full mb-2">
                <p className="text-xs text-muted-foreground mb-2 text-center">Actions rapides :</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {quickActions.map(action => (
                    <Button 
                        key={action.label} 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleQuickAction(action.prompt)}
                        className="text-xs justify-start text-left h-auto py-2 leading-tight"
                    >
                        <action.icon className="h-4 w-4 mr-2 shrink-0 opacity-70" />
                        {action.label}
                    </Button>
                    ))}
                </div>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex w-full items-center gap-3">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Envoyer un message à Sakai..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading || isGeneratingImage}
              className="flex-1 py-3 px-4 text-sm rounded-lg bg-background focus-visible:ring-primary/50 h-11" 
            />
            <Button variant="ghost" size="icon" type="button" aria-label="Saisie vocale (Bientôt disponible)" className="text-primary hover:text-primary/80" disabled>
                <Mic className="h-5 w-5" />
            </Button>
            <Button type="submit" size="icon" disabled={isLoading || isGeneratingImage || !input.trim()} aria-label="Envoyer" className="h-11 w-11 rounded-lg">
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
