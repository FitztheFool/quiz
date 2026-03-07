'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState, useCallback } from 'react';
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

interface RecentActivity {
    completedAt: string;
    totalScore: number;
    type?: 'quiz' | 'uno';
    quiz: { title: string } | null;
    user: { username: string };
    placement?: number | null;
    gameId?: string | null;
    playerCount?: number;
}

interface AdminStats {
    totals: { users: number; quizzes: number; scores: number; pointsScored: number };
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
}

type AdminTab = 'stats' | 'users' | 'quizzes' | 'categories';

const PAGE_SIZE = 10;

type UserSort = 'createdAt_desc' | 'createdAt_asc' | 'username_asc' | 'username_desc';

const SECTION_ID: Record<AdminTab, string> = {
    stats: 'admin-stats',
    users: 'admin-users',
    quizzes: 'admin-quizzes',
    categories: 'admin-categories',
};

const PLACEMENT_EMOJI: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

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

    // Users
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [userPage, setUserPage] = useState(1);
    const [userTotalPages, setUserTotalPages] = useState(1);
    const [userQuery, setUserQuery] = useState('');
    const [hideAnonymous, setHideAnonymous] = useState(true);
    const [userSort, setUserSort] = useState<UserSort>('createdAt_desc');

    // Quizzes
    const [quizzes, setQuizzes] = useState<AdminQuiz[]>([]);
    const [quizPage, setQuizPage] = useState(1);
    const [quizTotalPages, setQuizTotalPages] = useState(1);

    // Categories
    const [categories, setCategories] = useState<AdminCategory[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);

    // Stats
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [activityPeriod, setActivityPeriod] = useState(30);

    // Loading
    const [loading, setLoading] = useState(false);
    const [loadingStats, setLoadingStats] = useState(false);
    const [loadingActivity, setLoadingActivity] = useState(false);

    const { data: session } = useSession();

    const scrollToSection = useCallback((tab: AdminTab) => {
        const id = SECTION_ID[tab];
        history.replaceState(null, '', `#${id}`);
        setTimeout(() => {
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
    }, []);

    const userParams = useMemo(() => {
        const params = new URLSearchParams({
            page: String(userPage),
            pageSize: String(PAGE_SIZE),
            q: userQuery.trim(),
            hideAnonymous: String(hideAnonymous),
            sort: userSort,
        });
        if (!userQuery.trim()) params.delete('q');
        return params;
    }, [userPage, userQuery, hideAnonymous, userSort]);

    const fetchStatsFull = async (period = activityPeriod) => {
        setLoadingStats(true);
        try {
            const res = await fetch(`/api/admin/stats?period=${period}`, { cache: 'no-store' });
            if (res.ok) setStats(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingStats(false);
        }
    };

    const refreshStatsForPeriod = async (period: number) => {
        setLoadingActivity(true);
        try {
            const res = await fetch(`/api/admin/stats?period=${period}`, { cache: 'no-store' });
            if (!res.ok) return;
            const data: AdminStats = await res.json();
            setStats((prev) => (prev ? { ...prev, recentActivity: data.recentActivity } : data));
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingActivity(false);
        }
    };

    const fetchUsers = async (page = 1) => {
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
    };

    const fetchTab = async (tab: AdminTab) => {
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
    };

    useEffect(() => {
        if (activeTab === 'stats') {
            fetchStatsFull(activityPeriod);
        } else {
            fetchTab(activeTab);
        }
        scrollToSection(activeTab);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'stats') refreshStatsForPeriod(activityPeriod);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activityPeriod]);

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

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">🛡️ Administration</h2>

            <div className="flex flex-wrap gap-2 mb-6">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => { setActiveTab(t.key); scrollToSection(t.key); }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${activeTab === t.key
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
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
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Utilisateurs', value: stats.totals.users, color: 'blue' },
                                        { label: 'Quiz', value: stats.totals.quizzes, color: 'green' },
                                        { label: 'Parties UNO jouées', value: stats.totals.scores, color: 'orange' },
                                        { label: 'Points marqués', value: stats.totals.pointsScored, color: 'purple' },
                                    ].map((stat) => (
                                        <div key={stat.label} className={`bg-${stat.color}-50 border border-${stat.color}-200 rounded-xl p-4 text-center`}>
                                            <div className={`text-3xl font-bold text-${stat.color}-600`}>{stat.value.toLocaleString()}</div>
                                            <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">🏆 Quiz les plus joués</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 text-gray-600 text-left">
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
                                                    <tr key={quiz.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                        <td className="px-4 py-3 font-medium">
                                                            <Link href={`/quiz/${quiz.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                                                                {i + 1}. {quiz.title}
                                                            </Link>
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-gray-500">{quiz.questionCount}</td>
                                                        <td className="px-4 py-3 text-center">{quiz.playCount}</td>
                                                        <td className="px-4 py-3 text-center text-orange-600 font-semibold">{quiz.avgScore} pts</td>
                                                        <td className="px-4 py-3 text-center text-green-600 font-semibold">{quiz.maxScore} pts</td>
                                                        <td className="px-4 py-3 text-center text-purple-600 font-semibold">{quiz.maxPossibleScore} pts</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <h3 className="text-lg font-bold text-gray-900">🕐 Activité récente</h3>
                                        {loadingActivity && (
                                            <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
                                        )}
                                    </div>

                                    <select
                                        value={activityPeriod}
                                        onChange={(e) => setActivityPeriod(Number(e.target.value))}
                                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600"
                                    >
                                        <option value={-1}>Aujourd'hui</option>
                                        <option value={1}>Dernières 24h</option>
                                        <option value={7}>7 derniers jours</option>
                                        <option value={30}>30 derniers jours</option>
                                        <option value={0}>Tout</option>
                                    </select>

                                    <div className="space-y-2 max-h-64 overflow-y-auto mt-3">
                                        {stats.recentActivity.length === 0 ? (
                                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500 text-center">
                                                Aucune activité récente pour cette période.
                                            </div>
                                        ) : (
                                            stats.recentActivity.map((activity, i) => {
                                                const isUno = activity.type === 'uno';
                                                const userHref =
                                                    session?.user?.username === activity.user.username
                                                        ? '/dashboard'
                                                        : `/profil/${activity.user.username}`;

                                                return (
                                                    <div
                                                        key={i}
                                                        className="flex justify-between items-center rounded-lg px-4 py-2 text-sm bg-gray-50"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="flex-shrink-0">{isUno ? '🎴' : '🎯'}</span>
                                                            <Link
                                                                href={userHref}
                                                                className="font-medium text-blue-600 hover:underline truncate"
                                                            >
                                                                {activity.user.username}
                                                            </Link>
                                                            <span
                                                                className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${isUno
                                                                        ? 'bg-orange-100 text-orange-700'
                                                                        : 'bg-blue-100 text-blue-700'
                                                                    }`}
                                                            >
                                                                {isUno ? 'UNO' : 'Quiz'}
                                                            </span>
                                                        </div>

                                                        <span className="text-gray-500 truncate mx-4">
                                                            {isUno
                                                                ? `UNO — ${activity.playerCount ?? '?'} joueurs`
                                                                : activity.quiz?.title ?? '—'}
                                                        </span>

                                                        <div className="flex items-center gap-3 flex-shrink-0">
                                                            {isUno ? (
                                                                <span className="font-semibold text-orange-600">
                                                                    {activity.placement !== null && activity.placement !== undefined
                                                                        ? PLACEMENT_EMOJI[activity.placement] ?? `#${activity.placement}`
                                                                        : '—'}
                                                                </span>
                                                            ) : (
                                                                <span className="text-orange-600 font-semibold">
                                                                    {activity.totalScore} pts
                                                                </span>
                                                            )}
                                                            <span className="text-gray-400 whitespace-nowrap">
                                                                {new Date(activity.completedAt).toLocaleDateString('fr-FR', {
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                })}{' '}
                                                                {new Date(activity.completedAt).toLocaleTimeString('fr-FR', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                    second: '2-digit',
                                                                })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
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
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full md:w-96"
                                    />
                                    <select
                                        value={userSort}
                                        onChange={(e) => setUserSort(e.target.value as UserSort)}
                                        className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 w-full md:w-56"
                                    >
                                        <option value="createdAt_desc">Plus récents</option>
                                        <option value="createdAt_asc">Plus anciens</option>
                                        <option value="username_asc">Username A → Z</option>
                                        <option value="username_desc">Username Z → A</option>
                                    </select>
                                </div>
                                <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
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
                                        <tr className="bg-gray-50 text-gray-600 text-left">
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
                                                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">Aucun utilisateur trouvé</td>
                                            </tr>
                                        ) : (
                                            users.map((user) => (
                                                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-semibold">
                                                        <Link
                                                            href={session?.user?.username === user.username ? '/dashboard' : `/profil/${user.username}`}
                                                            className="text-blue-600 hover:underline transition-colors"
                                                        >
                                                            {user.username}
                                                        </Link>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500">{user.email}</td>
                                                    <td className="px-4 py-3 text-center">{user._count.createdQuizzes}</td>
                                                    <td className="px-4 py-3 text-center text-blue-600 font-medium">{user.quizAttempts}</td>
                                                    <td className="px-4 py-3 text-center text-orange-600 font-medium">{user.unoAttempts}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        {user.role === 'ADMIN' || user.role === 'ANONYMOUS' ? (
                                                            <span className={`text-xs font-bold px-3 py-1 rounded-full border inline-flex items-center gap-2 ${user.role === 'ADMIN' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-300 text-gray-800 border-gray-400'
                                                                }`} title="Rôle verrouillé">
                                                                {user.role} <span className="opacity-60">🔒</span>
                                                            </span>
                                                        ) : (
                                                            <select
                                                                value={user.role}
                                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                                className={`text-xs font-bold px-2 py-1 rounded-full border ${user.role === 'RANDOM' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                                                                    }`}
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
                                        <tr className="bg-gray-50 text-gray-600 text-left">
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
                                            <tr key={quiz.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium">
                                                    <Link href={`/quiz/${quiz.id}`} className="text-blue-600 hover:text-blue-800 font-medium">{quiz.title}</Link>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500">
                                                    <Link
                                                        href={session?.user?.username === quiz.creator.username ? '/dashboard' : `/profil/${quiz.creator.username}`}
                                                        className="text-blue-600 hover:underline transition-colors"
                                                    >
                                                        {quiz.creator.username}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500">{quiz.category?.name ?? '—'}</td>
                                                <td className="px-4 py-3 text-center">{quiz._count.questions}</td>
                                                <td className="px-4 py-3 text-center">{quiz._count.attempts}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${quiz.isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
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
                                    <div key={cat.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
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
                                                <span className="font-semibold text-gray-800">{cat.name}</span>
                                                <span className="text-xs text-gray-400 ml-3">{cat._count.quizzes} quiz</span>
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            {editingCategory?.id === cat.id ? (
                                                <>
                                                    <button onClick={handleRenameCategory} className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Sauvegarder</button>
                                                    <button onClick={() => setEditingCategory(null)} className="text-xs px-3 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">Annuler</button>
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
        </div>
    );
}
