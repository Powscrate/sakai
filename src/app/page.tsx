// src/app/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ChatAssistant } from '@/components/chat/chat-assistant';
import { MemoryDialog } from '@/components/chat/memory-dialog';
import useLocalStorage from '@/hooks/use-local-storage';
import type { ChatMessage } from '@/ai/flows/chat-assistant-flow';
import { Loader2, Brain, SlidersHorizontal, Info, AlertTriangle, CheckCircle, Zap, Contact, MessageSquare } from 'lucide-react';
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

const CURRENT_USER_KEY = 'sakaiSimulatedUser';
const CHAT_SESSIONS_KEY = 'sakaiChatSessions_v2';
const ACTIVE_CHAT_ID_KEY = 'sakaiActiveChatId_v2';

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

interface User {
  id: string;
  name?: string;
  email: string;
}

const DEV_ACCESS_CODE = "1234566";

export default function ChatPage() {
  const [pageIsMounted, setPageIsMounted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const [user, setUser] = useLocalStorage<User | null>(CURRENT_USER_KEY, null);
  const [chatSessions, setChatSessions] = useLocalStorage<ChatSession[]>(CHAT_SESSIONS_KEY, []);
  const [activeChatId, setActiveChatId] = useLocalStorage<string | null>(ACTIVE_CHAT_ID_KEY, null);

  const [userMemory, setUserMemory] = useLocalStorage<string>('sakaiUserMemory', '');
  const [isMemoryDialogOpen, setIsMemoryDialogOpen] = useState(false);
  
  const [isFeaturesDialogOpen, setIsFeaturesDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  
  const [isDevCodePromptOpen, setIsDevCodePromptOpen] = useState(false);
  const [devCodeInput, setDevCodeInput] = useState('');
  const [isDevSettingsOpen, setIsDevSettingsOpen] = useState(false);

  const [devOverrideSystemPrompt, setDevOverrideSystemPrompt] = useLocalStorage<string>('sakaiDevOverrideSystemPrompt', '');
  const [devModelTemperature, setDevModelTemperature] = useLocalStorage<number | undefined>('sakaiDevModelTemperature', undefined);
  
  const [tempOverrideSystemPrompt, setTempOverrideSystemPrompt] = useState('');
  const [tempModelTemperature, setTempModelTemperature] = useState(0.7);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setPageIsMounted(true);
  }, []);
  
  useEffect(() => {
    if (pageIsMounted) {
      setTempOverrideSystemPrompt(devOverrideSystemPrompt);
      setTempModelTemperature(devModelTemperature ?? 0.7);
    }
  }, [devOverrideSystemPrompt, devModelTemperature, pageIsMounted]);

  const handleNewChat = useCallback(() => {
    if (!user) return; // Do not create new chat if no user
    const newChatId = `chat-${Date.now()}`;
    const newChatSession: ChatSession = {
      id: newChatId,
      title: "Nouveau Chat",
      messages: [],
      createdAt: Date.now(),
    };
    setChatSessions(prevSessions => [newChatSession, ...prevSessions]);
    setActiveChatId(newChatId);
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
  }, [user, setChatSessions, setActiveChatId, isMobileMenuOpen, setIsMobileMenuOpen]);

  useEffect(() => {
    if (!pageIsMounted) return;

    if (!user) {
      router.push('/auth/login');
    } else {
      if (chatSessions.length === 0) {
        handleNewChat();
      } else if (!activeChatId || !chatSessions.find(cs => cs.id === activeChatId)) {
         const firstValidSession = chatSessions.length > 0 ? chatSessions[0].id : null;
         if (firstValidSession) {
            setActiveChatId(firstValidSession);
         } else {
            // This case implies chatSessions became empty after user was validated, should be rare.
            handleNewChat();
         }
      }
    }
  }, [pageIsMounted, user, router, chatSessions, activeChatId, handleNewChat, setActiveChatId]);


  const activeChatMessages = chatSessions.find(cs => cs.id === activeChatId)?.messages || [];

  const handleMessagesUpdate = (updatedMessages: ChatMessage[]) => {
    setChatSessions(prevSessions =>
      prevSessions.map(session => {
        if (session.id === activeChatId) {
          let newTitle = session.title;
          if ((newTitle === "Nouveau Chat" || newTitle === "Nouvelle Discussion") && updatedMessages.length > 0) {
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

  const handleDeleteChat = (idToDelete: string) => {
    setChatSessions(prevSessions => {
      const newSessions = prevSessions.filter(session => session.id !== idToDelete);
      if (activeChatId === idToDelete) {
        if (newSessions.length > 0) {
          setActiveChatId(newSessions[0].id);
        } else {
          setActiveChatId(null); 
          // handleNewChat will be triggered by useEffect if user is still logged in
        }
      }
      return newSessions;
    });
    toast({ title: "Chat supprimé", description: "La session de chat a été supprimée." });
  };
  
  const handleLogout = () => {
    setUser(null); // Clears current user from localStorage via useLocalStorage hook
    setChatSessions([]); // Clear chat sessions for the logged out user
    setActiveChatId(null); // Clear active chat id
    // The useEffect above will detect user is null and redirect to /auth/login
    toast({ title: "Déconnexion", description: "Vous avez été déconnecté."});
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

  if (!pageIsMounted || (!user && router.pathname !== '/auth/login' && router.pathname !== '/auth/signup')) { 
    return (
      <div className="flex flex-col h-screen bg-background text-foreground items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Chargement de Sakai...</p>
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
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeChatId ? (
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
           <div className="flex-1 flex items-center justify-center text-muted-foreground">
            {chatSessions.length > 0 ? <p>Sélectionnez un chat pour continuer.</p> : <p>Cliquez sur "Nouveau Chat" pour commencer.</p>}
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
            <AlertDialogTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary"/>À propos de Sakai</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              <p className="mb-2">Sakai est votre assistant IA personnel, un grand modèle linguistique codé par Tantely, développé avec passion pour être intelligent, convivial et utile au quotidien.</p>
              <p className="mb-2">Il utilise les dernières avancées en matière d'intelligence artificielle (via Genkit et les modèles Gemini de Google) pour vous offrir une expérience interactive et enrichissante.</p>
              <p>Version: 1.8.0 (Authentification & Personnalisation)</p>
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
            <AlertDialogTitle className="flex items-center gap-2"><Contact className="h-5 w-5 text-primary"/>Contacter le développeur</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              <p>Vous pouvez contacter MAMPIONONTIAKO Tantely Etienne Théodore via WhatsApp :</p>
              <Button variant="link" asChild className="text-lg p-0 h-auto mt-2">
                <a href="https://wa.me/261343775058" target="_blank" rel="noopener noreferrer">
                  <MessageSquare className="mr-2 h-5 w-5" /> +261 34 37 750 58
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
            <AlertDialogCancel onClick={() => {setDevCodeInput(''); setIsDevCodePromptOpen(false);}}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDevCodeCheck}>Valider</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDevSettingsOpen} onOpenChange={setIsDevSettingsOpen}>
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
                    <Button type="button" variant="ghost" onClick={()=> {
                      if (pageIsMounted) {
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
