import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
// AppShell and Toaster will be rendered by ClientLayoutWrapper, ThemeProvider too.
import { ClientLayoutWrapper } from '@/components/layout/client-layout-wrapper';


// Initialize GeistSans. The .variable property gives us the CSS variable name.
// The geist/font package automatically injects the necessary CSS to define this variable
// when the class (which is the variable name) is applied to an element.
// Default subsets (like 'latin') are usually included automatically.

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
