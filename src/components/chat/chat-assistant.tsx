
// src/components/chat/chat-assistant.tsx
"use client";

import { useState, useRef, useEffect, FormEvent, ChangeEvent, Fragment } from 'react';
import NextImage from 'next/image';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send, Loader2, User, Bot, Mic, Zap, MessageSquarePlus, HelpCircle, Languages, Brain, Paperclip, XCircle,
  MoreVertical, Info, SlidersHorizontal, AlertTriangle, CheckCircle, Mail, Plane, Lightbulb, FileText, Trash2, MessageSquare, Image as ImageIcon, Brush, Copy, Check
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

import { streamChatAssistant, type ChatMessage, type ChatStreamChunk, type ChatMessagePart } from '@/ai/flows/chat-assistant-flow';
import { generateImage, type GenerateImageOutput } from '@/ai/flows/generate-image-flow';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { SakaiLogo } from '@/components/icons/logo';
import { MemoryDialog } from './memory-dialog';
import useLocalStorage from '@/hooks/use-local-storage';
import { ThemeToggleButton } from './theme-toggle-button';
import Link from 'next/link';

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


interface QuickAction {
  label: string;
  prompt: string;
  icon: React.ElementType;
  actionType?: 'input' | 'command';
}

const quickActions: QuickAction[] = [
  { label: "Raconte une blague", prompt: "Raconte-moi une blague.", icon: MessageSquarePlus, actionType: 'input' },
  { label: "Génère un chaton mignon", prompt: "Génère une image d'un chaton mignon explorant une bibliothèque magique", icon: ImageIcon, actionType: 'input' },
  { label: "Traduis 'Bonjour le monde'", prompt: "Traduis 'Bonjour le monde' en espagnol.", icon: Languages, actionType: 'input' },
  { label: "Résume cet email: [coller ici]", prompt: "Peux-tu m'aider à résumer cet email : ", icon: Mail, actionType: 'input' },
  { label: "Planifie un voyage pour...", prompt: "Aide-moi à planifier un voyage pour [destination] pour [nombre] jours.", icon: Plane, actionType: 'input' },
  { label: "Rédige un pitch pour...", prompt: "J'ai besoin d'un pitch pour [produit/idée]. Peux-tu m'aider à le rédiger ?", icon: Lightbulb, actionType: 'input' },
  { label: "Analyser une image/doc", prompt: "Décris le(s) fichier(s) que j'ai téléversé(s).", icon: Paperclip, actionType: 'input' },
  { label: "Donne un fait amusant", prompt: "Donne-moi un fait amusant.", icon: HelpCircle, actionType: 'input' },
];

const DEV_ACCESS_CODE = "1234566";

interface UploadedFileWrapper {
  dataUri: string;
  file: File;
  id: string;
}


