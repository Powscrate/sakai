
// src/app/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import NextImage from 'next/image';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ChatAssistant } from '@/components/chat/chat-assistant';
import { MemoryDialog } from '@/components/chat/memory-dialog';
import { 
  streamChatAssistant, 
  type ChatMessage, 
  type ChatMessagePart, 
  type ChatStreamChunk 
} from '@/ai/flows/chat-assistant-flow';
import { generateImage, type GenerateImageOutput } from '@/ai/flows/generate-image-flow';
import { generateChatTitle, type GenerateChatTitleOutput } from '@/ai/flows/generate-chat-title-flow';
import { generateSakaiThought, type GenerateSakaiThoughtOutput } from '@/ai/flows/generate-sakai-thought-flow';
import * as dbManager from '@/lib/indexeddb'; // Import IndexedDB manager
import {
  Loader2, Settings, Brain, Info, Contact, Zap, MessageSquare, Brush, Wand2,
  SlidersHorizontal, User as UserIconImport, Edit3, MoreVertical, LogOut as LogOutIcon, PanelLeftClose, PanelRightClose,
  Mail, Plane, Lightbulb, Languages, ImageIcon as ImageIconLucide, Laugh, Sparkles, Globe, Bot as DeepSakaiIcon,
  Send, Paperclip, XCircle, FileText, Trash2, Download as DownloadIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase'; // db from firebase is no longer used for app data
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { SakaiLogo } from '@/components/icons/logo';
import { ThemeToggleButton } from '@/components/chat/theme-toggle-button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';


export const aiPersonalities = ["Sakai (par défaut)", "Développeur Pro", "Coach Bienveillant", "Humoriste Décalé"] as const;
export type AIPersonality = (typeof aiPersonalities)[number];

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number; 
  userId: string; 
  messages: ChatMessage[];
}

interface UploadedFileWrapper {
  dataUri: string;
  file: File;
  id: string;
}

// IndexedDB User Setting Keys
const getActiveChatIdKeyForDB = (userId: string) => `activeChatId_${userId}`;
const getUserAvatarKeyForDB = (userId: string) => `userAvatarUrl_${userId}`;
const getUserMemoryKeyForDB = (userId: string) => `userMemory_${userId}`;
const getDevOverrideSystemPromptKeyForDB = (userId: string) => `devOverrideSystemPrompt_${userId}`;
const getDevModelTemperatureKeyForDB = (userId: string) => `devModelTemperature_${userId}`;
const getSidebarCollapsedKeyForDB = (userId: string) => `sidebarCollapsed_${userId}`;
const getDevSakaiAmbianceEnabledKeyForDB = (userId: string) => `devSakaiAmbianceEnabled_${userId}`;
const getAiPersonalityKeyForDB = (userId: string) => `aiPersonality_${userId}`;
const getWebSearchEnabledKeyForDB = (userId: string) => `webSearchEnabled_${userId}`;
const getDeepSakaiEnabledKeyForDB = (userId: string) => `deepSakaiEnabled_${userId}`;


const DEV_ACCESS_CODE = "1234566";
const INPUT_BAR_ESTIMATED_MAX_HEIGHT = '13rem'; 

