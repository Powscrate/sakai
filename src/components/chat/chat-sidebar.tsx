// src/components/chat/chat-sidebar.tsx
"use client";

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Brain, SlidersHorizontal, Info, Trash2, LogOut, Menu, Plus,
  ChevronDown, ChevronUp, MessageSquare, Contact, Zap, Sparkles, FileText, 
  Image as ImageIconLucide, Laugh, Lightbulb, Languages, MessageSquarePlus, Brush, Loader2, User as UserIcon
} from 'lucide-react';
import { SakaiLogo } from '@/components/icons/logo';
import type { ChatSession } from '@/app/page'; 
import { cn } from '@/lib/utils';
import { ThemeToggleButton } from './theme-toggle-button';
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

interface ChatSidebarProps {
  chatSessions: ChatSession[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onLogout: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  onOpenMemoryDialog: () => void;
  onOpenDevSettingsDialog: () => void;
  onOpenFeaturesDialog: () => void;
  onOpenAboutDialog: () => void;
  onOpenContactDialog: () => void;
  isLoading: boolean; 
}

export function ChatSidebar({
  chatSessions,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onLogout,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  onOpenMemoryDialog,
  onOpenDevSettingsDialog,
  onOpenFeaturesDialog,
  onOpenAboutDialog,
  onOpenContactDialog,
  isLoading,
}: ChatSidebarProps) {

  const sidebarContent = (
    <div className="flex flex-col h-full bg-card text-card-foreground border-r">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
            <SakaiLogo className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-semibold">Sakai</h1>
          </Link>
        </div>
      </div>

      <div className="p-3">
        <Button onClick={() => { onNewChat(); setIsMobileMenuOpen(false); }} className="w-full">
          <Plus className="mr-2 h-4 w-4" /> Nouveau Chat
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 mb-2">
        <div className="space-y-1">
          {isLoading && (
            <div className="flex justify-center items-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="ml-2 text-sm text-muted-foreground">Chargement...</p>
            </div>
          )}
          {!isLoading && chatSessions.length === 0 && (
            <p className="text-xs text-muted-foreground p-2 text-center">Aucune session de chat.</p>
          )}
          {!isLoading && chatSessions.map((session) => (
            <div key={session.id} className="group relative">
              <Button
                variant={activeChatId === session.id ? "secondary" : "ghost"}
                className="w-full justify-start truncate pr-8 h-9 text-sm"
                onClick={() => { onSelectChat(session.id); setIsMobileMenuOpen(false); }}
                title={session.title}
              >
                {session.title || "Nouveau Chat"}
              </Button>
              {chatSessions.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDeleteChat(session.id); }}
                  aria-label="Supprimer le chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="mt-auto p-3 border-t space-y-1.5">
        <DropdownMenuSeparator className="my-1" /> 
        <p className="text-xs text-muted-foreground px-2 pt-1">Options</p>
        <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => { router.push('/profile'); setIsMobileMenuOpen(false); }}>
          <UserIcon className="mr-2 h-4 w-4" /> Profil
        </Button>
        <Button variant="ghost" className="w-full justify-start text-sm" onClick={onOpenMemoryDialog}>
          <Brain className="mr-2 h-4 w-4" /> Panneau de Mémoire
        </Button>
        <Button variant="ghost" className="w-full justify-start text-sm" onClick={onOpenDevSettingsDialog}>
          <SlidersHorizontal className="mr-2 h-4 w-4" /> Mode Développeur
        </Button>
        <Button variant="ghost" className="w-full justify-start text-sm" onClick={onOpenFeaturesDialog}>
          <Zap className="mr-2 h-4 w-4" /> Fonctionnalités
        </Button>
         <Button variant="ghost" className="w-full justify-start text-sm" onClick={onOpenContactDialog}>
          <Contact className="mr-2 h-4 w-4" /> Contacter
        </Button>
        <Button variant="ghost" className="w-full justify-start text-sm" onClick={onOpenAboutDialog}>
          <Info className="mr-2 h-4 w-4" /> À propos de Sakai
        </Button>
        <div className="pt-1">
          <ThemeToggleButton />
        </div>
        <Button variant="outline" className="w-full text-sm" onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Déconnexion
        </Button>
      </div>
    </div>
  );

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const router = require('next/navigation').useRouter(); // Temporary workaround for router in sidebar

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-72 shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar Trigger */}
      <div className="md:hidden p-2 fixed top-2 left-2 z-50">
        <Button variant="outline" size="icon" onClick={() => setIsMobileMenuOpen(true)} aria-label="Ouvrir le menu">
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Sheet */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-72 border-r-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </>
  );
}