export function ChatAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userMemory, setUserMemory] = useLocalStorage<string>('sakaiUserMemory', '');
  const [isMemoryDialogOpen, setIsMemoryDialogOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileWrapper[]>([]);

  const [isFeaturesDialogOpen, setIsFeaturesDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isDevCodePromptOpen, setIsDevCodePromptOpen] = useState(false);
  const [devCodeInput, setDevCodeInput] = useState('');
  const [isDevSettingsOpen, setIsDevSettingsOpen] = useState(false);

  const [devOverrideSystemPrompt, setDevOverrideSystemPrompt] = useLocalStorage<string>('sakaiDevOverrideSystemPrompt', '');
  const [devModelTemperature, setDevModelTemperature] = useLocalStorage<number | undefined>('sakaiDevModelTemperature', undefined);

  const [tempOverrideSystemPrompt, setTempOverrideSystemPrompt] = useState(devOverrideSystemPrompt);
  const [tempModelTemperature, setTempModelTemperature] = useState(devModelTemperature ?? 0.7);

  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<string | null>(null);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});


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

  useEffect(scrollToBottom, [messages, isLoading]);

  useEffect(() => {
    if (inputRef.current && !isMemoryDialogOpen && !isDevSettingsOpen && !isDevCodePromptOpen && !isFeaturesDialogOpen && !isAboutDialogOpen && !isLoading) {
      inputRef.current.focus();
    }
  }, [isLoading, isMemoryDialogOpen, isDevSettingsOpen, isDevCodePromptOpen, isFeaturesDialogOpen, isAboutDialogOpen]);


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


  const handleImageGeneration = async (prompt: string) => {
    setIsLoading(true);
    const imageGenPlaceholderId = `img-gen-${Date.now()}`;
    setCurrentStreamingMessageId(null); 
    setMessages(prev => [...prev, {
      role: 'model',
      parts: [{type: 'text', text: `Sakai génère une image pour : "${prompt}"...`}],
      id: imageGenPlaceholderId
    }]);

    try {
      const result: GenerateImageOutput = await generateImage({ prompt });
      if (result.imageUrl) {
        setMessages(prev => prev.map(msg =>
          msg.id === imageGenPlaceholderId
          ? {...msg, parts: [{ type: 'image', imageDataUri: result.imageUrl, mimeType: 'image/png' }]} 
          : msg
        ));
      } else {
        throw new Error(result.error || "La génération d'image a échoué ou l'URL est manquante.");
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
    
    // Consider it an image generation request if keywords are present, no files are uploaded, and prompt is not excessively long.
    if (isImageRequestIntent && uploadedFiles.length === 0 && currentInput.split(' ').length < 30) {
      const newUserMessage: ChatMessage = { role: 'user', parts: [{type: 'text', text: currentInput}], id: `user-${Date.now()}` };
      setMessages(prev => [...prev, newUserMessage]);
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

    setMessages(prev => [...prev, newUserMessage]);
    if (typeof e !== 'string') setInput('');
    clearAllUploadedFiles();

    setIsLoading(true);
    const assistantMessageId = `model-${Date.now()}`;
    setCurrentStreamingMessageId(assistantMessageId);
    setMessages(prev => [...prev, { role: 'model', parts: [{type: 'text', text: ''}], id: assistantMessageId }]);

    const currentHistory = [...messages, newUserMessage].filter(msg =>
      !(msg.parts.length === 1 && msg.parts[0].type === 'text' && msg.parts[0].text.startsWith('Sakai génère une image'))
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

        if (chatChunk.error) {
          console.error("Stream error from server:", chatChunk.error);
          throw new Error(chatChunk.error);
        }

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
      setCurrentStreamingMessageId(null);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.actionType === 'input') {
      if (action.label === "Analyser une image/doc") {
         if (uploadedFiles.length > 0) {
           setInput(action.prompt);
         } else {
           fileInputRef.current?.click();
           setInput(action.prompt);
         }
      } else {
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
      setTempOverrideSystemPrompt(devOverrideSystemPrompt);
      setTempModelTemperature(devModelTemperature ?? 0.7);
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
    setDevOverrideSystemPrompt('');
    setDevModelTemperature(undefined);
    toast({
      title: "Paramètres développeur réinitialisés",
      description: "Les paramètres par défaut sont restaurés.",
    });
  };

  useEffect(() => {
    setTempOverrideSystemPrompt(devOverrideSystemPrompt);
    setTempModelTemperature(devModelTemperature ?? 0.7);
  }, [devOverrideSystemPrompt, devModelTemperature]);

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
    const uniquePartKey = `${message.id || 'msg'}-${part.type}-${partIndex}-${Math.random()}`;

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
              style={vscDarkPlus} // Or another style from react-syntax-highlighter/dist/esm/styles/prism
              showLineNumbers
              wrapLines={true}
              lineProps={{ style: { wordBreak: 'break-all', whiteSpace: 'pre-wrap', display: 'block' } }}
              className="!p-3 !text-sm !bg-transparent" // Override default padding/bg of SyntaxHighlighter
              codeTagProps={{style: {fontFamily: 'var(--font-geist-mono), Menlo, Monaco, Consolas, "Courier New", monospace'}}}
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
          <NextImage
            key={uniquePartKey}
            src={part.imageDataUri}
            alt={message.role === 'user' ? "Fichier de l'utilisateur" : "Média généré"}
            width={300}
            height={300}
            className="rounded-lg object-contain max-w-full h-auto border border-border/50"
            data-ai-hint="user uploaded"
          />
        );
      } else {
        return (
          <div key={uniquePartKey} className="my-2 p-2 border border-dashed rounded-md bg-muted/30 flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary shrink-0" />
            <span className="text-xs text-muted-foreground truncate">Fichier: {part.mimeType || 'document'} ({message.role === 'user' ? 'téléversé' : 'généré'})</span>
          </div>
        );
      }
    }
    return null;
  };


  return (
    <div className="flex flex-col h-screen bg-background text-foreground items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 transition-colors duration-300">
      <Card className="w-full max-w-2xl h-full flex flex-col shadow-2xl border rounded-2xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b shrink-0 bg-card">
          <div className="flex items-center gap-3">
            <SakaiLogo className="h-9 w-9 text-primary" />
            <CardTitle className="text-2xl font-semibold">
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
                 <DropdownMenuItem asChild>
                  <Link href="/sakai-builder">
                    <Zap className="mr-2 h-4 w-4" />
                    Sakai Builder
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/sakai-inpainter">
                    <Brush className="mr-2 h-4 w-4" />
                    Sakai Inpainter
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDevCodePromptOpen(true)}>
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Mode Développeur
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                 <DropdownMenuItem onClick={() => window.open('https://wa.me/261343775058', '_blank')}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Contacter le développeur
                </DropdownMenuItem>
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
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 space-y-6">
                  <SakaiLogo className="h-28 w-28 text-primary opacity-80" />
                  <p className="text-3xl font-medium">Bonjour ! Je suis Sakai.</p>
                  <p className="text-lg max-w-md">
                    Prêt à explorer ? Essayez une action rapide, posez une question, ou <label htmlFor="file-upload-button" className="text-primary hover:underline cursor-pointer font-medium">téléchargez un ou plusieurs fichiers</label> (images, PDF, TXT, MD). Vous pouvez aussi configurer ma <Button variant="link" className="p-0 h-auto text-lg text-primary inline-block align-middle" onClick={() => setIsMemoryDialogOpen(true)}><Brain className="inline-block align-middle h-5 w-5 mr-1" />mémoire</Button>.
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
                    {isUser ? <User className="h-7 w-7 shrink-0 text-muted-foreground/80 mb-1.5" /> : <Bot className="h-7 w-7 shrink-0 text-primary mb-1.5" />}

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

        <CardFooter className="p-4 border-t bg-card shrink-0 flex flex-col gap-3">
          {uploadedFiles.length > 0 && (
            <div className="w-full mb-2 space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground font-medium">Fichiers téléversés :</p>
                <Button variant="ghost" size="sm" onClick={clearAllUploadedFiles} className="text-xs text-destructive hover:text-destructive/80 h-auto py-1">
                  <Trash2 className="h-3 w-3 mr-1" /> Tout effacer
                </Button>
              </div>
              <ScrollArea className="max-h-28">
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
          {(messages.length === 0 && uploadedFiles.length === 0 && !isLoading) && (
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
            <input
              type="file"
              accept="image/*,application/pdf,text/plain,.md,text/markdown"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload-button"
              multiple
            />
            <Button variant="outline" size="icon" type="button" aria-label="Télécharger un fichier" onClick={() => fileInputRef.current?.click()} className="text-primary hover:text-primary/80 border-primary/30 hover:bg-primary/10 dark:hover:bg-primary/20 shrink-0 h-11 w-11 rounded-lg">
                <Paperclip className="h-5 w-5" />
            </Button>
            <Input
              ref={inputRef}
              type="text"
              placeholder={uploadedFiles.length > 0 ? "Ajouter un commentaire sur le(s) fichier(s)..." : "Envoyer un message à Sakai..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1 py-3 px-4 text-sm rounded-lg bg-background focus-visible:ring-primary/50 h-11"
            />
            <Button variant="outline" size="icon" type="button" aria-label="Saisie vocale (Bientôt disponible)" className="text-primary hover:text-primary/80 border-primary/30 hover:bg-primary/10 dark:hover:bg-primary/20 shrink-0 h-11 w-11 rounded-lg" disabled>
                <Mic className="h-5 w-5" />
            </Button>
            <Button type="submit" size="icon" disabled={isLoading || (!input.trim() && uploadedFiles.length === 0)} aria-label="Envoyer" className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 w-11 rounded-lg shrink-0">
              {isLoading && currentStreamingMessageId ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </form>
        </CardFooter>
      </Card>

      <MemoryDialog
        isOpen={isMemoryDialogOpen}
        onOpenChange={(open) => {
          setIsMemoryDialogOpen(open);
          if (!open && inputRef.current && !isDevSettingsOpen && !isDevCodePromptOpen && !isFeaturesDialogOpen && !isAboutDialogOpen) inputRef.current.focus();
        }}
        currentMemory={userMemory}
        onSaveMemory={handleSaveMemory}
      />

      <AlertDialog open={isFeaturesDialogOpen} onOpenChange={(open) => {
          setIsFeaturesDialogOpen(open);
          if (!open && inputRef.current && !isMemoryDialogOpen && !isDevSettingsOpen && !isDevCodePromptOpen && !isAboutDialogOpen) inputRef.current.focus();
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary"/>Fonctionnalités de Sakai</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              Sakai est un assistant IA polyvalent conçu pour vous aider dans diverses tâches :
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Répondre à vos questions et fournir des informations.</li>
                <li>Générer du texte créatif (emails, poèmes, scripts).</li>
                <li>Raconter des blagues et des histoires captivantes.</li>
                <li>Générer des images à partir de vos descriptions (demandez naturellement, ex: "dessine un paysage futuriste").</li>
                <li>Analyser le contenu des images, PDF, et fichiers texte que vous téléchargez (même plusieurs à la fois !).</li>
                <li>Traduire du texte dans différentes langues.</li>
                <li>Agir comme un partenaire de brainstorming et de réflexion.</li>
                <li>Se souvenir de vos préférences grâce au Panneau de Mémoire.</li>
                <li>Mode Développeur pour personnaliser le comportement du modèle.</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsFeaturesDialogOpen(false)}>Compris !</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isAboutDialogOpen} onOpenChange={(open) => {
        setIsAboutDialogOpen(open);
         if (!open && inputRef.current && !isMemoryDialogOpen && !isDevSettingsOpen && !isDevCodePromptOpen && !isFeaturesDialogOpen) inputRef.current.focus();
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary"/>À propos de Sakai</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              <p className="mb-2">Sakai est votre assistant IA personnel, développé avec passion pour être intelligent, convivial et utile au quotidien.</p>
              <p className="mb-2">Il utilise les dernières avancées en matière d'intelligence artificielle (via Genkit et les modèles Gemini de Google) pour vous offrir une expérience interactive et enrichissante.</p>
              <p>Version: 1.5.0 (Inférence d'intention pour génération d'images)</p>
              <p className="mt-4 text-xs text-muted-foreground">
                © Tous droits réservés.<br />
                Créateur & Développeur : MAMPIONONTIAKO Tantely Etienne Théodore
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsAboutDialogOpen(false)}>Fermer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDevCodePromptOpen} onOpenChange={(open) => {
        setIsDevCodePromptOpen(open);
        if (!open && !isDevSettingsOpen && inputRef.current && !isMemoryDialogOpen && !isFeaturesDialogOpen && !isAboutDialogOpen) inputRef.current.focus();
      }}>
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
            <AlertDialogCancel onClick={() => {setDevCodeInput(''); setIsDevCodePromptOpen(false);}}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDevCodeCheck}>Valider</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDevSettingsOpen} onOpenChange={(open) => {
        setIsDevSettingsOpen(open);
        if (!open && inputRef.current && !isMemoryDialogOpen && !isDevCodePromptOpen && !isFeaturesDialogOpen && !isAboutDialogOpen) inputRef.current.focus();
      }}>
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
                    <Button type="button" variant="ghost" onClick={()=> {
                      setTempOverrideSystemPrompt(devOverrideSystemPrompt);
                      setTempModelTemperature(devModelTemperature ?? 0.7);
                      setIsDevSettingsOpen(false);
                    }}>
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
