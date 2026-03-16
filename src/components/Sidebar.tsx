'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { generateCode } from '@/lib/utils';
import type { TabType } from '@/types/dashboard';

const QUIZ_NAV_ITEMS: { label: string; icon: string; href?: string }[] = [
    { label: 'Quiz disponibles', icon: '🎯', href: '/quiz/available' },
    { label: 'Mes quiz', icon: '📝', href: '/quiz/my-quizzes' },
    { label: '', icon: '' },
    { label: 'Générer un quiz (IA)', icon: '✨', href: '/quiz/generate' },
    { label: 'Créer un quiz', icon: '➕', href: '/quiz/create' },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    isAuthenticated: boolean;
    userRole?: string;
    userName?: string | null;
    userEmail?: string | null;
}

export default function Sidebar({ isOpen, onClose, isAuthenticated, userRole, userName, userEmail }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(true);
    const [quizMenuOpen, setQuizMenuOpen] = useState(false);
    const [lobbyMenuOpen, setLobbyMenuOpen] = useState(false);

    const quizSectionActive = QUIZ_NAV_ITEMS.some(n => n.href && pathname.startsWith(n.href));
    const isCreatingLobby = pathname.startsWith('/lobby/create/');
    const lobbySectionActive = pathname.startsWith('/lobby/');

    useEffect(() => {
        if (quizSectionActive) setQuizMenuOpen(true);
        if (lobbySectionActive) setLobbyMenuOpen(true);
    }, [quizSectionActive, lobbySectionActive]);

    return (
        <aside className={`
            fixed top-0 left-0 h-full bg-white dark:bg-gray-900 shadow-xl z-30 flex flex-col
            transition-all duration-300
            ${collapsed ? 'w-16' : 'w-64'}
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            md:translate-x-0 md:sticky md:top-0 md:h-screen md:shadow-none md:border-r md:border-gray-200 dark:border-gray-700
        `}>

            {/* Header */}
            <div className="px-3 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                {!collapsed && (
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                            {isAuthenticated ? 'Dashboard' : 'Menu'}
                        </h1>
                        {isAuthenticated && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{userName ?? userEmail}</p>
                        )}
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(prev => !prev)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 dark:text-gray-500 flex-shrink-0"
                    title={collapsed ? 'Ouvrir' : 'Réduire'}
                >
                    {collapsed ? '→' : '←'}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">

                {/* ── Lobby ── */}
                {isAuthenticated && (
                    <div>
                        <button
                            onClick={() => { if (collapsed) setCollapsed(false); else setLobbyMenuOpen(prev => !prev); }}
                            title="Lobby"
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
                                ${lobbySectionActive
                                    ? 'bg-green-50 text-green-700'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            <span className="text-base flex-shrink-0">🎮</span>
                            {!collapsed && (
                                <>
                                    <span>Lobby</span>
                                    <span className={`ml-auto text-xs transition-transform duration-200 ${lobbyMenuOpen ? 'rotate-180' : ''}`}>▾</span>
                                </>
                            )}
                        </button>

                        {!collapsed && lobbyMenuOpen && (
                            <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-gray-100 dark:border-gray-700 pl-3">
                                <Link href={`/lobby/create/${generateCode(8)}`}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left
                ${isCreatingLobby
                                            ? 'bg-green-50 text-green-700'
                                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    <span className="text-sm">➕</span>
                                    Créer un lobby
                                    {isCreatingLobby && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500" />}
                                </Link>
                                <Link href="/lobby/all"
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left
                ${pathname === '/lobby/all'
                                            ? 'bg-green-50 text-green-700'
                                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    <span className="text-sm">🔍</span>
                                    Voir les lobbies
                                    {pathname === '/lobby/all' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500" />}
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Quiz ── */}
                <div>
                    <button
                        onClick={() => { if (collapsed) setCollapsed(false); else setQuizMenuOpen(prev => !prev); }}
                        title="Quiz"
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
                            ${quizSectionActive
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        <span className="text-base flex-shrink-0">🎯</span>
                        {!collapsed && (
                            <>
                                <span>Quiz</span>
                                <span className={`ml-auto text-xs transition-transform duration-200 ${quizMenuOpen ? 'rotate-180' : ''}`}>▾</span>
                            </>
                        )}
                    </button>

                    {!collapsed && quizMenuOpen && (
                        <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-gray-100 dark:border-gray-700 pl-3">
                            {isAuthenticated ? (
                                QUIZ_NAV_ITEMS.map((item, i) => {
                                    if (!item.label) return <div key={i} className="border-t border-gray-100 dark:border-gray-700 my-1" />;
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link key={item.href} href={item.href!}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive
                                                    ? 'bg-blue-50 text-blue-700'
                                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                                }`}
                                        >
                                            <span className="text-sm">{item.icon}</span>
                                            {item.label}
                                            {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                        </Link>
                                    );
                                })
                            ) : (
                                <Link href="/quiz/available"
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left
        ${pathname === '/quiz/available'
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    <span className="text-sm">🎯</span>
                                    Quiz disponibles
                                    {pathname === '/quiz/available' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                </Link>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Leaderboard ── */}
                <Link href="/leaderboard/uno"
                    title="Leaderboard"
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
        ${pathname.startsWith('/leaderboard/')
                            ? 'bg-yellow-50 text-yellow-700'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                        }`}
                >
                    <span className="text-base flex-shrink-0">🏆</span>
                    {!collapsed && (
                        <>
                            <span>Leaderboard</span>
                            {pathname.startsWith('/leaderboard/') && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-yellow-500" />}
                        </>
                    )}
                </Link>

                {/* ── Dashboard ── */}
                {isAuthenticated && (
                    <Link href="/dashboard"
                        title="Dashboard"
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
            ${pathname === '/dashboard'
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        <span className="text-base flex-shrink-0">🎛️</span>
                        {!collapsed && (
                            <>
                                <span>Dashboard</span>
                                {pathname === '/dashboard' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
                            </>
                        )}
                    </Link>
                )}

                {/* ── Paramètres ── */}
                <Link href="/settings"
                    title="Paramètres"
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
        ${pathname === '/settings'
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                        }`}
                >
                    <span className="text-base flex-shrink-0">⚙️</span>
                    {!collapsed && (
                        <>
                            <span>Paramètres</span>
                            {pathname === '/settings' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gray-500" />}
                        </>
                    )}
                </Link>

                {/* ── Admin ── */}
                {isAuthenticated && userRole === 'ADMIN' && (
                    <Link href="/admin"
                        title="Admin"
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
            ${pathname === '/admin'
                                ? 'bg-red-50 text-red-700'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        <span className="text-base flex-shrink-0">🛡️</span>
                        {!collapsed && 'Admin'}
                        {!collapsed && pathname === '/admin' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500" />}
                    </Link>
                )}

                {/* ── Connexion (non connectés) ── */}
                {!isAuthenticated && (
                    <Link href="/login"
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
                            ${pathname === '/login'
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        <span className="text-base flex-shrink-0">🔐</span>
                        {!collapsed && 'Se connecter'}
                    </Link>
                )}
            </nav>
        </aside>
    );
}
