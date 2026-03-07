import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AppLayout from '@/components/AppLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Quiz App - Testez vos connaissances',
  description: 'Application de quiz interactive avec classements',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <Providers>
          <Header />
          <AppLayout>
            {children}
          </AppLayout>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
