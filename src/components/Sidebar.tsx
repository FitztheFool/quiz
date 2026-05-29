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
import SidebarUser from '@/components/Sidebar/SidebarUser';
import SidebarSearch from '@/components/Sidebar/SidebarSearch';
import PinnedQuizzes from '@/components/Sidebar/PinnedQuizzes';
import { useLobbyCount } from '@/hooks/useLobbyCount';

// ─── Color system ─────────────────────────────────────────────────────────────
type Color = 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple';

const COLOR: Record<Color, { active: string; activeBorder: string; activeDot: string; activeIcon: string }> = {
    blue: { active: 'text-primary-700 dark:text-primary-300', activeBorder: 'border-l-primary-500', activeDot: 'bg-primary-500', activeIcon: 'text-primary-500' },
    green: { active: 'text-green-700 dark:text-green-300', activeBorder: 'border-l-green-500', activeDot: 'bg-green-500', activeIcon: 'text-green-500' },
    yellow: { active: 'text-yellow-700 dark:text-yellow-300', activeBorder: 'border-l-yellow-500', activeDot: 'bg-yellow-500', activeIcon: 'text-yellow-500' },
    red: { active: 'text-red-700 dark:text-red-300', activeBorder: 'border-l-red-500', activeDot: 'bg-red-500', activeIcon: 'text-red-500' },
    gray: { active: 'text-gray-900 dark:text-white', activeBorder: 'border-l-gray-500', activeDot: 'bg-gray-900 dark:bg-white', activeIcon: 'text-gray-700 dark:text-gray-200' },
    purple: { active: 'text-purple-700 dark:text-purple-300', activeBorder: 'border-l-purple-500', activeDot: 'bg-purple-500', activeIcon: 'text-purple-500' },
};

type IconComponent = React.ComponentType<{ className?: string }>;

const INACTIVE = 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200';

// ─── NavLink ──────────────────────────────────────────────────────────────────
function NavLink({ href, Icon, label, isActive, collapsed, color, badge }: {
    href: string; Icon: IconComponent; label: string;
    isActive: boolean; collapsed: boolean; color: Color; badge?: number;
}) {
    // All sidebar tabs share the Dashboard's selected style: white in dark, black in light.
    const c = COLOR.gray;
    void color;
    return (
        <Link href={href} title={label}
            className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left border-l-2 ${isActive ? `${c.active} ${c.activeBorder} bg-gray-50 dark:bg-gray-800/40` : `${INACTIVE} border-l-transparent`}`}
        >
            <span className="relative flex-shrink-0">
                <Icon className={`w-5 h-5 ${isActive ? c.activeIcon : ''}`} />
                {badge != null && badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center leading-none ring-2 ring-white dark:ring-gray-900">
                        {badge > 99 ? '99+' : badge}
                    </span>
                )}
            </span>
            {!collapsed && (
                <>
                    <span className="flex-1 truncate">{label}</span>
                    {isActive && <span className={`ml-auto w-1.5 h-1.5 rounded-full ${c.activeDot}`} />}
                </>
            )}
        </Link>
    );
}

// ─── SubNavLink ───────────────────────────────────────────────────────────────
function SubNavLink({ href, Icon, label, isActive, color }: {
    href: string; Icon: IconComponent; label: string;
    isActive: boolean; color: Color;
}) {
    // All sidebar tabs share the Dashboard's selected style: white in dark, black in light.
    const c = COLOR.gray;
    void color;
    return (
        <Link href={href}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${isActive ? `${c.active}` : INACTIVE}`}
        >
            <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? c.activeIcon : ''}`} />
            <span className="truncate">{label}</span>
            {isActive && <span className={`ml-auto w-1.5 h-1.5 rounded-full ${c.activeDot}`} />}
        </Link>
    );
}

// ─── SectionToggle ────────────────────────────────────────────────────────────
function SectionToggle({ Icon, label, isActive, isOpen, collapsed, color, onClick, badge }: {
    Icon: IconComponent; label: string; isActive: boolean; isOpen: boolean;
    collapsed: boolean; color: Color; onClick: () => void; badge?: number;
}) {
    // All sidebar tabs share the Dashboard's selected style: white in dark, black in light.
    const c = COLOR.gray;
    void color;
    return (
        <button onClick={onClick} title={label}
            aria-label={collapsed ? label : undefined}
            aria-expanded={isOpen}
            className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left border-l-2 ${isActive ? `${c.active} ${c.activeBorder} bg-gray-50 dark:bg-gray-800/40` : `${INACTIVE} border-l-transparent`}`}
        >
            <span className="relative flex-shrink-0">
                <Icon className={`w-5 h-5 ${isActive ? c.activeIcon : ''}`} />
                {badge != null && badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center leading-none ring-2 ring-white dark:ring-gray-900">
                        {badge > 99 ? '99+' : badge}
                    </span>
                )}
            </span>
            {!collapsed && (
                <>
                    <span className="flex-1 truncate">{label}</span>
                    <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </>
            )}
        </button>
    );
}

