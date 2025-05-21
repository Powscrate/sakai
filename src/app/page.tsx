
// src/app/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ChatAssistant } from '@/components/chat/chat-assistant';
import { MemoryDialog } from '@/components/chat/memory-dialog';
import type { ChatMessage } from '@/ai/flows/chat-assistant-flow';
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
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, addDoc, doc, setDoc, deleteDoc, serverTimestamp, Timestamp, where, getDocs, writeBatch } from 'firebase/firestore';
import useLocalStorage from '@/hooks/use-local-storage';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Timestamp | Date; // Allow Date for optimistic updates before server timestamp
  userId: string;
}

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

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChatMessages, setActiveChatMessages] = useState<ChatMessage[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

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

  useEffect(() => {
    setPageIsMounted(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (!user && pageIsMounted) {
        router.push('/auth/login');
      }
    });
    return () => unsubscribe();
  }, [router, pageIsMounted]);

  useEffect(() => {
    if (pageIsMounted && currentUser) {
      setTempOverrideSystemPrompt(devOverrideSystemPrompt);
      setTempModelTemperature(devModelTemperature ?? 0.7);
    }
  }, [devOverrideSystemPrompt, devModelTemperature, pageIsMounted, currentUser]);

  const handleNewChat = useCallback(async () => {
    if (!currentUser) return;

    const newChatSessionData = {
      title: "Nouveau Chat",
      createdAt: serverTimestamp(),
      userId: currentUser.uid,
    };
    try {
      const sessionsCol = collection(db, `userChats/${currentUser.uid}/sessions`);
      const docRef = await addDoc(sessionsCol, newChatSessionData);
      setActiveChatId(docRef.id);
      if (isMobileMenuOpen) setIsMobileMenuOpen(false);
    } catch (error) {
      console.error("Error creating new chat:", error);
      toast({ title: "Erreur", description: "Impossible de créer un nouveau chat. Vérifiez votre connexion ou les permissions Firestore.", variant: "destructive" });
    }
  }, [currentUser, isMobileMenuOpen, toast]); // Removed setIsMobileMenuOpen from deps, it's a setter

  // Fetch chat sessions from Firestore
  useEffect(() => {
    if (!currentUser || !pageIsMounted) {
      setSessionsLoading(false);
      setChatSessions([]); // Clear sessions if no user
      return;
    }
    setSessionsLoading(true);
    const sessionsCol = collection(db, `userChats/${currentUser.uid}/sessions`);
    const q = query(sessionsCol, orderBy("createdAt", "desc"));

    const unsubscribeSessions = onSnapshot(q, (snapshot) => {
      const fetchedSessions: ChatSession[] = [];
      snapshot.forEach((doc) => {
        fetchedSessions.push({ id: doc.id, ...doc.data() } as ChatSession);
      });
      setChatSessions(fetchedSessions);

      if (fetchedSessions.length > 0) {
        if (!activeChatId || !fetchedSessions.find(s => s.id === activeChatId)) {
          setActiveChatId(fetchedSessions[0].id);
        }
      } else {
        // No sessions exist, create one
        handleNewChat();
      }
      setSessionsLoading(false);
    }, (error) => {
      console.error("Error fetching chat sessions:", error);
      toast({ title: "Erreur de Sessions", description: "Impossible de charger les sessions de chat. Vérifiez vos règles Firestore.", variant: "destructive" });
      setSessionsLoading(false);
    });

    return () => unsubscribeSessions();
  }, [currentUser, pageIsMounted, activeChatId, handleNewChat, toast]);


  // Fetch messages for the active chat
  useEffect(() => {
    if (!currentUser || !activeChatId || !pageIsMounted) {
      setActiveChatMessages([]);
      setMessagesLoading(false);
      return;
    }
    setMessagesLoading(true);
    const messagesCol = collection(db, `userChats/${currentUser.uid}/sessions/${activeChatId}/messages`);
    const q = query(messagesCol, orderBy("createdAt", "asc"));

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const fetchedMessages: ChatMessage[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ChatMessage));
      setActiveChatMessages(fetchedMessages);
      setMessagesLoading(false);
    }, (error) => {
      console.error("Error fetching messages:", error);
      toast({ title: "Erreur de Messages", description: "Impossible de charger les messages. Vérifiez vos règles Firestore.", variant: "destructive" });
      setMessagesLoading(false);
    });
    return () => unsubscribeMessages();
  }, [currentUser, activeChatId, pageIsMounted, toast]);


  const handleMessagesUpdate = async (updatedMessages: ChatMessage[]) => {
    if (!currentUser || !activeChatId) return;

    const latestMessage = updatedMessages[updatedMessages.length - 1];
    if (!latestMessage) return;

    const messagesCol = collection(db, `userChats/${currentUser.uid}/sessions/${activeChatId}/messages`);
    try {
      // Add new message to Firestore.
      // We assume latestMessage does not have an ID yet if it's truly new from client,
      // or if it's from AI, its ID was generated client-side for optimistic update.
      // Firestore will generate its own ID if one isn't provided or doesn't exist.
      // For simplicity, let's assume we just add it.
      // If latestMessage has an ID from optimistic UI update, Firestore will use it if doc doesn't exist, or update if it does.
      // If we *always* want a new doc for each call, ensure no ID or use addDoc.
      const messageData = {
        ...latestMessage,
        createdAt: latestMessage.createdAt instanceof Timestamp ? latestMessage.createdAt : serverTimestamp()
      };
      if (latestMessage.id && typeof latestMessage.id === 'string') {
        await setDoc(doc(messagesCol, latestMessage.id), messageData);
      } else {
        await addDoc(messagesCol, messageData);
      }


      const currentSession = chatSessions.find(s => s.id === activeChatId);
      if (currentSession && (currentSession.title === "Nouveau Chat" || currentSession.title === "Nouvelle Discussion")) {
        const firstUserMessage = updatedMessages.find(m => m.role === 'user' && m.parts[0]?.type === 'text');
        if (firstUserMessage && firstUserMessage.parts[0].type === 'text') {
          const newTitle = firstUserMessage.parts[0].text.substring(0, 30) + (firstUserMessage.parts[0].text.length > 30 ? '...' : '');
          const sessionRef = doc(db, `userChats/${currentUser.uid}/sessions/${activeChatId}`);
          await setDoc(sessionRef, { title: newTitle }, { merge: true });
        }
      }
    } catch (error) {
      console.error("Error updating/adding message or title:", error);
      toast({ title: "Erreur de Sauvegarde", description: "Impossible de sauvegarder le message. Vérifiez vos règles Firestore.", variant: "destructive" });
    }
  };

  const handleDeleteChat = async (idToDelete: string) => {
    if (!currentUser) return;
    try {
      const messagesCol = collection(db, `userChats/${currentUser.uid}/sessions/${idToDelete}/messages`);
      const messagesSnapshot = await getDocs(messagesCol);
      const batch = writeBatch(db);
      messagesSnapshot.forEach(msgDoc => {
        batch.delete(doc(db, `userChats/${currentUser.uid}/sessions/${idToDelete}/messages`, msgDoc.id));
      });
      await batch.commit();

      const sessionRef = doc(db, `userChats/${currentUser.uid}/sessions/${idToDelete}`);
      await deleteDoc(sessionRef);

      toast({ title: "Chat supprimé", description: "La session de chat a été supprimée." });
      if (activeChatId === idToDelete) {
        setActiveChatId(null); // Will trigger useEffect to select a new chat or create one
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast({ title: "Erreur de Suppression", description: "Impossible de supprimer le chat. Vérifiez vos règles Firestore.", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Clear states related to user specific data
      setChatSessions([]);
      setActiveChatId(null);
      setActiveChatMessages([]);
      // userMemory, etc. are handled by useLocalStorage hook with changing keys
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

  if (!pageIsMounted || authLoading) {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">{authLoading ? "Vérification de l'authentification..." : "Chargement de Sakai..."}</p>
      </div>
    );
  }

  if (!currentUser) { // Should be handled by onAuthStateChanged redirect
    return (
      <div className="flex flex-col h-screen bg-background text-foreground items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirection vers la page de connexion...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-muted/30 dark:bg-background">
      <ChatSidebar
        chatSessions={chatSessions}
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
        isLoading={sessionsLoading}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeChatId && !messagesLoading ? (
          <ChatAssistant
            key={activeChatId}
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
            {sessionsLoading || messagesLoading ? <p>Chargement des discussions...</p> :
              chatSessions.length > 0 ? <p>Sélectionnez un chat pour continuer ou créez-en un nouveau.</p> :
                <p>Créez un "Nouveau Chat" pour commencer.</p>}
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
              Sakai est un assistant IA polyvalent conçu pour vous aider dans diverses tâches :
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Répondre à vos questions et fournir des informations.</li>
                <li>Générer du texte créatif (emails, poèmes, scripts, pitchs).</li>
                <li>Raconter des blagues et des histoires captivantes.</li>
                <li>Générer des images à partir de vos descriptions (demandez naturellement).</li>
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

      <AlertDialog open={isAboutDialogOpen} onOpenChange={setIsAboutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">À propos de Sakai</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              <p className="mb-2">Sakai est votre assistant IA personnel, un grand modèle linguistique créé par Tantely, développé avec passion pour être intelligent, convivial et utile au quotidien.</p>
              <p className="mb-2">Il utilise les dernières avancées en matière d'intelligence artificielle pour vous offrir une expérience interactive et enrichissante.</p>
              <p>Version: 2.0.0 (Authentification Firebase & Firestore)</p>
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

      <AlertDialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">Contacter le développeur</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              <p>Vous pouvez contacter MAMPIONONTIAKO Tantely Etienne Théodore via WhatsApp :</p>
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
