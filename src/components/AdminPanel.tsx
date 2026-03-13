'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Pagination from '@/components/Pagination';

interface AdminUser {
    id: string;
    username: string;
    email: string;
    role: string;
    createdAt: string;
    _count: { createdQuizzes: number };
    quizAttempts: number;
    unoAttempts: number;
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

type GameType = 'QUIZ' | 'UNO' | 'TABOO' | 'SKYJOW' | 'YAHTZEE';

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
        gameStats: Record<string, { count: number; points: number }>;
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

const GAME_EMOJI: Record<GameType, string> = {
    QUIZ: '🎯',
    UNO: '🎴',
    TABOO: '🚫',
    SKYJOW: '✈️',
    YAHTZEE: '🎲',
};

const GAME_BADGE: Record<GameType, string> = {
    QUIZ: 'bg-blue-100   dark:bg-blue-900/40   text-blue-700   dark:text-blue-400',
    UNO: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
    TABOO: 'bg-red-100    dark:bg-red-900/40    text-red-700    dark:text-red-400',
    SKYJOW: 'bg-sky-100    dark:bg-sky-900/40    text-sky-700    dark:text-sky-400',
    YAHTZEE: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
};

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
    const [hideAnonymous, setHideAnonymous] = useState(true);
    const [userSort, setUserSort] = useState<UserSort>('createdAt_desc');

    const [gameFilter, setGameFilter] = useState<GameType | 'ALL'>('ALL');

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
    const activityGameFilterRef = useRef<GameType | 'ALL'>('ALL');

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

    // ── Stats fetching ───────────────────────────────────────────────────────

    const buildStatsUrl = useCallback((
        period: number,
        page: number,
        q: string,
        gameType: GameType | 'ALL' = 'ALL',
    ) => {
        const params = new URLSearchParams({
            period: String(period),
            page: String(page),
            pageSize: String(ACTIVITY_PAGE_SIZE),
        });
        if (q.trim()) params.set('q', q.trim());
        if (gameType !== 'ALL') params.set('gameType', gameType);
        return `/api/admin/stats?${params.toString()}`;
    }, []);

