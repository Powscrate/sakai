
// src/app/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ChatAssistant } from '@/components/chat/chat-assistant';
import { MemoryDialog } from '@/components/chat/memory-dialog';
import type { ChatMessage, ChatMessagePart } from '@/ai/flows/chat-assistant-flow'; // ChatMessagePart is used by ChatSession
import { Loader2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import useLocalStorage from '@/hooks/use-local-storage';

// ChatSession now includes messages
export interface ChatSession {
  id: string;
  title: string;
  createdAt: number; // Using number (Date.now()) for easier localStorage serialization
  userId: string;
  messages: ChatMessage[];
}

const getChatSessionsKey = (userId: string | undefined) => userId ? `sakaiChatSessions_v3_${userId}` : 'sakaiChatSessions_v3_anonymous';
const getActiveChatIdKey = (userId: string | undefined) => userId ? `sakaiActiveChatId_v3_${userId}` : 'sakaiActiveChatId_v3_anonymous';
const getUserMemoryKey = (userId: string | undefined) => userId ? `sakaiUserMemory_${userId}` : 'sakaiUserMemory_anonymous';
const getDevOverrideSystemPromptKey = (userId: string | undefined) => userId ? `sakaiDevOverrideSystemPrompt_${userId}` : 'sakaiDevOverrideSystemPrompt_anonymous';
const getDevModelTemperatureKey = (userId: string | undefined) => userId ? `sakaiDevModelTemperature_${userId}` : 'sakaiDevModelTemperature_anonymous';

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

  const [isMemoryDialogOpen, setIsMemoryDialogOpen] = useState(false);
  const [isFeaturesDialogOpen, setIsFeaturesDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isDevCodePromptOpen, setIsDevCodePromptOpen] = useState(false);
  const [devCodeInput, setDevCodeInput] = useState('');
  const [isDevSettingsOpen, setIsDevSettingsOpen] = useState(false);
  const [tempOverrideSystemPrompt, setTempOverrideSystemPrompt] = useState('');
  const [tempModelTemperature, setTempModelTemperature] = useState(0.7);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage<boolean>(`sakaiSidebarCollapsed_${currentUser?.uid}`, false);

  useEffect(() => {
    setPageIsMounted(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (!user && pageIsMounted) { // Check pageIsMounted before redirecting
        router.push('/auth/login');
      }
    });
    return () => unsubscribe();
  }, [router, pageIsMounted]); // Added pageIsMounted

  // Initialize dev settings form when user is available and dialog might open
  useEffect(() => {
    if (pageIsMounted && currentUser) {
      setTempOverrideSystemPrompt(devOverrideSystemPrompt);
      setTempModelTemperature(devModelTemperature ?? 0.7);
    }
  }, [devOverrideSystemPrompt, devModelTemperature, pageIsMounted, currentUser]);


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
    setChatSessions(prevSessions => [newChatSession, ...prevSessions]);
    setActiveChatId(newChatId);
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
  }, [currentUser, setChatSessions, setActiveChatId, isMobileMenuOpen, setIsMobileMenuOpen]);

  // Initialize chat sessions (e.g., create first one if none exist)
  useEffect(() => {
    if (!pageIsMounted || !currentUser) return;

    if (chatSessions.length === 0) {
      handleNewChat();
    } else if (!activeChatId || !chatSessions.find(s => s.id === activeChatId)) {
      // If no active chat or active chat doesn't exist, select the most recent one
      setActiveChatId(chatSessions[0]?.id || null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIsMounted, currentUser, handleNewChat]); // Removed chatSessions, activeChatId, setActiveChatId as they cause loops here


  const activeChatMessages = chatSessions.find(session => session.id === activeChatId)?.messages || [];

  const handleMessagesUpdate = async (updatedMessages: ChatMessage[]) => {
    if (!currentUser || !activeChatId) return;

    setChatSessions(prevSessions => 
      prevSessions.map(session => {
        if (session.id === activeChatId) {
          // Update title if it's the first user message
          let newTitle = session.title;
          if (session.title === "Nouveau Chat" || session.title === "Nouvelle Discussion") {
            const firstUserMessage = updatedMessages.find(m => m.role === 'user' && m.parts[0]?.type === 'text');
            if (firstUserMessage && firstUserMessage.parts[0].type === 'text') {
              newTitle = firstUserMessage.parts[0].text.substring(0, 30) + (firstUserMessage.parts[0].text.length > 30 ? '...' : '');
            }
          }
          return { ...session, messages: updatedMessages, title: newTitle };
        }
        return session;
      })
    );
  };

  const handleDeleteChat = async (idToDelete: string) => {
    if (!currentUser) return;
    setChatSessions(prevSessions => prevSessions.filter(s => s.id !== idToDelete));
    if (activeChatId === idToDelete) {
      const remainingSessions = chatSessions.filter(s => s.id !== idToDelete);
      if (remainingSessions.length > 0) {
        setActiveChatId(remainingSessions.sort((a,b) => b.createdAt - a.createdAt)[0].id);
      } else {
        handleNewChat(); // Create a new one if no chats are left
      }
    }
    toast({ title: "Chat supprimé", description: "La session de chat a été supprimée." });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Clear user-specific local storage for chat sessions and active chat
      // The keys for useLocalStorage will change when currentUser becomes null, effectively clearing them for the next user.
      // However, to be explicit, especially if not using UID in keys directly in hook:
      if (currentUser) {
        localStorage.removeItem(getChatSessionsKey(currentUser.uid));
        localStorage.removeItem(getActiveChatIdKey(currentUser.uid));
      }
      setChatSessions([]); // Clear state
      setActiveChatId(null); // Clear state

      toast({ title: "Déconnexion", description: "Vous avez été déconnecté." });
      // onAuthStateChanged will trigger redirect to /auth/login
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

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  // This ensures that if the user object changes (e.g., on logout/login), the localStorage keys update
  const memoizedChatSessionsKey = getChatSessionsKey(currentUser?.uid);
  const memoizedActiveChatIdKey = getActiveChatIdKey(currentUser?.uid);
  const memoizedUserMemoryKey = getUserMemoryKey(currentUser?.uid);
  const memoizedDevOverrideSystemPromptKey = getDevOverrideSystemPromptKey(currentUser?.uid);
  const memoizedDevModelTemperatureKey = getDevModelTemperatureKey(currentUser?.uid);

  useEffect(() => {
    // Re-initialize useLocalStorage hooks if currentUser.uid changes to ensure correct keys
    // This is implicitly handled by the keys changing, but this effect is a placeholder if more direct logic is needed.
  }, [currentUser?.uid]);

  if (!pageIsMounted || authLoading) {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">{authLoading ? "Vérification de l'authentification..." : "Chargement de Sakai..."}</p>
      </div>
    );
  }
  
  if (!currentUser) { 
     // This case should ideally be handled by the onAuthStateChanged listener redirecting.
     // If it reaches here, it's a brief moment before redirection or an issue.
    return (
      <div className="flex flex-col h-screen bg-background text-foreground items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirection vers la page de connexion...</p>
      </div>
    );
  }
  
  // Ensure chatSessions is an array before rendering
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
      />
      <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${isSidebarCollapsed && !isMobileMenuOpen ? 'md:ml-20' : 'md:ml-72'}`}>
        {activeChatId && activeChatMessages ? (
          <ChatAssistant
            key={activeChatId} // Force re-render when chat changes
            initialMessages={activeChatMessages}
            onMessagesUpdate={handleMessagesUpdate}
            userMemory={userMemory}
            devOverrideSystemPrompt={devOverrideSystemPrompt}
            devModelTemperature={devModelTemperature}
            activeChatId={activeChatId}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
             <p>Chargement des discussions ou sélectionnez un chat...</p>
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
            <AlertDialogTitle className="flex items-center gap-2">Fonctionnalités de Sakai</AlertDialogTitle>
            <AlertDialogDescription className="text-left max-h-[60vh] overflow-y-auto">
              Sakai est ton assistant IA personnel, toujours prêt à t'aider :
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Discuter de tout et de rien, répondre à tes questions.</li>
                <li>Générer des images stylées à partir de tes descriptions.</li>
                <li>Analyser les images, PDF, et fichiers texte que tu lui donnes.</li>
                <li>Raconter des blagues et des histoires pour te détendre.</li>
                <li>T'aider à rédiger des emails, pitchs, poèmes, scripts...</li>
                <li>Se souvenir de tes préférences grâce au Panneau de Mémoire.</li>
                <li>Mode Développeur pour les experts qui veulent personnaliser son comportement.</li>
              </ul>
               <p className="mt-3 text-sm font-semibold">Sakai est gratuit mais puissant, toujours là pour toi !</p>
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
            <AlertDialogTitle className="flex items-center gap-2">À propos de Sakai</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              <p className="mb-2">Sakai est un grand modèle linguistique, entraîné par Tantely pour être ton partenaire IA cool et futé. Il est conçu pour être gratuit, puissant, et rendre ton quotidien plus simple et fun !</p>
              <p className="mb-2">Il utilise les dernières avancées en matière d'intelligence artificielle pour t'offrir une expérience interactive et enrichissante.</p>
              <p>Version: 3.0.0 (LocalStorage Chat & UI Overhaul)</p>
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
            <AlertDialogTitle className="flex items-center gap-2">Contacter le développeur</AlertDialogTitle>
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
            <AlertDialogTitle className="flex items-center gap-2">Accès Mode Développeur</AlertDialogTitle>
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
            <DialogTitle className="text-xl flex items-center gap-2">Paramètres Développeur</DialogTitle>
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
