import type { Metadata } from 'next';
import { Geist } from 'next/font/google'; // Geist_Mono no longer explicitly needed if not widely used
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes"; // Recommended for dark mode

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

// const geistMono = Geist_Mono({ // Can be removed if not primary font for code/mono elements
//   variable: '--font-geist-mono',
//   subsets: ['latin'],
// });

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
    <html lang="fr" suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased`}>
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
      </body>
    </html>
  );
}
