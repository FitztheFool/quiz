'use client';

import { useCallback, useEffect, useState } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import PlayerModal from '@/components/PlayerModal';
import { type GameFilter } from '@/components/GameFilterPills';
import { useAdminStats } from './hooks/useAdminStats';
import { useAdminUsers } from './hooks/useAdminUsers';
import { useAdminWords } from './hooks/useAdminWords';
import StatsTab from './tabs/StatsTab';
import UsersTab from './tabs/UsersTab';
import QuizzesTab from './tabs/QuizzesTab';
import CategoriesTab from './tabs/CategoriesTab';
import WordsTab from './tabs/WordsTab';
import WordGroupsTab from './tabs/WordGroupsTab';
import type { AdminTab, AdminQuiz, AdminCategory, AdminWordGroup } from './types';
import {
    ChartBarIcon,
    UsersIcon,
    QuestionMarkCircleIcon,
    TagIcon,
    FolderOpenIcon,
    BookOpenIcon,
} from '@heroicons/react/24/outline';

const PAGE_SIZE = 20;
const SECTION_ID: Record<AdminTab, string> = {
    stats: 'stats', users: 'users', quizzes: 'quizzes',
    categories: 'categories', words: 'words', wordGroups: 'word-groups',
};

const hashToTab = (hash: string): AdminTab => ({
    '#stats': 'stats',
    '#users': 'users',
    '#quizzes': 'quizzes',
    '#categories': 'categories',
    '#words': 'words',
    '#word-groups': 'wordGroups',
} as Record<string, AdminTab>)[hash] ?? 'stats';

function qs(q: string) { return q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''; }

