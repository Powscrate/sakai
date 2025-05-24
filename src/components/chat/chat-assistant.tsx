
// src/components/chat/chat-assistant.tsx
"use client";

import React, { useState, useRef, useEffect, FormEvent, ChangeEvent, useCallback } from 'react';
import NextImage from 'next/image';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send, Loader2, User, Mic, Paperclip, XCircle, FileText, Copy, Check,
  Brain, MoreVertical, Info, SlidersHorizontal, AlertTriangle, CheckCircle, Mail, Plane, Lightbulb, Languages, Sparkles, Trash2, Download, Eye, Palette, Ratio, Image as ImageIconLucide, MessageSquare, Laugh, Settings, Zap, Contact
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

import { streamChatAssistant, type ChatMessage, type ChatStreamChunk, type ChatMessagePart } from '@/ai/flows/chat-assistant-flow';
import { generateImage, type GenerateImageOutput } from '@/ai/flows/generate-image-flow';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { SakaiLogo } from '@/components/icons/logo';
import { ThemeToggleButton } from './theme-toggle-button';
import type { AIPersonality } from '@/app/page';

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
  onMessagesUpdate: (messages: ChatMessage[], newAssistantMessage?: ChatMessage) => void;
  userMemory: string;
  devOverrideSystemPrompt?: string;
  devModelTemperature?: number;
  activeChatId: string | null;
  currentUserName?: string | null;
  userAvatarUrl: string | null;
  selectedPersonality: AIPersonality;
  onOpenMemoryDialog: () => void;
  onOpenDevSettingsDialog: () => void;
  onOpenFeaturesDialog: () => void;
  onOpenAboutDialog: () => void;
  onOpenContactDialog: () => void;
}

