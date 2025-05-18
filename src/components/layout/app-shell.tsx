// src/components/layout/app-shell.tsx
"use client";

import type { ReactNode } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { SidebarNav } from './sidebar-nav';
import { LifeInsightsLogo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { Settings, LogOut } from 'lucide-react';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider defaultOpen={true} collapsible="icon">
      <Sidebar variant="sidebar" side="left" className="border-r">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <LifeInsightsLogo className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-semibold">Perspectives de Vie</h1>
          </div>
        </SidebarHeader>
        <SidebarContent className="flex-1 p-2">
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter className="p-2">
          {/* Placeholder for settings or user actions */}
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Settings className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden">Paramètres</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2">
            <LogOut className="h-4 w-4" />
             <span className="group-data-[collapsible=icon]:hidden">Déconnexion</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md md:hidden">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
             <LifeInsightsLogo className="h-6 w-6 text-primary" />
             <h1 className="text-lg font-semibold">Perspectives de Vie</h1>
          </div>
        </header>
        <main className="flex-1 flex-col p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
