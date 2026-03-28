// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import Header from '@/components/Layout/Header';
import Footer from '@/components/Layout/Footer';
import AppLayout from '@/components/Layout/AppLayout';
import { ChatProvider } from '@/context/ChatContext';
import FloatingChat from '@/components/Chat/FloatingChat';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Quiz App - Testez vos connaissances',
  description: 'Application de quiz interactive avec classements',
  icons: {
    icon: [
      { url: '/logo/favicon.ico', sizes: 'any' },
      { url: '/logo/icon-light.svg', type: 'image/svg+xml' },
    ],
    apple: { url: '/logo/icon-light-192.png', sizes: '192x192' },
  },
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
