// src/app/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import NextImage from 'next/image';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ChatAssistant } from '@/components/chat/chat-assistant';
import { MemoryDialog } from '@/components/chat/memory-dialog';
import type { ChatMessage } from '@/ai/flows/chat-assistant-flow';
import { generateChatTitle, type GenerateChatTitleOutput } from '@/ai/flows/generate-chat-title-flow';
import { generateSakaiThought, type GenerateSakaiThoughtOutput } from '@/ai/flows/generate-sakai-thought-flow';
import {
  Loader2, Settings, Brain, Info, Contact, Zap, MessageSquare, Brush, Wand2,
  SlidersHorizontal, User as UserIconImport, Edit3, MoreVertical, LogOut as LogOutIcon, PanelLeftClose, PanelRightClose,
  Mail, Plane, Lightbulb, Languages, ImageIcon, Laugh, Sparkles, Globe, Bot as DeepSakaiIcon
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
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import useLocalStorage from '@/hooks/use-local-storage';
import { SakaiLogo } from '@/components/icons/logo';
import { ThemeToggleButton } from '@/components/chat/theme-toggle-button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export const aiPersonalities = ["Sakai (par défaut)", "Développeur Pro", "Coach Bienveillant", "Humoriste Décalé"] as const;
export type AIPersonality = (typeof aiPersonalities)[number];

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  userId: string;
  messages: ChatMessage[];
}

const getChatSessionsKey = (userId: string | undefined) => userId ? `sakaiChatSessions_v3_${userId}` : `sakaiChatSessions_v3_fallback_no_user`;
const getActiveChatIdKey = (userId: string | undefined) => userId ? `sakaiActiveChatId_v3_${userId}` : `sakaiActiveChatId_v3_fallback_no_user`;
const getUserAvatarKey = (userId: string | undefined) => userId ? `sakaiUserAvatar_${userId}` : 'sakaiUserAvatar_fallback';
const getUserMemoryKey = (userId: string | undefined) => userId ? `sakaiUserMemory_${userId}` : 'sakaiUserMemory_fallback';
const getDevOverrideSystemPromptKey = (userId: string | undefined) => userId ? `sakaiDevOverrideSystemPrompt_${userId}` : 'sakaiDevOverrideSystemPrompt_fallback';
const getDevModelTemperatureKey = (userId: string | undefined) => userId ? `sakaiDevModelTemperature_${userId}` : 'sakaiDevModelTemperature_fallback';
const getSidebarCollapsedKey = (userId: string | undefined) => userId ? `sakaiSidebarCollapsed_v1_${userId}` : `sakaiSidebarCollapsed_v1_fallback`;
const getDevSakaiAmbianceEnabledKey = (userId: string | undefined) => userId ? `sakaiDevAmbianceEnabled_${userId}` : 'sakaiDevAmbianceEnabled_fallback';
const getAiPersonalityKey = (userId: string | undefined) => userId ? `sakaiAiPersonality_${userId}` : 'sakaiAiPersonality_fallback';
const getWebSearchEnabledKey = (userId: string | undefined) => userId ? `sakaiWebSearchEnabled_${userId}` : 'sakaiWebSearchEnabled_fallback';
const getDeepSakaiEnabledKey = (userId: string | undefined) => userId ? `sakaiDeepSakaiEnabled_${userId}` : 'sakaiDeepSakaiEnabled_fallback';


const DEV_ACCESS_CODE = "1234566";

