
import type { Metadata } from 'next';
// Corrected import and usage for Geist Sans font
import { GeistSans } from 'geist/font/sans';
import './globals.css';
// AppShell and Toaster will be rendered by ClientLayoutWrapper, ThemeProvider too.
import { ClientLayoutWrapper } from '@/components/layout/client-layout-wrapper';

// GeistSans from 'geist/font/sans' is an object containing font details,
// including the CSS variable name. It's not a function to be called.
// The .variable property directly gives us the CSS variable name.
// The geist/font package automatically injects the necessary CSS to define this variable
// when the class (which is the variable name) is applied to an element.

export const metadata: Metadata = {
  title: 'Sakai AI Assistant',
  description: 'Sakai - Votre assistant IA personnel et intelligent.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={GeistSans.variable} suppressHydrationWarning>
      <body className="antialiased"> {/* Tailwind's antialiased class */}
        <ClientLayoutWrapper>
          {children}
        </ClientLayoutWrapper>
      </body>
    </html>
  );
}
