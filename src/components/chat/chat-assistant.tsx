// src/components/chat/chat-assistant.tsx
"use client";

import { useState, useRef, useEffect, FormEvent, ChangeEvent, Fragment } from 'react';
import NextImage from 'next/image'; // Renamed to NextImage to avoid conflict
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send, Loader2, User, Bot, Mic, Paperclip, XCircle, FileText, Copy, Check,
  ImageIcon, Laugh, Lightbulb, Languages, Sparkles // Added Sparkles and other feature icons
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { streamChatAssistant, type ChatMessage, type ChatStreamChunk, type ChatMessagePart } from '@/ai/flows/chat-assistant-flow';
import { generateImage, type GenerateImageOutput } from '@/ai/flows/generate-image-flow';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
// Import languages you want to support
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import shell from 'react-syntax-highlighter/dist/esm/languages/prism/shell-session';


SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('js', javascript);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('py', python);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('md', markdown);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('csharp', csharp);
SyntaxHighlighter.registerLanguage('cs', csharp);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('shell', shell);
SyntaxHighlighter.registerLanguage('sh', shell);
SyntaxHighlighter.registerLanguage('bash', shell);


interface UploadedFileWrapper {
  dataUri: string;
  file: File;
  id: string;
}

interface ChatAssistantProps {
  initialMessages?: ChatMessage[];
  onMessagesUpdate: (messages: ChatMessage[]) => void;
  userMemory: string;
  devOverrideSystemPrompt?: string;
  devModelTemperature?: number;
  activeChatId: string | null; // To know when to show welcome message
}