export default function ChatPage() {
  const [pageIsMounted, setPageIsMounted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [chatSessions, setChatSessions] = useLocalStorage<ChatSession[]>(getChatSessionsKey(currentUser?.uid), []);
  const [activeChatId, setActiveChatId] = useLocalStorage<string | null>(getActiveChatIdKey(currentUser?.uid), null);
  const [userAvatarUrl, setUserAvatarUrl] = useLocalStorage<string>(getUserAvatarKey(currentUser?.uid), '');
  const [userMemory, setUserMemory] = useLocalStorage<string>(getUserMemoryKey(currentUser?.uid), '');
  
  const [devOverrideSystemPrompt, setDevOverrideSystemPrompt] = useLocalStorage<string>(getDevOverrideSystemPromptKey(currentUser?.uid), '');
  const [devModelTemperature, setDevModelTemperature] = useLocalStorage<number | undefined>(getDevModelTemperatureKey(currentUser?.uid), undefined);
  const [isDevSakaiAmbianceEnabled, setIsDevSakaiAmbianceEnabled] = useLocalStorage<boolean>(getDevSakaiAmbianceEnabledKey(currentUser?.uid), false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useLocalStorage<boolean>(getWebSearchEnabledKey(currentUser?.uid), false);
  const [isDeepSakaiEnabled, setIsDeepSakaiEnabled] = useLocalStorage<boolean>(getDeepSakaiEnabledKey(currentUser?.uid), false);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage<boolean>(getSidebarCollapsedKey(currentUser?.uid), false);
  const [aiPersonality, setAiPersonality] = useLocalStorage<AIPersonality>(getAiPersonalityKey(currentUser?.uid), "Sakai (par défaut)");

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
  const [tempIsWebSearchEnabled, setTempIsWebSearchEnabled] = useState(false);
  const [tempIsDeepSakaiEnabled, setTempIsDeepSakaiEnabled] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);

  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatTitle, setEditingChatTitle] = useState('');

  useEffect(() => {
    setPageIsMounted(true);
  }, []);

  useEffect(() => {
    if (!pageIsMounted) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (!user) {
        // Clear user-specific localStorage items on logout or if no user
        localStorage.removeItem(getChatSessionsKey(currentUser?.uid));
        localStorage.removeItem(getActiveChatIdKey(currentUser?.uid));
        localStorage.removeItem(getUserAvatarKey(currentUser?.uid));
        localStorage.removeItem(getUserMemoryKey(currentUser?.uid));
        localStorage.removeItem(getDevOverrideSystemPromptKey(currentUser?.uid));
        localStorage.removeItem(getDevModelTemperatureKey(currentUser?.uid));
        localStorage.removeItem(getSidebarCollapsedKey(currentUser?.uid));
        localStorage.removeItem(getDevSakaiAmbianceEnabledKey(currentUser?.uid));
        localStorage.removeItem(getAiPersonalityKey(currentUser?.uid));
        localStorage.removeItem(getWebSearchEnabledKey(currentUser?.uid));
        localStorage.removeItem(getDeepSakaiEnabledKey(currentUser?.uid));
        router.push('/auth/login');
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIsMounted, router]);

  useEffect(() => {
    if (pageIsMounted && currentUser && !authLoading) {
      setTempOverrideSystemPrompt(devOverrideSystemPrompt);
      setTempModelTemperature(devModelTemperature ?? 0.7);
      setTempIsDevSakaiAmbianceEnabled(isDevSakaiAmbianceEnabled);
      setTempIsWebSearchEnabled(isWebSearchEnabled);
      setTempIsDeepSakaiEnabled(isDeepSakaiEnabled);
    }
  }, [devOverrideSystemPrompt, devModelTemperature, isDevSakaiAmbianceEnabled, isWebSearchEnabled, isDeepSakaiEnabled, pageIsMounted, currentUser, authLoading]);

  const fetchSakaiThought = useCallback(async () => {
    if (!isDevSakaiAmbianceEnabled || !pageIsMounted || !currentUser) return;
    try {
      const result: GenerateSakaiThoughtOutput = await generateSakaiThought();
      if (result.thought) {
        setSakaiCurrentThought(result.thought);
      }
      if (result.error) {
        console.warn("Error fetching Sakai's thought:", result.error);
      }
    } catch (error) {
      console.error("Error fetching Sakai's thought:", error);
      setSakaiCurrentThought(null);
    }
  }, [isDevSakaiAmbianceEnabled, pageIsMounted, currentUser]);

  useEffect(() => {
    if (isDevSakaiAmbianceEnabled && pageIsMounted && currentUser) {
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
  }, [isDevSakaiAmbianceEnabled, fetchSakaiThought, pageIsMounted, currentUser]);

  const handleNewChat = useCallback(() => {
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
    setActiveChatId(newChatId);
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
  }, [currentUser, setChatSessions, setActiveChatId, isMobileMenuOpen]);

  // Effect for initializing chats or redirecting
  useEffect(() => {
    if (!pageIsMounted || authLoading) return;

    if (!currentUser) {
      router.push('/auth/login');
      return;
    }

    const currentSessions = Array.isArray(chatSessions) ? chatSessions : [];

    if (currentSessions.length === 0) {
      handleNewChat();
    } else if (!activeChatId || !currentSessions.find(s => s.id === activeChatId)) {
      const sortedSessions = [...currentSessions].sort((a, b) => b.createdAt - a.createdAt);
      setActiveChatId(sortedSessions[0]?.id || null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIsMounted, currentUser, authLoading, router, handleNewChat]);


  const handleMessagesUpdate = useCallback((updatedMessages: ChatMessage[]) => {
    if (!currentUser || !activeChatId) return;

    setChatSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === activeChatId
          ? { ...session, messages: updatedMessages }
          : session
      )
    );
  }, [currentUser, activeChatId, setChatSessions]);

  // useEffect for generating chat title (runs after messages are updated and persisted)
  useEffect(() => {
    if (!currentUser || !activeChatId || isGeneratingTitle || !pageIsMounted) return;

    const activeSession = chatSessions.find(s => s.id === activeChatId);

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
          .then(titleOutput => {
            if (titleOutput.title && !titleOutput.error) {
              setChatSessions(prevSessions =>
                prevSessions.map(s =>
                  s.id === activeChatId ? { ...s, title: titleOutput.title } : s
                )
              );
            } else if (titleOutput.error) {
              console.warn("Error generating chat title:", titleOutput.error);
              // Optionally, keep the default title or set a generic one
            }
          })
          .catch(err => {
            console.error("Error in generateChatTitle API call:", err);
          })
          .finally(() => {
            setIsGeneratingTitle(false);
          });
      }
    }
  }, [chatSessions, activeChatId, currentUser, isGeneratingTitle, pageIsMounted, setChatSessions]);


  const handleRenameChat = (chatId: string, newTitle: string) => {
    if (!currentUser || !newTitle.trim()) return;
    setChatSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === chatId ? { ...session, title: newTitle.trim() } : session
      )
    );
    setEditingChatId(null);
    toast({ title: "Chat renommé", description: `Le chat a été renommé en "${newTitle.trim()}".` });
  };

  const startEditingChatTitle = (chat: ChatSession) => {
    setEditingChatId(chat.id);
    setEditingChatTitle(chat.title);
  };

  const handleDeleteChat = (idToDelete: string) => {
    if (!currentUser) return;
    setChatSessions(prevSessions => {
      const updatedSessions = prevSessions.filter(s => s.id !== idToDelete);
      if (activeChatId === idToDelete) {
        if (updatedSessions.length > 0) {
          setActiveChatId([...updatedSessions].sort((a, b) => b.createdAt - a.createdAt)[0].id);
        } else {
          setActiveChatId(null); // This will trigger handleNewChat in the useEffect
        }
      }
      return updatedSessions;
    });
    toast({ title: "Chat supprimé", description: "La session de chat a été supprimée." });
  };


  const handleLogout = async () => {
    try {
      await signOut(auth);
      // currentUser will become null via onAuthStateChanged, triggering redirection
      // For immediate UI update and to be safe, reset states:
      setChatSessions([]);
      setActiveChatId(null);
      setUserMemory('');
      setDevOverrideSystemPrompt('');
      setDevModelTemperature(undefined);
      setIsSidebarCollapsed(false);
      setIsDevSakaiAmbianceEnabled(false);
      setSakaiCurrentThought(null);
      setUserAvatarUrl('');
      setAiPersonality("Sakai (par défaut)");
      setIsWebSearchEnabled(false);
      setIsDeepSakaiEnabled(false);
      toast({ title: "Déconnexion", description: "Vous avez été déconnecté." });
      // Redirection is handled by onAuthStateChanged effect.
    } catch (error) {
      console.error("Logout error:", error);
      toast({ title: "Erreur de déconnexion", description: "Une erreur est survenue.", variant: "destructive" });
    }
  };

  const handleSaveMemory = (newMemory: string) => {
    setUserMemory(newMemory);
    toast({ title: "Mémoire sauvegardée", description: "Sakai utilisera ces informations." });
  };

  const handleDevCodeCheck = () => {
    if (devCodeInput === DEV_ACCESS_CODE) {
      setIsDevCodePromptOpen(false);
      setDevCodeInput('');
      if (pageIsMounted && currentUser) {
        setTempOverrideSystemPrompt(devOverrideSystemPrompt);
        setTempModelTemperature(devModelTemperature ?? 0.7);
        setTempIsDevSakaiAmbianceEnabled(isDevSakaiAmbianceEnabled);
        setTempIsWebSearchEnabled(isWebSearchEnabled);
        setTempIsDeepSakaiEnabled(isDeepSakaiEnabled);
      }
      setIsDevSettingsOpen(true);
      toast({ title: "Accès Développeur Accordé" });
    } else {
      toast({ title: "Code d'accès incorrect", variant: "destructive" });
      setDevCodeInput('');
    }
  };

  const handleSaveDevSettings = () => {
    setDevOverrideSystemPrompt(tempOverrideSystemPrompt);
    setDevModelTemperature(tempModelTemperature);
    setIsDevSakaiAmbianceEnabled(tempIsDevSakaiAmbianceEnabled);
    setIsWebSearchEnabled(tempIsWebSearchEnabled);
    setIsDeepSakaiEnabled(tempIsDeepSakaiEnabled);
    setIsDevSettingsOpen(false);
    toast({ title: "Paramètres développeur sauvegardés" });
  };

  const handleResetDevSettings = () => {
    setTempOverrideSystemPrompt('');
    setTempModelTemperature(0.7);
    setTempIsDevSakaiAmbianceEnabled(false);
    setTempIsWebSearchEnabled(false);
    setTempIsDeepSakaiEnabled(false);
    
    setDevOverrideSystemPrompt('');
    setDevModelTemperature(undefined);
    setIsDevSakaiAmbianceEnabled(false);
    setIsWebSearchEnabled(false);
    setIsDeepSakaiEnabled(false);
    toast({ title: "Paramètres développeur réinitialisés" });
  };

  const toggleSidebarCollapse = () => setIsSidebarCollapsed(prev => !prev);

  const activeChatMessages = chatSessions.find(session => session.id === activeChatId)?.messages || [];
  const activeChat = chatSessions.find(session => session.id === activeChatId);
  const sortedChatSessions = [...chatSessions].sort((a, b) => b.createdAt - a.createdAt);

  if (!pageIsMounted || authLoading) {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Chargement de Sakai...</p>
      </div>
    );
  }

  if (!currentUser) {
     return (
      <div className="flex flex-col h-screen bg-background text-foreground items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirection...</p>
      </div>
    );
  }

  const moreOptionsMenuItems = [
    { label: "Profil", icon: UserIconImport, action: () => router.push('/profile') },
    { label: "Panneau de Mémoire", icon: Brain, action: () => setIsMemoryDialogOpen(true) },
    { label: "Mode Développeur", icon: SlidersHorizontal, action: () => setIsDevCodePromptOpen(true) },
    { label: "Fonctionnalités de Sakai", icon: Zap, action: () => setIsFeaturesDialogOpen(true) },
    { label: "Contacter le développeur", icon: Contact, action: () => setIsContactDialogOpen(true) },
    { label: "À propos de Sakai", icon: Info, action: () => setIsAboutDialogOpen(true) },
  ];

  return (
    <div className="flex h-screen bg-muted/30 dark:bg-background text-foreground">
      <ChatSidebar
        chatSessions={sortedChatSessions}
        activeChatId={activeChatId}
        onSelectChat={(id) => { setActiveChatId(id); if (isMobileMenuOpen) setIsMobileMenuOpen(false); }}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebarCollapse={toggleSidebarCollapse}
        sakaiCurrentThought={sakaiCurrentThought}
        isDevSakaiAmbianceEnabled={isDevSakaiAmbianceEnabled}
        userAvatarUrl={userAvatarUrl}
        editingChatId={editingChatId}
        editingChatTitle={editingChatTitle}
        onStartEditingChatTitle={startEditingChatTitle}
        onRenameChat={handleRenameChat}
        setEditingChatTitle={setEditingChatTitle}
        setEditingChatId={setEditingChatId}
        currentPersonality={aiPersonality}
        onPersonalityChange={setAiPersonality}
        onLogout={handleLogout}
        onOpenMemoryDialog={() => setIsMemoryDialogOpen(true)}
        onOpenDevSettingsDialog={() => setIsDevCodePromptOpen(true)}
        onOpenFeaturesDialog={() => setIsFeaturesDialogOpen(true)}
        onOpenAboutDialog={() => setIsAboutDialogOpen(true)}
        onOpenContactDialog={() => setIsContactDialogOpen(true)}
      />

      <main className={`flex-1 flex flex-col relative overflow-hidden bg-background dark:bg-black/20 transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'md:ml-20' : 'md:ml-72'
      }`}>
        {/* Topbar Fixe */}
        <div className={`fixed top-0 right-0 h-16 bg-card/80 backdrop-blur-md border-b border-border/70
                         flex items-center justify-between px-6 z-20
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

        {/* Zone de Messages Défilable (avec padding pour topbar/inputbar) */}
        <div className="flex-1 overflow-y-auto" style={{ paddingTop: '4rem', paddingBottom: '6rem' }}> {/* Approx 64px top, 96px bottom */}
            {activeChatId && activeChat ? (
            <ChatAssistant
                key={activeChatId} // Important pour réinitialiser l'état de ChatAssistant si l'ID change
                initialMessages={activeChatMessages}
                onMessagesUpdate={handleMessagesUpdate}
                userMemory={userMemory}
                devOverrideSystemPrompt={devOverrideSystemPrompt}
                devModelTemperature={devModelTemperature}
                activeChatId={activeChatId}
                currentUserName={currentUser?.displayName}
                userAvatarUrl={userAvatarUrl}
                selectedPersonality={aiPersonality}
                isWebSearchEnabled={isWebSearchEnabled}
                isDeepSakaiEnabled={isDeepSakaiEnabled}
            />
            ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4 pt-16">
                {sortedChatSessions.length > 0 ? (
                <>
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                    <p>Sélection d'un chat...</p>
                </>
                ) : (
                <>
                    <MessageSquare className="h-12 w-12 text-primary mb-4 opacity-70" />
                    <p className="text-lg">Commencez par créer une nouvelle discussion !</p>
                    <Button onClick={handleNewChat} className="mt-4">
                    <Edit3 className="mr-2 h-4 w-4" /> Nouveau Chat
                    </Button>
                </>
                )}
            </div>
            )}
        </div>
        
        {/* Zone de Saisie Fixe */}
        {activeChatId && activeChat && (
            <div className={`fixed bottom-0 right-0 border-t border-border/70 bg-card/80 backdrop-blur-md
                            ${isSidebarCollapsed ? 'left-0 md:left-20' : 'left-0 md:left-72'}
                            transition-all duration-300 ease-in-out z-20`}>
                 {/* Le formulaire de ChatAssistant est géré par ChatAssistant lui-même,
                 mais on pourrait aussi le rendre ici si on décomposait ChatAssistant */}
            </div>
        )}
      </main>

      <MemoryDialog isOpen={isMemoryDialogOpen} onOpenChange={setIsMemoryDialogOpen} currentMemory={userMemory} onSaveMemory={handleSaveMemory} />
      
      <AlertDialog open={isFeaturesDialogOpen} onOpenChange={setIsFeaturesDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary"/>Fonctionnalités de Sakai</AlertDialogTitle><AlertDialogDescription className="text-left max-h-[60vh] overflow-y-auto">Sakai est ton assistant IA personnel, gratuit mais puissant, toujours prêt à t'aider :<ul className="list-disc list-inside mt-2 space-y-1 text-sm"><li>Discuter de tout et de rien, répondre à tes questions.</li><li>Générer des images stylées à partir de tes descriptions.</li><li>Analyser les images, PDF, et fichiers texte que tu lui donnes (même plusieurs d'un coup !).</li><li>Raconter des blagues et des histoires pour te détendre.</li><li>T'aider à rédiger des emails, pitchs, poèmes, scripts...</li><li>Se souvenir de tes préférences grâce au Panneau de Mémoire.</li><li>Choisir sa personnalité (Développeur, Coach, Humoriste...).</li><li>Mode Développeur pour personnaliser son comportement et activer des surprises comme les "Pensées de Sakai", le "Mode Web" (simulé) et le "Mode DeepSakai".</li></ul><p className="mt-3 text-sm font-semibold">Sakai est là pour toi, prêt à rendre ton quotidien plus fun et productif !</p></AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogAction onClick={() => setIsFeaturesDialogOpen(false)}>Compris !</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isAboutDialogOpen} onOpenChange={setIsAboutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary"/>À propos de Sakai</AlertDialogTitle><AlertDialogDescription className="text-left"><p className="mb-2">Sakai est une IA conversationnelle (pas un "modèle de langage"), codée par Tantely pour être ton partenaire IA cool et futé. Il est conçu pour être gratuit, puissant, et rendre ton quotidien plus simple et fun !</p><p className="mb-2">Il utilise les dernières avancées en matière d'intelligence artificielle pour t'offrir une expérience interactive et enrichissante.</p><p>Version: 3.10.0 (Avatars & Personnalités)</p><p className="mt-4 text-xs text-muted-foreground">© MAMPIONONTIAKO Tantely Etienne Théodore. Tous droits réservés.<br />Créateur & Développeur : MAMPIONONTIAKO Tantely Etienne Théodore</p></AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogAction onClick={() => setIsAboutDialogOpen(false)}>Fermer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><Contact className="h-5 w-5 text-primary"/>Contacter le développeur</AlertDialogTitle><AlertDialogDescription className="text-left"><p>Tu peux contacter Tantely (le créateur de Sakai) via WhatsApp :</p><Button variant="link" asChild className="text-lg p-0 h-auto mt-2"><a href="https://wa.me/261343775058" target="_blank" rel="noopener noreferrer">+261 34 37 750 58</a></Button><p className="text-xs text-muted-foreground mt-3">Ou par email : <a href="mailto:tantely@gmail.com" className="underline">tantely@gmail.com</a></p></AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogAction onClick={() => setIsContactDialogOpen(false)}>Fermer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isDevCodePromptOpen} onOpenChange={setIsDevCodePromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-primary"/>Accès Mode Développeur</AlertDialogTitle><AlertDialogDescription>Veuillez entrer le code d'accès pour modifier les paramètres avancés du modèle.</AlertDialogDescription></AlertDialogHeader>
          <div className="py-2"><Input type="password" placeholder="Code d'accès" value={devCodeInput} onChange={(e) => setDevCodeInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleDevCodeCheck()}/></div>
          <AlertDialogFooter><AlertDialogCancel onClick={() => { setDevCodeInput(''); setIsDevCodePromptOpen(false); }}>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDevCodeCheck}>Valider</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={isDevSettingsOpen} onOpenChange={setIsDevSettingsOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card">
          <DialogHeader><DialogTitle className="text-xl flex items-center gap-2"><SlidersHorizontal className="h-6 w-6 text-primary"/>Paramètres Développeur</DialogTitle><DialogDescription>Modifiez ici les paramètres avancés du modèle IA. Ces changements sont pour les utilisateurs avertis.</DialogDescription></DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2"><Label htmlFor="dev-system-prompt" className="text-sm font-medium">System Prompt Personnalisé :</Label><Textarea id="dev-system-prompt" placeholder="Laisse vide pour utiliser l'invite système par défaut..." value={tempOverrideSystemPrompt} onChange={(e) => setTempOverrideSystemPrompt(e.target.value)} className="min-h-[150px] text-sm p-3 rounded-md border bg-background" rows={8}/><p className="text-xs text-muted-foreground">L'invite système de base sera remplacée. La mémoire et la personnalité sont ajoutées après.</p></div>
            <div className="grid gap-2"><Label htmlFor="dev-temperature" className="text-sm font-medium">Température du Modèle : <span className="text-primary font-semibold">{tempModelTemperature.toFixed(1)}</span></Label><Slider id="dev-temperature" min={0} max={1} step={0.1} value={[tempModelTemperature]} onValueChange={(value) => setTempModelTemperature(value[0])} className="w-full"/><p className="text-xs text-muted-foreground">Plus bas = plus factuel. Plus haut = plus créatif. (Défaut: 0.7)</p></div>
            <div className="flex items-center space-x-2"><Switch id="dev-sakai-ambiance" checked={tempIsDevSakaiAmbianceEnabled} onCheckedChange={setTempIsDevSakaiAmbianceEnabled}/><Label htmlFor="dev-sakai-ambiance" className="text-sm font-medium">Activer l'Ambiance Sakai (Pensées)</Label></div>
            <div className="flex items-center space-x-2"><Switch id="dev-web-search" checked={tempIsWebSearchEnabled} onCheckedChange={setTempIsWebSearchEnabled}/><Label htmlFor="dev-web-search" className="text-sm font-medium">Activer le Mode Web (Simulé)</Label></div>
            <div className="flex items-center space-x-2"><Switch id="dev-deep-sakai" checked={tempIsDeepSakaiEnabled} onCheckedChange={setTempIsDeepSakaiEnabled}/><Label htmlFor="dev-deep-sakai" className="text-sm font-medium">Activer le Mode DeepSakai</Label></div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0"><Button type="button" variant="outline" onClick={handleResetDevSettings}>Reset</Button><DialogClose asChild><Button type="button" variant="ghost" onClick={() => { if (pageIsMounted && currentUser) { setTempOverrideSystemPrompt(devOverrideSystemPrompt); setTempModelTemperature(devModelTemperature ?? 0.7); setTempIsDevSakaiAmbianceEnabled(isDevSakaiAmbianceEnabled); setTempIsWebSearchEnabled(isWebSearchEnabled); setTempIsDeepSakaiEnabled(isDeepSakaiEnabled); } setIsDevSettingsOpen(false); }}>Annuler</Button></DialogClose><Button type="button" onClick={handleSaveDevSettings}>Sauvegarder</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

