// src/app/layout.tsx
import type { Metadata } from 'next';
import { Barlow, DM_Sans } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import Header from '@/components/Layout/Header';
import Footer from '@/components/Layout/Footer';
import AppLayout from '@/components/Layout/AppLayout';
import { ChatProvider } from '@/context/ChatContext';
import { CommandPaletteProvider } from '@/context/CommandPaletteContext';
import CommandPalette from '@/components/CommandPalette';
import FloatingChat from '@/components/Chat/FloatingChat';

const barlow = Barlow({
    subsets: ['latin'],
    variable: '--font-heading',
    weight: ['600', '700', '800'],
    display: 'swap',
});

const dmSans = DM_Sans({
    subsets: ['latin'],
    variable: '--font-body',
    weight: ['400', '500', '600'],
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Kwizar',
    description: 'Application de jeux solo et multijoueurs',
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
        <html lang="fr" suppressHydrationWarning className={`${barlow.variable} ${dmSans.variable}`}>
            <body className={dmSans.className}>
                <Providers>
                    <ChatProvider>
                        <CommandPaletteProvider>
                            <Header />
                            <AppLayout>{children}</AppLayout>
                            <Footer />
                            <FloatingChat />
                            <CommandPalette />
                        </CommandPaletteProvider>
                    </ChatProvider>
                </Providers>
            </body>
        </html>
    );
}
