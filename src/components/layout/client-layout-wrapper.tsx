
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
    // Render nothing on the server and during initial client-side render to prevent hydration mismatch
    // A simple loader could also be returned here if preferred, but null is safest for hydration.
    return null; 
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark" // Changed from "system" to "dark"
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
