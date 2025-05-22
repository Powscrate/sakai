
// src/components/chat/chat-sidebar.tsx
"use client";

import Link from 'next/link';
import NextImage from 'next/image';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain, SlidersHorizontal, Info, Trash2, LogOut, Menu, Plus,
  MessageSquare, Contact, Zap, User as UserIcon, Settings, PanelLeftClose, 
  PanelRightClose, Lightbulb, Edit3, Check, X, ChevronsUpDown
} from 'lucide-react';
import { SakaiLogo } from '@/components/icons/logo';
import type { ChatSession, AIPersonality } from '@/app/page'; 
import { aiPersonalities } from '@/app/page';
import { cn } from '@/lib/utils';
import { ThemeToggleButton } from './theme-toggle-button';
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useRouter } from 'next/navigation'; 
import React from 'react';

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
  isSidebarCollapsed: boolean;
  toggleSidebarCollapse: () => void;
  sakaiCurrentThought: string | null; 
  isDevSakaiAmbianceEnabled: boolean; 
  userAvatarUrl: string | null;
  editingChatId: string | null;
  editingChatTitle: string;
  onStartEditingChatTitle: (chat: ChatSession) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  setEditingChatTitle: (title: string) => void;
  setEditingChatId: (id: string | null) => void;
  currentPersonality: AIPersonality;
  onPersonalityChange: (personality: AIPersonality) => void;
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
  isSidebarCollapsed,
  toggleSidebarCollapse,
  sakaiCurrentThought,
  isDevSakaiAmbianceEnabled,
  userAvatarUrl,
  editingChatId,
  editingChatTitle,
  onStartEditingChatTitle,
  onRenameChat,
  setEditingChatTitle,
  setEditingChatId,
  currentPersonality,
  onPersonalityChange,
}: ChatSidebarProps) {
  const router = useRouter();

  const optionsMenuItems = [
    { label: "Profil", icon: UserIcon, action: () => router.push('/profile') },
    { label: "Panneau de Mémoire", icon: Brain, action: onOpenMemoryDialog },
    { label: "Mode Développeur", icon: SlidersHorizontal, action: onOpenDevSettingsDialog },
    { label: "Fonctionnalités", icon: Zap, action: onOpenFeaturesDialog },
    { label: "Contacter", icon: Contact, action: onOpenContactDialog },
    { label: "À propos de Sakai", icon: Info, action: onOpenAboutDialog },
  ];

  const handleTitleEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, chatId: string) => {
    if (event.key === 'Enter') {
      onRenameChat(chatId, editingChatTitle);
    } else if (event.key === 'Escape') {
      setEditingChatId(null);
    }
  };

  const sidebarContent = (
    <div className={cn(
      "flex flex-col h-full bg-card text-card-foreground border-r shadow-lg transition-all duration-300 ease-in-out",
      isSidebarCollapsed ? "w-20 items-center" : "w-72" 
    )}>
      <div className={cn("p-3 border-b", isSidebarCollapsed ? "h-[69px] flex justify-center items-center" : "flex items-center justify-between w-full")}>
        <Link href="/" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
            {userAvatarUrl ? (
                 <NextImage src={userAvatarUrl} alt="User Avatar" width={32} height={32} className="h-8 w-8 rounded-full object-cover shrink-0" data-ai-hint="user avatar small"/>
            ) : (
                <SakaiLogo className="h-8 w-8 text-primary shrink-0" />
            )}
          {!isSidebarCollapsed && <h1 className="text-xl font-semibold truncate">Sakai</h1>}
        </Link>
        {!isSidebarCollapsed && (
           <Button variant="ghost" size="icon" onClick={toggleSidebarCollapse} className="hidden md:flex h-8 w-8">
            <PanelLeftClose className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className={cn("p-3", isSidebarCollapsed ? "mt-0 w-full flex justify-center" : "")}>
        <Button 
          onClick={() => { onNewChat(); setIsMobileMenuOpen(false); }} 
          className={cn("w-full transition-colors duration-150 ease-in-out", isSidebarCollapsed ? "px-0 aspect-square h-12 w-12" : "")} 
          aria-label={isSidebarCollapsed ? "Nouveau Chat" : undefined}
        >
          <Plus className={cn(isSidebarCollapsed ? "" : "mr-2", "h-5 w-5")} /> 
          {!isSidebarCollapsed && "Nouveau Chat"}
        </Button>
      </div>

      {isDevSakaiAmbianceEnabled && sakaiCurrentThought && !isSidebarCollapsed && (
        <div className="px-3 py-2 text-xs text-muted-foreground italic border-b border-dashed mx-2 my-1 text-center">
          <Lightbulb className="inline h-3 w-3 mr-1 text-primary/70" /> {sakaiCurrentThought}
        </div>
      )}

      <ScrollArea className="flex-1 px-3 mb-2">
        <div className="space-y-1">
          {chatSessions.length === 0 && !isSidebarCollapsed && (
            <p className="text-xs text-muted-foreground p-2 text-center">Aucune session.</p>
          )}
          {chatSessions.map((session) => (
            <div key={session.id} className="group relative">
              {editingChatId === session.id ? (
                <div className="flex items-center gap-1 p-1">
                  <Input
                    type="text"
                    value={editingChatTitle}
                    onChange={(e) => setEditingChatTitle(e.target.value)}
                    onKeyDown={(e) => handleTitleEditKeyDown(e, session.id)}
                    onBlur={() => onRenameChat(session.id, editingChatTitle)}
                    className="h-8 text-sm flex-grow"
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRenameChat(session.id, editingChatTitle)}><Check className="h-4 w-4 text-green-500" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingChatId(null)}><X className="h-4 w-4 text-red-500" /></Button>
                </div>
              ) : (
                <Button
                  variant={activeChatId === session.id ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start h-9 text-sm transition-colors duration-150 ease-in-out",
                    isSidebarCollapsed ? "px-0 aspect-square flex items-center justify-center h-10 w-10" : "truncate pr-12" 
                  )}
                  onClick={() => { onSelectChat(session.id); setIsMobileMenuOpen(false); }}
                  title={session.title}
                  aria-label={isSidebarCollapsed ? session.title : undefined}
                >
                  <MessageSquare className={cn(isSidebarCollapsed ? "" : "mr-2 shrink-0", "h-4 w-4")} />
                  {!isSidebarCollapsed && (session.title || "Nouveau Chat")}
                </Button>
              )}
              {!isSidebarCollapsed && editingChatId !== session.id && chatSessions.length > 0 && ( 
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); onStartEditingChatTitle(session); }}
                    aria-label="Renommer le chat"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDeleteChat(session.id); }}
                    aria-label="Supprimer le chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {!isSidebarCollapsed && (
          <div className="px-3 pt-1 pb-2 border-t">
            <Label htmlFor="ai-personality-select" className="text-xs text-muted-foreground mb-1 block">Personnalité de Sakai</Label>
            <Select value={currentPersonality} onValueChange={onPersonalityChange}>
              <SelectTrigger id="ai-personality-select" className="h-9 text-sm">
                <SelectValue placeholder="Choisir personnalité..." />
              </SelectTrigger>
              <SelectContent>
                {aiPersonalities.map(p => (
                  <SelectItem key={p} value={p} className="text-sm">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}


      <div className={cn("mt-auto p-3 border-t", isSidebarCollapsed ? "flex flex-col items-center space-y-2" : "space-y-1.5")}>
         <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" className={cn("w-full text-sm transition-colors duration-150 ease-in-out", isSidebarCollapsed ? "px-0 aspect-square h-10 w-10" : "justify-start")}>
              <Settings className={cn(isSidebarCollapsed ? "" : "mr-2", "h-5 w-5")} />
              {!isSidebarCollapsed && "Options & Plus"}
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            side="top" 
            align={isSidebarCollapsed ? "start" : "center"} 
            className="w-64 p-2 mb-2 rounded-lg shadow-xl bg-popover"
            style={{ animation: 'slideUpAndFade 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <div className="space-y-1">
              {optionsMenuItems.map(item => (
                <Button
                  key={item.label}
                  variant="ghost"
                  className="w-full justify-start text-sm h-9 transition-colors duration-150 ease-in-out"
                  onClick={() => { item.action(); if (isMobileMenuOpen) setIsMobileMenuOpen(false); }}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              ))}
              <DropdownMenuSeparator />
              <div className={cn("pt-1 flex justify-center", isSidebarCollapsed ? "" : "")}>
                 <ThemeToggleButton />
              </div>
              <Button variant="outline" className="w-full text-sm h-9 mt-1 transition-colors duration-150 ease-in-out" onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
       {isSidebarCollapsed && (
        <div className="p-3 border-t">
          <Button variant="ghost" size="icon" onClick={toggleSidebarCollapse} className="w-full h-10 transition-colors duration-150 ease-in-out">
            <PanelRightClose className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden md:block shrink-0 transition-all duration-300 ease-in-out fixed top-0 left-0 h-full z-20",
        isSidebarCollapsed ? "w-20" : "w-72"
      )}>
        {sidebarContent}
      </div>

      {/* Mobile Menu Button */}
      <Button 
        variant="outline" 
        size="icon" 
        onClick={() => setIsMobileMenuOpen(true)} 
        aria-label="Ouvrir le menu"
        className="md:hidden fixed top-3 left-3 z-50 h-10 w-10 rounded-md bg-card/80 backdrop-blur-sm shadow-md"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Sheet Sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-72 border-r-0 flex"> 
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </>
  );
}