export function ChatAssistant({
  initialMessages = [],
  onMessagesUpdate,
  userMemory,
  devOverrideSystemPrompt,
  devModelTemperature,
  activeChatId,
  currentUserName,
  userAvatarUrl,
  selectedPersonality,
  onOpenMemoryDialog,
  onOpenDevSettingsDialog,
  onOpenFeaturesDialog,
  onOpenAboutDialog,
  onOpenContactDialog,
}: ChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileWrapper[]>([]);
  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<string | null>(null);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [isFeaturesPopoverOpen, setIsFeaturesPopoverOpen] = useState(false);

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

  const moreOptionsMenuItems = [
    { label: "Panneau de Mémoire", icon: Brain, action: onOpenMemoryDialog },
    { label: "Mode Développeur", icon: SlidersHorizontal, action: onOpenDevSettingsDialog },
    { label: "Fonctionnalités de Sakai", icon: Zap, action: onOpenFeaturesDialog },
    { label: "Contacter le développeur", icon: Contact, action: onOpenContactDialog },
    { label: "À propos de Sakai", icon: Info, action: onOpenAboutDialog },
  ];


  useEffect(() => {
    if (activeChatId) {
        setMessages(initialMessages);
        setInput('');
        setUploadedFiles([]);
    }
  }, [activeChatId, initialMessages]);

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, []);

  useEffect(scrollToBottom, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (inputRef.current && !isLoading && !isImagePreviewOpen && !isFeaturesPopoverOpen ) {
      inputRef.current.focus();
    }
  }, [isLoading, isImagePreviewOpen, isFeaturesPopoverOpen, activeChatId]);


  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'text/markdown'];
      const newFilesBuffer: UploadedFileWrapper[] = [];

      Array.from(files).forEach(file => {
        const uniqueId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${encodeURIComponent(file.name)}`;
        let effectiveMimeType = file.type;

        if (!effectiveMimeType || effectiveMimeType === "application/octet-stream" || effectiveMimeType === "") {
          const lowerName = file.name.toLowerCase();
          if (lowerName.endsWith('.md')) effectiveMimeType = 'text/markdown';
          else if (lowerName.endsWith('.txt')) effectiveMimeType = 'text/plain';
          else if (lowerName.endsWith('.pdf')) effectiveMimeType = 'application/pdf';
          else if (lowerName.endsWith('.png')) effectiveMimeType = 'image/png';
          else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) effectiveMimeType = 'image/jpeg';
          else if (lowerName.endsWith('.webp')) effectiveMimeType = 'image/webp';
          else if (lowerName.endsWith('.gif')) effectiveMimeType = 'image/gif';
          else effectiveMimeType = 'application/octet-stream';
        }

        const isAllowed = allowedMimeTypes.some(allowedType => {
            if (allowedType.endsWith('/*')) {
                return effectiveMimeType.startsWith(allowedType.slice(0, -2));
            }
            return effectiveMimeType === allowedType;
        });

        if (isAllowed) {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result) {
              const correctlyTypedFile = new File([file], file.name, { type: effectiveMimeType });
              setUploadedFiles(prev => [...prev, { dataUri: reader.result as string, file: correctlyTypedFile, id: uniqueId }]);
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
            description: `Le fichier "${file.name}" (type: ${effectiveMimeType || 'inconnu'}) n'est pas supporté. Images (PNG, JPG, WEBP, GIF), PDF, TXT, et MD sont acceptés.`,
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

  const handleImageGeneration = async (promptText: string) => {
    setIsLoading(true);
    setCurrentStreamingMessageId(null);
    const imageGenUserMessageId = `user-img-prompt-${Date.now()}`;
    const imageGenPlaceholderId = `img-gen-${Date.now()}`;

    // Capture current input for the prompt, then clear it.
    const coreImagePrompt = promptText.replace(/^(génère une image de|dessine-moi|crée une image de|photo de|image de|montre-moi une image de|fais une image de|je veux une image de)\s*/i, '').trim();

    const userPromptMessage: ChatMessage = {
      role: 'user',
      parts: [{ type: 'text', text: `Génère une image de ${coreImagePrompt}` }],
      id: imageGenUserMessageId,
      createdAt: Date.now(),
    };

    const assistantPlaceholderMessage: ChatMessage = {
      role: 'model',
      parts: [{ type: 'text', text: `Sakai génère une image pour : "${coreImagePrompt.substring(0,50)}..."` }],
      id: imageGenPlaceholderId,
      createdAt: Date.now() + 1,
    };

    // Update local state for display first
    const updatedDisplayMessages = [...messages, userPromptMessage, assistantPlaceholderMessage];
    setMessages(updatedDisplayMessages);

    // Update parent/persistent state only with the user message initially
    onMessagesUpdate([...initialMessages, userPromptMessage]);

    try {
      const result: GenerateImageOutput = await generateImage({ prompt: coreImagePrompt });
      let finalAssistantMessagePart: ChatMessagePart;
      let finalAssistantMessage: ChatMessage;

      if (result.imageUrl) {
        finalAssistantMessagePart = { type: 'image' as 'image', imageDataUri: result.imageUrl, mimeType: 'image/png' };
        finalAssistantMessage = {
            role: 'model' as 'model',
            parts: [finalAssistantMessagePart],
            id: imageGenPlaceholderId,
            createdAt: Date.now(),
        };
      } else {
        const errorMessage = result.error || "La génération d'image a échoué ou l'URL est manquante.";
        toast({
          title: "Erreur de génération d'image",
          description: errorMessage,
          variant: "destructive",
        });
        finalAssistantMessagePart = { type: 'text' as 'text', text: `Désolé, je n'ai pas pu générer l'image. ${errorMessage}` };
        finalAssistantMessage = {
            role: 'model' as 'model',
            parts: [finalAssistantMessagePart],
            id: imageGenPlaceholderId,
            createdAt: Date.now(),
        };
      }

      setMessages(prev => prev.map(msg => msg.id === imageGenPlaceholderId ? finalAssistantMessage : msg));
      onMessagesUpdate([...initialMessages, userPromptMessage], finalAssistantMessage);

    } catch (error: unknown) {
      console.error("Erreur de génération d'image (client):", error);
      const errorMessage = (error as Error)?.message || "Désolé, une erreur est survenue lors de la génération de l'image.";
      toast({
        title: "Erreur de génération d'image",
        description: errorMessage,
        variant: "destructive",
      });
       const errorResponseMessage: ChatMessage = {
            role: 'model' as 'model',
            parts: [{ type: 'text' as 'text', text: `Erreur : ${errorMessage}` }],
            id: imageGenPlaceholderId,
            createdAt: Date.now(),
        };
      setMessages(prev => prev.map(msg => msg.id === imageGenPlaceholderId ? errorResponseMessage : msg));
      onMessagesUpdate([...initialMessages, userPromptMessage], errorResponseMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e?: FormEvent<HTMLFormElement> | string) => {
    if (typeof e === 'object' && e?.preventDefault) e.preventDefault();

    const currentInputVal = (typeof e === 'string' ? e : input).trim();
    const currentUploadedFiles = [...uploadedFiles]; // Capture before clearing

    if ((!currentInputVal && currentUploadedFiles.length === 0) || isLoading) return;

    setInput('');
    clearAllUploadedFiles();

    // Image generation intent detection
    const imageKeywords = [
      "génère une image de", "génère moi une image de", "génère une image pour",
      "dessine-moi", "dessine moi", "dessine une image de", "dessines-moi",
      "crée une image de", "crée moi une image de", "crée-moi une image de",
      "photo de", "image de", "montre-moi une image de",
      "fais une image de", "je veux une image de"
    ];
    const lowerInput = currentInputVal.toLowerCase();
    let isImageRequestIntent = false;

    if (currentUploadedFiles.length === 0) {
        isImageRequestIntent = imageKeywords.some(keyword => lowerInput.startsWith(keyword));
    }

    if (isImageRequestIntent) {
      await handleImageGeneration(currentInputVal);
      return;
    }

    const newUserMessageParts: ChatMessagePart[] = [];
    currentUploadedFiles.forEach(fileWrapper => {
      newUserMessageParts.push({
        type: 'image',
        imageDataUri: fileWrapper.dataUri,
        mimeType: fileWrapper.file.type || 'application/octet-stream'
      });
    });

    if (currentInputVal) {
      newUserMessageParts.push({ type: 'text', text: currentInputVal });
    }

    if (newUserMessageParts.length === 0) return;

    const newUserMessage: ChatMessage = { role: 'user', parts: newUserMessageParts, id: `user-${Date.now()}`, createdAt: Date.now() };
    const assistantMessageId = `model-${Date.now()}`;
    setCurrentStreamingMessageId(assistantMessageId);
    setIsLoading(true);

    const assistantPlaceholderMessage: ChatMessage = { role: 'model', parts: [{type: 'text', text: ''}], id: assistantMessageId, createdAt: Date.now() + 1 };

    // Update local display state immediately
    setMessages(prev => [...prev, newUserMessage, assistantPlaceholderMessage]);
    // Update parent/persistent state with only the user message for now
    onMessagesUpdate([...initialMessages, newUserMessage]);


    const historyForApi = [...initialMessages, newUserMessage];

    try {
      const readableStream = await streamChatAssistant({
        history: historyForApi,
        memory: userMemory,
        overrideSystemPrompt: devOverrideSystemPrompt,
        temperature: devModelTemperature,
        personality: selectedPersonality,
      });
      const reader = readableStream.getReader();
      let accumulatedText = "";
      let finalAssistantMessage: ChatMessage | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chatChunk: ChatStreamChunk = value;

        if (chatChunk.error) {
          console.error("Stream error from server:", chatChunk.error);
          accumulatedText = `Désolé, une erreur est survenue : ${chatChunk.error}`;
          toast({ title: "Erreur de l'assistant", description: chatChunk.error, variant: "destructive" });
          break;
        }

        if (chatChunk.text) {
          accumulatedText += chatChunk.text;
          setMessages(prev => {
            return prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, parts: [{type: 'text', text: accumulatedText }] }
                : msg
            );
          });
        }
      }

      finalAssistantMessage = {
        role: 'model',
        parts: [{type: 'text' as 'text', text: accumulatedText }],
        id: assistantMessageId,
        createdAt: Date.now()
      };

      setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? finalAssistantMessage! : msg));
      onMessagesUpdate([...initialMessages, newUserMessage], finalAssistantMessage);


    } catch (error: any) {
      console.error("Erreur lors du streaming du chat (côté client):", error);
      const errorMessageText = error?.message || "Désolé, une erreur de communication est survenue.";
      toast({
        title: "Erreur de Communication",
        description: errorMessageText,
        variant: "destructive",
      });
      const errorAssistantMessage: ChatMessage = {
        role: 'model',
        parts: [{ type: 'text', text: errorMessageText }],
        id: assistantMessageId,
        createdAt: Date.now()
      };
      setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? errorAssistantMessage : msg));
      onMessagesUpdate([...initialMessages, newUserMessage], errorAssistantMessage);
    } finally {
      setIsLoading(false);
      setCurrentStreamingMessageId(null);
    }
  };

  const handleFeatureActionClick = (promptPrefix: string) => {
    setInput(prevInput => promptPrefix + prevInput);
    setIsFeaturesPopoverOpen(false);
    if(inputRef.current) inputRef.current.focus();
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

  const handleDownloadImage = (imageDataUri: string) => {
    const link = document.createElement('a');
    link.href = imageDataUri;
    link.download = `sakai-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Téléchargement", description: "L'image est en cours de téléchargement." });
  };

  const handleDownloadGeneratedFile = (filename: string, content: string, mimeType: string) => {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Téléchargement", description: `Le fichier "${filename}" a été téléchargé.` });
    } catch (error) {
      console.error("Error downloading generated file:", error);
      toast({ title: "Erreur de téléchargement", description: "Impossible de télécharger le fichier.", variant: "destructive" });
    }
  };


  const handlePreviewImage = (imageDataUri: string) => {
    setImagePreviewUrl(imageDataUri);
    setIsImagePreviewOpen(true);
  };

  const processInlineFormatting = (text: string, baseKey: string) => {
    const parts: (JSX.Element | string)[] = [];
    let remainingText = text;
    let keyIdx = 0;
    const inlineRegex = /(\*\*\*|___)(.+?)\1|(\*\*|__)(.+?)\3|(\*|_)(.+?)\5|(`)(.+?)\7/g;
    let lastIndex = 0;
    let match;

    while ((match = inlineRegex.exec(remainingText)) !== null) {
        if (match.index > lastIndex) {
            parts.push(remainingText.substring(lastIndex, match.index));
        }
        if (match[2]) {
            parts.push(<strong key={`${baseKey}-bi-${keyIdx++}`}><em>{match[2]}</em></strong>);
        } else if (match[4]) {
            parts.push(<strong key={`${baseKey}-strong-${keyIdx++}`}>{match[4]}</strong>);
        } else if (match[6]) {
            parts.push(<em key={`${baseKey}-em-${keyIdx++}`}>{match[6]}</em>);
        } else if (match[8]) {
            parts.push(<code key={`${baseKey}-code-${keyIdx++}`} className="px-1 py-0.5 bg-muted text-muted-foreground rounded-sm text-xs font-mono">{match[8]}</code>);
        }
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < remainingText.length) {
        parts.push(remainingText.substring(lastIndex));
    }
    return <>{parts.filter(part => typeof part === 'string' ? part.length > 0 : true)}</>;
};