    const fetchStatsFull = useCallback(async (
        period = activityPeriod,
        page = 1,
        q = activityUserQueryRef.current,
        gameType: GameType | 'ALL' = activityGameFilterRef.current,
    ) => {
        setLoadingStats(true);
        try {
            const res = await fetch(buildStatsUrl(period, page, q, gameType), { cache: 'no-store' });
            if (res.ok) setStats(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingStats(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [buildStatsUrl]);

    const refreshActivity = useCallback(async (
        period: number,
        page: number,
        q: string,
        gameType: GameType | 'ALL' = activityGameFilterRef.current,
    ) => {
        setLoadingActivity(true);
        try {
            const res = await fetch(buildStatsUrl(period, page, q, gameType), { cache: 'no-store' });
            if (!res.ok) return;
            const data: AdminStats = await res.json();
            setStats((prev) => prev
                ? { ...prev, recentActivity: data.recentActivity, activityMeta: data.activityMeta }
                : data
            );
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingActivity(false);
        }
    }, [buildStatsUrl]);

    // ── Users fetching ───────────────────────────────────────────────────────

    const fetchUsers = useCallback(async (page = 1) => {
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(PAGE_SIZE),
            q: userQuery.trim(),
            hideAnonymous: String(hideAnonymous),
            sort: userSort,
        });
        if (!userQuery.trim()) params.delete('q');
        const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        setUsers(data.users);
        setUserTotalPages(data.totalPages);
        setUserPage(page);
    }, [userQuery, hideAnonymous, userSort]);

    // ── Generic tab fetching ─────────────────────────────────────────────────

    const fetchTab = useCallback(async (tab: AdminTab) => {
        setLoading(true);
        try {
            if (tab === 'users') {
                await fetchUsers(1);
            } else if (tab === 'quizzes') {
                const res = await fetch(`/api/admin/quiz?page=1&pageSize=${PAGE_SIZE}`, { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    setQuizzes(data.quizzes);
                    setQuizTotalPages(data.totalPages);
                    setQuizPage(1);
                }
            } else if (tab === 'categories') {
                const res = await fetch('/api/admin/categories', { cache: 'no-store' });
                if (res.ok) setCategories(await res.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [fetchUsers]);

    // ── Effects ──────────────────────────────────────────────────────────────

    useEffect(() => {
        if (activeTab === 'stats') {
            setActivityPage(1);
            setActivityUserQuery('');
            activityUserQueryRef.current = '';
            activityGameFilterRef.current = 'ALL';
            setGameFilter('ALL');
            fetchStatsFull(activityPeriod, 1, '', 'ALL');
        } else {
            fetchTab(activeTab);
        }
        scrollToSection(activeTab);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // Period change → reset to page 1
    useEffect(() => {
        if (activeTab !== 'stats') return;
        setActivityPage(1);
        refreshActivity(activityPeriod, 1, activityUserQueryRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activityPeriod]);

    // User query change → debounce 400ms, reset to page 1
    useEffect(() => {
        activityUserQueryRef.current = activityUserQuery;
        if (activeTab !== 'stats') return;
        const timer = setTimeout(() => {
            setActivityPage(1);
            refreshActivity(activityPeriod, 1, activityUserQuery);
        }, 400);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activityUserQuery]);

    // Game type filter change → send to API, reset to page 1
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
    }, [userQuery, hideAnonymous, userSort]);

    useEffect(() => {
        const onHashChange = () => {
            const tab = hashToTab(window.location.hash);
            setActiveTab(tab);
        };
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleActivityPageChange = (p: number) => {
        setActivityPage(p);
        refreshActivity(activityPeriod, p, activityUserQueryRef.current, activityGameFilterRef.current);
    };

    const handleUserPageChange = async (p: number) => { await fetchUsers(p); };

    const handleQuizPageChange = async (p: number) => {
        setQuizPage(p);
        const res = await fetch(`/api/admin/quiz?page=${p}&pageSize=${PAGE_SIZE}`, { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            setQuizzes(data.quizzes);
            setQuizTotalPages(data.totalPages);
        }
    };

    const handleRoleChange = async (userId: string, role: string) => {
        const res = await fetch('/api/admin/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, role }),
        });
        if (res.ok) await fetchUsers(userPage);
        else alert((await res.json())?.error ?? 'Erreur');
    };

    const handleDeleteUser = async (userId: string, username: string) => {
        if (!confirm(`Supprimer l'utilisateur "${username}" ?`)) return;
        const res = await fetch('/api/admin/users', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        if (res.ok) await fetchUsers(userPage);
        else alert((await res.json()).error);
    };

    const handleDeleteQuiz = async (quizId: string, title: string) => {
        if (!confirm(`Supprimer le quiz "${title}" ?`)) return;
        const res = await fetch('/api/admin/quiz', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quizId }),
        });
        if (res.ok) handleQuizPageChange(quizPage);
        else alert((await res.json())?.error ?? 'Erreur');
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        const res = await fetch('/api/admin/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newCategoryName }),
        });
        if (res.ok) { setNewCategoryName(''); fetchTab('categories'); }
        else alert((await res.json()).error);
    };

    const handleRenameCategory = async () => {
        if (!editingCategory || !editingCategory.name.trim()) return;
        const res = await fetch('/api/admin/categories', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryId: editingCategory.id, name: editingCategory.name }),
        });
        if (res.ok) { setEditingCategory(null); fetchTab('categories'); }
        else alert((await res.json())?.error ?? 'Erreur');
    };

    const handleDeleteCategory = async (categoryId: string, name: string) => {
        if (!confirm(`Supprimer la catégorie "${name}" ?`)) return;
        const res = await fetch('/api/admin/categories', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryId }),
        });
        if (res.ok) setCategories(categories.filter((c) => c.id !== categoryId));
        else alert((await res.json()).error);
    };

    const tabs: { key: AdminTab; label: string; emoji: string }[] = [
        { key: 'stats', label: 'Statistiques', emoji: '📊' },
        { key: 'users', label: 'Utilisateurs', emoji: '👥' },
        { key: 'quizzes', label: 'Quiz', emoji: '📝' },
        { key: 'categories', label: 'Catégories', emoji: '🏷️' },
    ];

    // ── Render ────────────────────────────────────────────────────────────────

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
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-red-600 border-t-transparent" />
                    </div>
                ) : (
                    <div id="admin-stats" className="scroll-mt-24">
                        {stats && (
                            <div className="space-y-8">

                                {/* Totaux globaux */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Utilisateurs', value: stats.totals.users, color: 'blue' },
                                        { label: 'Quiz', value: stats.totals.quizzes, color: 'green' },
                                        { label: 'Parties jouées', value: Object.values(stats.totals.gameStats).reduce((a, b) => a + b.count, 0), color: 'orange' },
                                        { label: 'Points marqués', value: stats.totals.pointsScored, color: 'purple' },
                                    ].map((stat) => (
                                        <div key={stat.label} className={`bg-${stat.color}-50 dark:bg-${stat.color}-900/20 border border-${stat.color}-200 dark:border-${stat.color}-800 rounded-xl p-4 text-center`}>
                                            <div className={`text-3xl font-bold text-${stat.color}-600 dark:text-${stat.color}-400`}>{stat.value.toLocaleString()}</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{stat.label}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Parties par jeu */}
                                <div className="flex flex-wrap gap-3 justify-center">
                                    {(Object.entries(stats.totals.gameStats) as [GameType, { count: number; points: number }][])
                                        .sort((a, b) => b[1].count - a[1].count)
                                        .map(([type, { count, points }]) => (
                                            <div key={type} className={`${GAME_BADGE[type]} border rounded-xl p-3.5 flex items-center gap-3.5`} style={{ width: '220px' }}>
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 opacity-80 ${GAME_BADGE[type]}`}>
                                                    {GAME_EMOJI[type]}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[11px] font-bold uppercase tracking-widest opacity-70 mb-1.5">{type}</div>
                                                    <div className="flex items-center gap-3">
                                                        <div>
                                                            <div className="text-lg font-bold tabular-nums leading-none">{count.toLocaleString()}</div>
                                                            <div className="text-[11px] opacity-60 mt-0.5">parties</div>
                                                        </div>
                                                        <div className="w-px self-stretch opacity-20 bg-current" />
                                                        <div>
                                                            <div className="text-lg font-bold tabular-nums leading-none">{points.toLocaleString()}</div>
                                                            <div className="text-[11px] opacity-60 mt-0.5">points</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>

                                {/* Top quizzes */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">🏆 Quiz les plus joués</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-left">
                                                    <th className="px-4 py-3 rounded-l-lg">Quiz</th>
                                                    <th className="px-4 py-3 text-center">Questions</th>
                                                    <th className="px-4 py-3 text-center">Parties</th>
                                                    <th className="px-4 py-3 text-center">Score moyen</th>
                                                    <th className="px-4 py-3 text-center">Score max joueur</th>
                                                    <th className="px-4 py-3 text-center rounded-r-lg">Score max quiz</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stats.topQuizzes.map((quiz, i) => (
                                                    <tr key={quiz.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                                        <td className="px-4 py-3 font-medium">
                                                            <Link href={`/quiz/${quiz.id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">
                                                                {i + 1}. {quiz.title}
                                                            </Link>
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{quiz.questionCount}</td>
                                                        <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{quiz.playCount}</td>
                                                        <td className="px-4 py-3 text-center text-orange-600 dark:text-orange-400 font-semibold">{quiz.avgScore} pts</td>
                                                        <td className="px-4 py-3 text-center text-green-600 dark:text-green-400 font-semibold">{quiz.maxScore} pts</td>
                                                        <td className="px-4 py-3 text-center text-purple-600 dark:text-purple-400 font-semibold">{quiz.maxPossibleScore} pts</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Activité récente */}
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">🕐 Activité récente</h3>
                                        {loadingActivity && (
                                            <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
                                        )}
                                    </div>

                                    {/* Filters row */}
                                    <div className="flex flex-wrap gap-3 items-center mb-3">
                                        {/* Period */}
                                        <select
                                            value={activityPeriod}
                                            onChange={(e) => setActivityPeriod(Number(e.target.value))}
                                            className="text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 text-gray-600 dark:text-gray-300"
                                        >
                                            <option value={-1}>Aujourd'hui</option>
                                            <option value={1}>Dernières 24h</option>
                                            <option value={7}>7 derniers jours</option>
                                            <option value={30}>30 derniers jours</option>
                                            <option value={0}>Tout</option>
                                        </select>

                                        {/* User search */}
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none text-sm">🔍</span>
                                            <input
                                                type="text"
                                                value={activityUserQuery}
                                                onChange={(e) => setActivityUserQuery(e.target.value)}
                                                placeholder="Filtrer par joueur…"
                                                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300 w-52 focus:outline-none focus:ring-2 focus:ring-red-400"
                                            />
                                            {activityUserQuery && (
                                                <button
                                                    onClick={() => setActivityUserQuery('')}
                                                    className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-base"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>

                                        {/* Page info */}
                                        {stats.activityMeta && (
                                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                                                Page {stats.activityMeta.page} / {stats.activityMeta.totalPages}
                                                {' '}· {stats.activityMeta.totalGames} parties
                                            </span>
                                        )}
                                    </div>

                                    {/* Game type filter pills */}
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {(['ALL', 'QUIZ', 'UNO', 'TABOO', 'SKYJOW', 'YAHTZEE'] as const).map((g) => (
                                            <button
                                                key={g}
                                                onClick={() => setGameFilter(g)}
                                                className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors ${gameFilter === g
                                                    ? 'bg-red-600 text-white border-red-600'
                                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                {g === 'ALL' ? '🎮 Tous' : `${GAME_EMOJI[g]} ${g}`}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Activity table — filtering done server-side */}
                                    {(() => {
                                        const filtered = stats.recentActivity;
                                        return (
                                            <>
                                                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                                                    <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                                                        <thead className="bg-gray-50 dark:bg-gray-800">
                                                            <tr>
                                                                {['Joueur', 'Partie', 'Quiz', 'Joueurs', 'Score', 'Date'].map(h => (
                                                                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                                                        {h}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                                                            {filtered.length === 0 ? (
                                                                <tr>
                                                                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                                                        Aucune activité récente pour cette période.
                                                                    </td>
                                                                </tr>
                                                            ) : (
                                                                filtered.flatMap((activity) =>
                                                                    activity.players.map((player, pi) => {
                                                                        const userHref = session?.user?.username === player.username
                                                                            ? '/dashboard'
                                                                            : `/profil/${player.username}`;
                                                                        return (
                                                                            <tr key={`${activity.gameId}-${pi}`} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                                                <td className="px-3 py-2 whitespace-nowrap">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Link href={userHref} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                                                                            {player.username}
                                                                                        </Link>
                                                                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${GAME_BADGE[activity.gameType]}`}>
                                                                                            {GAME_EMOJI[activity.gameType]} {activity.gameType}
                                                                                        </span>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-gray-400 dark:text-gray-500">
                                                                                    {activity.gameId.slice(0, 8)}…
                                                                                </td>
                                                                                <td className="px-3 py-2 whitespace-nowrap">
                                                                                    {activity.quiz ? (
                                                                                        <Link href={`/quiz/${activity.quiz.id}`} className="text-blue-600 dark:text-blue-400 hover:underline text-xs">
                                                                                            {activity.quiz.title}
                                                                                        </Link>
                                                                                    ) : (
                                                                                        <span className="text-gray-400">—</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="px-3 py-2 text-center">
                                                                                    <button
                                                                                        onClick={() => setPlayerModal({ gameId: activity.gameId, players: activity.players })}
                                                                                        className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline tabular-nums"
                                                                                    >
                                                                                        {activity.playerCount}
                                                                                    </button>
                                                                                </td>
                                                                                <td className="px-3 py-2 whitespace-nowrap">
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <span className="font-bold text-gray-900 dark:text-white">{player.score}</span>
                                                                                        <span className="text-xs text-gray-400">pts</span>
                                                                                        {player.placement != null && (
                                                                                            <span className="text-base">
                                                                                                {PLACEMENT_EMOJI[player.placement] ?? `#${player.placement}`}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">
                                                                                    {new Date(activity.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                                                                    {' '}
                                                                                    {new Date(activity.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })
                                                                )
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Activity pagination */}
                                                {stats.activityMeta && stats.activityMeta.totalPages > 1 && (
                                                    <Pagination
                                                        currentPage={activityPage}
                                                        totalPages={stats.activityMeta.totalPages}
                                                        onPageChange={handleActivityPageChange}
                                                    />
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>

                            </div>
                        )}
                    </div>
                )
            ) : loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-red-600 border-t-transparent" />
                </div>
            ) : (
                <>
                    {/* Users */}
                    {activeTab === 'users' && (
                        <div id="admin-users" className="scroll-mt-24">
                            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
                                <div className="flex flex-col md:flex-row gap-3 md:items-center w-full">
                                    <input
                                        type="text"
                                        value={userQuery}
                                        onChange={(e) => setUserQuery(e.target.value)}
                                        placeholder="Rechercher (username ou email)..."
                                        className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm w-full md:w-96"
                                    />
                                    <select
                                        value={userSort}
                                        onChange={(e) => setUserSort(e.target.value as UserSort)}
                                        className="text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-gray-600 dark:text-gray-300 w-full md:w-56"
                                    >
                                        <option value="createdAt_desc">Plus récents</option>
                                        <option value="createdAt_asc">Plus anciens</option>
                                        <option value="username_asc">Username A → Z</option>
                                        <option value="username_desc">Username Z → A</option>
                                    </select>
                                </div>
                                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 select-none">
                                    <input
                                        type="checkbox"
                                        checked={hideAnonymous}
                                        onChange={(e) => setHideAnonymous(e.target.checked)}
                                        className="h-4 w-4"
                                    />
                                    Masquer ANONYMOUS
                                </label>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-left">
                                            <th className="px-4 py-3 rounded-l-lg">Utilisateur</th>
                                            <th className="px-4 py-3">Email</th>
                                            <th className="px-4 py-3 text-center">Quiz créés</th>
                                            <th className="px-4 py-3 text-center">🎯 Quiz</th>
                                            <th className="px-4 py-3 text-center">🎴 UNO</th>
                                            <th className="px-4 py-3 text-center">Rôle</th>
                                            <th className="px-4 py-3 text-center rounded-r-lg">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">Aucun utilisateur trouvé</td>
                                            </tr>
                                        ) : (
                                            users.map((user) => (
                                                <tr key={user.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                                    <td className="px-4 py-3 font-semibold">
                                                        <Link
                                                            href={session?.user?.username === user.username ? '/dashboard' : `/profil/${user.username}`}
                                                            className="text-blue-600 dark:text-blue-400 hover:underline transition-colors"
                                                        >
                                                            {user.username}
                                                        </Link>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{user.email}</td>
                                                    <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{user._count.createdQuizzes}</td>
                                                    <td className="px-4 py-3 text-center text-blue-600 dark:text-blue-400 font-medium">{user.quizAttempts}</td>
                                                    <td className="px-4 py-3 text-center text-orange-600 dark:text-orange-400 font-medium">{user.unoAttempts}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        {user.role === 'ADMIN' || user.role === 'ANONYMOUS' ? (
                                                            <span className={`text-xs font-bold px-3 py-1 rounded-full border inline-flex items-center gap-2 ${user.role === 'ADMIN' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-300 text-gray-800 border-gray-400'}`} title="Rôle verrouillé">
                                                                {user.role} <span className="opacity-60">🔒</span>
                                                            </span>
                                                        ) : (
                                                            <select
                                                                value={user.role}
                                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                                className={`text-xs font-bold px-2 py-1 rounded-full border ${user.role === 'RANDOM' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}
                                                            >
                                                                <option value="USER">USER</option>
                                                                <option value="RANDOM">RANDOM</option>
                                                                <option value="ANONYMOUS">ANONYMOUS</option>
                                                                <option value="ADMIN">ADMIN</option>
                                                            </select>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {user.role !== 'ADMIN' && (
                                                            <button
                                                                onClick={() => handleDeleteUser(user.id, user.username)}
                                                                className="text-red-500 hover:text-red-700 font-semibold text-xs px-3 py-1 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                                                            >
                                                                Supprimer
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination currentPage={userPage} totalPages={userTotalPages} onPageChange={handleUserPageChange} />
                        </div>
                    )}

                    {/* Quizzes */}
                    {activeTab === 'quizzes' && (
                        <div id="admin-quizzes" className="scroll-mt-24">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-left">
                                            <th className="px-4 py-3 rounded-l-lg">Titre</th>
                                            <th className="px-4 py-3">Créateur</th>
                                            <th className="px-4 py-3">Catégorie</th>
                                            <th className="px-4 py-3 text-center">Questions</th>
                                            <th className="px-4 py-3 text-center">Parties</th>
                                            <th className="px-4 py-3 text-center">Visibilité</th>
                                            <th className="px-4 py-3 text-center rounded-r-lg">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {quizzes.map((quiz) => (
                                            <tr key={quiz.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="px-4 py-3 font-medium">
                                                    <Link href={`/quiz/${quiz.id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">{quiz.title}</Link>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                                    <Link
                                                        href={session?.user?.username === quiz.creator.username ? '/dashboard' : `/profil/${quiz.creator.username}`}
                                                        className="text-blue-600 dark:text-blue-400 hover:underline transition-colors"
                                                    >
                                                        {quiz.creator.username}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{quiz.category?.name ?? '—'}</td>
                                                <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{quiz._count.questions}</td>
                                                <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{quiz._count.attempts}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${quiz.isPublic ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                                                        {quiz.isPublic ? 'Public' : 'Privé'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center flex gap-2 justify-center">
                                                    <Link href={`/quiz/${quiz.id}/edit`} className="text-blue-500 hover:text-blue-700 font-semibold text-xs px-3 py-1 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors">
                                                        Modifier
                                                    </Link>
                                                    <button onClick={() => handleDeleteQuiz(quiz.id, quiz.title)} className="text-red-500 hover:text-red-700 font-semibold text-xs px-3 py-1 border border-red-300 rounded-lg hover:bg-red-50 transition-colors">
                                                        Supprimer
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination currentPage={quizPage} totalPages={quizTotalPages} onPageChange={handleQuizPageChange} />
                        </div>
                    )}

                    {/* Categories */}
                    {activeTab === 'categories' && (
                        <div id="admin-categories" className="scroll-mt-24 space-y-6">
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="Nouvelle catégorie..."
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                                    className="input-field flex-1"
                                />
                                <button onClick={handleCreateCategory} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors">
                                    + Ajouter
                                </button>
                            </div>
                            <div className="space-y-2">
                                {categories.map((cat) => (
                                    <div key={cat.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 border border-gray-200 dark:border-gray-700">
                                        {editingCategory?.id === cat.id ? (
                                            <input
                                                type="text"
                                                value={editingCategory.name}
                                                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                                onKeyDown={(e) => e.key === 'Enter' && handleRenameCategory()}
                                                className="input-field flex-1 mr-4"
                                                autoFocus
                                            />
                                        ) : (
                                            <div>
                                                <span className="font-semibold text-gray-800 dark:text-gray-200">{cat.name}</span>
                                                <span className="text-xs text-gray-400 ml-3">{cat._count.quizzes} quiz</span>
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            {editingCategory?.id === cat.id ? (
                                                <>
                                                    <button onClick={handleRenameCategory} className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Sauvegarder</button>
                                                    <button onClick={() => setEditingCategory(null)} className="text-xs px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400">Annuler</button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => setEditingCategory({ id: cat.id, name: cat.name })} className="text-blue-500 hover:text-blue-700 font-semibold text-xs px-3 py-1 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors">Renommer</button>
                                                    <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="text-red-500 hover:text-red-700 font-semibold text-xs px-3 py-1 border border-red-300 rounded-lg hover:bg-red-50 transition-colors">Supprimer</button>
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

            {/* Player modal */}
            {playerModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={() => setPlayerModal(null)}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-80 max-w-full"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 dark:text-white">
                                👥 Joueurs de la partie
                            </h3>
                            <button
                                onClick={() => setPlayerModal(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
                            >
                                ×
                            </button>
                        </div>
                        <p className="text-xs font-mono text-gray-400 mb-3">{playerModal.gameId.slice(0, 8)}…</p>
                        <div className="space-y-2">
                            {playerModal.players.map((p, i) => (
                                <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        {p.placement != null && (
                                            <span className="text-base">
                                                {PLACEMENT_EMOJI[p.placement] ?? `#${p.placement}`}
                                            </span>
                                        )}
                                        <Link
                                            href={session?.user?.username === p.username ? '/dashboard' : `/profil/${p.username}`}
                                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                            onClick={() => setPlayerModal(null)}
                                        >
                                            {p.username}
                                        </Link>
                                    </div>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                        {p.score} <span className="text-xs text-gray-400 font-normal">pts</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
