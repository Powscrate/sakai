
// src/components/chat/chat-assistant.tsx
"use client";

import { useState, useRef, useEffect, FormEvent, ChangeEvent, Fragment } from 'react';
import NextImage from 'next/image'; // Renamed to avoid conflict
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, Loader2, User, Bot, Mic, Paperclip, XCircle, FileText, Copy, Check, MoreVertical,
  Brain, Info, SlidersHorizontal, AlertTriangle, CheckCircle, Mail, Plane, MessageSquare,
  Laugh, Lightbulb, Languages, Sparkles, Trash2, Download, Eye, Ratio, Palette, Image as ImageIconLucide // Added Ratio, Palette, ImageIconLucide
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
} from "@/components/ui/alert-dialog";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


import { streamChatAssistant, type ChatMessage, type ChatStreamChunk, type ChatMessagePart } from '@/ai/flows/chat-assistant-flow';
import { generateImage, type GenerateImageOutput, type GenerateImageInput } from '@/ai/flows/generate-image-flow';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { SakaiLogo } from '@/components/icons/logo';
import { ThemeToggleButton } from './theme-toggle-button';

import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
  activeChatId: string | null; // Passed from parent
}

const imageStyles = [
  { value: "default", label: "Défaut" },
  { value: "photorealistic", label: "Photoréaliste" },
  { value: "cartoon", label: "Dessin animé" },
  { value: "pixel_art", label: "Pixel Art" },
  { value: "watercolor", label: "Aquarelle" },
  { value: "fantasy", label: "Fantaisie" },
  { value: "cyberpunk", label: "Cyberpunk" },
  { value: "steampunk", label: "Steampunk" },
  { value: "anime", label: "Animé" },
  { value: "line_art", label: "Dessin au trait" },
  { value: "isometric", label: "Isométrique" },
];

