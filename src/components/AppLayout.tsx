'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import type { TabType } from '@/types/dashboard';

const NO_SIDEBAR_PATHS = ['/login', '/register'];

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType | null>(null);

    const showSidebar = status === 'authenticated' &&
        !NO_SIDEBAR_PATHS.some(p => pathname.startsWith(p));

    // Sync activeTab with current path
    useEffect(() => {
        if (pathname.startsWith('/dashboard')) {
            const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
            const validTabs: TabType[] = ['available', 'my-quizzes', 'quiz-score', 'admin'];
            setActiveTab(validTabs.includes(hash as TabType) ? (hash as TabType) : 'available');
        } else {
            // Sur les autres pages, aucun tab actif (les liens href gèrent leur propre état via usePathname)
            setActiveTab(null);
        }
    }, [pathname]);

    if (!showSidebar) return <>{children}</>;

    return (
        <div className="min-h-screen bg-gray-50 flex">

            {/* Overlay mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-20 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <Sidebar
                activeTab={activeTab}
                onTabChange={(tab) => {
                    setActiveTab(tab);
                    if (!pathname.startsWith('/dashboard')) {
                        router.push(`/dashboard#${tab}`);
                    } else {
                        window.history.replaceState(null, '', `/dashboard#${tab}`);
                        window.dispatchEvent(new HashChangeEvent('hashchange'));
                    }
                }}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                userRole={session?.user?.role}
                userName={session?.user?.name}
                userEmail={session?.user?.email}
            />

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Topbar mobile */}
                <div className="md:hidden flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
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
