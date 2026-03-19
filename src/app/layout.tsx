// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AppLayout from '@/components/AppLayout';
import { ChatProvider } from '@/context/ChatContext';
import FloatingChat from '@/components/FloatingChat';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Quiz App - Testez vos connaissances',
  description: 'Application de quiz interactive avec classements',
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <ChatProvider>
            <Header />
            <AppLayout>{children}</AppLayout>
            <Footer />
            <FloatingChat />
          </ChatProvider>
        </Providers>
      </body>
    </html>
  );
}