export default function ChatPage() {
  const [pageIsMounted, setPageIsMounted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // States previously managed by useLocalStorage, now useState + IndexedDB
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatIdState] = useState<string | null>(null);
  const [userAvatarUrl, setUserAvatarUrlState] = useState<string>('');
  const [userMemory, setUserMemoryState] = useState<string>('');
  
  const [devOverrideSystemPrompt, setDevOverrideSystemPromptState] = useState<string>('');
  const [devModelTemperature, setDevModelTemperatureState] = useState<number | undefined>(undefined);
  const [isDevSakaiAmbianceEnabled, setIsDevSakaiAmbianceEnabledState] = useState<boolean>(false);
  
  const [isWebSearchEnabled, setIsWebSearchEnabledState] = useState<boolean>(false);
  const [isDeepSakaiEnabled, setIsDeepSakaiEnabledState] = useState<boolean>(false);

  const [isSidebarCollapsed, setIsSidebarCollapsedState] = useState<boolean>(false);
  const [aiPersonality, setAiPersonalityState] = useState<AIPersonality>("Sakai (par défaut)");

  const [sakaiCurrentThought, setSakaiCurrentThought] = useState<string | null>(null);
  const thoughtIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isMemoryDialogOpen, setIsMemoryDialogOpen] = useState(false);
  const [isFeaturesDialogOpen, setIsFeaturesDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isDevCodePromptOpen, setIsDevCodePromptOpen] = useState(false);
  const [devCodeInput, setDevCodeInput] = useState('');
  const [isDevSettingsOpen, setIsDevSettingsOpen] = useState(false);
  
  const [tempOverrideSystemPrompt, setTempOverrideSystemPrompt] = useState('');
  const [tempModelTemperature, setTempModelTemperature] = useState(0.7);
  const [tempIsDevSakaiAmbianceEnabled, setTempIsDevSakaiAmbianceEnabled] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);

  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatTitle, setEditingChatTitle] = useState('');

  const [input, setInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileWrapper[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFeaturesPopoverOpen, setIsFeaturesPopoverOpen] = useState(false);

  const featureActions = [
    { id: 'generate-image', label: "Générer une image", icon: ImageIconLucide, promptPrefix: "Génère une image de " },
    { id: 'tell-joke', label: "Raconter une blague", icon: Laugh, promptPrefix: "Raconte-moi une blague." },
    { id: 'draft-pitch', label: "Rédiger un pitch", icon: Lightbulb, promptPrefix: "Aide-moi à rédiger un pitch pour " },
    { id: 'translate-text', label: "Traduire un texte", icon: Languages, promptPrefix: "Traduis ce texte en français : " },
  ];


  useEffect(() => setPageIsMounted(true), []);

  // Auth state change
  useEffect(() => {
    if (!pageIsMounted) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        setIsDataLoaded(false); // Reset data loaded flag
        setChatSessions([]); // Clear local state
        setActiveChatIdState(null);
        // Clear other states...
        router.push('/auth/login');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [pageIsMounted, router]);

  // Initial data loading from IndexedDB
  useEffect(() => {
    if (!pageIsMounted || !currentUser || authLoading || isDataLoaded) return;

    const loadData = async () => {
      console.log("Attempting to load data from IndexedDB for user:", currentUser.uid);
      try {
        const [
          loadedSessions, loadedActiveChatId, loadedUserAvatarUrl, loadedUserMemory,
          loadedDevOverride, loadedDevTemp, loadedDevAmbiance,
          loadedWebSearch, loadedDeepSakai, loadedSidebarCollapsed, loadedPersonality,
        ] = await Promise.all([
          dbManager.getAllChatSessions(currentUser.uid),
          dbManager.getSetting<string | null>(getActiveChatIdKeyForDB(currentUser.uid), null),
          dbManager.getSetting<string>(getUserAvatarKeyForDB(currentUser.uid), ''),
          dbManager.getSetting<string>(getUserMemoryKeyForDB(currentUser.uid), ''),
          dbManager.getSetting<string>(getDevOverrideSystemPromptKeyForDB(currentUser.uid), ''),
          dbManager.getSetting<number | undefined>(getDevModelTemperatureKeyForDB(currentUser.uid), undefined),
          dbManager.getSetting<boolean>(getDevSakaiAmbianceEnabledKeyForDB(currentUser.uid), false),
          dbManager.getSetting<boolean>(getWebSearchEnabledKeyForDB(currentUser.uid), false),
          dbManager.getSetting<boolean>(getDeepSakaiEnabledKeyForDB(currentUser.uid), false),
          dbManager.getSetting<boolean>(getSidebarCollapsedKeyForDB(currentUser.uid), false),
          dbManager.getSetting<AIPersonality>(getAiPersonalityKeyForDB(currentUser.uid), "Sakai (par défaut)"),
        ]);

        setChatSessions(loadedSessions);
        setActiveChatIdState(loadedActiveChatId);
        setUserAvatarUrlState(loadedUserAvatarUrl);
        setUserMemoryState(loadedUserMemory);
        setDevOverrideSystemPromptState(loadedDevOverride);
        setDevModelTemperatureState(loadedDevTemp);
        setIsDevSakaiAmbianceEnabledState(loadedDevAmbiance);
        setIsWebSearchEnabledState(loadedWebSearch);
        setIsDeepSakaiEnabledState(loadedDeepSakai);
        setIsSidebarCollapsedState(loadedSidebarCollapsed);
        setAiPersonalityState(loadedPersonality);

        setTempOverrideSystemPrompt(loadedDevOverride);
        setTempModelTemperature(loadedDevTemp ?? 0.7);
        setTempIsDevSakaiAmbianceEnabled(loadedDevAmbiance);


        if (loadedSessions.length === 0) {
          await handleNewChat(true); // Pass true to indicate it's an initial new chat
        } else if (!loadedActiveChatId || !loadedSessions.find(s => s.id === loadedActiveChatId)) {
          const newActiveId = loadedSessions[0]?.id || null; // Already sorted by getAllChatSessions
          setActiveChatIdState(newActiveId);
          if (newActiveId) {
            await dbManager.saveSetting(getActiveChatIdKeyForDB(currentUser.uid), newActiveId);
          }
        }
        setIsDataLoaded(true);
        console.log("Data loaded successfully from IndexedDB.");
      } catch (error) {
        console.error("Error loading data from IndexedDB:", error);
        toast({ title: "Erreur de chargement des données", description: "Certaines données locales n'ont pas pu être chargées. Certaines fonctionnalités peuvent être affectées.", variant: "destructive" });
        setIsDataLoaded(true); // Still mark as loaded to unblock UI, app will use defaults
      }
    };
    if (currentUser && !isDataLoaded) {
       loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIsMounted, currentUser, authLoading, isDataLoaded, toast]); // handleNewChat is memoized


  // Wrapped state setters for IndexedDB persistence
  const setActiveChatId = useCallback(async (id: string | null) => {
    setActiveChatIdState(id);
    if (currentUser && isDataLoaded) {
      await dbManager.saveSetting(getActiveChatIdKeyForDB(currentUser.uid), id);
    }
  }, [currentUser, isDataLoaded]);

  const setUserMemory = useCallback(async (memory: string) => {
    setUserMemoryState(memory);
    if (currentUser && isDataLoaded) {
      await dbManager.saveSetting(getUserMemoryKeyForDB(currentUser.uid), memory);
    }
  }, [currentUser, isDataLoaded]);

  const setDevOverrideSystemPrompt = useCallback(async (prompt: string) => {
    setDevOverrideSystemPromptState(prompt);
    if (currentUser && isDataLoaded) {
      await dbManager.saveSetting(getDevOverrideSystemPromptKeyForDB(currentUser.uid), prompt);
    }
  }, [currentUser, isDataLoaded]);
  
  const setDevModelTemperature = useCallback(async (temp: number | undefined) => {
    setDevModelTemperatureState(temp);
    if (currentUser && isDataLoaded) {
      await dbManager.saveSetting(getDevModelTemperatureKeyForDB(currentUser.uid), temp);
    }
  }, [currentUser, isDataLoaded]);

  const setIsDevSakaiAmbianceEnabled = useCallback(async (enabled: boolean) => {
    setIsDevSakaiAmbianceEnabledState(enabled);
    if (currentUser && isDataLoaded) {
      await dbManager.saveSetting(getDevSakaiAmbianceEnabledKeyForDB(currentUser.uid), enabled);
    }
  }, [currentUser, isDataLoaded]);

  const setIsWebSearchEnabled = useCallback(async (enabled: boolean) => {
    setIsWebSearchEnabledState(enabled);
    if (currentUser && isDataLoaded) {
      await dbManager.saveSetting(getWebSearchEnabledKeyForDB(currentUser.uid), enabled);
    }
  }, [currentUser, isDataLoaded]);

  const setIsDeepSakaiEnabled = useCallback(async (enabled: boolean) => {
    setIsDeepSakaiEnabledState(enabled);
    if (currentUser && isDataLoaded) {
      await dbManager.saveSetting(getDeepSakaiEnabledKeyForDB(currentUser.uid), enabled);
    }
  }, [currentUser, isDataLoaded]);
  
  const setIsSidebarCollapsed = useCallback(async (collapsed: boolean | ((prevState: boolean) => boolean)) => {
    const newCollapsedState = typeof collapsed === 'function' ? collapsed(isSidebarCollapsed) : collapsed;
    setIsSidebarCollapsedState(newCollapsedState);
    if (currentUser && isDataLoaded) {
      await dbManager.saveSetting(getSidebarCollapsedKeyForDB(currentUser.uid), newCollapsedState);
    }
  }, [currentUser, isDataLoaded, isSidebarCollapsed]);

  const setAiPersonality = useCallback(async (personality: AIPersonality) => {
    setAiPersonalityState(personality);
    if (currentUser && isDataLoaded) {
      await dbManager.saveSetting(getAiPersonalityKeyForDB(currentUser.uid), personality);
    }
  }, [currentUser, isDataLoaded]);


  const fetchSakaiThought = useCallback(async () => {
    if (!isDevSakaiAmbianceEnabled || !pageIsMounted || !currentUser) return;
    try {
      const result: GenerateSakaiThoughtOutput = await generateSakaiThought();
      if (result.thought) setSakaiCurrentThought(result.thought);
      if (result.error) console.warn("Error fetching Sakai's thought:", result.error);
    } catch (error) {
      console.error("Error fetching Sakai's thought:", error);
      setSakaiCurrentThought(null);
    }
  }, [isDevSakaiAmbianceEnabled, pageIsMounted, currentUser]);

  useEffect(() => {
    if (isDevSakaiAmbianceEnabled && pageIsMounted && currentUser && isDataLoaded) {
      fetchSakaiThought();
      if (thoughtIntervalRef.current) clearInterval(thoughtIntervalRef.current);
      thoughtIntervalRef.current = setInterval(fetchSakaiThought, 60000);
    } else {
      if (thoughtIntervalRef.current) clearInterval(thoughtIntervalRef.current);
      setSakaiCurrentThought(null);
    }
    return () => {
      if (thoughtIntervalRef.current) clearInterval(thoughtIntervalRef.current);
    };
  }, [isDevSakaiAmbianceEnabled, fetchSakaiThought, pageIsMounted, currentUser, isDataLoaded]);

  const handleNewChat = useCallback(async (isInitial: boolean = false) => {
    if (!currentUser) return;
    const newChatId = `chat-${Date.now()}`;
    const newChatSession: ChatSession = {
      id: newChatId,
      title: "Nouveau Chat",
      createdAt: Date.now(),
      userId: currentUser.uid,
      messages: [],
    };
    setChatSessions(prevSessions => [newChatSession, ...prevSessions].sort((a, b) => b.createdAt - a.createdAt));
    setActiveChatId(newChatId); // This now calls the wrapped version that saves to DB
    
    await dbManager.addOrUpdateChatSession(newChatSession);
    // setActiveChatId above already saves the new active ID

    setInput('');
    setUploadedFiles([]);
    if (!isInitial && isMobileMenuOpen) setIsMobileMenuOpen(false);
  }, [currentUser, setActiveChatId, isMobileMenuOpen]);


  const updateMessagesForActiveChat = useCallback(async (updatedMessages: ChatMessage[], newActiveChatIdToUpdate?: string) => {
    const targetChatId = newActiveChatIdToUpdate || activeChatId;
    if (!currentUser || !targetChatId) return;

    let sessionToUpdate: ChatSession | undefined;
    setChatSessions(prevSessions => {
      const newSessions = prevSessions.map(session => {
        if (session.id === targetChatId) {
          sessionToUpdate = { ...session, messages: updatedMessages };
          return sessionToUpdate;
        }
        return session;
      });
      return newSessions; // Already sorted by initial load or new chat logic
    });

    if (sessionToUpdate) {
      await dbManager.addOrUpdateChatSession(sessionToUpdate);
    }
  }, [currentUser, activeChatId]);

  // Generate Chat Title
  useEffect(() => {
    if (!currentUser || !activeChatId || isGeneratingTitle || !pageIsMounted || isSendingMessage || !isDataLoaded) return;

    const currentChatIdForTitleGen = activeChatId; 
    const activeSession = chatSessions.find(s => s.id === currentChatIdForTitleGen);
    
    if (activeSession && (activeSession.title === "Nouveau Chat" || activeSession.title === "Nouvelle Discussion") && activeSession.messages.length > 0) {
      const contextMessages = activeSession.messages
        .slice(0, 2) 
        .map(msg => ({
          role: msg.role,
          parts: msg.parts.filter(part => part.type === 'text').map(part => ({ type: 'text' as 'text', text: part.text }))
        }))
        .filter(msg => msg.parts.length > 0);

      if (contextMessages.length > 0) {
        setIsGeneratingTitle(true);
        generateChatTitle({ messages: contextMessages })
          .then(async titleOutput => {
            if (titleOutput.title && !titleOutput.error) {
              let sessionToUpdate: ChatSession | undefined;
              setChatSessions(prevSessions =>
                prevSessions.map(s => {
                  if (s.id === currentChatIdForTitleGen) {
                    sessionToUpdate = { ...s, title: titleOutput.title };
                    return sessionToUpdate;
                  }
                  return s;
                })
              );
              if (sessionToUpdate) {
                await dbManager.addOrUpdateChatSession(sessionToUpdate);
              }
            } else if (titleOutput.error) console.warn("SACAI_CLIENT: Error generating chat title:", titleOutput.error);
          })
          .catch(err => console.error("SACAI_CLIENT: Error in generateChatTitle API call:", err))
          .finally(() => setIsGeneratingTitle(false));
      }
    }
  }, [chatSessions, activeChatId, currentUser, isGeneratingTitle, pageIsMounted, isSendingMessage, isDataLoaded]);


  const handleRenameChat = async (chatId: string, newTitle: string) => {
    if (!currentUser || !newTitle.trim()) return;
    let sessionToUpdate: ChatSession | undefined;
    setChatSessions(prevSessions =>
      prevSessions.map(session => {
        if (session.id === chatId) {
          sessionToUpdate = { ...session, title: newTitle.trim() };
          return sessionToUpdate;
        }
        return session;
      })
    );
    if (sessionToUpdate) {
      await dbManager.addOrUpdateChatSession(sessionToUpdate);
    }
    setEditingChatId(null);
    toast({ title: "Chat renommé", description: `Le chat a été renommé en "${newTitle.trim()}".` });
  };

  const startEditingChatTitle = (chat: ChatSession) => {
    setEditingChatId(chat.id);
    setEditingChatTitle(chat.title);
  };

  const handleDeleteChat = async (idToDelete: string) => {
    if (!currentUser) return;
    
    await dbManager.deleteChatSession(idToDelete);
    const prevActiveId = activeChatId;

    setChatSessions(prevSessions => {
      const updatedSessions = prevSessions.filter(s => s.id !== idToDelete);
      if (prevActiveId === idToDelete) {
        if (updatedSessions.length > 0) {
          // setActiveChatId will persist the new active ID
          setActiveChatId([...updatedSessions].sort((a, b) => b.createdAt - a.createdAt)[0].id);
        } else {
          setActiveChatId(null);
        }
      }
      return updatedSessions;
    });
    toast({ title: "Chat supprimé", description: "La session de chat a été supprimée." });
  };

  const handleLogout = async () => {
    try {
      const uid = currentUser?.uid;
      await signOut(auth);
      if (uid) {
        await dbManager.deleteAllChatSessionsForUser(uid);
        await dbManager.deleteAllUserSettingsForUser(uid); // This deletes keys ending with _UID
      }
      // States are reset by onAuthStateChanged
      toast({ title: "Déconnexion", description: "Vous avez été déconnecté." });
    } catch (error) {
      console.error("Logout error:", error);
      toast({ title: "Erreur de déconnexion", variant: "destructive" });
    }
  };

  const handleSaveMemory = (newMemory: string) => {
    setUserMemory(newMemory); // Wrapped setter, saves to DB
    toast({ title: "Mémoire sauvegardée", description: "Sakai utilisera ces informations." });
  };

  const handleDevCodeCheck = () => {
    if (devCodeInput === DEV_ACCESS_CODE) {
      setIsDevCodePromptOpen(false); setDevCodeInput(''); 
      if (pageIsMounted && currentUser) { // Values already loaded into state
        setTempOverrideSystemPrompt(devOverrideSystemPrompt);
        setTempModelTemperature(devModelTemperature ?? 0.7);
        setTempIsDevSakaiAmbianceEnabled(isDevSakaiAmbianceEnabled);
      }
      setIsDevSettingsOpen(true);
      toast({ title: "Accès Développeur Accordé" });
    } else {
      toast({ title: "Code d'accès incorrect", variant: "destructive" });
      setDevCodeInput('');
    }
  };

  const handleSaveDevSettings = () => {
    // Use wrapped setters to persist to DB
    setDevOverrideSystemPrompt(tempOverrideSystemPrompt);
    setDevModelTemperature(tempModelTemperature);
    setIsDevSakaiAmbianceEnabled(tempIsDevSakaiAmbianceEnabled);
    setIsDevSettingsOpen(false);
    toast({ title: "Paramètres développeur sauvegardés" });
  };

  const handleResetDevSettings = () => {
    setTempOverrideSystemPrompt(''); setTempModelTemperature(0.7); setTempIsDevSakaiAmbianceEnabled(false);
    // Use wrapped setters to persist to DB
    setDevOverrideSystemPrompt(''); setDevModelTemperature(undefined); setIsDevSakaiAmbianceEnabled(false);
    toast({ title: "Paramètres développeur réinitialisés" });
  };

  const toggleSidebarCollapse = () => setIsSidebarCollapsed(prev => !prev); // Wrapped setter

  const activeChat = chatSessions.find(session => session.id === activeChatId);
  
  const sortedChatSessions = useMemo(() => {
    // chatSessions are already sorted by getAllChatSessions or handleNewChat
    return chatSessions;
  }, [chatSessions]);


  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'text/markdown'];
      Array.from(files).forEach(file => {
        const uniqueId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${encodeURIComponent(file.name)}`;
        let effectiveMimeType = file.type;
        if (!effectiveMimeType || effectiveMimeType === "application/octet-stream" || effectiveMimeType === "") {
          const lowerName = file.name.toLowerCase();
          if (lowerName.endsWith('.md')) effectiveMimeType = 'text/markdown'; else if (lowerName.endsWith('.txt')) effectiveMimeType = 'text/plain'; else if (lowerName.endsWith('.pdf')) effectiveMimeType = 'application/pdf'; else if (lowerName.endsWith('.png')) effectiveMimeType = 'image/png'; else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) effectiveMimeType = 'image/jpeg'; else if (lowerName.endsWith('.webp')) effectiveMimeType = 'image/webp'; else if (lowerName.endsWith('.gif')) effectiveMimeType = 'image/gif'; else effectiveMimeType = 'application/octet-stream';
        }
        const isAllowed = allowedMimeTypes.some(allowedType => effectiveMimeType === allowedType || (allowedType.endsWith('/*') && effectiveMimeType.startsWith(allowedType.slice(0, -2))));
        if (isAllowed) {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result) setUploadedFiles(prev => [...prev, { dataUri: reader.result as string, file: new File([file], file.name, { type: effectiveMimeType }), id: uniqueId }]);
            else toast({ title: "Erreur de lecture", variant: "destructive" });
          };
          reader.onerror = () => toast({ title: "Erreur de lecture", variant: "destructive" });
          reader.readAsDataURL(file);
        } else toast({ title: "Type de fichier non supporté", description: `"${file.name}" (${effectiveMimeType})`, variant: "destructive" });
      });
    }
    if (event.target) event.target.value = '';
  };
  const removeUploadedFile = (fileIdToRemove: string) => setUploadedFiles(prev => prev.filter(fileWrapper => fileWrapper.id !== fileIdToRemove));
  const clearAllUploadedFiles = () => { setUploadedFiles([]); if (fileInputRef.current) fileInputRef.current.value = ''; };
  const handleFeatureActionClick = (promptPrefix: string) => { setInput(prevInput => promptPrefix + prevInput); setIsFeaturesPopoverOpen(false); if(inputRef.current) inputRef.current.focus(); };

  const handleImageGeneration = async (promptText: string) => {
    if (!activeChatId) {
      toast({ title: "Aucun chat actif", description: "Veuillez sélectionner ou créer un chat.", variant: "destructive" });
      return;
    }
    setIsSendingMessage(true); setCurrentStreamingMessageId(null);
    const imageGenUserMessageId = `user-img-prompt-${Date.now()}`;
    const imageGenPlaceholderId = `img-gen-${Date.now()}`;
    const coreImagePrompt = promptText;
    const userPromptMessage: ChatMessage = { role: 'user', parts: [{ type: 'text', text: `Génère une image : ${coreImagePrompt}` }], id: imageGenUserMessageId, createdAt: Date.now() };
    const assistantPlaceholderMessage: ChatMessage = { role: 'model', parts: [{ type: 'text', text: `Sakai génère une image pour : "${coreImagePrompt.substring(0, 50)}..."` }], id: imageGenPlaceholderId, createdAt: Date.now() + 1 };
    
    const currentMessages = chatSessions.find(s => s.id === activeChatId)?.messages || [];
    let finalUserAndAssistantMessages = [...currentMessages, userPromptMessage, assistantPlaceholderMessage];
    await updateMessagesForActiveChat(finalUserAndAssistantMessages); // Persists to DB
    
    let finalAssistantMessage: ChatMessage | null = null;
    try {
      const result: GenerateImageOutput = await generateImage({ prompt: coreImagePrompt });
      if (result.imageUrl) finalAssistantMessage = { role: 'model' as 'model', parts: [{ type: 'image' as 'image', imageDataUri: result.imageUrl, mimeType: 'image/png' }], id: imageGenPlaceholderId, createdAt: Date.now() };
      else finalAssistantMessage = { role: 'model' as 'model', parts: [{ type: 'text' as 'text', text: `Désolé, je n'ai pas pu générer l'image. ${result.error || "Erreur inconnue."}` }], id: imageGenPlaceholderId, createdAt: Date.now() };
    } catch (error: unknown) {
      finalAssistantMessage = { role: 'model' as 'model', parts: [{ type: 'text' as 'text', text: `Erreur : ${(error as Error)?.message || "Erreur inconnue."}` }], id: imageGenPlaceholderId, createdAt: Date.now() };
    } finally {
      if (finalAssistantMessage) {
        await updateMessagesForActiveChat(finalUserAndAssistantMessages.map(msg => msg.id === imageGenPlaceholderId ? finalAssistantMessage! : msg));
      }
      setIsSendingMessage(false);
    }
  };

  const handleSendMessage = async (e?: FormEvent<HTMLFormElement> | string) => {
    if (typeof e === 'object' && e?.preventDefault) e.preventDefault();
    const currentInputVal = (typeof e === 'string' ? e : input).trim();
    const currentUploadedFiles = [...uploadedFiles];
    if ((!currentInputVal && currentUploadedFiles.length === 0) || isSendingMessage) return;

    if (!activeChatId) {
      toast({ title: "Aucun chat actif", description: "Veuillez sélectionner ou créer un chat.", variant: "destructive" });
      return;
    }

    setIsSendingMessage(true);

    const imageKeywords = ["génère une image de", "dessine-moi", "crée une image de", "photo de", "image de"];
    const lowerInput = currentInputVal.toLowerCase();
    let isImageRequestIntent = currentUploadedFiles.length === 0 && imageKeywords.some(keyword => lowerInput.startsWith(keyword));

    if (isImageRequestIntent) {
      const capturedInputForImage = currentInputVal; setInput(''); clearAllUploadedFiles();
      await handleImageGeneration(capturedInputForImage.replace(/^(génère une image de|dessine-moi|crée une image de|photo de|image de)\s*/i, '').trim());
      return; 
    }

    const userMessageId = `user-${Date.now()}`;
    const newUserMessageParts: ChatMessagePart[] = currentUploadedFiles.map(fw => ({ type: 'image', imageDataUri: fw.dataUri, mimeType: fw.file.type || 'application/octet-stream' }));
    if (currentInputVal) newUserMessageParts.push({ type: 'text', text: currentInputVal });
    if (newUserMessageParts.length === 0) {
        setIsSendingMessage(false);
        return;
    }
    
    const newUserMessage: ChatMessage = { role: 'user', parts: newUserMessageParts, id: userMessageId, createdAt: Date.now() };
    const assistantMessageId = `model-${Date.now()}`;
    setCurrentStreamingMessageId(assistantMessageId); 
    const assistantPlaceholderMessage: ChatMessage = { role: 'model', parts: [{type: 'text', text: ''}], id: assistantMessageId, createdAt: Date.now() + 1 };
    
    const initialMessagesForThisChat = chatSessions.find(s => s.id === activeChatId)?.messages || [];
    const messagesForImmediateDisplay = [...initialMessagesForThisChat, newUserMessage, assistantPlaceholderMessage];
    await updateMessagesForActiveChat(messagesForImmediateDisplay); // Persists to DB
    
    const historyForApi = [...initialMessagesForThisChat, newUserMessage];
    setInput(''); clearAllUploadedFiles();
    let accumulatedText = ""; let finalAssistantMessage: ChatMessage | null = null;

    try {
      const streamInput = {
        history: historyForApi, 
        memory: userMemory, 
        overrideSystemPrompt: devOverrideSystemPrompt,
        temperature: devModelTemperature, 
        personality: aiPersonality, 
        enableWebSearch: isWebSearchEnabled, 
        enableDeepSakai: isDeepSakaiEnabled, 
      };
      const readableStream = await streamChatAssistant(streamInput);
      const reader = readableStream.getReader();
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        const chatChunk: ChatStreamChunk = value;
        if (chatChunk.error) { accumulatedText = `Désolé, une erreur est survenue : ${chatChunk.error}`; toast({ title: "Erreur de l'assistant", description: chatChunk.error, variant: "destructive" }); break; }
        if (chatChunk.text) {
          accumulatedText += chatChunk.text;
          await updateMessagesForActiveChat(messagesForImmediateDisplay.map(msg => msg.id === assistantMessageId ? { ...msg, parts: [{type: 'text', text: accumulatedText }] } : msg));
        }
      }
      finalAssistantMessage = { role: 'model', parts: [{type: 'text' as 'text', text: accumulatedText }], id: assistantMessageId, createdAt: Date.now() };
    } catch (error: any) {
      const errorMessageText = error?.message || "Désolé, une erreur de communication est survenue.";
      toast({ title: "Erreur de Communication", description: errorMessageText, variant: "destructive" });
      finalAssistantMessage = { role: 'model', parts: [{ type: 'text', text: errorMessageText }], id: assistantMessageId, createdAt: Date.now() };
    } finally {
      let messagesForPersistence;
      if (finalAssistantMessage) messagesForPersistence = messagesForImmediateDisplay.map(msg => msg.id === assistantMessageId ? finalAssistantMessage! : msg);
      else {
        const fallbackErrorMsg = accumulatedText || "Une erreur inattendue est survenue.";
        messagesForPersistence = messagesForImmediateDisplay.map(msg => msg.id === assistantMessageId ? { role: 'model', parts: [{ type: 'text', text: fallbackErrorMsg }], id: assistantMessageId, createdAt: Date.now() } : msg);
      }
      await updateMessagesForActiveChat(messagesForPersistence); // Final update, persists to DB
      setIsSendingMessage(false); 
      setCurrentStreamingMessageId(null);
    }
  };

  const handleExportChat = () => {
    if (!activeChat) {
      toast({ title: "Aucun chat actif", description: "Impossible d'exporter.", variant: "destructive" });
      return;
    }
    // ... (rest of the export logic is fine)
    let chatContent = `Titre: ${activeChat.title}\n`;
    chatContent += `Date de création: ${new Date(activeChat.createdAt).toLocaleString('fr-FR')}\n\n`;
    chatContent += "---- MESSAGES ----\n\n";

    activeChat.messages.forEach(message => {
      const prefix = message.role === 'user' ? 'Utilisateur:' : 'Sakai:';
      chatContent += `${prefix}\n`;
      message.parts.forEach(part => {
        if (part.type === 'text') {
          chatContent += `${part.text}\n`;
        } else if (part.type === 'image' && part.imageDataUri) {
          let filename = 'media_attache';
          try {
            if (part.imageDataUri.includes('name=')) { 
                const nameMatch = part.imageDataUri.match(/name=([^;,]+)/);
                if (nameMatch && nameMatch[1]) filename = decodeURIComponent(nameMatch[1]);
            } else if (part.mimeType) {
                const extension = part.mimeType.split('/')[1] || 'bin';
                filename = `fichier_media.${extension}`;
            }
          } catch (e) { /* ignore errors in filename heuristic */ }
          chatContent += `[Fichier Média: ${filename} (${part.mimeType || 'inconnu'})]\n`;
        }
      });
      chatContent += "--------------------\n";
    });

    const blob = new Blob([chatContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = activeChat.title.replace(/[^a-z0-9_.-]/gi, '_').substring(0, 50);
    link.download = `Sakai_Chat_${safeTitle || 'export'}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: "Chat exporté", description: "La conversation a été téléchargée." });
  };


  if (!pageIsMounted || authLoading || !isDataLoaded && currentUser) {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="mt-4 text-muted-foreground">Chargement de Sakai...</p>
      </div>
    );
  }
  if (!currentUser) {
     return (
      <div className="flex flex-col h-screen bg-background text-foreground items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="mt-4 text-muted-foreground">Redirection...</p>
      </div>
    );
  }

  const moreOptionsMenuItems = [
    { label: "Profil", icon: UserIconImport, action: () => router.push('/profile') },
    { label: "Panneau de Mémoire", icon: Brain, action: () => setIsMemoryDialogOpen(true) },
    { label: "Exporter ce Chat", icon: DownloadIcon, action: handleExportChat },
    { label: "Mode Développeur", icon: SlidersHorizontal, action: () => setIsDevCodePromptOpen(true) },
    { label: "Fonctionnalités de Sakai", icon: Zap, action: () => setIsFeaturesDialogOpen(true) },
    { label: "Contacter le créateur", icon: Contact, action: () => setIsContactDialogOpen(true) },
    { label: "À propos de Sakai", icon: Info, action: () => setIsAboutDialogOpen(true) },
  ];
  
  // Conditional rendering for Sidebar pass-through props
  const sidebarProps = {
    chatSessions:sortedChatSessions, 
    activeChatId:activeChatId,
    onSelectChat: (id: string) => { setActiveChatId(id); if (isMobileMenuOpen) setIsMobileMenuOpen(false); },
    onNewChat: () => handleNewChat(false), 
    onDeleteChat:handleDeleteChat, 
    isMobileMenuOpen:isMobileMenuOpen,
    setIsMobileMenuOpen:setIsMobileMenuOpen, 
    isSidebarCollapsed:isSidebarCollapsed,
    toggleSidebarCollapse:toggleSidebarCollapse, 
    sakaiCurrentThought:sakaiCurrentThought,
    isDevSakaiAmbianceEnabled:isDevSakaiAmbianceEnabled, 
    userAvatarUrl:userAvatarUrl,
    editingChatId:editingChatId, 
    editingChatTitle:editingChatTitle,
    onStartEditingChatTitle:startEditingChatTitle, 
    onRenameChat:handleRenameChat,
    setEditingChatTitle:setEditingChatTitle, 
    setEditingChatId:setEditingChatId,
    currentPersonality:aiPersonality, 
    onPersonalityChange:setAiPersonality, // Wrapped setter
    onLogout:handleLogout, 
    onOpenMemoryDialog:() => setIsMemoryDialogOpen(true),
    onOpenDevSettingsDialog:() => setIsDevCodePromptOpen(true),
    onOpenFeaturesDialog:() => setIsFeaturesDialogOpen(true),
    onOpenAboutDialog:() => setIsAboutDialogOpen(true),
    onOpenContactDialog:() => setIsContactDialogOpen(true),
  };


  return (
    <div className="flex h-screen bg-muted/30 dark:bg-background text-foreground">
      <ChatSidebar {...sidebarProps} />

      <main className={`flex-1 flex flex-col relative overflow-hidden bg-background dark:bg-black/20 transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'md:ml-20' : 'md:ml-72'
      }`}>
        {/* Top Bar */}
        <div className={`fixed top-0 right-0 h-16 bg-card/80 backdrop-blur-md border-b border-border/70
                         flex items-center justify-between px-6 z-30 
                         ${isSidebarCollapsed ? 'left-0 md:left-20' : 'left-0 md:left-72'}
                         transition-all duration-300 ease-in-out`}>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-muted-foreground">
                 <PanelRightClose className="h-5 w-5" />
            </Button>
            <SakaiLogo className="h-7 w-7 text-primary" />
            <h1 className="text-lg font-semibold text-foreground truncate">
              {activeChat?.title || "Sakai"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {moreOptionsMenuItems.map((item) => (
                  <DropdownMenuItem key={item.label} onClick={item.action} className="cursor-pointer">
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggleButton />
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto" style={{ paddingTop: '4rem', paddingBottom: INPUT_BAR_ESTIMATED_MAX_HEIGHT }}>
            {activeChatId && activeChat ? (
            <ChatAssistant
                key={activeChatId} 
                messages={activeChat.messages}
                isSendingMessage={isSendingMessage}
                currentStreamingMessageId={currentStreamingMessageId}
                currentUserName={currentUser?.displayName}
                userAvatarUrl={userAvatarUrl}
            />
            ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4 pt-16">
                {chatSessions.length > 0 && isDataLoaded ? ( // Check isDataLoaded
                <><Loader2 className="h-10 w-10 animate-spin text-primary mb-4" /><p>Sélection d'un chat...</p></>
                ) : ( isDataLoaded && // Check isDataLoaded before showing new chat button
                <><MessageSquare className="h-12 w-12 text-primary mb-4 opacity-70" />
                    <p className="text-lg">Commencez par créer une nouvelle discussion !</p>
                    <Button onClick={() => handleNewChat(false)} className="mt-4"><Edit3 className="mr-2 h-4 w-4" /> Nouveau Chat</Button></>
                )}
                 {!isDataLoaded && !authLoading && <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" /> /* Show loader if data not yet loaded but auth is done */}
            </div>
            )}
        </div>
        
        {/* Input Bar Area */}
        {activeChatId && activeChat && (
            <div className={`fixed bottom-0 right-0 border-t border-border/70 bg-card/80 backdrop-blur-md
                            ${isSidebarCollapsed ? 'left-0 md:left-20' : 'left-0 md:left-72'}
                            transition-all duration-300 ease-in-out z-20 p-3 sm:p-4`}>
              {uploadedFiles.length > 0 && (
                <div className="mb-2.5 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground font-medium">Fichiers ({uploadedFiles.length}) :</p>
                    <Button variant="ghost" size="sm" onClick={clearAllUploadedFiles} className="text-xs text-destructive hover:text-destructive/80 h-auto py-1"><Trash2 className="h-3 w-3 mr-1" /> Tout effacer</Button>
                  </div>
                  <ScrollArea className="max-h-24"><div className="space-y-1 pr-2">
                    {uploadedFiles.map((fileWrapper) => (
                      <div key={fileWrapper.id} className="relative w-full p-1.5 border border-dashed rounded-md flex items-center justify-between bg-background/50 dark:bg-muted/30 text-xs">
                        <div className="flex items-center gap-2 overflow-hidden">
                          {fileWrapper.file.type.startsWith('image/') ? (<NextImage src={fileWrapper.dataUri} alt={`Aperçu ${fileWrapper.file.name}`} width={24} height={24} className="rounded object-cover shrink-0" data-ai-hint="image preview"/>) : (<FileText className="h-5 w-5 shrink-0 text-primary" />)}
                          <span className="text-muted-foreground truncate" title={fileWrapper.file.name}>{fileWrapper.file.name} ({(fileWrapper.file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeUploadedFile(fileWrapper.id)} className="text-destructive hover:text-destructive/80 h-6 w-6 shrink-0"><XCircle className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                  </div></ScrollArea>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2 sm:gap-2.5">
                <Popover open={isFeaturesPopoverOpen} onOpenChange={setIsFeaturesPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" type="button" aria-label="Fonctionnalités de Sakai" className="text-primary hover:text-primary/80 border-primary/30 hover:bg-primary/10 dark:hover:bg-primary/20 shrink-0 h-10 w-10 rounded-lg"><Sparkles className="h-5 w-5" /></Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2 bg-popover border shadow-xl rounded-lg mb-2" side="top" align="start">
                    <div className="flex gap-1">
                      {featureActions.map((action) => (
                        <TooltipProvider key={action.id} delayDuration={100}><Tooltip>
                          <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleFeatureActionClick(action.promptPrefix)} className="text-muted-foreground hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 h-9 w-9" aria-label={action.label}><action.icon className="h-5 w-5" /></Button></TooltipTrigger>
                          <TooltipContent side="top" className="bg-popover text-popover-foreground text-xs py-1 px-2 rounded shadow-md"><p>{action.label}</p></TooltipContent>
                        </Tooltip></TooltipProvider>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button variant="outline" size="icon" type="button" aria-label="Télécharger un fichier" onClick={() => fileInputRef.current?.click()} className="text-primary hover:text-primary/80 border-primary/30 hover:bg-primary/10 dark:hover:bg-primary/20 shrink-0 h-10 w-10 rounded-lg"><Paperclip className="h-5 w-5" /></Button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" accept="image/*,application/pdf,text/plain,.md,text/markdown"/>
                
                <TooltipProvider delayDuration={100}><Tooltip>
                  <TooltipTrigger asChild><div className="flex items-center space-x-2 p-2 rounded-md border border-input bg-transparent hover:bg-accent/50 transition-colors">
                    <Switch id="web-search-toggle" checked={isWebSearchEnabled} onCheckedChange={setIsWebSearchEnabled} className="data-[state=checked]:bg-blue-500 dark:data-[state=checked]:bg-blue-500" aria-label="Recherche web"/>
                    <Label htmlFor="web-search-toggle" className="cursor-pointer"><Globe className={cn("h-5 w-5", isWebSearchEnabled ? "text-blue-500" : "text-muted-foreground")} /></Label>
                  </div></TooltipTrigger>
                  <TooltipContent side="top" className="bg-popover text-popover-foreground text-xs py-1 px-2 rounded shadow-md"><p>Mode Web</p></TooltipContent>
                </Tooltip></TooltipProvider>

                <TooltipProvider delayDuration={100}><Tooltip>
                  <TooltipTrigger asChild><div className="flex items-center space-x-2 p-2 rounded-md border border-input bg-transparent hover:bg-accent/50 transition-colors">
                    <Switch id="deep-sakai-toggle" checked={isDeepSakaiEnabled} onCheckedChange={setIsDeepSakaiEnabled} className="data-[state=checked]:bg-purple-500 dark:data-[state=checked]:bg-purple-500" aria-label="Mode DeepSakai"/>
                    <Label htmlFor="deep-sakai-toggle" className="cursor-pointer"><DeepSakaiIcon className={cn("h-5 w-5", isDeepSakaiEnabled ? "text-purple-500" : "text-muted-foreground")} /></Label>
                  </div></TooltipTrigger>
                  <TooltipContent side="top" className="bg-popover text-popover-foreground text-xs py-1 px-2 rounded shadow-md"><p>Mode DeepSakai</p></TooltipContent>
                </Tooltip></TooltipProvider>

                <Input ref={inputRef} type="text" placeholder="Envoyer un message à Sakai..." value={input} onChange={(e) => setInput(e.target.value)} disabled={isSendingMessage} className="flex-1 py-2.5 px-3.5 text-sm rounded-lg bg-input focus-visible:ring-primary/50 h-10"/>
                <Button type="submit" size="icon" disabled={isSendingMessage || (!input.trim() && uploadedFiles.length === 0)} aria-label="Envoyer" className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 w-10 rounded-lg shrink-0">
                  {isSendingMessage && currentStreamingMessageId ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </form>
            </div>
        )}
      </main>

      <MemoryDialog isOpen={isMemoryDialogOpen} onOpenChange={setIsMemoryDialogOpen} currentMemory={userMemory} onSaveMemory={handleSaveMemory} />
      <AlertDialog open={isFeaturesDialogOpen} onOpenChange={setIsFeaturesDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary"/>Fonctionnalités de Sakai</AlertDialogTitle><AlertDialogDescription className="text-left max-h-[60vh] overflow-y-auto">Sakai est ton assistant IA personnel conçu pour t'aider dans une variété de tâches. Voici ce qu'il peut faire pour toi :<br/><br/><strong>Communication & Rédaction :</strong><br/>- Rédiger des emails, des scripts, des poèmes, des descriptions marketing, etc.<br/>- Résumer des textes longs, expliquer des concepts complexes.<br/>- Traduire des textes entre plusieurs langues (principalement vers et depuis le Français).<br/><br/><strong>Organisation & Planification :</strong><br/>- T'aider à organiser tes idées, planifier des voyages, créer des listes de tâches.<br/>- Générer des idées créatives pour tes projets personnels ou professionnels.<br/><br/><strong>Analyse & Traitement de Fichiers :</strong><br/>- Analyser le contenu d'images (JPG, PNG, WEBP), de PDF, et de fichiers texte (.txt, .md) que tu télécharges.<br/>- Répondre à tes questions sur la base des documents fournis.<br/><br/><strong>Création & Divertissement :</strong><br/>- Générer des images uniques à partir de tes descriptions textuelles.<br/>- Te raconter des blagues ou de courtes histoires.<br/><br/><strong>Utilisation Avancée :</strong><br/>- <strong>Mode Web :</strong> Si activé, Sakai peut tenter de chercher des informations sur internet (via DuckDuckGo) pour répondre à des questions nécessitant des données récentes. Il citera ses sources.<br/>- <strong>Mode DeepSakai :</strong> Si activé, Sakai adoptera une approche plus analytique, fournissant des réponses plus longues, détaillées et explorant diverses facettes du sujet.<br/>- <strong>Personnalités :</strong> Choisis une personnalité pour Sakai (Développeur, Coach, Humoriste) pour adapter son style de réponse.<br/>- <strong>Mémoire :</strong> Utilise le "Panneau de Mémoire" pour donner à Sakai des informations persistantes sur toi, tes préférences ou des contextes spécifiques.<br/><br/>Sakai apprend et s'améliore continuellement. N'hésite pas à explorer ses capacités !</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction onClick={() => setIsFeaturesDialogOpen(false)}>Compris !</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={isAboutDialogOpen} onOpenChange={setIsAboutDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary"/>À propos de Sakai</AlertDialogTitle><AlertDialogDescription className="text-left"><p><strong>Sakai</strong> est une Intelligence Artificielle conversationnelle de nouvelle génération, fièrement conçue et développée par <strong>MAMPIONONTIAKO Tantely Etienne Théodore</strong>, un développeur et passionné d'IA originaire de Madagascar.</p><p className="mt-2">Mon objectif est de fournir une assistance intelligente, créative et personnalisée. Je suis construit avec les dernières technologies, notamment Genkit de Google pour mes capacités IA, et une interface utilisateur moderne bâtie avec Next.js et React.</p><p className="mt-2">Je suis en constante évolution. Vos interactions m'aident à apprendre et à m'améliorer. Merci d'utiliser Sakai !</p><p className="mt-3 text-xs">Version: 1.0.0 - Sakai Chat</p></AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction onClick={() => setIsAboutDialogOpen(false)}>Fermer</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary"/>Contacter le créateur</AlertDialogTitle><AlertDialogDescription className="text-left"><p>Pour toute question, suggestion, ou si vous souhaitez simplement discuter du projet Sakai, vous pouvez contacter son créateur, <strong>MAMPIONONTIAKO Tantely Etienne Théodore</strong> :</p><ul className="list-disc list-inside mt-3 space-y-1"><li><strong>Email :</strong> <a href="mailto:tantelyetumamp@gmail.com" className="text-primary hover:underline">tantelyetumamp@gmail.com</a></li><li><strong>LinkedIn :</strong> <a href="https://www.linkedin.com/in/tantely-etienne-théodore-mampionontiako-179b73285/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Profil LinkedIn</a></li><li><strong>GitHub :</strong> <a href="https://github.com/tantelyeti" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Profil GitHub</a></li></ul></AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction onClick={() => setIsContactDialogOpen(false)}>Fermer</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={isDevCodePromptOpen} onOpenChange={setIsDevCodePromptOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-primary"/>Accès Mode Développeur</AlertDialogTitle><AlertDialogDescription>Veuillez entrer le code d'accès pour modifier les paramètres avancés de Sakai (prompt système, température du modèle, etc.). Les modes Web et DeepSakai sont accessibles directement via les icônes près du champ de saisie.</AlertDialogDescription></AlertDialogHeader><div className="py-2"><Input type="password" placeholder="Code d'accès" value={devCodeInput} onChange={(e) => setDevCodeInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleDevCodeCheck()}/></div><AlertDialogFooter><AlertDialogCancel onClick={() => { setDevCodeInput(''); setIsDevCodePromptOpen(false); }}>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDevCodeCheck}>Valider</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <Dialog open={isDevSettingsOpen} onOpenChange={setIsDevSettingsOpen}><DialogContent className="sm:max-w-[600px] bg-card"><DialogHeader><DialogTitle className="text-xl flex items-center gap-2"><SlidersHorizontal className="h-6 w-6 text-primary"/>Paramètres Développeur</DialogTitle><DialogDescription>Modifiez ici les paramètres avancés pour le comportement de Sakai. Ces paramètres sont pour les développeurs et peuvent affecter la performance ou la pertinence des réponses.</DialogDescription></DialogHeader><div className="grid gap-6 py-4"><div className="grid gap-2"><Label htmlFor="dev-system-prompt" className="text-sm font-medium">System Prompt Personnalisé :</Label><Textarea id="dev-system-prompt" placeholder="Laissez vide pour utiliser l'invite système par défaut de Sakai. Si rempli, cela surchargera complètement le prompt par défaut." value={tempOverrideSystemPrompt} onChange={(e) => setTempOverrideSystemPrompt(e.target.value)} className="min-h-[150px] text-sm p-3 rounded-md border bg-background" rows={8}/><p className="text-xs text-muted-foreground">L'invite système de base sera remplacée si ce champ est rempli.</p></div><div className="grid gap-2"><Label htmlFor="dev-temperature" className="text-sm font-medium">Température du Modèle : <span className="text-primary font-semibold">{tempModelTemperature?.toFixed(1)}</span></Label><Slider id="dev-temperature" min={0} max={1} step={0.1} value={[tempModelTemperature ?? 0.7]} onValueChange={(value) => setTempModelTemperature(value[0])} className="w-full"/><p className="text-xs text-muted-foreground">Contrôle l'aléa des réponses. Plus bas = plus déterministe/factuel. Plus haut = plus créatif/aléatoire.</p></div><div className="flex items-center space-x-2"><Switch id="dev-sakai-ambiance" checked={tempIsDevSakaiAmbianceEnabled} onCheckedChange={setTempIsDevSakaiAmbianceEnabled}/><Label htmlFor="dev-sakai-ambiance" className="text-sm font-medium">Activer l'Ambiance Sakai (pensées aléatoires)</Label></div></div><DialogFooter className="gap-2 sm:gap-0"><Button type="button" variant="outline" onClick={handleResetDevSettings}>Réinitialiser</Button><DialogClose asChild><Button type="button" variant="ghost" onClick={() => { setTempOverrideSystemPrompt(devOverrideSystemPrompt); setTempModelTemperature(devModelTemperature ?? 0.7); setTempIsDevSakaiAmbianceEnabled(isDevSakaiAmbianceEnabled); setIsDevSettingsOpen(false);}}>Annuler</Button></DialogClose><Button type="button" onClick={handleSaveDevSettings}>Sauvegarder</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
