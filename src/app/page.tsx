
// src/app/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ChatAssistant } from '@/components/chat/chat-assistant';
import { MemoryDialog } from '@/components/chat/memory-dialog';
import type { ChatMessage } from '@/ai/flows/chat-assistant-flow';
import { generateChatTitle } from '@/ai/flows/generate-chat-title-flow';
import { generateSakaiThought } from '@/ai/flows/generate-sakai-thought-flow'; 
import { Loader2, Settings, Brain, Info, Contact, Zap, MessageSquare, Brush, Wand2, SlidersHorizontal } from 'lucide-react'; // Added SlidersHorizontal
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input"; 
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
import { Switch } from "@/components/ui/switch"; 
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import useLocalStorage from '@/hooks/use-local-storage';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number; // Using JS timestamp (milliseconds)
  userId: string; // To associate chat with a user
  messages: ChatMessage[];
}

const getChatSessionsKey = (userId: string | undefined) => userId ? `sakaiChatSessions_v3_${userId}` : `sakaiChatSessions_v3_anonymous_fallback_key_should_not_happen`;
const getActiveChatIdKey = (userId: string | undefined) => userId ? `sakaiActiveChatId_v3_${userId}` : `sakaiActiveChatId_v3_anonymous_fallback_key_should_not_happen`;
const getUserMemoryKey = (userId: string | undefined) => userId ? `sakaiUserMemory_${userId}` : 'sakaiUserMemory_anonymous';
const getDevOverrideSystemPromptKey = (userId: string | undefined) => userId ? `sakaiDevOverrideSystemPrompt_${userId}` : 'sakaiDevOverrideSystemPrompt_anonymous';
const getDevModelTemperatureKey = (userId: string | undefined) => userId ? `sakaiDevModelTemperature_${userId}` : 'sakaiDevModelTemperature_anonymous';
const getSidebarCollapsedKey = (userId: string | undefined) => userId ? `sakaiSidebarCollapsed_v1_${userId}` : `sakaiSidebarCollapsed_v1_anonymous_fallback`;
const getDevSakaiAmbianceEnabledKey = (userId: string | undefined) => userId ? `sakaiDevAmbianceEnabled_${userId}` : 'sakaiDevAmbianceEnabled_anonymous';


const DEV_ACCESS_CODE = "1234566";

