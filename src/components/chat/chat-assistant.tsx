
// src/components/chat/chat-assistant.tsx
"use client";

import { useState, useRef, useEffect, FormEvent, ChangeEvent } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, Loader2, User, Bot, Mic, Zap, MessageSquarePlus, HelpCircle, Languages, Brain, Paperclip, XCircle, 
  MoreVertical, Info, SlidersHorizontal, AlertTriangle, CheckCircle, Mail, Plane, Lightbulb
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // AlertDialogTrigger was removed as it's not directly used here.
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";

import { streamChatAssistant, type ChatMessage, type ChatStreamChunk, type ChatMessagePart } from '@/ai/flows/chat-assistant-flow';
import { generateImage } from '@/ai/flows/generate-image-flow'; // type GenerateImageInput removed as not directly used
import { analyzeImage } from '@/ai/flows/analyze-image-flow'; // type AnalyzeImageInput removed as not directly used
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { SakaiLogo } from '@/components/icons/logo';
import { MemoryDialog } from './memory-dialog';
import useLocalStorage from '@/hooks/use-local-storage';
import { ThemeToggleButton } from './theme-toggle-button';

interface QuickAction {
  label: string;
  prompt: string;
  icon: React.ElementType;
  actionType?: 'input' | 'command'; 
}

const quickActions: QuickAction[] = [
  { label: "Raconte une blague", prompt: "Raconte-moi une blague.", icon: MessageSquarePlus, actionType: 'input' },
  { label: "Donne un fait amusant", prompt: "Donne-moi un fait amusant.", icon: HelpCircle, actionType: 'input' },
  { label: "Génère un chaton", prompt: "/image un chaton explorant une bibliothèque magique", icon: Zap, actionType: 'input' },
  { label: "Traduis 'Bonjour le monde'", prompt: "Traduis 'Bonjour le monde' en espagnol.", icon: Languages, actionType: 'input' },
  { label: "Résume un email", prompt: "Peux-tu m'aider à résumer cet email : [coller l'email ici] ?", icon: Mail, actionType: 'input' },
  { label: "Planifie un voyage", prompt: "Aide-moi à planifier un voyage pour [destination] pour [nombre] jours.", icon: Plane, actionType: 'input' },
  { label: "Rédige un pitch", prompt: "J'ai besoin d'un pitch pour [produit/idée]. Peux-tu m'aider à le rédiger ?", icon: Lightbulb, actionType: 'input' },
  { label: "Analyser une image", prompt: "Décris cette image.", icon: Paperclip, actionType: 'input' },
];

const DEV_ACCESS_CODE = "1234566";

