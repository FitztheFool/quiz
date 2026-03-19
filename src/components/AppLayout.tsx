// src/components/AppLayout.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import type { TabType } from '@/types/dashboard';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType | null>(null);

    // Sync activeTab with current path
    useEffect(() => {
        const updateActiveTab = () => {
            if (pathname.startsWith('/dashboard')) {
                const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
                const validTabs: TabType[] = ['available', 'my-quizzes', 'quiz-score', 'admin', 'lobbies'];
                setActiveTab(validTabs.includes(hash as TabType) ? (hash as TabType) : 'available');
            } else {
                setActiveTab(null);
            }
        };

        updateActiveTab();

        if (typeof window !== 'undefined') {
            window.addEventListener('hashchange', updateActiveTab);
            return () => window.removeEventListener('hashchange', updateActiveTab);
        }
    }, [pathname]);

    if (status === 'loading') return <>{children}</>;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">

            {/* Overlay mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-20 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                isAuthenticated={status === 'authenticated'}
                userRole={session?.user?.role}
                userName={session?.user?.name}
                userEmail={session?.user?.email}
            />

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Topbar mobile */}
                <div className="md:hidden flex items-center gap-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 sticky top-0 z-10">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        aria-label="Ouvrir le menu"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>

                <main className="flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}
