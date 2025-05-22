
"use client";

import { useState, useEffect, type ReactNode } from 'react';
import { ThemeProvider } from "next-themes";
import { AppShell } from '@/components/layout/app-shell';
import { Toaster } from "@/components/ui/toaster";
// Loader2 is not rendered initially if we return null
// import { Loader2 } from 'lucide-react';

interface ClientLayoutWrapperProps {
  children: ReactNode;
}

export function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Render nothing on the server and on the initial client render pass
    // This can help avoid hydration mismatches for content within the body
    // when external scripts (like browser extensions) heavily modify the body tag itself.
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
