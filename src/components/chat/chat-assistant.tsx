
// src/components/chat/chat-assistant.tsx
"use client";

import { useState, useRef, useEffect, FormEvent, ChangeEvent, Fragment, useCallback } from 'react';
import NextImage from 'next/image';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send, Loader2, User, Bot, Mic, Paperclip, XCircle, FileText, Copy, Check, MoreVertical,
  Brain, Info, SlidersHorizontal, AlertTriangle, CheckCircle, Mail, Plane, MessageSquare,
  Laugh, Lightbulb, Languages, Sparkles, Trash2, Download, Eye, Image as ImageIconLucide, Palette, Ratio
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { streamChatAssistant, type ChatMessage, type ChatStreamChunk, type ChatMessagePart } from '@/ai/flows/chat-assistant-flow';
import { generateImage, type GenerateImageOutput } from '@/ai/flows/generate-image-flow';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { SakaiLogo } from '@/components/icons/logo';

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
  activeChatId: string | null;
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

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [isFeaturesPopoverOpen, setIsFeaturesPopoverOpen] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Define featureActions inside the component
  const featureActions = [
    { id: 'generate-image', label: "Générer une image", icon: ImageIconLucide, promptPrefix: "Génère une image de " },
    { id: 'tell-joke', label: "Raconter une blague", icon: Laugh, promptPrefix: "Raconte-moi une blague." },
    { id: 'draft-pitch', label: "Rédiger un pitch", icon: Lightbulb, promptPrefix: "Aide-moi à rédiger un pitch pour " },
    { id: 'translate-text', label: "Traduire un texte", icon: Languages, promptPrefix: "Traduis ce texte en anglais : " },
  ];


  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, activeChatId]);

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
    if (inputRef.current && !isLoading && !isImagePreviewOpen && !isFeaturesPopoverOpen) {
      inputRef.current.focus();
    }
  }, [isLoading, isImagePreviewOpen, isFeaturesPopoverOpen]);


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

  const handleImageGeneration = async (promptText: string) => {
    setIsLoading(true);
    setCurrentStreamingMessageId(null); // Ensure cursor is not shown for this special handling
    const imageGenUserMessageId = `user-img-prompt-${Date.now()}`;
    const imageGenPlaceholderId = `img-gen-${Date.now()}`;

    const userPromptMessage: ChatMessage = {
      role: 'user',
      parts: [{ type: 'text', text: promptText }],
      id: imageGenUserMessageId,
      createdAt: Date.now(),
    };

    const assistantPlaceholderMessage: ChatMessage = {
      role: 'model',
      parts: [{ type: 'text', text: `Sakai génère une image pour : "${promptText.substring(0,50)}..."` }],
      id: imageGenPlaceholderId,
      createdAt: Date.now() + 1,
    };
    
    // Update local messages and then call onMessagesUpdate for parent
    const updatedLocalMessages = [...messages, userPromptMessage, assistantPlaceholderMessage];
    setMessages(updatedLocalMessages);
    onMessagesUpdate([...messages, userPromptMessage]); // Send only user message initially to parent

    try {
      const result: GenerateImageOutput = await generateImage({ prompt: promptText });
      let finalAssistantMessagePart: ChatMessagePart;

      if (result.imageUrl) {
        finalAssistantMessagePart = { type: 'image' as 'image', imageDataUri: result.imageUrl, mimeType: 'image/png' }; // Assuming PNG for now
      } else {
        const errorMessage = result.error || "La génération d'image a échoué ou l'URL est manquante.";
        toast({
          title: "Erreur de génération d'image",
          description: errorMessage,
          variant: "destructive",
        });
        finalAssistantMessagePart = { type: 'text' as 'text', text: `Désolé, je n'ai pas pu générer l'image. ${errorMessage}` };
      }
      
      const finalAssistantMessage: ChatMessage = {
        role: 'model' as 'model',
        parts: [finalAssistantMessagePart],
        id: imageGenPlaceholderId, // Re-use ID for replacement
        createdAt: Date.now(),
      };
      setMessages(prev => prev.map(msg => msg.id === imageGenPlaceholderId ? finalAssistantMessage : msg));
      onMessagesUpdate([...messages, userPromptMessage, finalAssistantMessage]);


    } catch (error: unknown) {
      console.error("Erreur de génération d'image (client):", error);
      const errorMessage = (error as Error)?.message || "Désolé, une erreur est survenue lors de la génération de l'image.";
      toast({
        title: "Erreur de génération d'image",
        description: errorMessage,
        variant: "destructive",
      });
      const errorFinalMessage: ChatMessage = { 
        role: 'model' as 'model',
        parts: [{ type: 'text' as 'text', text: `Erreur : ${errorMessage}` }],
        id: imageGenPlaceholderId, 
        createdAt: Date.now(),
      };
      setMessages(prev => prev.map(msg => msg.id === imageGenPlaceholderId ? errorFinalMessage : msg));
      onMessagesUpdate([...messages, userPromptMessage, errorFinalMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e?: FormEvent<HTMLFormElement> | string) => {
    if (typeof e === 'object' && e?.preventDefault) e.preventDefault();

    const currentInput = (typeof e === 'string' ? e : input).trim();
    if ((!currentInput && uploadedFiles.length === 0) || isLoading) return;

    const imageKeywords = ["génère une image de", "dessine-moi", "dessine moi", "crée une image de", "photo de", "image de"];
    const lowerInput = currentInput.toLowerCase();
    let isImageRequestIntent = false;
    if (uploadedFiles.length === 0) { // Only detect image generation if no files are uploaded
        isImageRequestIntent = imageKeywords.some(keyword => lowerInput.startsWith(keyword));
    }

    if (isImageRequestIntent) {
      if (typeof e !== 'string') setInput(''); // Clear input only if it was a form submission
      clearAllUploadedFiles(); // Clear files as well if image gen is triggered by text
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
          mimeType = fileWrapper.file.type || (fileWrapper.file.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'); // Basic fallback
        } else {
          mimeType = 'application/octet-stream'; // Default unknown
        }
      }
      newUserMessageParts.push({
        type: 'image', // Use 'image' for Gemini to treat as media, mimeType will specify
        imageDataUri: fileWrapper.dataUri,
        mimeType: mimeType
      });
    });

    if (currentInput) {
      newUserMessageParts.push({ type: 'text', text: currentInput });
    }

    if (newUserMessageParts.length === 0) return;

    const newUserMessage: ChatMessage = { role: 'user', parts: newUserMessageParts, id: `user-${Date.now()}`, createdAt: Date.now() };
    
    if (typeof e !== 'string') setInput('');
    clearAllUploadedFiles();

    setIsLoading(true);
    const assistantMessageId = `model-${Date.now()}`;
    setCurrentStreamingMessageId(assistantMessageId);

    const assistantPlaceholderMessage: ChatMessage = { role: 'model', parts: [{type: 'text', text: ''}], id: assistantMessageId, createdAt: Date.now() + 1 };
    const updatedLocalMessages = [...messages, newUserMessage, assistantPlaceholderMessage];
    setMessages(updatedLocalMessages);
    onMessagesUpdate([...messages, newUserMessage]); // Send only new user message to parent initially for storage

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
          accumulatedText = `Désolé, une erreur est survenue : ${chatChunk.error}`; 
          toast({ title: "Erreur de l'assistant", description: chatChunk.error, variant: "destructive" });
          break; 
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
      
      const finalAssistantMessage: ChatMessage = { 
        role: 'model', 
        parts: [{type: 'text' as 'text', text: accumulatedText }], 
        id: assistantMessageId, 
        createdAt: Date.now() 
      };
      
      setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? finalAssistantMessage : msg));
      onMessagesUpdate([...historyForApi, finalAssistantMessage]);


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
      onMessagesUpdate([...historyForApi, errorAssistantMessage]);
    } finally {
      setIsLoading(false);
      setCurrentStreamingMessageId(null);
    }
  };

  const handleFeatureActionClick = (promptPrefix: string) => {
    setInput(prevInput => promptPrefix + prevInput);
    setIsFeaturesPopoverOpen(false); // Close popover after click
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

  const handleDownloadImage = (imageDataUri: string) => {
    const link = document.createElement('a');
    link.href = imageDataUri;
    link.download = `sakai-image-${Date.now()}.png`; // Suggest a filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Téléchargement", description: "L'image est en cours de téléchargement." });
  };

  const handlePreviewImage = (imageDataUri: string) => {
    setImagePreviewUrl(imageDataUri);
    setIsImagePreviewOpen(true);
  };
  
  const parseAndStyleText = (text: string, uniqueKeyPrefix: string) => {
    const elements: JSX.Element[] = [];
    let remainingText = text;
  
    // Regex for code blocks
    const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/gs;
    // Regex for headings, bold, italics, and lists (simplified)
    const lineRegex = /^(#{1,3})\s+(.+)|(\*\*|__)(.+?)\3|(\*|_)(.+?)\5|^(\s*[-*]|\s*\d+\.)\s+(.+)/;
  
    let keyIndex = 0;
  
    const processBlock = (blockText: string, isCodeBlock: boolean, lang?: string) => {
      if (isCodeBlock) {
        const codeBlockId = `${uniqueKeyPrefix}-code-${keyIndex++}`;
        elements.push(
          <div key={codeBlockId} className="relative group bg-muted dark:bg-black/30 my-2 rounded-md shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground font-mono">{lang || 'code'}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-50 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                onClick={() => handleCopyCode(blockText, codeBlockId)}
                aria-label="Copier le code"
              >
                {copiedStates[codeBlockId] ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <SyntaxHighlighter
              language={lang || 'plaintext'}
              style={vscDarkPlus}
              showLineNumbers
              wrapLines={true}
              lineProps={{ style: { wordBreak: 'break-all', whiteSpace: 'pre-wrap', display: 'block' } }}
              className="!p-3 !text-sm !bg-transparent !font-mono"
              codeTagProps={{style: {fontFamily: 'var(--font-geist-mono), Menlo, Monaco, Consolas, "Courier New", monospace'}}}
            >
              {blockText}
            </SyntaxHighlighter>
          </div>
        );
      } else {
        // Process non-code block text line by line for other markdown
        const lines = blockText.split('\n');
        let currentListType: 'ul' | 'ol' | null = null;
        let listItems: JSX.Element[] = [];
  
        const flushList = () => {
          if (listItems.length > 0) {
            if (currentListType === 'ul') {
              elements.push(<ul key={`${uniqueKeyPrefix}-ul-${keyIndex++}`} className="list-disc list-inside my-1 pl-4 space-y-0.5">{listItems}</ul>);
            } else if (currentListType === 'ol') {
              elements.push(<ol key={`${uniqueKeyPrefix}-ol-${keyIndex++}`} className="list-decimal list-inside my-1 pl-4 space-y-0.5">{listItems}</ol>);
            }
            listItems = [];
            currentListType = null;
          }
        };
  
        lines.forEach((line, idx) => {
          const lineMatch = line.match(lineRegex);
          if (lineMatch) {
            flushList(); // End previous list if type changes or not a list item
            if (lineMatch[1]) { // Heading
              const level = lineMatch[1].length;
              const content = lineMatch[2];
              if (level === 1) elements.push(<h1 key={`${uniqueKeyPrefix}-h1-${keyIndex++}`} className="text-xl font-semibold my-2">{content}</h1>);
              else if (level === 2) elements.push(<h2 key={`${uniqueKeyPrefix}-h2-${keyIndex++}`} className="text-lg font-semibold my-1.5">{content}</h2>);
              else if (level === 3) elements.push(<h3 key={`${uniqueKeyPrefix}-h3-${keyIndex++}`} className="text-md font-semibold my-1">{content}</h3>);
            } else if (lineMatch[3]) { // Bold
              elements.push(<strong key={`${uniqueKeyPrefix}-strong-${keyIndex++}`}>{lineMatch[4]}</strong>);
            } else if (lineMatch[5]) { // Italic
              elements.push(<em key={`${uniqueKeyPrefix}-em-${keyIndex++}`}>{lineMatch[6]}</em>);
            } else if (lineMatch[7]) { // List item
              const listMarker = lineMatch[7];
              const itemContent = lineMatch[8];
              const newListType = listMarker.includes('.') ? 'ol' : 'ul';
              if (currentListType !== newListType) {
                flushList();
                currentListType = newListType;
              }
              listItems.push(<li key={`${uniqueKeyPrefix}-li-${idx}-${keyIndex++}`}>{itemContent}</li>);
            } else {
               // This case should ideally not be hit if regex is comprehensive for special lines
               elements.push(<span key={`${uniqueKeyPrefix}-span-${idx}-${keyIndex++}`}>{line}</span>);
               if (idx < lines.length -1) elements.push(<br key={`${uniqueKeyPrefix}-br-${idx}-${keyIndex++}`} />);
            }
          } else {
            flushList(); // End list if line is not a list item
            elements.push(<span key={`${uniqueKeyPrefix}-span-${idx}-${keyIndex++}`}>{line}</span>);
            // Add <br /> only if it's not the last line and the line is not empty
            if (idx < lines.length - 1 && line.trim() !== "") {
                 // elements.push(<br key={`${uniqueKeyPrefix}-br-${idx}-${keyIndex++}`} />);
            } else if (line.trim() === "" && idx < lines.length - 1 && lines[idx+1].trim() !== "") {
                 elements.push(<div key={`${uniqueKeyPrefix}-pbr-${idx}-${keyIndex++}`} className="h-3"></div>); // Paragraph break
            }
          }
        });
        flushList(); // Flush any remaining list items
      }
    };
    
    // Simpler block splitting: just code blocks for now, rest is paragraph
    let lastIndex = 0;
    let match;
    while ((match = codeBlockRegex.exec(remainingText)) !== null) {
      if (match.index > lastIndex) {
        parseAndStyleNonCodeText(elements, remainingText.substring(lastIndex, match.index), uniqueKeyPrefix, keyIndex++);
      }
      const lang = match[1]?.toLowerCase() || 'plaintext';
      const code = match[2].trim();
      processBlock(code, true, lang);
      lastIndex = match.index + match[0].length;
    }
  
    if (lastIndex < remainingText.length) {
      parseAndStyleNonCodeText(elements, remainingText.substring(lastIndex), uniqueKeyPrefix, keyIndex++);
    }
  
    return elements;
  };

  const parseAndStyleNonCodeText = (elements: JSX.Element[], textBlock: string, uniqueKeyPrefix: string, blockKeyIndex: number) => {
    const lines = textBlock.split('\n');
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

    lines.forEach((line, lineIdx) => {
        const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
        const boldMatch = line.match(/(\*\*|__)(.*?)\1/g); // May match multiple
        const italicMatch = line.match(/(\*|_)(.*?)\1/g); // May match multiple
        const listItemMatch = line.match(/^\s*([-*]|\d+\.)\s+(.*)/);

        if (headingMatch) {
            flushList();
            const level = headingMatch[1].length;
            const content = headingMatch[2];
            const headingKey = `${uniqueKeyPrefix}-h${level}-${blockKeyIndex}-${keyIndex++}`;
            if (level === 1) elements.push(<h1 key={headingKey} className="text-xl font-semibold my-3 pb-1 border-b">{content}</h1>);
            else if (level === 2) elements.push(<h2 key={headingKey} className="text-lg font-semibold my-2 pb-0.5 border-b">{content}</h2>);
            else elements.push(<h3 key={headingKey} className="text-md font-semibold my-1.5">{content}</h3>);
        } else if (listItemMatch) {
            const listMarker = listItemMatch[1];
            const itemContent = listItemMatch[2];
            const newListType = listMarker.includes('.') ? 'ol' : 'ul';

            if (currentListType !== newListType && listItems.length > 0) flushList();
            currentListType = newListType;
            
            // Process bold/italic within list item
            const processedItemContent = processInlineFormatting(itemContent, `${uniqueKeyPrefix}-li-text-${blockKeyIndex}-${lineIdx}-${keyIndex++}`);
            listItems.push(<li key={`${uniqueKeyPrefix}-li-${blockKeyIndex}-${lineIdx}-${keyIndex++}`}>{processedItemContent}</li>);
        } else {
            flushList();
            if (line.trim() === '') {
                elements.push(<div key={`${uniqueKeyPrefix}-pbr-${blockKeyIndex}-${lineIdx}-${keyIndex++}`} className="h-3"></div>); // Paragraph break for empty line
            } else {
                 // Process bold/italic for normal paragraph lines
                const processedLine = processInlineFormatting(line, `${uniqueKeyPrefix}-p-text-${blockKeyIndex}-${lineIdx}-${keyIndex++}`);
                elements.push(<p key={`${uniqueKeyPrefix}-p-${blockKeyIndex}-${lineIdx}-${keyIndex++}`} className="my-1">{processedLine}</p>);
            }
        }
    });
    flushList(); // Flush any remaining list items at the end of the block
};

const processInlineFormatting = (text: string, baseKey: string) => {
    // This is a very simplified parser. For robust markdown, a library is needed.
    // It handles simple cases of **bold** and *italic*.
    // It doesn't handle nested or complex combinations well.
    const parts = [];
    let remainingText = text;
    let keyIdx = 0;

    // Regex to find first occurrence of **bold** or *italic*
    const inlineRegex = /(\*\*|__)(.+?)\1|(\*|_)(.+?)\3/;
    let match;

    while ((match = inlineRegex.exec(remainingText)) !== null) {
        // Add text before the match
        if (match.index > 0) {
            parts.push(<span key={`${baseKey}-txt-${keyIdx++}`}>{remainingText.substring(0, match.index)}</span>);
        }
        // Add the bold/italic part
        if (match[2]) { // Bold
            parts.push(<strong key={`${baseKey}-strong-${keyIdx++}`}>{match[2]}</strong>);
        } else if (match[4]) { // Italic
            parts.push(<em key={`${baseKey}-em-${keyIdx++}`}>{match[4]}</em>);
        }
        remainingText = remainingText.substring(match.index + match[0].length);
    }

    // Add any remaining text
    if (remainingText) {
        parts.push(<span key={`${baseKey}-txt-${keyIdx++}`}>{remainingText}</span>);
    }
    return <>{parts}</>;
};


  const renderMessagePart = (part: ChatMessagePart, partIndex: number, message: ChatMessage, isLastMessageOfList: boolean) => {
    const uniquePartKey = `${message.id || 'msg'}-${part.type}-${partIndex}-${Math.random().toString(36).substring(2,7)}`;

    if (part.type === 'text') {
      const styledTextElements = parseAndStyleText(part.text, uniquePartKey);
      return (
        <div key={uniquePartKey} className="text-sm whitespace-pre-wrap leading-relaxed">
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
          <div key={uniquePartKey} className={cn("relative group my-2", isUserMessage ? "max-w-[250px]" : "max-w-[300px]")}>
            <NextImage
              src={part.imageDataUri}
              alt={message.role === 'user' ? "Fichier de l'utilisateur" : "Média généré"}
              width={isUserMessage ? 250 : 300}
              height={isUserMessage ? 250 : 300}
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
        return (
          <div key={uniquePartKey} className="my-2 p-3 border border-dashed rounded-md bg-muted/30 flex items-center gap-2 text-sm text-muted-foreground max-w-[250px]">
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
    <div className="flex flex-col h-full bg-card text-card-foreground shadow-xl rounded-lg overflow-hidden">
      <CardHeader className="shrink-0 border-b p-4 flex flex-row items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <SakaiLogo className="h-7 w-7 text-primary" />
          <CardTitle className="text-lg font-semibold text-foreground">Sakai</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="h-full bg-background/60 dark:bg-black/10">
          <div className="p-4 sm:p-6 space-y-6">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 space-y-4">
                <SakaiLogo className="h-24 w-24 text-primary opacity-70 mb-4" data-ai-hint="logo large"/>
                <p className="text-xl font-medium">Bienvenue ! Je suis Sakai.</p>
                <p className="text-sm max-w-md">
                  Comment puis-je vous aider aujourd&apos;hui ?<br />
                  Posez une question, demandez de générer une image, ou téléversez des fichiers pour analyse. Utilisez les icônes ci-dessous pour des actions rapides !
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
