
"use client";

import { useState, useEffect, type ReactNode } from 'react';
import { ThemeProvider } from "next-themes";
import { AppShell } from '@/components/layout/app-shell';
import { Toaster } from "@/components/ui/toaster";

interface ClientLayoutWrapperProps {
  children: ReactNode;
}

export function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AppShell>
        {children}
      </AppShell>
      <Toaster />
    </ThemeProvider>
  );
}