const parseAndStyleNonCodeText = (elements: JSX.Element[], textBlock: string, uniqueKeyPrefix: string, blockKeyIndex: number) => {
    const segmentLines = textBlock.split('\n');
    let currentListType: 'ul' | 'ol' | null = null;
    let listItems: JSX.Element[] = [];
    let keyIndex = 0;

    const flushList = () => {
        if (listItems.length > 0) {
            const listKey = `${uniqueKeyPrefix}-list-${blockKeyIndex}-${keyIndex++}`;
            if (currentListType === 'ul') {
                elements.push(<ul key={listKey} className="list-disc list-inside my-2 pl-5 space-y-1">{listItems}</ul>);
            } else if (currentListType === 'ol') {
                 elements.push(<ol key={listKey} className="list-decimal list-inside my-2 pl-5 space-y-1">{listItems}</ol>);
            }
            listItems = [];
        }
        currentListType = null;
    };

    segmentLines.forEach((line, lineIdx) => {
        const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
        const listItemMatch = line.match(/^\s*([-*]|\d+\.)\s+(.*)/);

        if (headingMatch) {
            flushList();
            const level = headingMatch[1].length;
            const content = headingMatch[2];
            const processedContent = processInlineFormatting(content, `${uniqueKeyPrefix}-h${level}-text-${blockKeyIndex}-${lineIdx}-${keyIndex++}`);
            const headingKey = `${uniqueKeyPrefix}-h${level}-${blockKeyIndex}-${keyIndex++}`;
            if (level === 1) elements.push(<h1 key={headingKey} className="text-xl 2xl:text-2xl font-semibold my-3 pb-1 border-b">{processedContent}</h1>);
            else if (level === 2) elements.push(<h2 key={headingKey} className="text-lg 2xl:text-xl font-semibold my-2 pb-0.5 border-b">{processedContent}</h2>);
            else elements.push(<h3 key={headingKey} className="text-md 2xl:text-lg font-semibold my-1.5">{processedContent}</h3>);
        } else if (listItemMatch) {
            const listMarker = listItemMatch[1];
            const itemContent = listItemMatch[2];
            const newListType = listMarker.includes('.') ? 'ol' : 'ul';

            if (currentListType !== newListType && listItems.length > 0) flushList();
            currentListType = newListType;

            const processedItemContent = processInlineFormatting(itemContent, `${uniqueKeyPrefix}-li-text-${blockKeyIndex}-${lineIdx}-${keyIndex++}`);
            listItems.push(<li key={`${uniqueKeyPrefix}-li-${blockKeyIndex}-${lineIdx}-${keyIndex++}`}>{processedItemContent}</li>);
        } else {
            flushList();
            if (line.trim() === '') {
                if (lineIdx > 0 && segmentLines[lineIdx-1]?.trim() !== '' && elements.length > 0 && elements[elements.length-1].type === 'p') {
                   elements.push(<div key={`${uniqueKeyPrefix}-pbr-${blockKeyIndex}-${lineIdx}-${keyIndex++}`} className="h-2 2xl:h-3"></div>);
                }
            } else {
                const processedLine = processInlineFormatting(line, `${uniqueKeyPrefix}-p-text-${blockKeyIndex}-${lineIdx}-${keyIndex++}`);
                elements.push(<p key={`${uniqueKeyPrefix}-p-${blockKeyIndex}-${lineIdx}-${keyIndex++}`} className="my-1 2xl:my-1.5">{processedLine}</p>);
            }
        }
    });
    flushList();
};

