'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import PlayerModal from '@/components/PlayerModal';
import GameFilterPills, { type GameFilter } from '@/components/GameFilterPills';
import { useAdminStats } from './hooks/useAdminStats';
import { useAdminUsers } from './hooks/useAdminUsers';
import { useAdminWords } from './hooks/useAdminWords';
import StatsTab from './tabs/StatsTab';
import UsersTab from './tabs/UsersTab';
import QuizzesTab from './tabs/QuizzesTab';
import CategoriesTab from './tabs/CategoriesTab';
import WordsTab from './tabs/WordsTab';
import type { AdminTab, AdminQuiz, AdminCategory } from './types';

const PAGE_SIZE = 20;
const SECTION_ID: Record<AdminTab, string> = {
    stats: 'admin-stats', users: 'admin-users', quizzes: 'admin-quizzes',
    categories: 'admin-categories', words: 'admin-words',
};

const hashToTab = (hash: string): AdminTab => ({
    '#admin-stats': 'stats', '#admin-users': 'users',
    '#admin-quizzes': 'quizzes', '#admin-categories': 'categories',
} as Record<string, AdminTab>)[hash] ?? 'stats';

export default function AdminPanel() {
    const [activeTab, setActiveTab] = useState<AdminTab>(() =>
        typeof window !== 'undefined' ? hashToTab(window.location.hash) : 'stats'
    );
    const [loading, setLoading] = useState(false);
    const [activityPeriod, setActivityPeriod] = useState(30);
    const [activityPage, setActivityPage] = useState(1);
    const [activityUserQuery, setActivityUserQuery] = useState('');
    const [gameFilter, setGameFilter] = useState<GameFilter>('ALL');
    const [quizzes, setQuizzes] = useState<AdminQuiz[]>([]);
    const [quizPage, setQuizPage] = useState(1);
    const [quizTotalPages, setQuizTotalPages] = useState(1);
    const [categories, setCategories] = useState<AdminCategory[]>([]);
    const [playerModal, setPlayerModal] = useState<{ gameId: string; players: any[] } | null>(null);

    const { stats, loadingStats, loadingActivity, fetchFull, refreshActivity, userQueryRef, gameFilterRef } = useAdminStats(activityPeriod);
    const usersHook = useAdminUsers();
    const wordsHook = useAdminWords();

    const scrollToSection = useCallback((tab: AdminTab) => {
        const id = SECTION_ID[tab];
        history.replaceState(null, '', `#${id}`);
        setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    }, []);

    const fetchQuizzes = async (page = 1) => {
        const res = await fetch(`/api/admin/quiz?page=${page}&pageSize=${PAGE_SIZE}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        setQuizzes(data.quizzes);
        setQuizTotalPages(data.totalPages);
        setQuizPage(page);
    };

    const fetchCategories = async () => {
        const res = await fetch('/api/admin/categories', { cache: 'no-store' });
        if (res.ok) setCategories(await res.json());
    };

    const fetchTab = useCallback(async (tab: AdminTab) => {
        setLoading(true);
        try {
            if (tab === 'users') await usersHook.fetchUsers(1);
            else if (tab === 'quizzes') await fetchQuizzes(1);
            else if (tab === 'categories') await fetchCategories();
            else if (tab === 'words') { await wordsHook.fetchWordIndex(); }
        } finally { setLoading(false); }
    }, [usersHook.fetchUsers, wordsHook.fetchWordIndex]);

    useEffect(() => {
        if (activeTab === 'stats') {
            setActivityPage(1); setActivityUserQuery('');
            userQueryRef.current = ''; gameFilterRef.current = 'ALL'; setGameFilter('ALL');
            fetchFull(activityPeriod, 1, '', 'ALL');
        } else { fetchTab(activeTab); }
        scrollToSection(activeTab);
    }, [activeTab]);

    useEffect(() => { if (activeTab !== 'stats') return; setActivityPage(1); refreshActivity(activityPeriod, 1, userQueryRef.current); }, [activityPeriod]);
    useEffect(() => { userQueryRef.current = activityUserQuery; if (activeTab !== 'stats') return; const t = setTimeout(() => { setActivityPage(1); refreshActivity(activityPeriod, 1, activityUserQuery); }, 400); return () => clearTimeout(t); }, [activityUserQuery]);
    useEffect(() => { gameFilterRef.current = gameFilter; if (activeTab !== 'stats') return; setActivityPage(1); refreshActivity(activityPeriod, 1, userQueryRef.current, gameFilter); }, [gameFilter]);
    useEffect(() => { const fn = () => setActiveTab(hashToTab(window.location.hash)); window.addEventListener('hashchange', fn); return () => window.removeEventListener('hashchange', fn); }, []);

    const tabs: { key: AdminTab; label: string; emoji: string }[] = [
        { key: 'stats', label: 'Statistiques', emoji: '📊' },
        { key: 'users', label: 'Utilisateurs', emoji: '👥' },
        { key: 'quizzes', label: 'Quiz', emoji: '📝' },
        { key: 'categories', label: 'Catégories', emoji: '🏷️' },
        { key: 'words', label: 'Mots', emoji: '🔤' },
    ];

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">🛡️ Administration</h2>

            <div className="flex flex-wrap gap-2 mb-6">
                {tabs.map(t => (
                    <button key={t.key} onClick={() => { setActiveTab(t.key); scrollToSection(t.key); }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${activeTab === t.key ? 'bg-red-600 text-white border-red-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                        {t.emoji} {t.label}
                    </button>
                ))}
            </div>

            {activeTab === 'stats' && (
                <StatsTab
                    stats={stats} loadingStats={loadingStats} loadingActivity={loadingActivity}
                    activityPeriod={activityPeriod} setActivityPeriod={setActivityPeriod}
                    activityPage={activityPage} onActivityPageChange={p => { setActivityPage(p); refreshActivity(activityPeriod, p, userQueryRef.current, gameFilterRef.current); }}
                    gameFilter={gameFilter} setGameFilter={setGameFilter}
                    activityUserQuery={activityUserQuery} setActivityUserQuery={setActivityUserQuery}
                    onPlayerClick={row => setPlayerModal({ gameId: row.gameId, players: row.players })}
                />
            )}

            {activeTab !== 'stats' && loading && <div className="flex items-center justify-center py-16"><LoadingSpinner fullScreen={false} /></div>}

            {activeTab !== 'stats' && !loading && (
                <>
                    {activeTab === 'users' && (
                        <UsersTab
                            users={usersHook.users} userPage={usersHook.userPage} userTotalPages={usersHook.userTotalPages}
                            userQuery={usersHook.userQuery} setUserQuery={usersHook.setUserQuery}
                            userSort={usersHook.userSort} setUserSort={usersHook.setUserSort}
                            userRole={usersHook.userRole} setUserRole={usersHook.setUserRole}        // ← ajout
                            userStatus={usersHook.userStatus} setUserStatus={usersHook.setUserStatus} // ← ajout
                            onPageChange={usersHook.fetchUsers}
                            onRoleChange={usersHook.handleRoleChange}
                            onToggleBan={usersHook.handleToggleBan}
                            onDeleteUser={usersHook.handleDeleteUser}
                        />
                    )}
                    {activeTab === 'quizzes' && (
                        <QuizzesTab
                            quizzes={quizzes} quizPage={quizPage} quizTotalPages={quizTotalPages}
                            onPageChange={fetchQuizzes}
                            onDelete={async (id, title) => { if (!confirm(`Supprimer "${title}" ?`)) return; const res = await fetch('/api/admin/quiz', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quizId: id }) }); if (res.ok) fetchQuizzes(quizPage); else alert((await res.json())?.error ?? 'Erreur'); }}
                        />
                    )}
                    {activeTab === 'categories' && (
                        <CategoriesTab
                            categories={categories}
                            onCreate={async name => { const res = await fetch('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }); if (res.ok) fetchCategories(); else alert((await res.json()).error); }}
                            onRename={async (id, name) => { const res = await fetch('/api/admin/categories', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId: id, name }) }); if (res.ok) fetchCategories(); else alert((await res.json())?.error ?? 'Erreur'); }}
                            onDelete={async (id, name) => { if (!confirm(`Supprimer "${name}" ?`)) return; const res = await fetch('/api/admin/categories', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId: id }) }); if (res.ok) setCategories(c => c.filter(x => x.id !== id)); else alert((await res.json()).error); }}
                        />
                    )}
                    {activeTab === 'words' && (
                        <WordsTab {...wordsHook} onSelectLetter={wordsHook.handleSelectLetter} onAddWord={wordsHook.handleAddWord} onSaveWord={wordsHook.handleSaveWord} onDeleteWord={wordsHook.handleDeleteWord} />
                    )}
                </>
            )}

            {playerModal && <PlayerModal gameId={playerModal.gameId} players={playerModal.players} onClose={() => setPlayerModal(null)} />}
        </div>
    );
}