export default function ChatPage() {
  const [pageIsMounted, setPageIsMounted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [chatSessions, setChatSessions] = useLocalStorage<ChatSession[]>(getChatSessionsKey(currentUser?.uid), []);
  const [activeChatId, setActiveChatId] = useLocalStorage<string | null>(getActiveChatIdKey(currentUser?.uid), null);
  
  const [userMemory, setUserMemory] = useLocalStorage<string>(getUserMemoryKey(currentUser?.uid), '');
  const [devOverrideSystemPrompt, setDevOverrideSystemPrompt] = useLocalStorage<string>(getDevOverrideSystemPromptKey(currentUser?.uid), '');
  const [devModelTemperature, setDevModelTemperature] = useLocalStorage<number | undefined>(getDevModelTemperatureKey(currentUser?.uid), undefined);
  const [isDevSakaiAmbianceEnabled, setIsDevSakaiAmbianceEnabled] = useLocalStorage<boolean>(getDevSakaiAmbianceEnabledKey(currentUser?.uid), false);
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage<boolean>(getSidebarCollapsedKey(currentUser?.uid), false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);


  useEffect(() => {
    setPageIsMounted(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        if (pageIsMounted) { 
            router.push('/auth/login');
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router, pageIsMounted]);


  useEffect(() => {
    if (pageIsMounted && currentUser) {
      setTempOverrideSystemPrompt(devOverrideSystemPrompt);
      setTempModelTemperature(devModelTemperature ?? 0.7);
      setTempIsDevSakaiAmbianceEnabled(isDevSakaiAmbianceEnabled);
    }
  }, [devOverrideSystemPrompt, devModelTemperature, isDevSakaiAmbianceEnabled, pageIsMounted, currentUser]);

  // Fetch Sakai's current thought if ambiance is enabled
  const fetchSakaiThought = useCallback(async () => {
    if (!isDevSakaiAmbianceEnabled || !pageIsMounted || !currentUser) return;
    try {
      const result = await generateSakaiThought();
      setSakaiCurrentThought(result.thought);
    } catch (error) {
      console.error("Error fetching Sakai's thought:", error);
      setSakaiCurrentThought(null); // Or a default fallback thought
    }
  }, [isDevSakaiAmbianceEnabled, pageIsMounted, currentUser]);

  useEffect(() => {
    if (isDevSakaiAmbianceEnabled && pageIsMounted && currentUser) {
      fetchSakaiThought(); // Initial fetch
      if (thoughtIntervalRef.current) clearInterval(thoughtIntervalRef.current);
      thoughtIntervalRef.current = setInterval(fetchSakaiThought, 60000); // Fetch every 60 seconds
    } else {
      if (thoughtIntervalRef.current) clearInterval(thoughtIntervalRef.current);
      setSakaiCurrentThought(null); // Clear thought if ambiance is disabled
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
    setChatSessions(prevSessions => [newChatSession, ...prevSessions].sort((a,b) => b.createdAt - a.createdAt));
    setActiveChatId(newChatId);
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
  }, [currentUser, setChatSessions, setActiveChatId, isMobileMenuOpen, setIsMobileMenuOpen]);


  useEffect(() => {
    if (!pageIsMounted || !currentUser || authLoading) return;

    // Ensure chatSessions is an array before operating on it
    const currentSessions = Array.isArray(chatSessions) ? chatSessions : [];

    if (currentSessions.length === 0) {
      handleNewChat();
    } else if (!activeChatId || !currentSessions.find(s => s.id === activeChatId)) {
      // Sort by createdAt to get the most recent
      setActiveChatId(currentSessions.sort((a,b) => b.createdAt - a.createdAt)[0]?.id || null);
    }
  }, [pageIsMounted, currentUser, authLoading, chatSessions, activeChatId, handleNewChat, setActiveChatId]); 


  const activeChatMessages = chatSessions.find(session => session.id === activeChatId)?.messages || [];

  const handleMessagesUpdate = async (updatedMessages: ChatMessage[]) => {
    if (!currentUser || !activeChatId) return;

    setChatSessions(prevSessions =>
      prevSessions.map(session => {
        if (session.id === activeChatId) {
          // AI title generation
          if ((session.title === "Nouveau Chat" || session.title === "Nouvelle Discussion") && updatedMessages.length >= 1 && !isGeneratingTitle) {
            const firstUserMessage = updatedMessages.find(m => m.role === 'user');
            
            if (firstUserMessage) {
                 setIsGeneratingTitle(true);
                 const contextMessages = updatedMessages
                    .slice(0, 2)
                    .map(msg => ({
                        role: msg.role,
                        parts: msg.parts.filter(part => part.type === 'text').map(part => ({type: 'text' as 'text', text: part.text}))
                    }))
                    .filter(msg => msg.parts.length > 0);

                if (contextMessages.length > 0) {
                    generateChatTitle({ messages: contextMessages as any }) 
                    .then(titleOutput => {
                        if (titleOutput.title) {
                        setChatSessions(prev => prev.map(s => s.id === activeChatId ? { ...s, title: titleOutput.title } : s));
                        }
                    })
                    .catch(err => console.error("Error generating chat title:", err))
                    .finally(() => setIsGeneratingTitle(false));
                } else {
                    setIsGeneratingTitle(false); 
                }
            }
          }
          return { ...session, messages: updatedMessages };
        }
        return session;
      })
    );
  };

  const handleDeleteChat = async (idToDelete: string) => {
    if (!currentUser) return;
    setChatSessions(prevSessions => {
        const updatedSessions = prevSessions.filter(s => s.id !== idToDelete);
        if (activeChatId === idToDelete) {
            if (updatedSessions.length > 0) {
                setActiveChatId(updatedSessions.sort((a,b) => b.createdAt - a.createdAt)[0].id);
            } else {
                // No setActiveChatId(null) here; handleNewChat will set it.
            }
        }
        return updatedSessions;
    });
    // Call handleNewChat if all sessions are deleted
    if (chatSessions.filter(s => s.id !== idToDelete).length === 0) {
        handleNewChat();
    }
    toast({ title: "Chat supprimé", description: "La session de chat a été supprimée." });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setChatSessions([]);
      setActiveChatId(null);
      setUserMemory('');
      setDevOverrideSystemPrompt('');
      setDevModelTemperature(undefined);
      setIsSidebarCollapsed(false);
      setIsDevSakaiAmbianceEnabled(false); // Reset ambiance on logout

      toast({ title: "Déconnexion", description: "Vous avez été déconnecté." });
      // onAuthStateChanged in this component will handle redirect to /auth/login
    } catch (error) {
      console.error("Logout error:", error);
      toast({ title: "Erreur de déconnexion", description: "Une erreur est survenue.", variant: "destructive" });
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
      if (pageIsMounted && currentUser) {
        setTempOverrideSystemPrompt(devOverrideSystemPrompt);
        setTempModelTemperature(devModelTemperature ?? 0.7);
        setTempIsDevSakaiAmbianceEnabled(isDevSakaiAmbianceEnabled);
      }
      setIsDevSettingsOpen(true);
      toast({
        title: "Accès Développeur Accordé",
        description: "Vous pouvez maintenant modifier les paramètres du modèle.",
      });
    } else {
      toast({
        title: "Code d'accès incorrect",
        description: "Veuillez réessayer.",
        variant: "destructive",
      });
      setDevCodeInput('');
    }
  };

  const handleSaveDevSettings = () => {
    setDevOverrideSystemPrompt(tempOverrideSystemPrompt);
    setDevModelTemperature(tempModelTemperature);
    setIsDevSakaiAmbianceEnabled(tempIsDevSakaiAmbianceEnabled);
    setIsDevSettingsOpen(false);
    toast({
      title: "Paramètres développeur sauvegardés",
      description: "Les nouveaux paramètres seront appliqués à la prochaine interaction.",
    });
  };

  const handleResetDevSettings = () => {
    setTempOverrideSystemPrompt('');
    setTempModelTemperature(0.7);
    setTempIsDevSakaiAmbianceEnabled(false);
    // Persist reset
    setDevOverrideSystemPrompt('');
    setDevModelTemperature(undefined);
    setIsDevSakaiAmbianceEnabled(false);
    toast({
      title: "Paramètres développeur réinitialisés",
      description: "Les paramètres par défaut sont restaurés.",
    });
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => !prev);
  };
  
  useEffect(() => {
  }, [currentUser?.uid]);


  if (!pageIsMounted || authLoading || (!currentUser && !authLoading)) {
    // Show loader if page hasn't mounted, auth is loading, or if user is null and auth isn't loading (pre-redirect state)
    return (
      <div className="flex flex-col h-screen bg-background text-foreground items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
            {authLoading ? "Vérification de l'authentification..." : 
             !currentUser && !authLoading ? "Redirection vers la page de connexion..." : "Chargement de Sakai..."}
        </p>
      </div>
    );
  }
  
  const currentChatSessions = Array.isArray(chatSessions) ? chatSessions : [];
  const sortedChatSessions = [...currentChatSessions].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="flex h-screen bg-muted/30 dark:bg-background">
      <ChatSidebar
        chatSessions={sortedChatSessions}
        activeChatId={activeChatId}
        onSelectChat={(id) => {
          setActiveChatId(id);
          if (isMobileMenuOpen) setIsMobileMenuOpen(false);
        }}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onLogout={handleLogout}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        onOpenMemoryDialog={() => setIsMemoryDialogOpen(true)}
        onOpenDevSettingsDialog={() => setIsDevCodePromptOpen(true)}
        onOpenFeaturesDialog={() => setIsFeaturesDialogOpen(true)}
        onOpenAboutDialog={() => setIsAboutDialogOpen(true)}
        onOpenContactDialog={() => setIsContactDialogOpen(true)}
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebarCollapse={toggleSidebarCollapse}
        sakaiCurrentThought={sakaiCurrentThought}
        isDevSakaiAmbianceEnabled={isDevSakaiAmbianceEnabled}
      />
      <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${isSidebarCollapsed && !isMobileMenuOpen ? 'md:ml-20' : 'md:ml-72'}`}>
        {activeChatId && activeChatMessages ? (
          <ChatAssistant
            key={activeChatId} 
            initialMessages={activeChatMessages}
            onMessagesUpdate={handleMessagesUpdate}
            userMemory={userMemory}
            devOverrideSystemPrompt={devOverrideSystemPrompt}
            devModelTemperature={devModelTemperature}
            activeChatId={activeChatId}
            currentUserName={currentUser?.displayName}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
             <p>Chargement des discussions ou sélectionnez/créez un chat...</p>
          </div>
        )}
      </main>

      <MemoryDialog
        isOpen={isMemoryDialogOpen}
        onOpenChange={setIsMemoryDialogOpen}
        currentMemory={userMemory}
        onSaveMemory={handleSaveMemory}
      />

      <AlertDialog open={isFeaturesDialogOpen} onOpenChange={setIsFeaturesDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary"/>Fonctionnalités de Sakai</AlertDialogTitle>
            <AlertDialogDescription className="text-left max-h-[60vh] overflow-y-auto">
              Sakai est ton assistant IA personnel, gratuit mais puissant, toujours prêt à t'aider :
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Discuter de tout et de rien, répondre à tes questions.</li>
                <li>Générer des images stylées à partir de tes descriptions.</li>
                <li>Analyser les images, PDF, et fichiers texte que tu lui donnes (même plusieurs d'un coup !).</li>
                <li>Raconter des blagues et des histoires pour te détendre.</li>
                <li>T'aider à rédiger des emails, pitchs, poèmes, scripts...</li>
                <li>Se souvenir de tes préférences grâce au Panneau de Mémoire.</li>
                <li>Mode Développeur pour personnaliser son comportement et activer des surprises comme les "Pensées de Sakai".</li>
              </ul>
               <p className="mt-3 text-sm font-semibold">Sakai est là pour toi, prêt à rendre ton quotidien plus fun et productif !</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsFeaturesDialogOpen(false)}>Compris !</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isAboutDialogOpen} onOpenChange={setIsAboutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary"/>À propos de Sakai</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              <p className="mb-2">Sakai est un grand modèle linguistique, codé par Tantely pour être ton partenaire IA cool et futé. Il est conçu pour être gratuit, puissant, et rendre ton quotidien plus simple et fun !</p>
              <p className="mb-2">Il utilise les dernières avancées en matière d'intelligence artificielle pour t'offrir une expérience interactive et enrichissante.</p>
              <p>Version: 3.5.0 (Ambiance & UI)</p>
              <p className="mt-4 text-xs text-muted-foreground">
                © MAMPIONONTIAKO Tantely Etienne Théodore. Tous droits réservés.<br />
                Créateur & Développeur : MAMPIONONTIAKO Tantely Etienne Théodore
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsAboutDialogOpen(false)}>Fermer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Contact className="h-5 w-5 text-primary"/>Contacter le développeur</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              <p>Tu peux contacter Tantely (le créateur de Sakai) via WhatsApp :</p>
              <Button variant="link" asChild className="text-lg p-0 h-auto mt-2">
                <a href="https://wa.me/261343775058" target="_blank" rel="noopener noreferrer">
                  +261 34 37 750 58
                </a>
              </Button>
              <p className="text-xs text-muted-foreground mt-3">Ou par email : <a href="mailto:tantely@gmail.com" className="underline">tantely@gmail.com</a></p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsContactDialogOpen(false)}>Fermer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <AlertDialogCancel onClick={() => { setDevCodeInput(''); setIsDevCodePromptOpen(false); }}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDevCodeCheck}>Valider</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDevSettingsOpen} onOpenChange={setIsDevSettingsOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2"><SlidersHorizontal className="h-6 w-6 text-primary"/>Paramètres Développeur</DialogTitle>
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
                placeholder="Laisse vide pour utiliser l'invite système par défaut de Sakai. Sinon, entre ton propre délire ici..."
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
                Plus bas = plus factuel/carré. Plus haut = plus créatif/part en freestyle. (Défaut: 0.7)
              </p>
            </div>
            <div className="flex items-center space-x-2">
                <Switch
                    id="dev-sakai-ambiance"
                    checked={tempIsDevSakaiAmbianceEnabled}
                    onCheckedChange={setTempIsDevSakaiAmbianceEnabled}
                />
                <Label htmlFor="dev-sakai-ambiance" className="text-sm font-medium">
                    Activer l'Ambiance Sakai (Pensées de Sakai)
                </Label>
            </div>
             <p className="text-xs text-muted-foreground -mt-3">
                Si activé, Sakai partagera des pensées amusantes ou intéressantes de temps en temps dans la barre latérale.
             </p>

          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleResetDevSettings}>
              Reset aux réglages d'usine
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="ghost" onClick={() => {
                if (pageIsMounted && currentUser) {
                  setTempOverrideSystemPrompt(devOverrideSystemPrompt);
                  setTempModelTemperature(devModelTemperature ?? 0.7);
                  setTempIsDevSakaiAmbianceEnabled(isDevSakaiAmbianceEnabled);
                }
                setIsDevSettingsOpen(false);
              }}>
                Annuler
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSaveDevSettings}>
              Sauvegarder les Réglages
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