const TAB_CONFIG: { key: AdminTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { key: 'stats', label: 'Statistiques', icon: ChartBarIcon },
    { key: 'users', label: 'Utilisateurs', icon: UsersIcon },
    { key: 'categories', label: 'Catégories', icon: TagIcon },
    { key: 'quizzes', label: 'Quiz', icon: QuestionMarkCircleIcon },
    { key: 'wordGroups', label: 'Groupes de mots', icon: FolderOpenIcon },
    { key: 'words', label: 'Mots', icon: BookOpenIcon },
];

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
    const [categoriesPage, setCategoriesPage] = useState(1);
    const [categoriesTotalPages, setCategoriesTotalPages] = useState(1);

    const [wordGroups, setWordGroups] = useState<AdminWordGroup[]>([]);
    const [wordGroupsPage, setWordGroupsPage] = useState(1);
    const [wordGroupsTotalPages, setWordGroupsTotalPages] = useState(1);

    const [quizCategoryFilter, setQuizCategoryFilter] = useState('');
    const [quizCategoryName, setQuizCategoryName] = useState('');

    const [playerModal, setPlayerModal] = useState<{ gameId: string; players: any[] } | null>(null);

    const { stats, loadingStats, loadingActivity, fetchFull, refreshActivity, userQueryRef, gameFilterRef } = useAdminStats(activityPeriod);
    const usersHook = useAdminUsers();
    const wordsHook = useAdminWords();

    const scrollToSection = useCallback((tab: AdminTab) => {
        const id = SECTION_ID[tab];
        history.replaceState(null, '', `#${id}`);
        setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    }, []);

    const [quizCategories, setQuizCategories] = useState<AdminCategory[]>([]);

    const fetchQuizzes = useCallback(async (page: number, search: string, categoryId = '') => {
        const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
        if (search.trim()) params.set('q', search.trim());
        if (categoryId) params.set('categoryId', categoryId);
        const res = await fetch(`/api/admin/quiz?${params}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        setQuizzes(data.quizzes ?? []);
        setQuizTotalPages(data.totalPages ?? 1);
        setQuizPage(page);
    }, []);

    const fetchCategoriesForSelect = useCallback(async () => {
        const res = await fetch('/api/admin/categories?pageSize=200', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        setQuizCategories(Array.isArray(data) ? data : (data.categories ?? []));
    }, []);

    const fetchCategories = useCallback(async (page: number, search: string) => {
        const res = await fetch(`/api/admin/categories?page=${page}&pageSize=${PAGE_SIZE}${qs(search)}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const cats = Array.isArray(data) ? data : (data.categories ?? []);
        setCategories(cats);
        setCategoriesPage(Array.isArray(data) ? 1 : (data.page ?? page));
        setCategoriesTotalPages(Array.isArray(data) ? Math.max(1, Math.ceil(cats.length / PAGE_SIZE)) : (data.totalPages ?? 1));
    }, []);

    const fetchWordGroups = useCallback(async (page: number, search: string) => {
        const res = await fetch(`/api/admin/word-groups?page=${page}&pageSize=${PAGE_SIZE}${qs(search)}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const grps = Array.isArray(data) ? data : (data.groups ?? []);
        setWordGroups(grps);
        setWordGroupsPage(Array.isArray(data) ? 1 : (data.page ?? page));
        setWordGroupsTotalPages(Array.isArray(data) ? Math.max(1, Math.ceil(grps.length / PAGE_SIZE)) : (data.totalPages ?? 1));
    }, []);

    const fetchWordGroupsForSelect = useCallback(async () => {
        const res = await fetch('/api/admin/word-groups?pageSize=200', { cache: 'no-store' });
        if (res.ok) setWordGroups((await res.json()).groups ?? []);
    }, []);

    const handleViewQuizzes = useCallback((categoryId: string) => {
        const cat = categories.find(c => c.id === categoryId);
        setQuizCategoryFilter(categoryId);
        setQuizCategoryName(cat?.name ?? '');
        setActiveTab('quizzes');
        scrollToSection('quizzes');
    }, [scrollToSection, categories]);

    const handleViewWords = useCallback((groupId: string) => {
        const group = wordGroups.find(g => g.id === groupId);
        wordsHook.setWordGroupFilter(groupId);
        setActiveTab('words');
        scrollToSection('words');
    }, [scrollToSection, wordGroups, wordsHook]);

    const fetchTab = useCallback(async (tab: AdminTab) => {
        setLoading(true);
        try {
            switch (tab) {
                case 'users': await usersHook.fetchUsers(1); break;
                case 'quizzes': await Promise.all([fetchQuizzes(1, ''), fetchCategoriesForSelect()]); break;
                case 'categories': await fetchCategories(1, ''); break;
                case 'wordGroups': await fetchWordGroups(1, ''); break;
                case 'words': await Promise.all([wordsHook.fetchWordIndex(), fetchWordGroupsForSelect()]); break;
            }
        } finally { setLoading(false); }
    }, [usersHook.fetchUsers, wordsHook.fetchWordIndex, fetchQuizzes, fetchCategoriesForSelect, fetchCategories, fetchWordGroups, fetchWordGroupsForSelect]);

    useEffect(() => {
        if (activeTab === 'stats') {
            setActivityPage(1); setActivityUserQuery('');
            userQueryRef.current = ''; gameFilterRef.current = 'ALL'; setGameFilter('ALL');
            fetchFull(activityPeriod, 1, '', 'ALL');
        } else {
            fetchTab(activeTab);
        }
        scrollToSection(activeTab);
    }, [activeTab]);

    useEffect(() => { if (activeTab !== 'stats') return; setActivityPage(1); refreshActivity(activityPeriod, 1, userQueryRef.current); }, [activityPeriod]);
    useEffect(() => { userQueryRef.current = activityUserQuery; if (activeTab !== 'stats') return; const t = setTimeout(() => { setActivityPage(1); refreshActivity(activityPeriod, 1, activityUserQuery); }, 400); return () => clearTimeout(t); }, [activityUserQuery]);
    useEffect(() => { gameFilterRef.current = gameFilter; if (activeTab !== 'stats') return; setActivityPage(1); refreshActivity(activityPeriod, 1, userQueryRef.current, gameFilter); }, [gameFilter]);
    useEffect(() => { const fn = () => setActiveTab(hashToTab(window.location.hash)); window.addEventListener('hashchange', fn); return () => window.removeEventListener('hashchange', fn); }, []);

    useEffect(() => {
        const q = wordsHook.wordSearch.trim();
        const groupId = wordsHook.wordGroupFilter;
        const t = setTimeout(() => {
            if (q || groupId) wordsHook.fetchWordSearch(q, groupId, 1);
            else wordsHook.setWordSearchResults([]);
        }, 400);
        return () => clearTimeout(t);
    }, [wordsHook.wordSearch, wordsHook.wordGroupFilter, wordsHook.fetchWordSearch, wordsHook.setWordSearchResults]);

    const activeConfig = TAB_CONFIG.find(t => t.key === activeTab)!;

    return (
        <div className="flex gap-0 min-h-[600px] bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">

            {/* Sidebar */}
            <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="px-4 pt-5 pb-4 border-b border-gray-200 dark:border-gray-800">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Administration</p>
                </div>
                <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
                    {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => { setActiveTab(key); scrollToSection(key); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${activeTab === key
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                                }`}
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span>{label}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0 flex flex-col">

                {/* Mobile tab bar */}
                <div className="md:hidden flex gap-1.5 overflow-x-auto px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => { setActiveTab(key); scrollToSection(key); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap transition-colors shrink-0 ${activeTab === key
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                                }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Content header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                        <activeConfig.icon className="w-4 h-4 text-red-500 dark:text-red-400" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{activeConfig.label}</h2>
                        {activeTab === 'quizzes' && quizCategoryName && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                Filtrés par : <span className="font-medium text-red-500">{quizCategoryName}</span>
                            </p>
                        )}
                    </div>
                </div>

                {/* Tab content */}
                <div className="flex-1 p-6">
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

                    {activeTab !== 'stats' && loading && (
                        <div className="flex items-center justify-center py-20">
                            <LoadingSpinner fullScreen={false} message="Chargement..." />
                        </div>
                    )}

                    {activeTab !== 'stats' && !loading && (
                        <>
                            {activeTab === 'users' && (
                                <UsersTab
                                    users={usersHook.users} userPage={usersHook.userPage} userTotalPages={usersHook.userTotalPages}
                                    userQuery={usersHook.userQuery} setUserQuery={usersHook.setUserQuery}
                                    userSort={usersHook.userSort} setUserSort={usersHook.setUserSort}
                                    userRole={usersHook.userRole} setUserRole={usersHook.setUserRole}
                                    userStatus={usersHook.userStatus} setUserStatus={usersHook.setUserStatus}
                                    onPageChange={usersHook.fetchUsers}
                                    onRoleChange={usersHook.handleRoleChange}
                                    onToggleBan={usersHook.handleToggleBan}
                                    onDeleteUser={usersHook.handleDeleteUser}
                                    onDeleteGuests={usersHook.handleDeleteGuests}
                                />
                            )}
                            {activeTab === 'quizzes' && (
                                <QuizzesTab
                                    quizzes={quizzes} quizPage={quizPage} quizTotalPages={quizTotalPages}
                                    categories={quizCategories}
                                    initialCategoryId={quizCategoryFilter || undefined}
                                    onFetch={(page, search, catId) => {
                                        if (quizCategoryFilter && catId !== quizCategoryFilter) {
                                            setQuizCategoryFilter('');
                                            setQuizCategoryName('');
                                        }
                                        fetchQuizzes(page, search, catId);
                                    }}
                                    onDelete={async (id, title) => {
                                        if (!confirm(`Supprimer "${title}" ?`)) return;
                                        const res = await fetch('/api/admin/quiz', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quizId: id }) });
                                        if (res.ok) fetchQuizzes(quizPage, '');
                                        else alert((await res.json())?.error ?? 'Erreur');
                                    }}
                                />
                            )}
                            {activeTab === 'categories' && (
                                <CategoriesTab
                                    categories={categories} page={categoriesPage} totalPages={categoriesTotalPages}
                                    onFetch={fetchCategories}
                                    onCreate={async name => {
                                        const res = await fetch('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
                                        if (res.ok) fetchCategories(categoriesPage, ''); else alert((await res.json()).error);
                                    }}
                                    onRename={async (id, name) => {
                                        const res = await fetch('/api/admin/categories', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId: id, name }) });
                                        if (res.ok) fetchCategories(categoriesPage, ''); else alert((await res.json())?.error ?? 'Erreur');
                                    }}
                                    onDelete={async (id, name) => {
                                        if (!confirm(`Supprimer "${name}" ?`)) return;
                                        const res = await fetch('/api/admin/categories', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId: id }) });
                                        if (res.ok) fetchCategories(categoriesPage, ''); else alert((await res.json()).error);
                                    }}
                                    onViewQuizzes={handleViewQuizzes}
                                />
                            )}
                            {activeTab === 'wordGroups' && (
                                <WordGroupsTab
                                    groups={wordGroups} page={wordGroupsPage} totalPages={wordGroupsTotalPages}
                                    onFetch={fetchWordGroups}
                                    onViewWords={handleViewWords}
                                    onCreate={async theme => {
                                        const res = await fetch('/api/admin/word-groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme }) });
                                        if (res.ok) fetchWordGroups(wordGroupsPage, ''); else alert((await res.json())?.error ?? 'Erreur');
                                    }}
                                    onRename={async (id, theme) => {
                                        const res = await fetch('/api/admin/word-groups', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId: id, theme }) });
                                        if (res.ok) fetchWordGroups(wordGroupsPage, ''); else alert((await res.json())?.error ?? 'Erreur');
                                    }}
                                    onDelete={async (id, theme, wordCount) => {
                                        const msg = wordCount > 0
                                            ? `Supprimer le groupe "${theme}" et ses ${wordCount} mot${wordCount > 1 ? 's' : ''} ?`
                                            : `Supprimer le groupe "${theme}" ?`;
                                        if (!confirm(msg)) return;
                                        const res = await fetch('/api/admin/word-groups', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId: id }) });
                                        if (res.ok) { fetchWordGroups(wordGroupsPage, ''); wordsHook.fetchWordIndex(); }
                                        else alert((await res.json())?.error ?? 'Erreur');
                                    }}
                                />
                            )}
                            {activeTab === 'words' && (
                                <WordsTab
                                    {...wordsHook}
                                    wordGroups={wordGroups}
                                    onSelectLetter={wordsHook.handleSelectLetter}
                                    onLetterPageChange={wordsHook.handleLetterPageChange}
                                    onWordSearchPageChange={wordsHook.handleWordSearchPageChange}
                                    onAddWord={wordsHook.handleAddWord}
                                    onSaveWord={wordsHook.handleSaveWord}
                                    onDeleteWord={wordsHook.handleDeleteWord}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>

            {playerModal && <PlayerModal gameId={playerModal.gameId} players={playerModal.players} onClose={() => setPlayerModal(null)} />}
        </div>
    );
}
