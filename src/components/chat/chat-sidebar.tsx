
// src/components/chat/chat-sidebar.tsx
"use client";

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Brain, SlidersHorizontal, Info, Trash2, LogOut, Menu, Plus,
  ChevronDown, ChevronUp, MessageSquare, Contact, Zap, User as UserIcon, Settings, PanelLeftClose, PanelRightClose
} from 'lucide-react';
import { SakaiLogo } from '@/components/icons/logo';
import type { ChatSession } from '@/app/page'; 
import { cn } from '@/lib/utils';
import { ThemeToggleButton } from './theme-toggle-button';
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useRouter } from 'next/navigation'; 

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

  const sidebarContent = (
    <div className={cn(
      "flex flex-col h-full bg-card text-card-foreground border-r transition-all duration-300 ease-in-out",
      isSidebarCollapsed ? "w-20" : "w-72"
    )}>
      <div className={cn("p-4 border-b", isSidebarCollapsed ? "h-[69px]" : "")}>
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
            <SakaiLogo className="h-8 w-8 text-primary shrink-0" />
            {!isSidebarCollapsed && <h1 className="text-xl font-semibold truncate">Sakai</h1>}
          </Link>
          {!isSidebarCollapsed && (
             <Button variant="ghost" size="icon" onClick={toggleSidebarCollapse} className="hidden md:flex h-8 w-8">
              <PanelLeftClose className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      <div className={cn("p-3", isSidebarCollapsed ? "mt-0" : "")}>
        <Button 
          onClick={() => { onNewChat(); setIsMobileMenuOpen(false); }} 
          className={cn("w-full", isSidebarCollapsed ? "px-0 aspect-square" : "")}
          aria-label={isSidebarCollapsed ? "Nouveau Chat" : undefined}
        >
          <Plus className={cn(isSidebarCollapsed ? "" : "mr-2", "h-4 w-4")} />
          {!isSidebarCollapsed && "Nouveau Chat"}
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 mb-2">
        <div className="space-y-1">
          {chatSessions.length === 0 && !isSidebarCollapsed && (
            <p className="text-xs text-muted-foreground p-2 text-center">Aucune session.</p>
          )}
          {chatSessions.map((session) => (
            <div key={session.id} className="group relative">
              <Button
                variant={activeChatId === session.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start h-9 text-sm",
                  isSidebarCollapsed ? "px-0 aspect-square flex items-center justify-center" : "truncate pr-8"
                )}
                onClick={() => { onSelectChat(session.id); setIsMobileMenuOpen(false); }}
                title={session.title}
                aria-label={isSidebarCollapsed ? session.title : undefined}
              >
                <MessageSquare className={cn(isSidebarCollapsed ? "" : "mr-2 shrink-0", "h-4 w-4")} />
                {!isSidebarCollapsed && (session.title || "Nouveau Chat")}
              </Button>
              {!isSidebarCollapsed && chatSessions.length > 0 && ( 
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

      {/* Options Popover Trigger */}
      <div className={cn("mt-auto p-3 border-t", isSidebarCollapsed ? "flex flex-col items-center space-y-2" : "space-y-1.5")}>
         <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" className={cn("w-full text-sm", isSidebarCollapsed ? "px-0 aspect-square" : "justify-start")}>
              <Settings className={cn(isSidebarCollapsed ? "" : "mr-2", "h-4 w-4")} />
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
                  className="w-full justify-start text-sm h-9"
                  onClick={() => { item.action(); if (isMobileMenuOpen) setIsMobileMenuOpen(false); }}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              ))}
              <DropdownMenuSeparator />
              <div className={cn("pt-1", isSidebarCollapsed ? "mx-auto" : "")}>
                 <ThemeToggleButton />
              </div>
              <Button variant="outline" className="w-full text-sm h-9 mt-1" onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
       {isSidebarCollapsed && (
        <div className="p-3 border-t">
          <Button variant="ghost" size="icon" onClick={toggleSidebarCollapse} className="w-full h-10">
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
        "hidden md:block shrink-0 transition-all duration-300 ease-in-out",
        isSidebarCollapsed ? "w-20" : "w-72"
      )}>
        {sidebarContent}
      </div>

      {/* Mobile Sidebar Trigger */}
      <Button 
        variant="outline" 
        size="icon" 
        onClick={() => setIsMobileMenuOpen(true)} 
        aria-label="Ouvrir le menu"
        className="md:hidden fixed top-3 left-3 z-50 h-10 w-10 rounded-md bg-card/80 backdrop-blur-sm"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Sheet */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-72 border-r-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </>
  );
}

// @keyframes slideUpAndFade removed from here
