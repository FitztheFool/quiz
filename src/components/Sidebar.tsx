// src/components/Sidebar.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    SignalIcon,
    PlusIcon,
    MagnifyingGlassIcon,
    QuestionMarkCircleIcon,
    ListBulletIcon,
    BookmarkIcon,
    SparklesIcon,
    TrophyIcon,
    Squares2X2Icon,
    Cog6ToothIcon,
    ShieldCheckIcon,
    LockClosedIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/outline';

// ─── Types ────────────────────────────────────────────────────────────────────

type IconComponent = React.ComponentType<{ className?: string }>;
type Color = 'blue' | 'green' | 'yellow' | 'red' | 'gray';

const INACTIVE = 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200';
const ACTIVE_STYLE = 'text-gray-900 dark:text-white font-semibold';
const DOT = 'bg-gray-900 dark:bg-white';

// ─── NavLink ──────────────────────────────────────────────────────────────────

function NavLink({ href, Icon, label, isActive, collapsed }: {
    href: string; Icon: IconComponent; label: string;
    isActive: boolean; collapsed: boolean; color: Color;
}) {
    return (
        <Link href={href} title={label}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${isActive ? ACTIVE_STYLE : INACTIVE}`}
        >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && (
                <>
                    <span>{label}</span>
                    {isActive && <span className={`ml-auto w-1.5 h-1.5 rounded-full ${DOT}`} />}
                </>
            )}
        </Link>
    );
}

// ─── SubNavLink ───────────────────────────────────────────────────────────────

function SubNavLink({ href, Icon, label, isActive }: {
    href: string; Icon: IconComponent; label: string;
    isActive: boolean; color: Color;
}) {
    return (
        <Link href={href}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${isActive ? ACTIVE_STYLE : INACTIVE}`}
        >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
            {isActive && <span className={`ml-auto w-1.5 h-1.5 rounded-full ${DOT}`} />}
        </Link>
    );
}

// ─── SectionToggle ────────────────────────────────────────────────────────────

