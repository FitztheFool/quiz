// src/components/AdminPanel.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Pagination from '@/components/Pagination';
import { GAME_EMOJI_MAP, GAME_LABEL_MAP, GAME_COLOR } from '@/lib/gameConfig';
import PlayerModal from '@/components/PlayerModal'
import GameFilterPills, { type GameFilter } from '@/components/GameFilterPills';
import GameStatCards from '@/components/GameStatCards';
import LoadingSpinner from '@/components/LoadingSpinner';
import { plural } from '@/lib/utils';


interface AdminUser {
    id: string;
    username: string;
    email: string;
    role: string;
    createdAt: string;
    lastSeen: string | null;
    deactivatedAt: string | null;
    bannedAt: string | null;
    image: string | null;
}

interface AdminQuiz {
    id: string;
    title: string;
    description: string | null;
    isPublic: boolean;
    createdAt: string;
    creator: { username: string };
    category: { name: string } | null;
    _count: { questions: number; attempts: number };
}

interface AdminCategory {
    id: string;
    name: string;
    slug: string;
    _count: { quizzes: number };
}

type GameType = 'QUIZ' | 'UNO' | 'TABOO' | 'SKYJOW' | 'YAHTZEE' | 'PUISSANCE4' | 'JUST_ONE' | 'BATTLESHIP' | 'DIAMANT' | 'IMPOSTOR';

interface RecentActivity {
    createdAt: string;
    gameType: GameType;
    gameId: string;
    quiz: { id: string; title: string } | null;
    playerCount: number;
    players: { username: string; score: number; placement: number | null }[];
}

interface ActivityMeta {
    page: number;
    pageSize: number;
    totalGames: number;
    totalPages: number;
}

interface AdminStats {
    totals: {
        gameStats: Record<string, { count: number; points: number; rounds: number }>;
        users: number;
        quizzes: number;
        scores: number;
        pointsScored: number;
    };
    topQuizzes: {
        id: string;
        title: string;
        playCount: number;
        avgScore: number;
        maxScore: number;
        maxPossibleScore: number;
        questionCount: number;
    }[];
    recentActivity: RecentActivity[];
    activityMeta: ActivityMeta;
}

type AdminTab = 'stats' | 'users' | 'quizzes' | 'categories';
type UserSort = 'createdAt_desc' | 'createdAt_asc' | 'username_asc' | 'username_desc';

const PAGE_SIZE = 10;
const ACTIVITY_PAGE_SIZE = 20;

const SECTION_ID: Record<AdminTab, string> = {
    stats: 'admin-stats',
    users: 'admin-users',
    quizzes: 'admin-quizzes',
    categories: 'admin-categories',
};

const PLACEMENT_EMOJI: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };


function CollapseSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div>
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center justify-between w-full text-left mb-3 group"
            >
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{title}</h2>
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 transition-transform duration-200 text-[10px] group-hover:bg-gray-300 dark:group-hover:bg-gray-600 ${open ? 'rotate-0' : '-rotate-90'}`}>▾</span>
            </button>
            {open && children}
        </div>
    );
}

export default function AdminPanel() {
    const hashToTab = (hash: string): AdminTab => {
        const map: Record<string, AdminTab> = {
            '#admin-stats': 'stats',
            '#admin-users': 'users',
            '#admin-quizzes': 'quizzes',
            '#admin-categories': 'categories',
        };
        return map[hash] ?? 'stats';
    };

    const [activeTab, setActiveTab] = useState<AdminTab>(() =>
        typeof window !== 'undefined' ? hashToTab(window.location.hash) : 'stats'
    );

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [userPage, setUserPage] = useState(1);
    const [userTotalPages, setUserTotalPages] = useState(1);
    const [userQuery, setUserQuery] = useState('');
    const [userSort, setUserSort] = useState<UserSort>('createdAt_desc');

    const [gameFilter, setGameFilter] = useState<GameFilter>('ALL');

    const [quizzes, setQuizzes] = useState<AdminQuiz[]>([]);
    const [quizPage, setQuizPage] = useState(1);
    const [quizTotalPages, setQuizTotalPages] = useState(1);

    const [categories, setCategories] = useState<AdminCategory[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);

    const [stats, setStats] = useState<AdminStats | null>(null);
    const [activityPeriod, setActivityPeriod] = useState(30);
    const [activityPage, setActivityPage] = useState(1);
    const [activityUserQuery, setActivityUserQuery] = useState('');
    const activityUserQueryRef = useRef('');
    const activityGameFilterRef = useRef<GameFilter>('ALL');

    const [loading, setLoading] = useState(false);
    const [loadingStats, setLoadingStats] = useState(false);
    const [loadingActivity, setLoadingActivity] = useState(false);

    const [playerModal, setPlayerModal] = useState<{ gameId: string; players: { username: string; score: number; placement: number | null }[] } | null>(null);

    const { data: session } = useSession();

    const scrollToSection = useCallback((tab: AdminTab) => {
        const id = SECTION_ID[tab];
        history.replaceState(null, '', `#${id}`);
        setTimeout(() => {
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
    }, []);

    const buildStatsUrl = useCallback((period: number, page: number, q: string, gameType: GameFilter | 'ALL') => {
        const params = new URLSearchParams({ period: String(period), page: String(page), pageSize: String(ACTIVITY_PAGE_SIZE) });
        if (q.trim()) params.set('q', q.trim());
        if (gameType !== 'ALL') params.set('gameType', gameType);
        return `/api/admin/stats?${params.toString()}`;
    }, []);

    const fetchStatsFull = useCallback(async (
        period = activityPeriod, page = 1,
        q = activityUserQueryRef.current,
        gameType: GameFilter | 'ALL' = activityGameFilterRef.current,
    ) => {
        setLoadingStats(true);
        try {
            const res = await fetch(buildStatsUrl(period, page, q, gameType), { cache: 'no-store' });
            if (res.ok) setStats(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoadingStats(false); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [buildStatsUrl]);

    const refreshActivity = useCallback(async (
        period: number, page: number, q: string,
        gameType: GameFilter | 'ALL' = activityGameFilterRef.current,
    ) => {
        setLoadingActivity(true);
        try {
            const res = await fetch(buildStatsUrl(period, page, q, gameType), { cache: 'no-store' });
            if (!res.ok) return;
            const data: AdminStats = await res.json();
            setStats(prev => prev ? { ...prev, recentActivity: data.recentActivity, activityMeta: data.activityMeta } : data);
        } catch (err) { console.error(err); }
        finally { setLoadingActivity(false); }
    }, [buildStatsUrl]);

    const fetchUsers = useCallback(async (page = 1) => {
        const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), sort: userSort });
        if (userQuery.trim()) params.set('q', userQuery.trim());
        const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        setUsers(data.users);
        setUserTotalPages(data.totalPages);
        setUserPage(page);
    }, [userQuery, userSort]);

    const fetchTab = useCallback(async (tab: AdminTab) => {
        setLoading(true);
        try {
            if (tab === 'users') {
                await fetchUsers(1);
            } else if (tab === 'quizzes') {
                const res = await fetch(`/api/admin/quiz?page=1&pageSize=${PAGE_SIZE}`, { cache: 'no-store' });
                if (res.ok) { const data = await res.json(); setQuizzes(data.quizzes); setQuizTotalPages(data.totalPages); setQuizPage(1); }
            } else if (tab === 'categories') {
                const res = await fetch('/api/admin/categories', { cache: 'no-store' });
                if (res.ok) setCategories(await res.json());
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [fetchUsers]);

    useEffect(() => {
        if (activeTab === 'stats') {
            setActivityPage(1); setActivityUserQuery('');
            activityUserQueryRef.current = ''; activityGameFilterRef.current = 'ALL';
            setGameFilter('ALL');
            fetchStatsFull(activityPeriod, 1, '', 'ALL');
        } else { fetchTab(activeTab); }
        scrollToSection(activeTab);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'stats') return;
        setActivityPage(1);
        refreshActivity(activityPeriod, 1, activityUserQueryRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activityPeriod]);

    useEffect(() => {
        activityUserQueryRef.current = activityUserQuery;
        if (activeTab !== 'stats') return;
        const timer = setTimeout(() => { setActivityPage(1); refreshActivity(activityPeriod, 1, activityUserQuery); }, 400);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activityUserQuery]);

    useEffect(() => {
        activityGameFilterRef.current = gameFilter;
        if (activeTab !== 'stats') return;
        setActivityPage(1);
        refreshActivity(activityPeriod, 1, activityUserQueryRef.current, gameFilter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameFilter]);

    useEffect(() => {
        if (activeTab !== 'users') return;
        fetchUsers(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userQuery, userSort]);

    useEffect(() => {
        const onHashChange = () => setActiveTab(hashToTab(window.location.hash));
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    const handleActivityPageChange = (p: number) => { setActivityPage(p); refreshActivity(activityPeriod, p, activityUserQueryRef.current, activityGameFilterRef.current); };
    const handleUserPageChange = async (p: number) => { await fetchUsers(p); };
    const handleQuizPageChange = async (p: number) => {
        setQuizPage(p);
        const res = await fetch(`/api/admin/quiz?page=${p}&pageSize=${PAGE_SIZE}`, { cache: 'no-store' });
        if (res.ok) { const data = await res.json(); setQuizzes(data.quizzes); setQuizTotalPages(data.totalPages); }
    };

    const handleRoleChange = async (userId: string, role: string) => {
        const res = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, role }) });
        if (res.ok) await fetchUsers(userPage);
        else alert((await res.json())?.error ?? 'Erreur');
    };

    const handleToggleBan = async (userId: string, isBanned: boolean) => {
        const action = isBanned ? 'réactiver' : 'désactiver';
        if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ce compte ?`)) return;
        const res = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, action: 'toggleBan' }) });
        if (res.ok) await fetchUsers(userPage);
        else alert((await res.json())?.error ?? 'Erreur');
    };

    const handleDeleteUser = async (userId: string, username: string) => {
        if (!confirm(`Supprimer l'utilisateur "${username}" ?`)) return;
        const res = await fetch('/api/admin/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
        if (res.ok) await fetchUsers(userPage);
        else alert((await res.json()).error);
    };

    const handleDeleteQuiz = async (quizId: string, title: string) => {
        if (!confirm(`Supprimer le quiz "${title}" ?`)) return;
        const res = await fetch('/api/admin/quiz', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quizId }) });
        if (res.ok) handleQuizPageChange(quizPage);
        else alert((await res.json())?.error ?? 'Erreur');
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        const res = await fetch('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCategoryName }) });
        if (res.ok) { setNewCategoryName(''); fetchTab('categories'); }
        else alert((await res.json()).error);
    };

    const handleRenameCategory = async () => {
        if (!editingCategory || !editingCategory.name.trim()) return;
        const res = await fetch('/api/admin/categories', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId: editingCategory.id, name: editingCategory.name }) });
        if (res.ok) { setEditingCategory(null); fetchTab('categories'); }
        else alert((await res.json())?.error ?? 'Erreur');
    };

    const handleDeleteCategory = async (categoryId: string, name: string) => {
        if (!confirm(`Supprimer la catégorie "${name}" ?`)) return;
        const res = await fetch('/api/admin/categories', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId }) });
        if (res.ok) setCategories(categories.filter(c => c.id !== categoryId));
        else alert((await res.json()).error);
    };

    const tabs: { key: AdminTab; label: string; emoji: string }[] = [
        { key: 'stats', label: 'Statistiques', emoji: '📊' },
        { key: 'users', label: 'Utilisateurs', emoji: '👥' },
        { key: 'quizzes', label: 'Quiz', emoji: '📝' },
        { key: 'categories', label: 'Catégories', emoji: '🏷️' },
    ];

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">🛡️ Administration</h2>

            <div className="flex flex-wrap gap-2 mb-6">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => { setActiveTab(t.key); scrollToSection(t.key); }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${activeTab === t.key
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        {t.emoji} {t.label}
                    </button>
                ))}
            </div>

            {activeTab === 'stats' ? (
                loadingStats && !stats ? (
                    <div className="flex items-center justify-center py-16">
                        <LoadingSpinner fullScreen={false} />
                    </div>
                ) : (
                    <div id="admin-stats" className="scroll-mt-24 space-y-4">
                        {stats && (
                            <>
                                {/* Chips overview */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { label: 'utilisateurs', value: stats.totals.users },
                                        { label: 'quiz créés', value: stats.totals.quizzes },
                                        { label: 'parties jouées', value: Object.values(stats.totals.gameStats).reduce((a, b) => a + b.count, 0) },
                                        { label: 'points marqués', value: stats.totals.pointsScored },
                                    ].map((stat) => (
                                        <div key={stat.label} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3">
                                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value.toLocaleString()}</div>
                                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{stat.label}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Statistiques par jeu */}
                                {Object.values(stats.totals.gameStats).some(v => v.count > 0) && (
                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                                        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Statistiques par jeu</h2>
                                        <GameStatCards gameStats={stats.totals.gameStats} />
                                    </div>
                                )}

                                {/* Top quizzes */}
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                                    <CollapseSection title="🏆 Quiz les plus joués" defaultOpen={false}>
                                        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                                            <table className="w-full text-sm">
                                                <thead className="bg-white dark:bg-gray-900">
                                                    <tr className="text-left">
                                                        <th className="px-4 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Quiz</th>
                                                        <th className="px-4 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center">Questions</th>
                                                        <th className="px-4 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center">Parties</th>
                                                        <th className="px-4 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center">Score moy.</th>
                                                        <th className="px-4 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center">Score max</th>
                                                        <th className="px-4 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center">Max possible</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                                    {stats.topQuizzes.map((quiz, i) => (
                                                        <tr key={quiz.id} className="hover:bg-white dark:hover:bg-gray-900 transition-colors">
                                                            <td className="px-4 py-2 font-medium">
                                                                <Link href={`/quiz/${quiz.id}`} className="text-blue-600 dark:text-blue-400 hover:underline text-xs">
                                                                    {i + 1}. {quiz.title}
                                                                </Link>
                                                            </td>
                                                            <td className="px-4 py-2 text-center text-xs text-gray-500 dark:text-gray-400">{quiz.questionCount}</td>
                                                            <td className="px-4 py-2 text-center text-xs text-gray-700 dark:text-gray-300 font-semibold">{quiz.playCount}</td>
                                                            <td className="px-4 py-2 text-center text-xs text-orange-600 dark:text-orange-400 font-semibold">{quiz.avgScore} pts</td>
                                                            <td className="px-4 py-2 text-center text-xs text-green-600 dark:text-green-400 font-semibold">{quiz.maxScore} pts</td>
                                                            <td className="px-4 py-2 text-center text-xs text-purple-600 dark:text-purple-400 font-semibold">{quiz.maxPossibleScore} pts</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CollapseSection>
                                </div>

                                {/* Activité récente */}
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                                    <CollapseSection title="🕐 Activité récente">
                                        <div className="flex flex-wrap gap-2 items-center mb-3">
                                            <select
                                                value={activityPeriod}
                                                onChange={(e) => setActivityPeriod(Number(e.target.value))}
                                                className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg px-3 py-1.5 text-gray-600 dark:text-gray-300"
                                            >
                                                <option value={-1}>Aujourd'hui</option>
                                                <option value={1}>Dernières 24h</option>
                                                <option value={7}>7 derniers jours</option>
                                                <option value={30}>30 derniers jours</option>
                                                <option value={0}>Tout</option>
                                            </select>

                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none text-sm">🔍</span>
                                                <input
                                                    type="text"
                                                    value={activityUserQuery}
                                                    onChange={(e) => setActivityUserQuery(e.target.value)}
                                                    placeholder="Filtrer par joueur…"
                                                    className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg text-gray-700 dark:text-gray-300 w-48 focus:outline-none focus:ring-2 focus:ring-red-400"
                                                />
                                                {activityUserQuery && (
                                                    <button onClick={() => setActivityUserQuery('')} className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-base">×</button>
                                                )}
                                            </div>

                                            {loadingActivity && <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />}

                                            {stats.activityMeta && (
                                                <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                                                    {stats.activityMeta.totalGames} partie{stats.activityMeta.totalGames > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mb-3">
                                            <GameFilterPills
                                                value={gameFilter}
                                                onChange={setGameFilter}
                                                activeClassName="bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white"
                                                inactiveClassName="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                            />
                                        </div>

                                        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                                            <table className="w-full table-fixed text-sm">
                                                <thead className="bg-white dark:bg-gray-900">
                                                    <tr>
                                                        <th style={{ width: '22%' }} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Jeu</th>
                                                        <th style={{ width: '38%' }} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Quiz</th>
                                                        <th style={{ width: '16%' }} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Joueurs</th>
                                                        <th style={{ width: '24%' }} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                                    {stats.recentActivity.length === 0 ? (
                                                        <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">Aucune activité pour cette période.</td></tr>
                                                    ) : (
                                                        stats.recentActivity.map((activity) => (
                                                            <tr key={activity.gameId} className="hover:bg-white dark:hover:bg-gray-900 transition-colors">
                                                                <td className="px-3 py-2 whitespace-nowrap">
                                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${GAME_COLOR[activity.gameType]?.badge ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                                                        {GAME_EMOJI_MAP[activity.gameType]} {GAME_LABEL_MAP[activity.gameType] ?? activity.gameType}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2 whitespace-nowrap max-w-[140px]">
                                                                    {activity.quiz
                                                                        ? <Link href={`/quiz/${activity.quiz.id}`} className="text-blue-600 dark:text-blue-400 hover:underline text-xs truncate block">{activity.quiz.title}</Link>
                                                                        : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <button onClick={() => setPlayerModal({ gameId: activity.gameId, players: activity.players })} className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                                                        👥 {activity.playerCount}
                                                                    </button>
                                                                </td>
                                                                <td className="px-3 py-2 whitespace-nowrap text-[10px] text-gray-400 dark:text-gray-500">
                                                                    {new Date(activity.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                                                    {' '}
                                                                    {new Date(activity.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {stats.activityMeta && stats.activityMeta.totalPages > 1 && (
                                            <Pagination currentPage={activityPage} totalPages={stats.activityMeta.totalPages} onPageChange={handleActivityPageChange} />
                                        )}
                                    </CollapseSection>
                                </div>
                            </>
                        )}
                    </div>
                )
            ) : loading ? (
                <div className="flex items-center justify-center py-16">
                    <LoadingSpinner fullScreen={false} />
                </div>
            ) : (
                <>
                    {activeTab === 'users' && (
                        <div id="admin-users" className="scroll-mt-24 space-y-4">
                            {/* Filtres */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3 flex flex-wrap gap-2 items-center">
                                <input
                                    type="text"
                                    value={userQuery}
                                    onChange={(e) => setUserQuery(e.target.value)}
                                    placeholder="Rechercher (username ou email)…"
                                    className="flex-1 min-w-0 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400"
                                />
                                <select
                                    value={userSort}
                                    onChange={(e) => setUserSort(e.target.value as UserSort)}
                                    className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg px-3 py-1.5 text-gray-600 dark:text-gray-300"
                                >
                                    <option value="createdAt_desc">Plus récents</option>
                                    <option value="createdAt_asc">Plus anciens</option>
                                    <option value="username_asc">Username A → Z</option>
                                    <option value="username_desc">Username Z → A</option>
                                </select>
                            </div>

                            {/* Table */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                                    <table className="w-full text-sm">
                                        <thead className="bg-white dark:bg-gray-900">
                                            <tr className="text-left">
                                                {['', 'Utilisateur', 'Email', 'Inscrit le', 'Vu le'].map(h => (
                                                    <th key={h} className="px-3 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{h}</th>
                                                ))}
                                                <th className="px-3 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                                    <span className="inline-flex items-center gap-1">
                                                        Statut
                                                        <span className="relative group">
                                                            <span className="cursor-help text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-[11px] font-bold leading-none">ⓘ</span>
                                                            <div className="absolute left-1/2 -translate-x-1/2 top-5 z-50 hidden group-hover:block w-56 bg-gray-900 dark:bg-gray-700 text-white text-[11px] rounded-lg shadow-lg p-3 normal-case tracking-normal font-normal">
                                                                <p className="mb-1"><span className="font-semibold text-green-400">Actif</span> / <span className="font-semibold text-red-400">Banni</span> — désactivation admin, bloque la connexion.</p>
                                                                <p><span className="font-semibold text-orange-400">Désactivé</span> — auto-désactivation par l'utilisateur, réactivée à la reconnexion.</p>
                                                            </div>
                                                        </span>
                                                    </span>
                                                </th>
                                                {['Rôle', 'Actions'].map(h => (
                                                    <th key={h} className="px-3 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                            {users.length === 0 ? (
                                                <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">Aucun utilisateur trouvé</td></tr>
                                            ) : users.map((user) => (
                                                <tr key={user.id} className="hover:bg-white dark:hover:bg-gray-900 transition-colors">
                                                    <td className="px-3 py-2">
                                                        {user.image
                                                            ? <img src={user.image} className="w-8 h-8 rounded-lg object-cover border border-gray-100 dark:border-gray-800" />
                                                            : <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">{user.username[0]?.toUpperCase()}</div>}
                                                    </td>
                                                    <td className="px-3 py-2 font-semibold text-xs">
                                                        <Link href={session?.user?.username === user.username ? '/dashboard' : `/profil/${user.username}`} className="text-blue-600 dark:text-blue-400 hover:underline">{user.username}</Link>
                                                    </td>
                                                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{user.email}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString('fr-FR')}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                        {user.lastSeen ? new Date(user.lastSeen).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="flex flex-col gap-1">
                                                            {user.role !== 'ADMIN' ? (
                                                                <button
                                                                    onClick={() => handleToggleBan(user.id, !!user.bannedAt)}
                                                                    className={`text-[10px] font-semibold px-2 py-0.5 border rounded-lg transition-colors ${user.bannedAt
                                                                        ? 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                                        : 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                                    }`}
                                                                >
                                                                    {user.bannedAt ? 'Banni' : 'Actif'}
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs font-semibold text-green-600 dark:text-green-400">Actif</span>
                                                            )}
                                                            {user.deactivatedAt && (
                                                                <span className="text-[10px] text-orange-500 dark:text-orange-400 whitespace-nowrap">
                                                                    Désactivé {new Date(user.deactivatedAt).toLocaleDateString('fr-FR')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {user.role === 'ADMIN' ? (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800" title="Rôle verrouillé">
                                                                ADMIN <span className="opacity-60">🔒</span>
                                                            </span>
                                                        ) : (
                                                            <select value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value)} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${user.role === 'RANDOM' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'}`}>
                                                                <option value="USER">USER</option>
                                                                <option value="RANDOM">RANDOM</option>
                                                                <option value="ADMIN">ADMIN</option>
                                                            </select>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {user.role !== 'ADMIN' && (
                                                            <button onClick={() => handleDeleteUser(user.id, user.username)} className="text-[10px] font-semibold text-red-500 hover:text-red-700 px-2 py-0.5 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Supprimer</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <Pagination currentPage={userPage} totalPages={userTotalPages} onPageChange={handleUserPageChange} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'quizzes' && (
                        <div id="admin-quizzes" className="scroll-mt-24">
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                                    <table className="w-full text-sm">
                                        <thead className="bg-white dark:bg-gray-900">
                                            <tr className="text-left">
                                                {['Titre', 'Créateur', 'Catégorie', 'Questions', 'Parties', 'Visibilité', 'Actions'].map(h => (
                                                    <th key={h} className="px-3 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                            {quizzes.map((quiz) => (
                                                <tr key={quiz.id} className="hover:bg-white dark:hover:bg-gray-900 transition-colors">
                                                    <td className="px-3 py-2 font-medium max-w-[180px]">
                                                        <Link href={`/quiz/${quiz.id}`} className="text-blue-600 dark:text-blue-400 hover:underline text-xs truncate block">{quiz.title}</Link>
                                                    </td>
                                                    <td className="px-3 py-2 text-xs">
                                                        <Link href={session?.user?.username === quiz.creator.username ? '/dashboard' : `/profil/${quiz.creator.username}`} className="text-blue-600 dark:text-blue-400 hover:underline">{quiz.creator.username}</Link>
                                                    </td>
                                                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{quiz.category?.name ?? '—'}</td>
                                                    <td className="px-3 py-2 text-xs text-center text-gray-700 dark:text-gray-300 font-semibold">{quiz._count.questions}</td>
                                                    <td className="px-3 py-2 text-xs text-center text-gray-700 dark:text-gray-300 font-semibold">{quiz._count.attempts}</td>
                                                    <td className="px-3 py-2 text-center">
                                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${quiz.isPublic ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                                                            {quiz.isPublic ? 'Public' : 'Privé'}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="flex gap-1.5">
                                                            <Link href={`/quiz/${quiz.id}/edit`} className="text-[10px] font-semibold text-blue-500 hover:text-blue-700 px-2 py-0.5 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">Modifier</Link>
                                                            <button onClick={() => handleDeleteQuiz(quiz.id, quiz.title)} className="text-[10px] font-semibold text-red-500 hover:text-red-700 px-2 py-0.5 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Supprimer</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <Pagination currentPage={quizPage} totalPages={quizTotalPages} onPageChange={handleQuizPageChange} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'categories' && (
                        <div id="admin-categories" className="scroll-mt-24 space-y-4">
                            {/* Ajout */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3 flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Nouvelle catégorie…"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                                    className="flex-1 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg px-3 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                                />
                                <button onClick={handleCreateCategory} className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors">+ Ajouter</button>
                            </div>

                            {/* Liste */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-2">
                                {categories.map((cat) => (
                                    <div key={cat.id} className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-2.5">
                                        {editingCategory?.id === cat.id ? (
                                            <input
                                                type="text"
                                                value={editingCategory.name}
                                                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                                onKeyDown={(e) => e.key === 'Enter' && handleRenameCategory()}
                                                className="flex-1 mr-4 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                autoFocus
                                            />
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{cat.name}</span>
                                                <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{cat._count.quizzes} {plural(cat._count.quizzes, 'Quiz', 'Quizzes')}</span>
                                            </div>
                                        )}
                                        <div className="flex gap-1.5 shrink-0">
                                            {editingCategory?.id === cat.id ? (
                                                <>
                                                    <button onClick={handleRenameCategory} className="text-[10px] px-2 py-0.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors">Sauvegarder</button>
                                                    <button onClick={() => setEditingCategory(null)} className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Annuler</button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => setEditingCategory({ id: cat.id, name: cat.name })} className="text-[10px] font-semibold text-blue-500 hover:text-blue-700 px-2 py-0.5 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">Renommer</button>
                                                    <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="text-[10px] font-semibold text-red-500 hover:text-red-700 px-2 py-0.5 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Supprimer</button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {playerModal && (
                <PlayerModal gameId={playerModal.gameId} players={playerModal.players} onClose={() => setPlayerModal(null)} />
            )}
        </div>
    );
}