export function ChatAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [userMemory, setUserMemory] = useLocalStorage<string>('sakaiUserMemory', '');
  const [isMemoryDialogOpen, setIsMemoryDialogOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<{ dataUri: string; file: File } | null>(null);
  
  const [isFeaturesDialogOpen, setIsFeaturesDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isDevCodePromptOpen, setIsDevCodePromptOpen] = useState(false);
  const [devCodeInput, setDevCodeInput] = useState('');
  const [isDevSettingsOpen, setIsDevSettingsOpen] = useState(false);

  const [devOverrideSystemPrompt, setDevOverrideSystemPrompt] = useLocalStorage<string>('sakaiDevOverrideSystemPrompt', '');
  const [devModelTemperature, setDevModelTemperature] = useLocalStorage<number | undefined>('sakaiDevModelTemperature', undefined);
  
  const [tempOverrideSystemPrompt, setTempOverrideSystemPrompt] = useState(devOverrideSystemPrompt);
  const [tempModelTemperature, setTempModelTemperature] = useState(devModelTemperature ?? 0.7);


  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  };

  useEffect(scrollToBottom, [messages, isLoading, isGeneratingImage, isAnalyzingImage]);

  useEffect(() => {
    if (inputRef.current && !isMemoryDialogOpen && !isDevSettingsOpen && !isDevCodePromptOpen && !isLoading && !isGeneratingImage && !isAnalyzingImage) { 
      inputRef.current.focus();
    }
  }, [isLoading, isMemoryDialogOpen, isDevSettingsOpen, isDevCodePromptOpen, isGeneratingImage, isAnalyzingImage]); 

   useEffect(() => {
    if (inputRef.current && !isMemoryDialogOpen && !isDevSettingsOpen && !isDevCodePromptOpen) {
      inputRef.current.focus();
    }
  }, [isMemoryDialogOpen, isDevSettingsOpen, isDevCodePromptOpen]);

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage({ dataUri: reader.result as string, file });
      };
      reader.readAsDataURL(file);
    } else if (file) {
      toast({
        title: "Type de fichier non supporté",
        description: "Veuillez sélectionner un fichier image (ex: PNG, JPG).",
        variant: "destructive",
      });
    }
    event.target.value = ''; 
  };

  const clearUploadedImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; 
    }
  };

  const handleImageGeneration = async (promptText: string) => {
    setIsGeneratingImage(true);
    const imageGenPlaceholderId = `img-gen-${Date.now()}`;
    setMessages(prev => [...prev, { 
      role: 'model', 
      parts: [{type: 'text', text: `Sakai génère une image pour : "${promptText}"...`}], 
      id: imageGenPlaceholderId 
    }]);
    
    try {
      const result = await generateImage({ prompt: promptText });
      if (result.imageUrl) {
        setMessages(prev => prev.map(msg => 
          msg.id === imageGenPlaceholderId 
          ? {...msg, parts: [{ type: 'image', imageDataUri: result.imageUrl, mimeType: 'image/png' }]} 
          : msg
        ));
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
      setMessages(prev => prev.map(msg => 
        msg.id === imageGenPlaceholderId 
        ? {...msg, parts: [{type: 'text', text: `Erreur : ${errorMessage}`}]}
        : msg
      ));
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleImageAnalysis = async (promptText: string, image: { dataUri: string; file: File }) => {
    setIsAnalyzingImage(true);
    const analysisPlaceholderId = `analysis-${Date.now()}`;

    const userMessageParts: ChatMessagePart[] = [
        { type: 'image', imageDataUri: image.dataUri, mimeType: image.file.type },
        { type: 'text', text: promptText }
    ];
    const newUserMessage: ChatMessage = { role: 'user', parts: userMessageParts, id: `user-img-${Date.now()}` };
    setMessages(prev => [...prev, newUserMessage]);
    clearUploadedImage(); 

    setMessages(prev => [...prev, { 
      role: 'model', 
      parts: [{type: 'text', text: "Sakai analyse l'image..."}], 
      id: analysisPlaceholderId 
    }]);
    
    try {
      const result = await analyzeImage({ prompt: promptText, imageDataUri: image.dataUri, mimeType: image.file.type });
      if (result.analysis) {
        setMessages(prev => prev.map(msg => 
          msg.id === analysisPlaceholderId 
          ? {...msg, parts: [{type: 'text', text: result.analysis}]}
          : msg
        ));
      } else {
        throw new Error(result.error || "L'analyse d'image a échoué.");
      }
    } catch (error: any) {
      console.error("Erreur d'analyse d'image (client):", error);
      const errorMessage = error?.message || "Désolé, une erreur est survenue lors de l'analyse de l'image.";
      toast({
        title: "Erreur d'analyse d'image",
        description: errorMessage,
        variant: "destructive",
      });
       setMessages(prev => prev.map(msg => 
        msg.id === analysisPlaceholderId 
        ? {...msg, parts: [{type: 'text', text: `Erreur : ${errorMessage}`}]}
        : msg
      ));
    } finally {
      setIsAnalyzingImage(false);
    }
  };
  
  const handleSendMessage = async (e?: FormEvent<HTMLFormElement> | string) => {
    if (typeof e === 'object' && e?.preventDefault) e.preventDefault();
    
    const currentInput = (typeof e === 'string' ? e : input).trim();
    if ((!currentInput && !uploadedImage) || isLoading || isGeneratingImage || isAnalyzingImage) return;

    if (uploadedImage) {
      await handleImageAnalysis(currentInput || "Décris cette image.", uploadedImage);
      if (typeof e !== 'string') setInput('');
      return;
    }

    const newUserMessageParts: ChatMessagePart[] = [{ type: 'text', text: currentInput }];
    const newUserMessage: ChatMessage = { role: 'user', parts: newUserMessageParts, id: `user-${Date.now()}` };
    
    setMessages(prev => [...prev, newUserMessage]);
    if (typeof e !== 'string') {
      setInput('');
    }

    if (currentInput.toLowerCase().startsWith('/image ')) {
      const imagePrompt = currentInput.substring(7).trim();
      if (imagePrompt) {
        await handleImageGeneration(imagePrompt);
      } else {
        setMessages(prev => [...prev, { role: 'model', parts: [{type: 'text', text: "Veuillez fournir une description pour l'image après la commande /image."}], id: `model-${Date.now()}` }]);
      }
      return;
    }
    
    setIsLoading(true);
    const assistantMessageId = `model-${Date.now()}`;
    setMessages(prev => [...prev, { role: 'model', parts: [{type: 'text', text: ''}], id: assistantMessageId }]);
    
    const currentHistory = [...messages, newUserMessage].filter(msg => 
      !(msg.parts.length === 1 && msg.parts[0].type === 'text' && 
        (msg.parts[0].text.startsWith('Sakai génère une image') || msg.parts[0].text.startsWith("Sakai analyse l'image")))
    );

    try {
      const readableStream = await streamChatAssistant({ 
        history: currentHistory, 
        memory: userMemory,
        overrideSystemPrompt: devOverrideSystemPrompt,
        temperature: devModelTemperature
      });
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
                ? { ...msg, parts: [{type: 'text', text: accumulatedText }] } 
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
            ? { ...msg, parts: [{ type: 'text', text: errorMessage }] } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.actionType === 'input') {
      if (action.label === "Analyser une image") {
         if (uploadedImage) {
           setInput(action.prompt);
         } else {
           fileInputRef.current?.click(); 
           setInput(action.prompt); 
         }
      } else if (action.prompt.startsWith("/image") && uploadedImage) {
        setInput("Décris cette image."); 
      }
      else {
        setInput(action.prompt);
      }
      inputRef.current?.focus();
    }
  };

  const handleSaveMemory = (newMemory: string) => {
    setUserMemory(newMemory);
    toast({
      title: "Mémoire sauvegardée",
      description: "Sakai utilisera ces informations pour ses prochaines réponses.",
    });
  };

  const handleDevCodeCheck = () => {
    if (devCodeInput === DEV_ACCESS_CODE) {
      setIsDevCodePromptOpen(false);
      setDevCodeInput('');
      setTempOverrideSystemPrompt(devOverrideSystemPrompt); // Sync temp state
      setTempModelTemperature(devModelTemperature ?? 0.7); // Sync temp state
      setIsDevSettingsOpen(true);
      toast({
        title: "Accès Développeur Accordé",
        description: "Vous pouvez maintenant modifier les paramètres du modèle.",
        variant: "default",
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      });
    } else {
      toast({
        title: "Code d'accès incorrect",
        description: "Veuillez réessayer.",
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
      });
      setDevCodeInput('');
    }
  };

  const handleSaveDevSettings = () => {
    setDevOverrideSystemPrompt(tempOverrideSystemPrompt);
    setDevModelTemperature(tempModelTemperature);
    setIsDevSettingsOpen(false);
    toast({
      title: "Paramètres développeur sauvegardés",
      description: "Les nouveaux paramètres seront appliqués à la prochaine interaction.",
    });
  };

  const handleResetDevSettings = () => {
    setTempOverrideSystemPrompt('');
    setTempModelTemperature(0.7);
    // To apply immediately, also update the main state and localStorage
    setDevOverrideSystemPrompt('');
    setDevModelTemperature(undefined); 
    toast({
      title: "Paramètres développeur réinitialisés",
      description: "Les paramètres par défaut sont restaurés.",
    });
  };
  
  useEffect(() => { // Update temp states if global dev states change (e.g. by another tab)
    setTempOverrideSystemPrompt(devOverrideSystemPrompt);
    setTempModelTemperature(devModelTemperature ?? 0.7);
  }, [devOverrideSystemPrompt, devModelTemperature]);


  return (
    <div className="flex flex-col h-screen bg-background text-foreground items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 transition-colors duration-300">
      <Card className="w-full max-w-2xl h-full flex flex-col shadow-2xl border rounded-2xl overflow-hidden bg-card">
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b shrink-0 bg-card">
          <div className="flex items-center gap-3">
            <SakaiLogo className="h-9 w-9 text-primary" />
            <CardTitle className="text-2xl font-semibold text-foreground">
              Sakai
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggleButton />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Plus d'options">
                  <MoreVertical className="h-[1.3rem] w-[1.3rem] text-primary hover:text-primary/80 transition-colors" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setIsFeaturesDialogOpen(true)}>
                  <Zap className="mr-2 h-4 w-4" />
                  Fonctionnalités de Sakai
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsMemoryDialogOpen(true)}>
                  <Brain className="mr-2 h-4 w-4" />
                  Panneau de Mémoire
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDevCodePromptOpen(true)}>
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Mode Développeur
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsAboutDialogOpen(true)}>
                  <Info className="mr-2 h-4 w-4" />
                  À propos de Sakai
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-full bg-background/30 dark:bg-background/50">
            <div className="p-4 sm:p-6 space-y-6">
              {messages.length === 0 && !isLoading && !isGeneratingImage && !isAnalyzingImage && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 space-y-6">
                  <SakaiLogo className="h-28 w-28 text-primary opacity-80" />
                  <p className="text-3xl font-medium">Bonjour ! Je suis Sakai, votre assistant IA avancé.</p>
                  <p className="text-lg max-w-md">
                    Prêt à explorer ? Essayez une action rapide, posez une question, ou <label htmlFor="file-upload-button" className="text-primary hover:underline cursor-pointer font-medium">téléchargez une image</label> à analyser. Vous pouvez aussi configurer ma <Button variant="link" className="p-0 h-auto text-lg text-primary" onClick={() => setIsMemoryDialogOpen(true)}>mémoire</Button>.
                  </p>
                </div>
              )}
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                const isLoadingMessage = (isLoading && msg.role === 'model' && msg.id?.startsWith('model-') && msg.parts.length === 1 && msg.parts[0].type === 'text' && msg.parts[0].text === '' && !isGeneratingImage && !isAnalyzingImage);
                const isImageGenPlaceholder = isGeneratingImage && msg.role === 'model' && msg.parts.length === 1 && msg.parts[0].type === 'text' && msg.parts[0].text.startsWith('Sakai génère une image');
                const isAnalysisPlaceholder = isAnalyzingImage && msg.role === 'model' && msg.parts.length === 1 && msg.parts[0].type === 'text' && msg.parts[0].text.startsWith("Sakai analyse l'image");
                
                return (
                  <div
                    key={msg.id || `msg-${Math.random()}`} 
                    className={cn(
                      "flex items-end gap-3 max-w-[85%] break-words",
                      isUser ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'
                    )}
                  >
                    {isUser ? <User className="h-7 w-7 shrink-0 text-muted-foreground/80 mb-1.5" /> : <Bot className="h-7 w-7 shrink-0 text-primary mb-1.5" />}
                    
                    <div className={cn(
                       "p-3.5 rounded-xl shadow-md transition-all duration-200 ease-out",
                       isUser 
                         ? 'bg-primary text-primary-foreground rounded-br-none' 
                         : 'bg-card border text-card-foreground rounded-bl-none',
                        msg.parts.some(p => p.type === 'image') && !isLoadingMessage && !isImageGenPlaceholder && !isAnalysisPlaceholder && "p-1.5 bg-transparent shadow-none border-none dark:bg-transparent" 
                    )}>
                      {isLoadingMessage || isImageGenPlaceholder || isAnalysisPlaceholder ? (
                        <div className="flex items-center gap-2 p-2">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" /> 
                          <span className="text-sm text-muted-foreground">
                            {isImageGenPlaceholder ? "Génération d'image..." : isAnalysisPlaceholder ? "Analyse en cours..." : "Sakai réfléchit..."}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {msg.parts.map((part, partIndex) => {
                            if (part.type === 'text' && part.text.trim() !== '') {
                              return <p key={partIndex} className="text-sm whitespace-pre-wrap leading-relaxed">{part.text}</p>;
                            }
                            if (part.type === 'image' && part.imageDataUri) {
                              return (
                                <Image 
                                  key={partIndex}
                                  src={part.imageDataUri} 
                                  alt={isUser ? "Image envoyée par l'utilisateur" : "Image générée par Sakai"}
                                  width={300} 
                                  height={300} 
                                  className="rounded-lg object-contain max-w-full h-auto border border-border/50"
                                  data-ai-hint={isUser ? "user uploaded" : "generated art"}
                                />
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="p-4 border-t bg-card shrink-0 flex flex-col gap-3">
          {uploadedImage && (
            <div className="relative w-full p-2 border border-dashed rounded-md mb-2 flex items-center justify-between bg-background/50 dark:bg-muted/30">
              <div className="flex items-center gap-2 overflow-hidden">
                <Image src={uploadedImage.dataUri} alt="Preview de l'image à envoyer" width={40} height={40} className="rounded object-cover shrink-0" data-ai-hint="image preview"/>
                <span className="text-xs text-muted-foreground truncate">{uploadedImage.file.name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={clearUploadedImage} className="text-destructive hover:text-destructive/80 h-7 w-7 shrink-0">
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
          {(messages.length === 0 && !uploadedImage) && (
             <div className="w-full mb-2">
                <p className="text-xs text-muted-foreground mb-2 text-center font-medium">Suggestions :</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {quickActions.map(action => (
                    <Button 
                        key={action.label} 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleQuickAction(action)}
                        className="text-xs justify-start text-left h-auto py-2 leading-tight hover:bg-accent/50 hover:text-accent-foreground dark:hover:bg-accent/20"
                    >
                        <action.icon className="h-4 w-4 mr-2 shrink-0 opacity-70" />
                        {action.label}
                    </Button>
                    ))}
                </div>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex w-full items-center gap-3">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" id="file-upload-button"/>
            <Button variant="outline" size="icon" type="button" aria-label="Télécharger un fichier" onClick={() => fileInputRef.current?.click()} className="text-primary hover:text-primary/80 border-primary/30 hover:bg-primary/10 dark:hover:bg-primary/20 shrink-0 h-11 w-11 rounded-lg">
                <Paperclip className="h-5 w-5" />
            </Button>
            <Input
              ref={inputRef}
              type="text"
              placeholder={uploadedImage ? "Ajouter un commentaire sur l'image..." : "Envoyer un message à Sakai..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading || isGeneratingImage || isAnalyzingImage}
              className="flex-1 py-3 px-4 text-sm rounded-lg bg-background focus-visible:ring-primary/50 h-11" 
            />
            <Button variant="outline" size="icon" type="button" aria-label="Saisie vocale (Bientôt disponible)" className="text-primary hover:text-primary/80 border-primary/30 hover:bg-primary/10 dark:hover:bg-primary/20 shrink-0 h-11 w-11 rounded-lg" disabled>
                <Mic className="h-5 w-5" />
            </Button>
            <Button type="submit" size="icon" disabled={isLoading || isGeneratingImage || isAnalyzingImage || (!input.trim() && !uploadedImage)} aria-label="Envoyer" className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 w-11 rounded-lg shrink-0">
              {(isLoading || isGeneratingImage || isAnalyzingImage) ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </form>
        </CardFooter>
      </Card>

      {/* Memory Dialog */}
      <MemoryDialog
        isOpen={isMemoryDialogOpen}
        onOpenChange={setIsMemoryDialogOpen}
        currentMemory={userMemory}
        onSaveMemory={handleSaveMemory}
      />

      {/* Features Dialog */}
      <AlertDialog open={isFeaturesDialogOpen} onOpenChange={setIsFeaturesDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary"/>Fonctionnalités de Sakai</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              Sakai est un assistant IA polyvalent conçu pour vous aider dans diverses tâches :
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Répondre à vos questions et fournir des informations.</li>
                <li>Générer du texte créatif (emails, poèmes, scripts).</li>
                <li>Raconter des blagues et des histoires captivantes.</li>
                <li>Générer des images à partir de vos descriptions.</li>
                <li>Analyser le contenu des images que vous téléchargez.</li>
                <li>Traduire du texte dans différentes langues.</li>
                <li>Agir comme un partenaire de brainstorming et de réflexion.</li>
                <li>Se souvenir de vos préférences grâce au Panneau de Mémoire.</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsFeaturesDialogOpen(false)}>Compris !</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* About Dialog */}
      <AlertDialog open={isAboutDialogOpen} onOpenChange={setIsAboutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary"/>À propos de Sakai</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              <p className="mb-2">Sakai est votre assistant IA personnel, développé avec passion pour être intelligent, convivial et utile au quotidien.</p>
              <p className="mb-2">Il utilise les dernières avancées en matière d'intelligence artificielle (via Genkit et les modèles Gemini de Google) pour vous offrir une expérience interactive et enrichissante.</p>
              <p>Version: 1.0.0 (Prototype)</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsAboutDialogOpen(false)}>Fermer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Dev Code Prompt Dialog */}
      <AlertDialog open={isDevCodePromptOpen} onOpenChange={setIsDevCodePromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-primary"/>Accès Mode Développeur</AlertDialogTitle>
            <AlertDialogDescription>
              Veuillez entrer le code d'accès pour modifier les paramètres avancés du modèle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input 
              type="password" 
              placeholder="Code d'accès" 
              value={devCodeInput}
              onChange={(e) => setDevCodeInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleDevCodeCheck()}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDevCodeInput('')}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDevCodeCheck}>Valider</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dev Settings Dialog */}
      <Dialog open={isDevSettingsOpen} onOpenChange={setIsDevSettingsOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card">
            <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-primary"/>Paramètres Développeur</DialogTitle>
                <DialogDescription>
                    Modifiez ici les paramètres avancés du modèle IA. Ces changements sont pour les utilisateurs avertis et peuvent affecter la qualité des réponses.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="dev-system-prompt" className="text-sm font-medium">
                        System Prompt Personnalisé :
                    </Label>
                    <Textarea
                        id="dev-system-prompt"
                        placeholder="Laissez vide pour utiliser l'invite système par défaut de Sakai. Sinon, entrez votre propre invite ici..."
                        value={tempOverrideSystemPrompt}
                        onChange={(e) => setTempOverrideSystemPrompt(e.target.value)}
                        className="min-h-[150px] text-sm p-3 rounded-md border bg-background"
                        rows={8}
                    />
                    <p className="text-xs text-muted-foreground">
                        L'invite système de base sera remplacée par ce texte. La mémoire utilisateur sera toujours ajoutée après.
                    </p>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="dev-temperature" className="text-sm font-medium">
                        Température du Modèle : <span className="text-primary font-semibold">{tempModelTemperature.toFixed(1)}</span>
                    </Label>
                    <Slider
                        id="dev-temperature"
                        min={0}
                        max={1}
                        step={0.1}
                        value={[tempModelTemperature]}
                        onValueChange={(value) => setTempModelTemperature(value[0])}
                        className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                        Plus bas = plus déterministe/factuel. Plus haut = plus créatif/aléatoire. (Défaut: 0.7)
                    </p>
                </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={handleResetDevSettings}>
                    Réinitialiser par Défaut
                </Button>
                <DialogClose asChild>
                    <Button type="button" variant="ghost">
                        Annuler
                    </Button>
                </DialogClose>
                <Button type="button" onClick={handleSaveDevSettings}>
                    Sauvegarder les Paramètres
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

