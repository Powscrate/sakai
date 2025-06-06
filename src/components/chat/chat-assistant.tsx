// src/components/chat/chat-assistant.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import NextImage from 'next/image';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2, User, FileText, Copy, Check, Download, 
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogFooter, DialogClose,
} from "@/components/ui/dialog";

import type { ChatMessage, ChatMessagePart } from '@/ai/flows/chat-assistant-flow';
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


interface ChatAssistantProps {
  messages: ChatMessage[];
  isSendingMessage: boolean;
  currentStreamingMessageId: string | null;
  currentUserName?: string | null;
  userAvatarUrl: string | null;
  isWebSearchEnabled: boolean;
  onWebSearchChange: (checked: boolean) => void;
  isDeepSakaiEnabled: boolean;
  onDeepSakaiChange: (checked: boolean) => void;
}

export function ChatAssistant({
  messages,
  isSendingMessage,
  currentStreamingMessageId,
  currentUserName,
  userAvatarUrl,
}: ChatAssistantProps) {
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, []);

  useEffect(scrollToBottom, [messages, isSendingMessage, scrollToBottom]);

  const handleCopyCode = (codeToCopy: string, partId: string) => {
    navigator.clipboard.writeText(codeToCopy).then(() => {
      setCopiedStates(prev => ({ ...prev, [partId]: true }));
      setTimeout(() => { setCopiedStates(prev => ({ ...prev, [partId]: false })); }, 2000);
      toast({ title: "Copié!", description: "Le code a été copié." });
    }).catch(err => {
      console.error('SACAI_CLIENT: Failed to copy code: ', err);
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
    toast({ title: "Téléchargement", description: "L'image est en cours." });
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
      console.error("SACAI_CLIENT: Error downloading generated file:", error);
      toast({ title: "Erreur de téléchargement", variant: "destructive" });
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
        if (match.index > lastIndex) parts.push(remainingText.substring(lastIndex, match.index));
        if (match[2]) parts.push(<strong key={`${baseKey}-bi-${keyIdx++}`}><em>{match[2]}</em></strong>);
        else if (match[4]) parts.push(<strong key={`${baseKey}-strong-${keyIdx++}`}>{match[4]}</strong>);
        else if (match[6]) parts.push(<em key={`${baseKey}-em-${keyIdx++}`}>{match[6]}</em>);
        else if (match[8]) parts.push(<code key={`${baseKey}-code-${keyIdx++}`} className="px-1 py-0.5 bg-muted text-muted-foreground rounded-sm text-xs font-mono">{match[8]}</code>);
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < remainingText.length) parts.push(remainingText.substring(lastIndex));
    return <>{parts.filter(part => typeof part === 'string' ? part.length > 0 : true)}</>;
  };
  
  const parseAndStyleText = (text: string, uniqueKeyPrefix: string) => {
    const elements: JSX.Element[] = [];
    const mainRegex = /(```(?:(\w+)\n)?([\s\S]*?)```|---BEGIN_FILE:\s*([^ \n\r]+)\s*---([\s\S]*?)---END_FILE---)/gs;
    let lastIndex = 0;
    let match;
    let blockKeyIndex = 0;

    const parseNonCodeBlock = (blockText: string) => {
      const segmentLines = blockText.split('\n');
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
            if (lineIdx > 0 && segmentLines[lineIdx-1]?.trim() !== '' && elements.length > 0 && (elements[elements.length-1].type === 'p' || elements[elements.length-1].type === 'h1' || elements[elements.length-1].type === 'h2' || elements[elements.length-1].type === 'h3')) {
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
    
    while ((match = mainRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parseNonCodeBlock(text.substring(lastIndex, match.index));
      }
      if (match[1].startsWith('```')) { 
        const lang = match[2]?.toLowerCase() || 'plaintext';
        const code = match[3].trimEnd(); 
        const codeBlockId = `${uniqueKeyPrefix}-code-${blockKeyIndex}`;
        elements.push(
          <div key={codeBlockId} className="relative group bg-muted dark:bg-black/40 my-2.5 rounded-md shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-border/50">
              <span className="text-xs text-muted-foreground font-mono">{lang || 'code'}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-50 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground" onClick={() => handleCopyCode(code, codeBlockId)} aria-label="Copier le code">
                {copiedStates[codeBlockId] ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <SyntaxHighlighter language={lang || 'plaintext'} style={vscDarkPlus} showLineNumbers wrapLines={true} lineNumberStyle={{minWidth: '2.25em', paddingRight: '0.5em', opacity: 0.6, userSelect: 'none'}} lineProps={{ style: { wordBreak: 'break-all', whiteSpace: 'pre-wrap', display: 'block' } }} className="!py-3 !px-0 !text-sm !bg-transparent !font-mono" codeTagProps={{style: {fontFamily: 'var(--font-geist-mono), Menlo, Monaco, Consolas, "Courier New", monospace'}}}>
              {code}
            </SyntaxHighlighter>
          </div>
        );
      } else { 
        const fileName = match[4].trim();
        const fileContent = match[5].trim();
        const fileKey = `${uniqueKeyPrefix}-file-${blockKeyIndex}`;
        let mimeType = 'text/plain';
        if (fileName.endsWith('.md')) mimeType = 'text/markdown';
        else if (fileName.endsWith('.txt')) mimeType = 'text/plain';
        elements.push(
            <div key={fileKey} className="my-2"><Button variant="outline" size="sm" onClick={() => handleDownloadGeneratedFile(fileName, fileContent, mimeType)} className="text-sm"><Download className="mr-2 h-4 w-4" /> Télécharger {fileName}</Button></div>
        );
      }
      lastIndex = match.index + match[0].length;
      blockKeyIndex++; 
    }
    if (lastIndex < text.length) {
      parseNonCodeBlock(text.substring(lastIndex));
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
            {isLastMessageOfList && message.role === 'model' && isSendingMessage && message.id === currentStreamingMessageId && (
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
            <NextImage src={part.imageDataUri} alt={message.role === 'user' ? "Fichier de l'utilisateur" : "Média généré"} width={isUserMessage ? 300 : 350} height={isUserMessage ? 300 : 350} className="rounded-lg object-contain max-w-full h-auto border border-border/50 cursor-pointer hover:opacity-80 transition-opacity aspect-square" onClick={() => handlePreviewImage(part.imageDataUri as string)} data-ai-hint={isUserMessage ? "user uploaded media" : "generated media"} />
             {message.role === 'model' && (<Button variant="outline" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-background/70 hover:bg-background" onClick={(e) => { e.stopPropagation(); handleDownloadImage(part.imageDataUri as string); }} aria-label="Télécharger l'image"><Download className="h-4 w-4" /></Button>)}
          </div>
        );
      } else { 
        const fileNameFromPart = part.imageDataUri.startsWith('data:') ? (part.mimeType || 'fichier') : part.imageDataUri.substring(0,30) + "..."; 
        return (
          <div key={uniquePartKey} className="my-2 p-3 border border-dashed rounded-md bg-muted/30 flex items-center gap-2 text-sm text-muted-foreground max-w-[250px] md:max-w-[300px]">
            <FileText className="h-6 w-6 text-primary shrink-0" />
            <div className="truncate"><p className="font-medium truncate" title={fileNameFromPart}>{fileNameFromPart}</p><p className="text-xs">{part.mimeType || 'Fichier'}</p></div>
          </div>
        );
      }
    }
    return null;
  };

  return (
    <>
      <ScrollArea 
        ref={scrollAreaRef} 
        className="flex-1 w-full"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto"> 
          {messages.length === 0 && !isSendingMessage && (
             <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-6 mt-16">
              <SakaiLogo className="h-20 w-20 sm:h-24 sm:w-24 text-primary opacity-80 mb-4" data-ai-hint="logo large"/>
              <p className="text-xl 2xl:text-2xl font-medium text-foreground">
                Comment puis-je vous aider aujourd'hui, {currentUserName || "l'ami"} ?
              </p>
              <p className="text-sm 2xl:text-base max-w-md text-muted-foreground">
                Posez-moi une question, téléversez des fichiers pour analyse, ou demandez-moi de générer une image.
              </p>
            </div>
          )}
          {messages.map((msg, msgIndex) => {
            const isUser = msg.role === 'user';
            const isLastMessageOfList = msgIndex === messages.length - 1;
            const isLoadingPlaceholder = isSendingMessage && msg.role === 'model' && msg.id === currentStreamingMessageId && msg.parts.length === 1 && msg.parts[0].type === 'text' && msg.parts[0].text === '';
            const isImageGenPlaceholder = isSendingMessage && msg.role === 'model' && msg.parts.length === 1 && msg.parts[0].type === 'text' && msg.parts[0].text.startsWith('Sakai génère une image');

            return (
              <div key={msg.id || `msg-${msgIndex}-${Date.now()}-${Math.random()}`} className={cn("flex items-end gap-3 break-words w-full", isUser ? 'justify-end' : 'justify-start')}>
                <div className={cn("flex items-end gap-3", isUser ? 'flex-row-reverse' : 'flex-row', isUser ? 'max-w-[85%] 2xl:max-w-[80%]' : 'max-w-[90%] 2xl:max-w-[85%]')}>
                  {!isUser ? (
                     <SakaiLogo className="h-7 w-7 shrink-0 text-primary mb-1.5 rounded-full bg-primary/10 p-0.5 self-start" />
                  ) : (
                    userAvatarUrl ? (
                        <NextImage src={userAvatarUrl} alt="User Avatar" width={28} height={28} className="h-7 w-7 shrink-0 rounded-full object-cover aspect-square mb-1.5 self-start" data-ai-hint="user avatar small"/>
                    ) : (
                        <User className="h-7 w-7 shrink-0 text-muted-foreground/80 mb-1.5 rounded-full bg-muted p-1 self-start" />
                    )
                  )}
                  <div className={cn(
                     "p-3.5 rounded-xl shadow-md transition-all duration-200 ease-out hover:shadow-lg w-fit", 
                     isUser ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-card border text-card-foreground rounded-bl-none',
                     (msg.parts.some(p => p.type === 'image' && p.mimeType?.startsWith('image/')) && !isLoadingPlaceholder && !isImageGenPlaceholder) && "p-1.5 bg-transparent shadow-none border-none dark:bg-transparent"
                  )}>
                    {isLoadingPlaceholder || isImageGenPlaceholder ? (
                      <div className="flex items-center gap-2 p-2">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">{isImageGenPlaceholder ? "Génération d'image..." : "Sakai réfléchit..."}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">{msg.parts.map((part, index) => renderMessagePart(part, index, msg, isLastMessageOfList))}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {isImagePreviewOpen && imagePreviewUrl && (
        <Dialog open={isImagePreviewOpen} onOpenChange={setIsImagePreviewOpen}>
          <DialogContent className="max-w-3xl p-2 bg-card">
            <NextImage src={imagePreviewUrl} alt="Aperçu de l'image" width={800} height={600} className="rounded-md object-contain max-h-[80vh] w-full h-auto" data-ai-hint="image full preview"/>
            <DialogFooter className="mt-2 sm:justify-center">
                <Button variant="outline" onClick={() => { if(imagePreviewUrl) handleDownloadImage(imagePreviewUrl); setIsImagePreviewOpen(false);}}><Download className="mr-2 h-4 w-4" /> Télécharger</Button>
              <DialogClose asChild><Button type="button">Fermer</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    )}
  </>
  );
}