export function ChatAssistant({
  initialMessages = [],
  onMessagesUpdate,
  userMemory,
  devOverrideSystemPrompt,
  devModelTemperature,
  activeChatId,
}: ChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileWrapper[]>([]);
  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<string | null>(null);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [isFeaturesPopoverOpen, setIsFeaturesPopoverOpen] = useState(false);


  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Moved featureActions inside the component
  const featureActions = [
    { id: 'generate-image', label: "Générer une image", icon: ImageIcon, promptPrefix: "Génère une image de " },
    { id: 'tell-joke', label: "Raconter une blague", icon: Laugh, promptPrefix: "Raconte-moi une blague." },
    { id: 'draft-pitch', label: "Rédiger un pitch", icon: Lightbulb, promptPrefix: "Aide-moi à rédiger un pitch pour " },
    { id: 'translate-text', label: "Traduire un texte", icon: Languages, promptPrefix: "Traduis ce texte en anglais : " },
  ];


  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, activeChatId]);


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
    if (inputRef.current && !isLoading && !isFeaturesPopoverOpen) {
      inputRef.current.focus();
    }
  }, [isLoading, isFeaturesPopoverOpen]);


  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain', 'text/markdown'];
      
      Array.from(files).forEach(file => {
        const uniqueId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${encodeURIComponent(file.name)}`;
        
        let effectiveMimeType = file.type;
        if (!effectiveMimeType || effectiveMimeType === "application/octet-stream") {
            if (file.name.endsWith('.md')) effectiveMimeType = 'text/markdown';
            else if (file.name.endsWith('.txt')) effectiveMimeType = 'text/plain';
            else if (file.name.endsWith('.pdf')) effectiveMimeType = 'application/pdf';
            else if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].some(ext => file.name.toLowerCase().endsWith(ext))) {
                if (file.name.toLowerCase().endsWith('.png')) effectiveMimeType = 'image/png';
                else if (file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) effectiveMimeType = 'image/jpeg';
                else if (file.name.toLowerCase().endsWith('.webp')) effectiveMimeType = 'image/webp';
                else effectiveMimeType = 'image/*'; // Fallback for generic images
            } else {
                effectiveMimeType = 'application/octet-stream'; 
            }
        }
        
        const isAllowed = allowedTypes.some(type => 
          effectiveMimeType.startsWith(type.replace('*', ''))
        );

        if (isAllowed) {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result) {
              setUploadedFiles(prev => [...prev, { dataUri: reader.result as string, file, id: uniqueId }]);
            } else {
              console.error("FileReader result is null for file:", file.name);
              toast({
                title: "Erreur de lecture du fichier",
                description: `Impossible de lire le contenu du fichier "${file.name}".`,
                variant: "destructive",
              });
            }
          };
          reader.onerror = (error) => {
            console.error("FileReader error for file:", file.name, error);
            toast({
              title: "Erreur de lecture du fichier",
              description: `Une erreur est survenue lors de la lecture du fichier "${file.name}". Veuillez réessayer.`,
              variant: "destructive",
            });
          };
          reader.readAsDataURL(file);
        } else {
          toast({
            title: "Type de fichier non supporté",
            description: `Le fichier "${file.name}" (type: ${effectiveMimeType || 'inconnu'}) n'est pas supporté. Veuillez sélectionner une image (PNG, JPG, WEBP), un PDF, ou un fichier texte (.txt, .md).`,
            variant: "destructive",
          });
        }
      });
    }
    if (event.target) {
        event.target.value = ''; 
    }
  };

  const removeUploadedFile = (fileIdToRemove: string) => {
    setUploadedFiles(prev => prev.filter(fileWrapper => fileWrapper.id !== fileIdToRemove));
  };

  const clearAllUploadedFiles = () => {
    setUploadedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  const handleImageGeneration = async (prompt: string) => {
    setIsLoading(true);
    const imageGenPlaceholderId = `img-gen-${Date.now()}`;
    setCurrentStreamingMessageId(null); 
    
    const updatedMessagesWithPlaceholder = [...messages, {
      role: 'model' as 'model',
      parts: [{type: 'text', text: `Sakai génère une image pour : "${prompt}"...`}],
      id: imageGenPlaceholderId
    }];
    setMessages(updatedMessagesWithPlaceholder);
    onMessagesUpdate(updatedMessagesWithPlaceholder);


    try {
      const result: GenerateImageOutput = await generateImage({ prompt });
      let finalMessages;
      if (result.imageUrl) {
        finalMessages = updatedMessagesWithPlaceholder.map((msg) =>
            msg.id === imageGenPlaceholderId
              ? { ...msg, parts: [{ type: 'image' as 'image', imageDataUri: result.imageUrl, mimeType: 'image/png' }] }
              : msg
          );
      } else {
        const errorMessage = result.error || "La génération d'image a échoué ou l'URL est manquante.";
        toast({
          title: "Erreur de génération d'image",
          description: errorMessage,
          variant: "destructive",
        });
        finalMessages = updatedMessagesWithPlaceholder.map((msg) =>
            msg.id === imageGenPlaceholderId
              ? { ...msg, parts: [{ type: 'text' as 'text', text: `Erreur : ${errorMessage}` }] }
              : msg
          );
      }
      setMessages(finalMessages);
      onMessagesUpdate(finalMessages);

    } catch (error: unknown) {
      console.error("Erreur de génération d'image (client):", error);
      const errorMessage = (error as Error)?.message || "Désolé, une erreur est survenue lors de la génération de l'image.";
      toast({
        title: "Erreur de génération d'image",
        description: errorMessage,
        variant: "destructive",
      });
      const finalMessages = updatedMessagesWithPlaceholder.map((msg) =>
          msg.id === imageGenPlaceholderId
            ? { ...msg, parts: [{ type: 'text' as 'text', text: `Erreur : ${errorMessage}` }] }
            : msg
        );
      setMessages(finalMessages);
      onMessagesUpdate(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };


  const handleSendMessage = async (e?: FormEvent<HTMLFormElement> | string) => {
    if (typeof e === 'object' && e?.preventDefault) e.preventDefault();

    const currentInput = (typeof e === 'string' ? e : input).trim();
    if ((!currentInput && uploadedFiles.length === 0) || isLoading) return;

    const imageKeywords = ["génère une image de", "dessine-moi", "dessine moi", "crée une image de", "photo de", "image de", "génère une photo de", "génère un dessin de"];
    const lowerInput = currentInput.toLowerCase();
    let isImageRequestIntent = false;
    for (const keyword of imageKeywords) {
        if (lowerInput.includes(keyword)) {
            isImageRequestIntent = true;
            break;
        }
    }
    
    if (isImageRequestIntent && uploadedFiles.length === 0 && currentInput.split(' ').length < 30) {
      const newUserMessage: ChatMessage = { role: 'user', parts: [{type: 'text', text: currentInput}], id: `user-${Date.now()}` };
      const updatedMessagesUser = [...messages, newUserMessage];
      setMessages(updatedMessagesUser);
      onMessagesUpdate(updatedMessagesUser);

      if (typeof e !== 'string') setInput('');
      await handleImageGeneration(currentInput);
      return;
    }

    const newUserMessageParts: ChatMessagePart[] = [];

    uploadedFiles.forEach(fileWrapper => {
      let mimeType = fileWrapper.file.type;
       if (!mimeType || mimeType === "application/octet-stream") { 
            if (fileWrapper.file.name.endsWith('.md')) mimeType = 'text/markdown';
            else if (fileWrapper.file.name.endsWith('.txt')) mimeType = 'text/plain';
            else if (fileWrapper.file.name.endsWith('.pdf')) mimeType = 'application/pdf';
            else if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].some(ext => fileWrapper.file.name.toLowerCase().endsWith(ext))) {
                if (fileWrapper.file.name.toLowerCase().endsWith('.png')) mimeType = 'image/png';
                else if (fileWrapper.file.name.toLowerCase().endsWith('.jpg') || fileWrapper.file.name.toLowerCase().endsWith('.jpeg')) mimeType = 'image/jpeg';
                else if (fileWrapper.file.name.toLowerCase().endsWith('.webp')) mimeType = 'image/webp';
                else mimeType = 'image/*';
            }
            else mimeType = 'application/octet-stream';
        }
      newUserMessageParts.push({
        type: 'image', // Using 'image' type for generic media, relying on mimeType
        imageDataUri: fileWrapper.dataUri,
        mimeType: mimeType
      });
    });

    if (currentInput) {
      newUserMessageParts.push({ type: 'text', text: currentInput });
    }

    if (newUserMessageParts.length === 0) return;

    const newUserMessage: ChatMessage = { role: 'user', parts: newUserMessageParts, id: `user-${Date.now()}` };
    
    let updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    
    if (typeof e !== 'string') setInput('');
    clearAllUploadedFiles();

    setIsLoading(true);
    const assistantMessageId = `model-${Date.now()}`;
    setCurrentStreamingMessageId(assistantMessageId);
    
    const assistantPlaceholderMessage: ChatMessage = { role: 'model', parts: [{type: 'text', text: ''}], id: assistantMessageId };
    updatedMessages = [...updatedMessages, assistantPlaceholderMessage];
    setMessages(updatedMessages);
    onMessagesUpdate(updatedMessages); // Update parent with user message and placeholder


    const currentHistory = messages.filter(msg => // Use 'messages' state before adding new user msg for history
      !(msg.parts.length === 1 && msg.parts[0].type === 'text' && msg.parts[0].text.startsWith('Sakai génère une image'))
    );
    // Add the new user message to history for the API call
    const historyForApi = [...currentHistory, newUserMessage];


    try {
      const readableStream = await streamChatAssistant({
        history: historyForApi,
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

        if (chatChunk.error) {
          console.error("Stream error from server:", chatChunk.error);
          throw new Error(chatChunk.error);
        }

        if (chatChunk.text) {
          accumulatedText += chatChunk.text;
          setMessages(prev => {
            const newMsgs = prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, parts: [{type: 'text', text: accumulatedText }] }
                : msg
            );
            onMessagesUpdate(newMsgs); // Update parent during streaming
            return newMsgs;
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
        const newMsgs = prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, parts: [{ type: 'text', text: errorMessage }] }
            : msg
        );
        onMessagesUpdate(newMsgs); // Update parent with error message
        return newMsgs;
      });
    } finally {
      setIsLoading(false);
      setCurrentStreamingMessageId(null);
    }
  };

  const handleFeatureActionClick = (promptPrefix: string) => {
    setInput(prevInput => promptPrefix + (prevInput.startsWith(promptPrefix) ? prevInput.substring(promptPrefix.length) : prevInput));
    setIsFeaturesPopoverOpen(false);
    inputRef.current?.focus();
  };


  const handleCopyCode = (codeToCopy: string, partId: string) => {
    navigator.clipboard.writeText(codeToCopy).then(() => {
      setCopiedStates(prev => ({ ...prev, [partId]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [partId]: false }));
      }, 2000);
      toast({ title: "Copié!", description: "Le code a été copié dans le presse-papiers." });
    }).catch(err => {
      console.error('Failed to copy code: ', err);
      toast({ title: "Erreur", description: "Impossible de copier le code.", variant: "destructive" });
    });
  };

  const renderMessagePart = (part: ChatMessagePart, partIndex: number, message: ChatMessage, isLastMessageOfList: boolean) => {
    const uniquePartKey = `${message.id || 'msg'}-${part.type}-${partIndex}-${Math.random().toString(36).substring(2,7)}`;

    if (part.type === 'text') {
      const codeBlockRegex = /```(\w*)\n?([\s\S]+?)```/g;
      let lastIndex = 0;
      const elements = [];
      let match;

      while ((match = codeBlockRegex.exec(part.text)) !== null) {
        if (match.index > lastIndex) {
          elements.push(
            <span key={`${uniquePartKey}-text-${lastIndex}`}>
              {part.text.substring(lastIndex, match.index)}
            </span>
          );
        }
        
        const language = match[1]?.toLowerCase() || 'plaintext';
        const code = match[2].trim();
        const codeBlockId = `${uniquePartKey}-code-${match.index}`;

        elements.push(
          <div key={codeBlockId} className="relative group bg-muted dark:bg-black/30 my-2 rounded-md shadow">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground font-mono">{language}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-50 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                onClick={() => handleCopyCode(code, codeBlockId)}
                aria-label="Copier le code"
              >
                {copiedStates[codeBlockId] ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus} 
              showLineNumbers
              wrapLines={true}
              lineProps={{ style: { wordBreak: 'break-all', whiteSpace: 'pre-wrap', display: 'block' } }}
              className="!p-3 !text-sm !bg-transparent" 
              codeTagProps={{style: {fontFamily: 'var(--font-geist-sans), Menlo, Monaco, Consolas, "Courier New", monospace'}}}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        );
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < part.text.length) {
        elements.push(
          <span key={`${uniquePartKey}-text-${lastIndex}`}>
            {part.text.substring(lastIndex)}
          </span>
        );
      }
      
      const textContent = elements.length > 0 ? elements.map((el, i) => <Fragment key={`${uniquePartKey}-frag-${i}`}>{el}</Fragment>) : part.text;

      return (
        <div key={uniquePartKey} className="text-sm whitespace-pre-wrap leading-relaxed">
            {textContent}
            {isLastMessageOfList && message.role === 'model' && isLoading && message.id === currentStreamingMessageId && (
                <span className="blinking-cursor-span">▋</span>
            )}
        </div>
      );
    }

    if (part.type === 'image' && part.imageDataUri) {
      const isImageFile = part.mimeType?.startsWith('image/');
      if (isImageFile) {
        return (
          <NextImage // Using NextImage
            key={uniquePartKey}
            src={part.imageDataUri}
            alt={message.role === 'user' ? "Fichier de l'utilisateur" : "Média généré"}
            width={300}
            height={300}
            className="rounded-lg object-contain max-w-full h-auto border border-border/50"
            data-ai-hint="user uploaded"
          />
        );
      } else { // For PDF, TXT, MD previews
        return (
          <div key={uniquePartKey} className="my-2 p-3 border border-dashed rounded-md bg-muted/30 flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-6 w-6 text-primary shrink-0" />
            <div className="truncate">
              <p className="font-medium truncate">{part.file?.name || 'Document'}</p>
              <p className="text-xs">{part.mimeType || 'Fichier'}</p>
            </div>
          </div>
        );
      }
    }
    return null;
  };


  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <CardHeader className="shrink-0 border-b">
        <CardTitle className="text-xl font-semibold">Session de Chat</CardTitle>
      </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-full bg-background/30 dark:bg-background/50">
            <div className="p-4 sm:p-6 space-y-6">
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 space-y-4">
                   <Sparkles className="h-16 w-16 text-primary opacity-70 mb-2" data-ai-hint="magic sparkle" />
                  <p className="text-2xl font-medium">Comment puis-je vous aider aujourd'hui ?</p>
                  <p className="text-base max-w-md">
                    Utilisez les icônes ci-dessous pour des actions rapides ou tapez votre question.
                  </p>
                </div>
              )}
              {messages.map((msg, msgIndex) => {
                const isUser = msg.role === 'user';
                const isLastMessageOfList = msgIndex === messages.length - 1;

                const isLoadingMessage = isLoading && msg.role === 'model' && msg.id === currentStreamingMessageId && msg.parts.length === 1 && msg.parts[0].type === 'text' && msg.parts[0].text === '';
                const isImageGenPlaceholder = isLoading && msg.role === 'model' && (msg.id !== currentStreamingMessageId || !currentStreamingMessageId) && msg.parts.length === 1 && msg.parts[0].type === 'text' && msg.parts[0].text.startsWith('Sakai génère une image');

                return (
                  <div
                    key={msg.id || `msg-${msgIndex}-${Math.random()}`}
                    className={cn(
                      "flex items-end gap-3 max-w-[85%] break-words",
                      isUser ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'
                    )}
                  >
                    {isUser ? <User className="h-7 w-7 shrink-0 text-muted-foreground/80 mb-1.5 rounded-full bg-muted p-1" /> : <Bot className="h-7 w-7 shrink-0 text-primary mb-1.5 rounded-full bg-primary/10 p-1" />}

                    <div className={cn(
                       "p-3.5 rounded-xl shadow-md transition-all duration-200 ease-out",
                       isUser
                         ? 'bg-primary text-primary-foreground rounded-br-none'
                         : 'bg-card border text-card-foreground rounded-bl-none',
                        msg.parts.some(p => p.type === 'image' && p.mimeType?.startsWith('image/')) && !isLoadingMessage && !isImageGenPlaceholder && "p-1.5 bg-transparent shadow-none border-none dark:bg-transparent"
                    )}>
                      {isLoadingMessage || isImageGenPlaceholder ? (
                        <div className="flex items-center gap-2 p-2">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">
                            {isImageGenPlaceholder ? "Génération d'image..." : "Sakai réfléchit..."}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                           {msg.parts.map((part, index) => renderMessagePart(part, index, msg, isLastMessageOfList))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="p-3 border-t bg-card shrink-0 flex flex-col gap-2.5">
          {uploadedFiles.length > 0 && (
            <div className="w-full mb-1.5 space-y-1.5">
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground font-medium">Fichiers téléversés :</p>
                <Button variant="ghost" size="sm" onClick={clearAllUploadedFiles} className="text-xs text-destructive hover:text-destructive/80 h-auto py-1">
                  <Trash2 className="h-3 w-3 mr-1" /> Tout effacer
                </Button>
              </div>
              <ScrollArea className="max-h-24">
                <div className="space-y-1 pr-2">
                  {uploadedFiles.map((fileWrapper) => (
                    <div key={fileWrapper.id} className="relative w-full p-1.5 border border-dashed rounded-md flex items-center justify-between bg-background/50 dark:bg-muted/30 text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {fileWrapper.file.type.startsWith('image/') ? (
                          <NextImage src={fileWrapper.dataUri} alt={`Aperçu ${fileWrapper.file.name}`} width={24} height={24} className="rounded object-cover shrink-0" data-ai-hint="image preview"/>
                        ) : (
                          <FileText className="h-5 w-5 shrink-0 text-primary" />
                        )}
                        <span className="text-muted-foreground truncate" title={fileWrapper.file.name}>{fileWrapper.file.name} ({(fileWrapper.file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeUploadedFile(fileWrapper.id)} className="text-destructive hover:text-destructive/80 h-6 w-6 shrink-0">
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
          
           <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2.5">
            <input
              type="file"
              accept="image/*,application/pdf,text/plain,.md,text/markdown"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload-button"
              multiple
            />
             <TooltipProvider delayDuration={100}>
              <Popover open={isFeaturesPopoverOpen} onOpenChange={setIsFeaturesPopoverOpen}>
                <PopoverTrigger asChild>
                   <Button variant="outline" size="icon" type="button" aria-label="Fonctionnalités de Sakai" className="text-primary hover:text-primary/80 border-primary/30 hover:bg-primary/10 dark:hover:bg-primary/20 shrink-0 h-10 w-10 rounded-lg">
                      <Sparkles className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2 bg-card border shadow-xl rounded-lg">
                  <div className="flex gap-1">
                    {featureActions.map((action) => (
                      <Tooltip key={action.id}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleFeatureActionClick(action.promptPrefix)}
                            className="text-muted-foreground hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 h-9 w-9"
                            aria-label={action.label}
                          >
                            <action.icon className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-popover text-popover-foreground text-xs py-1 px-2 rounded shadow-md">
                          <p>{action.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </TooltipProvider>

            <Button variant="outline" size="icon" type="button" aria-label="Télécharger un fichier" onClick={() => fileInputRef.current?.click()} className="text-primary hover:text-primary/80 border-primary/30 hover:bg-primary/10 dark:hover:bg-primary/20 shrink-0 h-10 w-10 rounded-lg">
                <Paperclip className="h-5 w-5" />
            </Button>
            <Input
              ref={inputRef}
              type="text"
              placeholder={uploadedFiles.length > 0 ? "Ajouter un commentaire sur le(s) fichier(s)..." : "Envoyer un message à Sakai..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1 py-2.5 px-3.5 text-sm rounded-lg bg-background focus-visible:ring-primary/50 h-10"
            />
            <Button variant="outline" size="icon" type="button" aria-label="Saisie vocale (Bientôt disponible)" className="text-primary hover:text-primary/80 border-primary/30 hover:bg-primary/10 dark:hover:bg-primary/20 shrink-0 h-10 w-10 rounded-lg" disabled>
                <Mic className="h-5 w-5" />
            </Button>
            <Button type="submit" size="icon" disabled={isLoading || (!input.trim() && uploadedFiles.length === 0)} aria-label="Envoyer" className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 w-10 rounded-lg shrink-0">
              {isLoading && currentStreamingMessageId ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </form>
        </CardFooter>
    </div>
  );
}
