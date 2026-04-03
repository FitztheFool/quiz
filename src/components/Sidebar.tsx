// src/components/Sidebar.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const QUIZ_NAV_ITEMS: { label: string; icon: string; href?: string }[] = [
    { label: 'Quiz disponibles', icon: '🎯', href: '/quiz/available' },
    { label: 'Mes quiz', icon: '📝', href: '/quiz/my-quizzes' },
    { label: '', icon: '' },
    { label: 'Générer un quiz (IA)', icon: '✨', href: '/quiz/generate' },
    { label: 'Créer un quiz', icon: '➕', href: '/quiz/create' },
];

const INACTIVE = 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200';
const ACTIVE_STYLE = { item: 'text-gray-900 dark:text-white font-semibold', dot: 'bg-gray-900 dark:bg-white' };
const ACTIVE: Record<string, { item: string; dot: string }> = {
    blue: ACTIVE_STYLE, green: ACTIVE_STYLE, yellow: ACTIVE_STYLE, red: ACTIVE_STYLE, gray: ACTIVE_STYLE,
};

// ─── NavLink ──────────────────────────────────────────────────────────────────

function NavLink({ href, icon, label, isActive, collapsed, color }: {
    href: string; icon: string; label: string;
    isActive: boolean; collapsed: boolean; color: keyof typeof ACTIVE;
}) {
    const a = ACTIVE[color];
    return (
        <Link href={href} title={label}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${isActive ? a.item : INACTIVE}`}
        >
            <span className="text-base flex-shrink-0">{icon}</span>
            {!collapsed && (
                <>
                    <span>{label}</span>
                    {isActive && <span className={`ml-auto w-1.5 h-1.5 rounded-full ${a.dot}`} />}
                </>
            )}
        </Link>
    );
}

// ─── SubNavLink ───────────────────────────────────────────────────────────────

function SubNavLink({ href, icon, label, isActive, color }: {
    href: string; icon: string; label: string;
    isActive: boolean; color: keyof typeof ACTIVE;
}) {
    const a = ACTIVE[color];
    return (
        <Link href={href}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${isActive ? a.item : INACTIVE}`}
        >
            <span className="text-sm">{icon}</span>
            {label}
            {isActive && <span className={`ml-auto w-1.5 h-1.5 rounded-full ${a.dot}`} />}
        </Link>
    );
}

// ─── SectionToggle ────────────────────────────────────────────────────────────

function SectionToggle({ icon, label, isActive, isOpen, collapsed, color, onClick }: {
    icon: string; label: string; isActive: boolean; isOpen: boolean;
    collapsed: boolean; color: keyof typeof ACTIVE; onClick: () => void;
}) {
    const a = ACTIVE[color];
    return (
        <button onClick={onClick} title={label}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${isActive ? a.item : INACTIVE}`}
        >
            <span className="text-base flex-shrink-0">{icon}</span>
            {!collapsed && (
                <>
                    <span>{label}</span>
                    <span className={`ml-auto text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                </>
            )}
        </button>
    );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

interface SidebarProps {
    isOpen: boolean;
    onClose?: () => void;
    isAuthenticated: boolean;
    userRole?: string;
    userName?: string | null;
    userEmail?: string | null;
}

export default function Sidebar({ isOpen, isAuthenticated, userRole, userName, userEmail }: SidebarProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(true);
    const [quizMenuOpen, setQuizMenuOpen] = useState(false);
    const [lobbyMenuOpen, setLobbyMenuOpen] = useState(false);
    const [lobbyCode, setLobbyCode] = useState('');

    useEffect(() => { setLobbyCode(crypto.randomUUID()); }, []);

    const quizSectionActive = QUIZ_NAV_ITEMS.some(n => n.href && pathname.startsWith(n.href));
    const isCreatingLobby = pathname.startsWith('/lobby/create/');
    const lobbySectionActive = pathname.startsWith('/lobby/');

    useEffect(() => {
        if (quizSectionActive) setQuizMenuOpen(true);
        if (lobbySectionActive) setLobbyMenuOpen(true);
    }, [quizSectionActive, lobbySectionActive]);

    useEffect(() => {
        const isDesktop = window.matchMedia('(min-width: 768px)').matches;

        if (isDesktop && pathname.startsWith('/dashboard')) {
            setCollapsed(false);
        }
    }, [pathname]);

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
                        {isAuthenticated ? (
                            <Link href="/dashboard" className="text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                Dashboard
                            </Link>
                        ) : (
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Menu</h1>
                        )}
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
                        <SectionToggle
                            icon="🎮" label="Lobby"
                            isActive={lobbySectionActive} isOpen={lobbyMenuOpen}
                            collapsed={collapsed} color="green"
                            onClick={() => { if (collapsed) setCollapsed(false); else setLobbyMenuOpen(prev => !prev); }}
                        />
                        {!collapsed && lobbyMenuOpen && (
                            <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-gray-100 dark:border-gray-700 pl-3">
                                <SubNavLink href={`/lobby/create/${lobbyCode}`} icon="➕" label="Créer un lobby" isActive={isCreatingLobby} color="green" />
                                <SubNavLink href="/lobby/all" icon="🔍" label="Voir les lobbies" isActive={pathname === '/lobby/all'} color="green" />
                            </div>
                        )}
                    </div>
                )}

                {/* ── Quiz ── */}
                <div>
                    <SectionToggle
                        icon="🎯" label="Quiz"
                        isActive={quizSectionActive} isOpen={quizMenuOpen}
                        collapsed={collapsed} color="blue"
                        onClick={() => { if (collapsed) setCollapsed(false); else setQuizMenuOpen(prev => !prev); }}
                    />
                    {!collapsed && quizMenuOpen && (
                        <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-gray-100 dark:border-gray-700 pl-3">
                            {isAuthenticated ? (
                                QUIZ_NAV_ITEMS.map((item, i) => {
                                    if (!item.label) return <div key={i} className="border-t border-gray-100 dark:border-gray-700 my-1" />;
                                    return <SubNavLink key={item.href} href={item.href!} icon={item.icon} label={item.label} isActive={pathname === item.href} color="blue" />;
                                })
                            ) : (
                                <SubNavLink href="/quiz/available" icon="🎯" label="Quiz disponibles" isActive={pathname === '/quiz/available'} color="blue" />
                            )}
                        </div>
                    )}
                </div>

                {/* ── Leaderboard ── */}
                <NavLink href="/leaderboard/uno" icon="🏆" label="Leaderboard" isActive={pathname.startsWith('/leaderboard/')} collapsed={collapsed} color="yellow" />

                {/* ── Dashboard ── */}
                {isAuthenticated && (
                    <NavLink href="/dashboard" icon="🎛️" label="Dashboard" isActive={pathname === '/dashboard'} collapsed={collapsed} color="blue" />
                )}

                {/* ── Paramètres ── */}
                <NavLink href="/settings" icon="⚙️" label="Paramètres" isActive={pathname === '/settings'} collapsed={collapsed} color="gray" />

                {/* ── Admin ── */}
                {isAuthenticated && userRole === 'ADMIN' && (
                    <NavLink href="/admin" icon="🛡️" label="Admin" isActive={pathname === '/admin'} collapsed={collapsed} color="red" />
                )}

                {/* ── Connexion (non connectés) ── */}
                {!isAuthenticated && (
                    <NavLink href="/login" icon="🔐" label="Se connecter" isActive={pathname === '/login'} collapsed={collapsed} color="blue" />
                )}
            </nav>
        </aside>
    );
}