function SectionToggle({ Icon, label, isActive, isOpen, collapsed, onClick }: {
    Icon: IconComponent; label: string; isActive: boolean; isOpen: boolean;
    collapsed: boolean; color: Color; onClick: () => void;
}) {
    return (
        <button onClick={onClick} title={label}
            aria-label={collapsed ? label : undefined}
            aria-expanded={isOpen}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${isActive ? ACTIVE_STYLE : INACTIVE}`}
        >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && (
                <>
                    <span>{label}</span>
                    <ChevronDownIcon className={`ml-auto w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
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
    isAnonymous?: boolean;
}

export default function Sidebar({ isOpen, isAuthenticated, userRole, userName, userEmail, isAnonymous }: SidebarProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(true);
    const [hydrated, setHydrated] = useState(false);
    const [quizMenuOpen, setQuizMenuOpen] = useState(false);
    const [lobbyMenuOpen, setLobbyMenuOpen] = useState(false);
    const [lobbyCode, setLobbyCode] = useState('');

    useEffect(() => { setLobbyCode(crypto.randomUUID()); }, []);

    const quizSectionActive = ['/quiz/available', '/quiz/my-quizzes', '/quiz/generate', '/quiz/create'].some(p => pathname.startsWith(p));
    const isCreatingLobby = pathname.startsWith('/lobby/create/');
    const lobbySectionActive = pathname.startsWith('/lobby/');

    useEffect(() => {
        if (quizSectionActive) setQuizMenuOpen(true);
        if (lobbySectionActive) setLobbyMenuOpen(true);
    }, [quizSectionActive, lobbySectionActive]);

    useEffect(() => {
        const stored = localStorage.getItem('sidebar:collapsed');
        if (stored !== null) {
            setCollapsed(stored === '1');
        } else {
            const isDesktop = window.matchMedia('(min-width: 768px)').matches;
            if (isDesktop && pathname.startsWith('/dashboard')) setCollapsed(false);
        }
        setHydrated(true);
    }, [pathname]);

    const toggleCollapsed = () => {
        setCollapsed(prev => {
            const next = !prev;
            if (hydrated) localStorage.setItem('sidebar:collapsed', next ? '1' : '0');
            return next;
        });
    };

    const openIfCollapsed = () => {
        if (collapsed) {
            setCollapsed(false);
            if (hydrated) localStorage.setItem('sidebar:collapsed', '0');
        }
    };

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
                    onClick={toggleCollapsed}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 dark:text-gray-500 flex-shrink-0"
                    title={collapsed ? 'Ouvrir' : 'Réduire'}
                    aria-label={collapsed ? 'Ouvrir la barre latérale' : 'Réduire la barre latérale'}
                    aria-expanded={!collapsed}
                >
                    {collapsed
                        ? <ChevronRightIcon className="w-4 h-4" />
                        : <ChevronLeftIcon className="w-4 h-4" />
                    }
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">

                {/* ── Lobby ── */}
                {isAuthenticated && (
                    <div>
                        <SectionToggle
                            Icon={SignalIcon} label="Lobby"
                            isActive={lobbySectionActive} isOpen={lobbyMenuOpen}
                            collapsed={collapsed} color="green"
                            onClick={() => { if (collapsed) openIfCollapsed(); else setLobbyMenuOpen(prev => !prev); }}
                        />
                        {!collapsed && lobbyMenuOpen && (
                            <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-gray-100 dark:border-gray-700 pl-3">
                                <SubNavLink href={`/lobby/create/${lobbyCode}`} Icon={PlusIcon} label="Créer un lobby" isActive={isCreatingLobby} color="green" />
                                <SubNavLink href="/lobby/all" Icon={MagnifyingGlassIcon} label="Voir les lobbies" isActive={pathname === '/lobby/all'} color="green" />
                            </div>
                        )}
                    </div>
                )}

                {/* ── Quiz ── */}
                <div>
                    <SectionToggle
                        Icon={QuestionMarkCircleIcon} label="Quiz"
                        isActive={quizSectionActive} isOpen={quizMenuOpen}
                        collapsed={collapsed} color="blue"
                        onClick={() => { if (collapsed) openIfCollapsed(); else setQuizMenuOpen(prev => !prev); }}
                    />
                    {!collapsed && quizMenuOpen && (
                        <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-gray-100 dark:border-gray-700 pl-3">
                            {isAuthenticated ? (
                                <>
                                    <SubNavLink href="/quiz/available" Icon={ListBulletIcon} label="Quiz disponibles" isActive={pathname === '/quiz/available'} color="blue" />
                                    {!isAnonymous && <SubNavLink href="/quiz/my-quizzes" Icon={BookmarkIcon} label="Mes quiz" isActive={pathname === '/quiz/my-quizzes'} color="blue" />}
                                    <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                                    <SubNavLink href="/quiz/generate" Icon={SparklesIcon} label="Générer (IA)" isActive={pathname === '/quiz/generate'} color="blue" />
                                    <SubNavLink href="/quiz/create" Icon={PlusIcon} label="Créer un quiz" isActive={pathname === '/quiz/create'} color="blue" />
                                </>
                            ) : (
                                <SubNavLink href="/quiz/available" Icon={ListBulletIcon} label="Quiz disponibles" isActive={pathname === '/quiz/available'} color="blue" />
                            )}
                        </div>
                    )}
                </div>

                {/* ── Leaderboard ── */}
                <NavLink href="/leaderboard/uno" Icon={TrophyIcon} label="Classement" isActive={pathname.startsWith('/leaderboard/')} collapsed={collapsed} color="yellow" />

                {/* ── Dashboard ── */}
                {isAuthenticated && (
                    <NavLink href="/dashboard" Icon={Squares2X2Icon} label="Dashboard" isActive={pathname === '/dashboard'} collapsed={collapsed} color="blue" />
                )}

                {/* ── Paramètres ── */}
                <NavLink href="/settings" Icon={Cog6ToothIcon} label="Paramètres" isActive={pathname === '/settings'} collapsed={collapsed} color="gray" />

                {/* ── Admin ── */}
                {isAuthenticated && userRole === 'ADMIN' && (
                    <NavLink href="/admin" Icon={ShieldCheckIcon} label="Admin" isActive={pathname === '/admin'} collapsed={collapsed} color="red" />
                )}

                {/* ── Connexion ── */}
                {!isAuthenticated && (
                    <NavLink href="/login" Icon={LockClosedIcon} label="Se connecter" isActive={pathname === '/login'} collapsed={collapsed} color="blue" />
                )}
            </nav>
        </aside>
    );
}