const imageAspectRatios = [
  { value: "1:1", label: "Carré (1:1)" },
  { value: "16:9", label: "Large (16:9)" },
  { value: "9:16", label: "Portrait (9:16)" },
  { value: "4:3", label: "Paysage (4:3)" },
  { value: "3:4", label: "Portrait (3:4)" },
];


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
  
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);

  // States for image generation popover
  const [isImageSettingsPopoverOpen, setIsImageSettingsPopoverOpen] = useState(false);
  const [imageStyle, setImageStyle] = useState<string>("default");
  const [imageAspectRatio, setImageAspectRatio] = useState<string>("1:1");

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const featureActions = [
    { id: 'generate-image', label: "Générer une image", icon: ImageIconLucide, promptPrefix: "Génère une image de " },
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
    if (inputRef.current && !isLoading && !isImageSettingsPopoverOpen && !isImagePreviewOpen) {
      inputRef.current.focus();
    }
  }, [isLoading, isImageSettingsPopoverOpen, isImagePreviewOpen]);

  // Effect to manage image settings popover visibility based on input
  useEffect(() => {
    if (input.startsWith("Génère une image de ") || input.startsWith("Dessine-moi ") || input.startsWith("Crée une image de ") || input.startsWith("Photo de ")) {
      setIsImageSettingsPopoverOpen(true);
    } else {
      setIsImageSettingsPopoverOpen(false);
    }
  }, [input]);


  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain', 'text/markdown'];
      
      Array.from(files).forEach(file => {
        const uniqueId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${encodeURIComponent(file.name)}`;
        
        let effectiveMimeType = file.type;
        if (!effectiveMimeType || effectiveMimeType === "application/octet-stream") {
            if (file.name.toLowerCase().endsWith('.md')) effectiveMimeType = 'text/markdown';
            else if (file.name.toLowerCase().endsWith('.txt')) effectiveMimeType = 'text/plain';
            else if (file.name.toLowerCase().endsWith('.pdf')) effectiveMimeType = 'application/pdf';
            else if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].some(ext => file.name.toLowerCase().endsWith(ext))) {
                if (file.name.toLowerCase().endsWith('.png')) effectiveMimeType = 'image/png';
                else if (file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) effectiveMimeType = 'image/jpeg';
                else if (file.name.toLowerCase().endsWith('.webp')) effectiveMimeType = 'image/webp';
                else effectiveMimeType = 'image/*'; 
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

  const handleImageGeneration = async (basePromptText: string) => {
    setIsLoading(true);
    setCurrentStreamingMessageId(null);
    const imageGenUserMessageId = `user-img-prompt-${Date.now()}`;
    const imageGenPlaceholderId = `img-gen-${Date.now()}`;

    const userPromptMessage: ChatMessage = {
      role: 'user',
      parts: [{ type: 'text', text: basePromptText }],
      id: imageGenUserMessageId,
      createdAt: Date.now(),
    };

    const assistantPlaceholderMessage: ChatMessage = {
      role: 'model',
      parts: [{ type: 'text', text: `Sakai génère une image pour : "${basePromptText}"...` }],
      id: imageGenPlaceholderId,
      createdAt: Date.now() + 1,
    };

    const updatedMessagesWithPlaceholder = [...messages, userPromptMessage, assistantPlaceholderMessage];
    setMessages(updatedMessagesWithPlaceholder);
    onMessagesUpdate(updatedMessagesWithPlaceholder);

    const imageGenInput: GenerateImageInput = {
      prompt: basePromptText,
      style: imageStyle !== "default" ? imageStyle : undefined,
      aspectRatio: imageAspectRatio !== "1:1" ? imageAspectRatio : undefined, // Assuming 1:1 is default for the model if not specified
    };

    try {
      const result: GenerateImageOutput = await generateImage(imageGenInput);
      let finalMessages;
      if (result.imageUrl) {
        finalMessages = messages.map((msg) =>
          msg.id === imageGenUserMessageId ? userPromptMessage : msg
        );
        finalMessages = [...finalMessages, {
          role: 'model' as 'model',
          parts: [{ type: 'image' as 'image', imageDataUri: result.imageUrl, mimeType: 'image/png' }],
          id: imageGenPlaceholderId,
          createdAt: Date.now(),
        }];
      } else {
        const errorMessage = result.error || "La génération d'image a échoué ou l'URL est manquante.";
        toast({
          title: "Erreur de génération d'image",
          description: errorMessage,
          variant: "destructive",
        });
        finalMessages = messages.map((msg) =>
          msg.id === imageGenUserMessageId ? userPromptMessage : msg
        );
        finalMessages = [...finalMessages, {
          role: 'model' as 'model',
          parts: [{ type: 'text' as 'text', text: `Erreur : ${errorMessage}` }],
          id: imageGenPlaceholderId,
          createdAt: Date.now(),
        }];
      }
      setMessages(finalMessages);
      onMessagesUpdate(finalMessages);
      // Reset image settings after generation
      setImageStyle("default");
      setImageAspectRatio("1:1");
      setIsImageSettingsPopoverOpen(false);

    } catch (error: unknown) {
      console.error("Erreur de génération d'image (client):", error);
      const errorMessage = (error as Error)?.message || "Désolé, une erreur est survenue lors de la génération de l'image.";
      toast({
        title: "Erreur de génération d'image",
        description: errorMessage,
        variant: "destructive",
      });
      let finalMessages = messages.map((msg) => // Changed from const to let
        msg.id === imageGenUserMessageId ? userPromptMessage : msg
      );
      finalMessages = [...finalMessages, {
        role: 'model' as 'model',
        parts: [{ type: 'text' as 'text', text: `Erreur : ${errorMessage}` }],
        id: imageGenPlaceholderId,
        createdAt: Date.now(),
      }];
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

    const imageKeywords = ["génère une image de", "dessine-moi", "dessine moi", "crée une image de", "photo de", "image de", "génère une photo de", "génère un dessin de", "crée une photo de", "crée un dessin de"];
    const lowerInput = currentInput.toLowerCase();
    let isImageRequestIntent = false;
    if (uploadedFiles.length === 0) { 
        for (const keyword of imageKeywords) {
            if (lowerInput.startsWith(keyword)) {
                isImageRequestIntent = true;
                break;
            }
        }
    }
    
    if (isImageRequestIntent) { 
      if (typeof e !== 'string') setInput(''); 
      await handleImageGeneration(currentInput);
      return;
    }

    const newUserMessageParts: ChatMessagePart[] = [];

    uploadedFiles.forEach(fileWrapper => {
      let mimeType = fileWrapper.file.type;
       if (!mimeType || mimeType === "application/octet-stream") { 
            if (fileWrapper.file.name.toLowerCase().endsWith('.md')) mimeType = 'text/markdown';
            else if (fileWrapper.file.name.toLowerCase().endsWith('.txt')) mimeType = 'text/plain';
            else if (fileWrapper.file.name.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
            else if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].some(ext => fileWrapper.file.name.toLowerCase().endsWith(ext))) {
                if (fileWrapper.file.name.toLowerCase().endsWith('.png')) mimeType = 'image/png';
                else if (fileWrapper.file.name.toLowerCase().endsWith('.jpg') || fileWrapper.file.name.toLowerCase().endsWith('.jpeg')) mimeType = 'image/jpeg';
                else if (fileWrapper.file.name.toLowerCase().endsWith('.webp')) mimeType = 'image/webp';
                else mimeType = 'image/*';
            }
            else mimeType = 'application/octet-stream';
        }
      newUserMessageParts.push({
        type: 'image', 
        imageDataUri: fileWrapper.dataUri,
        mimeType: mimeType
      });
    });

    if (currentInput) {
      newUserMessageParts.push({ type: 'text', text: currentInput });
    }

    if (newUserMessageParts.length === 0) return;

    const newUserMessage: ChatMessage = { role: 'user', parts: newUserMessageParts, id: `user-${Date.now()}`, createdAt: Date.now() };
    
    let updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    onMessagesUpdate(updatedMessages); 
    
    if (typeof e !== 'string') setInput('');
    clearAllUploadedFiles();
    setIsImageSettingsPopoverOpen(false); // Close popover on send

    setIsLoading(true);
    const assistantMessageId = `model-${Date.now()}`;
    setCurrentStreamingMessageId(assistantMessageId);
    
    const assistantPlaceholderMessage: ChatMessage = { role: 'model', parts: [{type: 'text', text: ''}], id: assistantMessageId, createdAt: Date.now() +1 };
    updatedMessages = [...updatedMessages, assistantPlaceholderMessage];
    setMessages(updatedMessages); 
    onMessagesUpdate(updatedMessages);


    const historyForApi = [...messages, newUserMessage]; 

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
            return newMsgs;
          });
        }
      }
      const finalAssistantMessage = { role: 'model' as 'model', parts: [{type: 'text' as 'text', text: accumulatedText }], id: assistantMessageId, createdAt: Date.now() };
      onMessagesUpdate([...historyForApi, finalAssistantMessage]);


    } catch (error: any) {
      console.error("Erreur lors du streaming du chat (côté client):", error);
      const errorMessage = error?.message || "Désolé, une erreur est survenue. Veuillez réessayer.";
      toast({
        title: "Erreur de l'assistant",
        description: errorMessage,
        variant: "destructive",
      });
      const errorAssistantMessage = { role: 'model' as 'model', parts: [{ type: 'text' as 'text', text: errorMessage }], id: assistantMessageId, createdAt: Date.now() };
       setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? errorAssistantMessage : msg));
      onMessagesUpdate([...historyForApi, errorAssistantMessage]);

    } finally {
      setIsLoading(false);
      setCurrentStreamingMessageId(null);
    }
  };

  const handleFeatureActionClick = (promptPrefix: string) => {
    setInput(prevInput => {
      const currentBase = prevInput.startsWith("Génère une image de ") || prevInput.startsWith("Dessine-moi ") || prevInput.startsWith("Crée une image de ") || prevInput.startsWith("Photo de ")
        ? prevInput.substring(prevInput.indexOf(" ") + 1) // Keep text after "Génère une image de " etc.
        : prevInput;
      return promptPrefix + currentBase;
    });
    setIsFeaturesPopoverOpen(false); // Assuming you have a state for this popover
    inputRef.current?.focus();
  };


  const [isFeaturesPopoverOpen, setIsFeaturesPopoverOpen] = useState(false); // Added this state

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

  const handleDownloadImage = (imageDataUri: string) => {
    const link = document.createElement('a');
    link.href = imageDataUri;
    link.download = `sakai-image-${Date.now()}.png`; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({title: "Téléchargement", description: "L'image est en cours de téléchargement."})
  };

  const handlePreviewImage = (imageDataUri: string) => {
    setImagePreviewUrl(imageDataUri);
    setIsImagePreviewOpen(true);
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
          <div key={uniquePartKey} className="relative group my-2">
            <NextImage
              src={part.imageDataUri}
              alt={message.role === 'user' ? "Fichier de l'utilisateur" : "Média généré"}
              width={300}
              height={300}
              className="rounded-lg object-contain max-w-full h-auto border border-border/50 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handlePreviewImage(part.imageDataUri as string)}
              data-ai-hint="user uploaded media"
            />
             {message.role === 'model' && ( 
                <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-background/70 hover:bg-background"
                    onClick={(e) => { e.stopPropagation(); handleDownloadImage(part.imageDataUri as string); }}
                    aria-label="Télécharger l'image"
                >
                    <Download className="h-4 w-4" />
                </Button>
            )}
          </div>
        );
      } else { 
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
    <div className="flex flex-col h-full bg-card text-card-foreground">
      <CardHeader className="shrink-0 border-b p-4">
        <CardTitle className="text-lg font-semibold text-foreground">Session de Chat</CardTitle>
      </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-full bg-background/60 dark:bg-black/10">
            <div className="p-4 sm:p-6 space-y-6">
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 space-y-4">
                   <SakaiLogo className="h-20 w-20 text-primary opacity-70 mb-4" data-ai-hint="logo large"/>
                  <p className="text-2xl font-medium">Bienvenue sur Sakai !</p>
                  <p className="text-base max-w-md">
                    Comment puis-je vous aider aujourd&apos;hui ?<br/>
                    Posez une question, demandez de générer une image, ou utilisez les fonctionnalités via l&apos;icône <Sparkles className="inline-block align-middle h-4 w-4 mx-1 text-primary" />.
                  </p>
                </div>
              )}
              {messages.map((msg, msgIndex) => {
                const isUser = msg.role === 'user';
                const isLastMessageOfList = msgIndex === messages.length - 1;

                const isLoadingMessage = isLoading && msg.role === 'model' && msg.id === currentStreamingMessageId && msg.parts.length === 1 && msg.parts[0].type === 'text' && msg.parts[0].text === '';
                const isImageGenPlaceholder = isLoading && msg.role === 'model' && msg.parts.length === 1 && msg.parts[0].type === 'text' && msg.parts[0].text.startsWith('Sakai génère une image');


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
          {isImageSettingsPopoverOpen && (
            <Popover open={isImageSettingsPopoverOpen} onOpenChange={setIsImageSettingsPopoverOpen}>
                <PopoverTrigger asChild>
                    <div className="w-full h-0"></div>
                </PopoverTrigger>
                <PopoverContent 
                    className="w-auto p-4 bg-card border shadow-xl rounded-lg mb-2" 
                    side="top" 
                    align="start"
                    style={{ 
                        position: 'absolute', 
                        bottom: '100%', /* Position above the trigger (input area) */
                        left: '0',
                        marginBottom: '8px' /* Small gap between popover and input */
                    }}
                    onOpenAutoFocus={(e) => e.preventDefault()} // Prevent focus stealing
                >
                    <div className="grid gap-4">
                        <div>
                            <Label htmlFor="image-style" className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
                                <Palette className="h-3.5 w-3.5" /> Style Artistique
                            </Label>
                            <Select value={imageStyle} onValueChange={setImageStyle}>
                                <SelectTrigger id="image-style" className="h-9 text-xs">
                                    <SelectValue placeholder="Style" />
                                </SelectTrigger>
                                <SelectContent>
                                    {imageStyles.map(style => (
                                        <SelectItem key={style.value} value={style.value} className="text-xs">
                                            {style.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
                                <Ratio className="h-3.5 w-3.5" /> Ratio d'Aspect
                            </Label>
                            <RadioGroup
                                value={imageAspectRatio}
                                onValueChange={setImageAspectRatio}
                                className="grid grid-cols-3 gap-2"
                            >
                                {imageAspectRatios.map(ratio => (
                                    <TooltipProvider key={ratio.value} delayDuration={100}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Label
                                                    htmlFor={`ratio-${ratio.value.replace(":", "-")}`}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                                        imageAspectRatio === ratio.value && "border-primary ring-1 ring-primary"
                                                    )}
                                                >
                                                    <RadioGroupItem value={ratio.value} id={`ratio-${ratio.value.replace(":", "-")}`} className="sr-only" />
                                                    <span>{ratio.label.split(" ")[0]}</span>
                                                    <span className="text-muted-foreground/80">{ratio.label.split(" ")[1]}</span>
                                                </Label>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom">
                                                <p>{ratio.label}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ))}
                            </RadioGroup>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
           )}


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
            <Popover open={isFeaturesPopoverOpen} onOpenChange={setIsFeaturesPopoverOpen}>
              <PopoverTrigger asChild>
                 <Button variant="outline" size="icon" type="button" aria-label="Fonctionnalités de Sakai" className="text-primary hover:text-primary/80 border-primary/30 hover:bg-primary/10 dark:hover:bg-primary/20 shrink-0 h-10 w-10 rounded-lg">
                    <Sparkles className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2 bg-card border shadow-xl rounded-lg mb-2" side="top" align="start">
                <div className="flex gap-1">
                  {featureActions.map((action) => (
                    <TooltipProvider key={action.id} delayDuration={100}>
                      <Tooltip>
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
                    </TooltipProvider>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

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

        {isImagePreviewOpen && imagePreviewUrl && (
          <Dialog open={isImagePreviewOpen} onOpenChange={setIsImagePreviewOpen}>
            <DialogContent className="max-w-3xl p-2 bg-card">
              <NextImage
                src={imagePreviewUrl}
                alt="Aperçu de l'image"
                width={800}
                height={600}
                className="rounded-md object-contain max-h-[80vh] w-full h-auto"
                data-ai-hint="image full preview"
              />
              <DialogFooter className="mt-2 sm:justify-center">
                  <Button variant="outline" onClick={() => handleDownloadImage(imagePreviewUrl)}>
                    <Download className="mr-2 h-4 w-4" /> Télécharger
                  </Button>
                <DialogClose asChild>
                  <Button type="button">Fermer</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      )}
    </div>
  );
}

    