const parseAndStyleText = (text: string, uniqueKeyPrefix: string) => {
  const elements: JSX.Element[] = [];
  const mainRegex = /(```(\w*)\n?([\s\S]*?)```|---BEGIN_FILE:\s*(.+?)\s*---([\s\S]*?)---END_FILE---)/gs;
  let lastIndex = 0;
  let match;
  let blockKeyIndex = 0;

  while ((match = mainRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parseAndStyleNonCodeText(elements, text.substring(lastIndex, match.index), uniqueKeyPrefix, blockKeyIndex++);
    }

    if (match[1].startsWith('```')) {
      const lang = match[2]?.toLowerCase() || 'plaintext';
      const code = match[3].trimEnd();
      const codeBlockId = `${uniqueKeyPrefix}-code-${blockKeyIndex++}`;
      elements.push(
        <div key={codeBlockId} className="relative group bg-muted dark:bg-black/30 my-2.5 rounded-md shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-border/50">
            <span className="text-xs text-muted-foreground font-mono">{lang || 'code'}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-50 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              onClick={() => handleCopyCode(code, codeBlockId)}
              aria-label="Copier le code"
            >
              {copiedStates[codeBlockId] ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <SyntaxHighlighter
            language={lang || 'plaintext'}
            style={vscDarkPlus}
            showLineNumbers
            wrapLines={true}
            lineNumberStyle={{minWidth: '2.25em', paddingRight: '0.5em', opacity: 0.6, userSelect: 'none'}}
            lineProps={{ style: { wordBreak: 'break-all', whiteSpace: 'pre-wrap', display: 'block' } }}
            className="!py-3 !px-0 !text-sm !bg-transparent !font-mono"
            codeTagProps={{style: {fontFamily: 'var(--font-geist-sans), Menlo, Monaco, Consolas, "Courier New", monospace'}}}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      );
    } else {
      const fileName = match[4].trim();
      const fileContent = match[5].trim();
      const fileKey = `${uniqueKeyPrefix}-file-${blockKeyIndex++}`;
      let mimeType = 'text/plain';
      if (fileName.endsWith('.md')) mimeType = 'text/markdown';
      else if (fileName.endsWith('.txt')) mimeType = 'text/plain';

      elements.push(
          <div key={fileKey} className="my-2">
              <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadGeneratedFile(fileName, fileContent, mimeType)}
                  className="text-sm"
              >
                  <Download className="mr-2 h-4 w-4" /> Télécharger {fileName}
              </Button>
          </div>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parseAndStyleNonCodeText(elements, text.substring(lastIndex), uniqueKeyPrefix, blockKeyIndex++);
  }

  return elements;
};


  const renderMessagePart = (part: ChatMessagePart, partIndex: number, message: ChatMessage, isLastMessageOfList: boolean) => {
    const uniquePartKey = `${message.id || 'msg'}-${part.type}-${partIndex}-${Math.random().toString(36).substring(2,7)}`;

    if (part.type === 'text') {
      const styledTextElements = parseAndStyleText(part.text, uniquePartKey);
      return (
        <div key={uniquePartKey} className="text-sm 2xl:text-base whitespace-pre-wrap leading-relaxed">
            {styledTextElements}
            {isLastMessageOfList && message.role === 'model' && isLoading && message.id === currentStreamingMessageId && (
                <span className="blinking-cursor-span">▋</span>
            )}
        </div>
      );
    }

    if (part.type === 'image' && part.imageDataUri) {
      const isImageFile = part.mimeType?.startsWith('image/');
      const isUserMessage = message.role === 'user';

      if (isImageFile) {
        return (
          <div key={uniquePartKey} className={cn("relative group my-2 transition-all hover:shadow-lg", isUserMessage ? "max-w-[250px] md:max-w-[300px]" : "max-w-[300px] md:max-w-[350px]")}>
            <NextImage
              src={part.imageDataUri}
              alt={message.role === 'user' ? "Fichier de l'utilisateur" : "Média généré"}
              width={isUserMessage ? 300 : 350}
              height={isUserMessage ? 300 : 350}
              className="rounded-lg object-contain max-w-full h-auto border border-border/50 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handlePreviewImage(part.imageDataUri as string)}
              data-ai-hint={isUserMessage ? "user uploaded media" : "generated media"}
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
        const fileNameFromPart = (part as any).file?.name || part.imageDataUri.substring(0,30) + "..."; // Fallback for AI generated files

        return (
          <div key={uniquePartKey} className="my-2 p-3 border border-dashed rounded-md bg-muted/30 flex items-center gap-2 text-sm text-muted-foreground max-w-[250px] md:max-w-[300px]">
            <FileText className="h-6 w-6 text-primary shrink-0" />
            <div className="truncate">
              <p className="font-medium truncate" title={fileNameFromPart}>{fileNameFromPart}</p>
              <p className="text-xs">{part.mimeType || 'Fichier'}</p>
            </div>
          </div>
        );
      }
    }
    return null;
  };


  return (
    <Card className="w-full h-full flex flex-col shadow-2xl rounded-lg overflow-hidden bg-card text-card-foreground">
      <CardHeader className="shrink-0 border-b p-4 flex flex-row items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <SakaiLogo className="h-8 w-8 text-primary" />
          <CardTitle className="text-lg 2xl:text-xl font-semibold">Sakai</CardTitle>
        </div>
         <div className="flex items-center gap-2">
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80" aria-label="Plus d'options">
                        <MoreVertical className="h-5 w-5" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2 mr-2">
                    <div className="grid gap-1">
                        {moreOptionsMenuItems.map((item) => (
                            <Button
                                key={item.label}
                                variant="ghost"
                                onClick={() => { item.action(); if (inputRef.current) inputRef.current.focus(); }}
                                className="justify-start text-sm h-9"
                            >
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.label}
                            </Button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
            <ThemeToggleButton />
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden min-h-0">
        <ScrollArea ref={scrollAreaRef} className="h-full bg-background/60 dark:bg-black/10">
          <div className="p-4 sm:p-6 space-y-6">
            {messages.length === 0 && !isLoading && (
               <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 space-y-6">
                <SakaiLogo className="h-28 w-28 text-primary opacity-70 mb-4" data-ai-hint="logo large"/>
                <p className="text-xl 2xl:text-2xl font-medium">Salut {currentUserName || "l'ami"} ! C'est Sakai.</p>
                <p className="text-sm 2xl:text-base max-w-md">
                  Comment puis-je t'aider aujourd'hui ?<br />
                  Pose-moi une question, télécharge un fichier, ou utilise le bouton <Sparkles className="inline-block align-middle h-4 w-4 mx-0.5 text-primary"/> pour des actions rapides !
                </p>
              </div>
            )}
            {messages.map((msg, msgIndex) => {
              const isUser = msg.role === 'user';
              const isLastMessageOfList = msgIndex === messages.length - 1;
              const isLoadingPlaceholder = isLoading && msg.role === 'model' && msg.id === currentStreamingMessageId && msg.parts.length === 1 && msg.parts[0].type === 'text' && msg.parts[0].text === '';
              const isImageGenPlaceholder = isLoading && msg.role === 'model' && msg.parts.length === 1 && msg.parts[0].type === 'text' && msg.parts[0].text.startsWith('Sakai génère une image');

              return (
                <div
                  key={msg.id || `msg-${msgIndex}-${Date.now()}-${Math.random()}`}
                  className={cn(
                    "flex items-end gap-3 max-w-[85%] 2xl:max-w-[80%] break-words",
                    isUser ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'
                  )}
                >
                  {isUser ? (
                    userAvatarUrl ? (
                        <NextImage src={userAvatarUrl} alt="User Avatar" width={28} height={28} className="h-7 w-7 shrink-0 rounded-full object-cover aspect-square mb-1.5" data-ai-hint="user avatar small"/>
                    ) : (
                        <User className="h-7 w-7 shrink-0 text-muted-foreground/80 mb-1.5 rounded-full bg-muted p-1" />
                    )
                  ) : (
                     <SakaiLogo className="h-7 w-7 shrink-0 text-primary mb-1.5 rounded-full bg-primary/10 p-0.5" />
                  )}
                  <div className={cn(
                     "p-3.5 rounded-xl shadow-md transition-all duration-200 ease-out hover:shadow-lg",
                     isUser
                       ? 'bg-primary text-primary-foreground rounded-br-none'
                       : 'bg-card border text-card-foreground rounded-bl-none',
                      (msg.parts.some(p => p.type === 'image' && p.mimeType?.startsWith('image/')) && !isLoadingPlaceholder && !isImageGenPlaceholder) && "p-1.5 bg-transparent shadow-none border-none dark:bg-transparent"
                  )}>
                    {isLoadingPlaceholder || isImageGenPlaceholder ? (
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
              <p className="text-xs text-muted-foreground font-medium">Fichiers téléversés ({uploadedFiles.length}) :</p>
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
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            className="hidden"
            accept="image/*,application/pdf,text/plain,.md,text/markdown"
          />
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
                <Button variant="outline" onClick={() => {handleDownloadImage(imagePreviewUrl); setIsImagePreviewOpen(false);}}>
                  <Download className="mr-2 h-4 w-4" /> Télécharger
                </Button>
              <DialogClose asChild>
                <Button type="button">Fermer</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    )}
  </Card>
  );
}
