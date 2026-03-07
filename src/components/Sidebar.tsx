'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { plural } from '@/lib/utils';
import CreateLobbyButton from '@/components/CreateLobbyButton';

type TabType = 'available' | 'my-quizzes' | 'scores' | 'admin';

const QUIZ_NAV_ITEMS: { tab?: TabType; label: string; icon: string; href?: string }[] = [
    { tab: 'available', label: 'Quiz disponibles', icon: '🎯' },
    { tab: 'my-quizzes', label: 'Mes quiz', icon: '📝' },
    { tab: 'scores', label: 'Mes scores', icon: '🏆' },
    { label: '', icon: '', href: '' }, // séparateur
    { label: 'Générer un quiz', icon: '✨', href: '/quiz/generate' },
    { label: 'Créer un quiz', icon: '➕', href: '/quiz/create' },
];

interface SidebarProps {
    activeTab: TabType | null;
    onTabChange: (tab: TabType) => void;
    isOpen: boolean;
    onClose: () => void;
    userRole?: string;
    userName?: string | null;
    userEmail?: string | null;
}

export default function Sidebar({
    activeTab,
    onTabChange,
    isOpen,
    onClose,
    userRole,
    userName,
    userEmail,
}: SidebarProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(true);
    const [quizMenuOpen, setQuizMenuOpen] = useState(true);

    const isQuizTab = QUIZ_NAV_ITEMS.some(n => n.tab === activeTab);
    const isQuizHref = QUIZ_NAV_ITEMS.some(n => n.href && pathname === n.href);
    const quizSectionActive = isQuizTab || isQuizHref;

    const handleTab = (tab: TabType) => {
        onTabChange(tab);
        onClose();
    };

    return (
        <aside className={`
            fixed top-0 left-0 h-full bg-white shadow-xl z-30 flex flex-col
            transition-all duration-300
            ${collapsed ? 'w-16' : 'w-64'}
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            md:translate-x-0 md:sticky md:top-0 md:h-screen md:shadow-none md:border-r md:border-gray-200
        `}>

            {/* Header */}
            <div className="px-3 py-5 border-b border-gray-100 flex items-center gap-2">
                {!collapsed && (
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{userName ?? userEmail}</p>
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(prev => !prev)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 ml-auto flex-shrink-0"
                    title={collapsed ? 'Ouvrir' : 'Réduire'}
                >
                    {collapsed ? '→' : '←'}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">

                {/* ── Quiz (sous-menu déroulant) ── */}
                <div>
                    <button
                        onClick={() => {
                            if (collapsed) setCollapsed(false);
                            else setQuizMenuOpen(prev => !prev);
                        }}
                        title="Quiz"
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
                            ${quizSectionActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
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
                        <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-gray-100 pl-3">
                            {QUIZ_NAV_ITEMS.map((item, i) => {
                                if (!item.label) return <div key={i} className="border-t border-gray-100 my-1" />;

                                if (item.href) {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left
                                                ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
                                        >
                                            <span className="text-sm">{item.icon}</span>
                                            {item.label}
                                            {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                        </Link>
                                    );
                                }

                                return (
                                    <button
                                        key={item.tab}
                                        onClick={() => handleTab(item.tab!)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left
                                            ${activeTab === item.tab
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                            }`}
                                    >
                                        <span className="text-sm">{item.icon}</span>
                                        {item.label}
                                        {activeTab === item.tab && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Uno ── */}
                <button
                    title="Uno"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                >
                    <span className="text-base flex-shrink-0">🎴</span>
                    {!collapsed && 'Uno'}
                </button>

                {/* ── Skyjow ── */}
                <button
                    title="Skyjow"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                >
                    <span className="text-base flex-shrink-0">🌐</span>
                    {!collapsed && 'Skyjow'}
                </button>

                {/* ── Paramètres ── */}
                <button
                    title="Paramètres"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                >
                    <span className="text-base flex-shrink-0">⚙️</span>
                    {!collapsed && 'Paramètres'}
                </button>

                {/* ── Admin ── */}
                {userRole === 'ADMIN' && (
                    <button
                        onClick={() => handleTab('admin')}
                        title="Admin"
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
                            ${activeTab === 'admin' ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                    >
                        <span className="text-base flex-shrink-0">🛡️</span>
                        {!collapsed && 'Admin'}
                        {!collapsed && activeTab === 'admin' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500" />}
                    </button>
                )}
            </nav>

            {/* CTA Lobby */}
            <div className="px-3 py-4 border-t border-gray-100">
                {collapsed
                    ? <button title="Créer un lobby" className="w-full flex justify-center text-xl">🎮</button>
                    : <CreateLobbyButton />
                }
            </div>
        </aside>
    );
}