// ─── Section header ──────────────────────────────────────────────────────────
function SectionHeader({ label, collapsed }: { label: string; collapsed: boolean }) {
    if (collapsed) return <div className="my-1 mx-2 border-t border-gray-200 dark:border-gray-700" />;
    return <div className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase">{label}</div>;
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

export default function Sidebar({ isOpen, isAuthenticated, userRole, isAnonymous }: SidebarProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(true);
    const [hydrated, setHydrated] = useState(false);
    const [quizMenuOpen, setQuizMenuOpen] = useState(false);
    const [lobbyMenuOpen, setLobbyMenuOpen] = useState(false);
    const [lobbyCode, setLobbyCode] = useState('');

    const lobbyCount = useLobbyCount();

    useEffect(() => { setLobbyCode(crypto.randomUUID()); }, []);

    const quizSectionActive = ['/quiz/available', '/quiz/my-quizzes', '/quiz/generate', '/quiz/create'].some(p => pathname.startsWith(p));
    const isCreatingLobby = pathname.startsWith('/lobby/create/');
    const lobbySectionActive = pathname.startsWith('/lobby/');
    const isAdmin = userRole === 'ADMIN';
    const isGuest = userRole === 'GUEST' || isAnonymous;
    const canCreateQuiz = isAuthenticated && !isGuest;

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
            // Default: desktop non-admin authenticated user → opened; admin or mobile → collapsed.
            if (isDesktop && isAuthenticated && !isAdmin) setCollapsed(false);
        }
        setHydrated(true);
    }, [pathname, isAuthenticated, isAdmin]);

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
            <div className="px-3 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                {!collapsed && (
                    <div className="min-w-0">
                        {isAuthenticated ? (
                            <Link href="/dashboard" className="text-xl font-bold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                                Dashboard
                            </Link>
                        ) : (
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Menu</h1>
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
                    {collapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
                </button>
            </div>

            {/* Search */}
            <div className="px-2 pt-3 flex-shrink-0">
                <SidebarSearch collapsed={collapsed} />
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">

                {/* ── JOUER ── */}
                {isAuthenticated && (
                    <>
                        <SectionHeader label="Jouer" collapsed={collapsed} />

                        <SectionToggle
                            Icon={SignalIcon} label="Lobby"
                            isActive={lobbySectionActive} isOpen={lobbyMenuOpen}
                            collapsed={collapsed} color="green"
                            badge={lobbyCount}
                            onClick={() => { if (collapsed) openIfCollapsed(); else setLobbyMenuOpen(prev => !prev); }}
                        />
                        {!collapsed && lobbyMenuOpen && (
                            <div className="ml-3 mt-0.5 mb-1 space-y-0.5 border-l-2 border-gray-100 dark:border-gray-700 pl-3">
                                <SubNavLink href={`/lobby/create/${lobbyCode}`} Icon={PlusIcon} label="Créer un lobby" isActive={isCreatingLobby} color="green" />
                                <SubNavLink href="/lobby/all" Icon={MagnifyingGlassIcon} label="Voir les lobbies" isActive={pathname === '/lobby/all'} color="green" />
                            </div>
                        )}

                        <NavLink href="/leaderboard/uno" Icon={TrophyIcon} label="Classement" isActive={pathname.startsWith('/leaderboard/')} collapsed={collapsed} color="yellow" />
                    </>
                )}

                {/* ── CRÉER ── */}
                <SectionHeader label="Créer" collapsed={collapsed} />
                <SectionToggle
                    Icon={QuestionMarkCircleIcon} label="Quiz"
                    isActive={quizSectionActive} isOpen={quizMenuOpen}
                    collapsed={collapsed} color="blue"
                    onClick={() => { if (collapsed) openIfCollapsed(); else setQuizMenuOpen(prev => !prev); }}
                />
                {!collapsed && quizMenuOpen && (
                    <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-gray-100 dark:border-gray-700 pl-3">
                        <SubNavLink href="/quiz/available" Icon={ListBulletIcon} label="Quiz disponibles" isActive={pathname === '/quiz/available'} color="blue" />
                        {canCreateQuiz && <SubNavLink href="/quiz/my-quizzes" Icon={BookmarkIcon} label="Mes quiz" isActive={pathname === '/quiz/my-quizzes'} color="blue" />}
                        {canCreateQuiz && (
                            <>
                                <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                                <SubNavLink href="/quiz/generate" Icon={SparklesIcon} label="Générer (IA)" isActive={pathname === '/quiz/generate'} color="blue" />
                                <SubNavLink href="/quiz/create" Icon={PlusIcon} label="Créer un quiz" isActive={pathname === '/quiz/create'} color="blue" />
                            </>
                        )}
                    </div>
                )}

                <PinnedQuizzes collapsed={collapsed} />

                {/* ── COMPTE ── */}
                {(isAuthenticated || isAdmin) && <SectionHeader label="Compte" collapsed={collapsed} />}
                {isAuthenticated && (
                    <NavLink href="/dashboard" Icon={Squares2X2Icon} label="Dashboard" isActive={pathname === '/dashboard'} collapsed={collapsed} color="gray" />
                )}
                <NavLink href="/settings" Icon={Cog6ToothIcon} label="Paramètres" isActive={pathname === '/settings'} collapsed={collapsed} color="gray" />
                {isAuthenticated && isAdmin && (
                    <NavLink href="/admin" Icon={ShieldCheckIcon} label="Administration" isActive={pathname === '/admin'} collapsed={collapsed} color="red" />
                )}

                {!isAuthenticated && (
                    <NavLink href="/login" Icon={LockClosedIcon} label="Se connecter" isActive={pathname === '/login'} collapsed={collapsed} color="blue" />
                )}
            </nav>

            {/* User profile + logout — back at the bottom */}
            {isAuthenticated && (
                <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-700">
                    <SidebarUser collapsed={collapsed} />
                </div>
            )}
        </aside>
    );
}
