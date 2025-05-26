
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { ClientLayoutWrapper } from '@/components/layout/client-layout-wrapper';

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
        <div> {/* Simple wrapper div */}
          <ClientLayoutWrapper>
            {children}
          </ClientLayoutWrapper>
        </div>
      </body>
    </html>
  );
}
