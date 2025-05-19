// src/components/layout/app-shell.tsx
import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
