'use client';
import LoadingSpinner from '@/components/LoadingSpinner';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { plural } from '@/lib/utils';
import QuizCard from '@/components/QuizCard';
import QuizFilters from '@/components/QuizFilters';
import Pagination from '@/components/Pagination';
import AdminPanel from '@/components/AdminPanel';
import ScoreList from '@/components/ScoreList';
import type { TabType } from '@/types/dashboard';

const PAGE_SIZE = 6;

interface Category {
    id: string;
    name: string;
}

interface Quiz {
    id: string;
    title: string;
    description: string | null;
    isPublic: boolean;
    createdAt?: string;
    _count: { questions: number };
    creatorId?: string;
    category?: { name: string } | null;
    questions?: { points: number }[];
}

interface UserScore {
    quiz: { id: string; title: string };
    totalScore: number;
    completedAt: string;
    maxScore: number;
    attempts: number;
}

interface UnoStats {
    gamesPlayed: number;
    podiums: number;
    wins: number;
    top1: number;
    top2: number;
    top3: number;
    totalScore: number;
    bestPlacement: number | null;
    recentGames: { placement: number | null; createdAt: string }[];
    recentGamesTotal: number;
    recentGamesTotalPages: number;
}

const PLACEMENT_EMOJI: Record<number, string> = {
    1: '🥇',
    2: '🥈',
    3: '🥉',
};

const ALL_TABS: TabType[] = ['available', 'my-quizzes', 'quiz-score', 'uno-score', 'admin'];

const computePoints = (quizzesList: Quiz[]) => {
    const map: Record<string, number> = {};
    quizzesList.forEach((q: Quiz) => {
        map[q.id] =
            q.questions?.reduce((sum: number, qq: { points: number }) => sum + (qq.points || 0), 0) || 0;
    });
    return map;
};

const isTab = (v: string): v is TabType => ALL_TABS.includes(v as TabType);

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    usePathname();

    const getTabFromHash = (): TabType => {
        if (typeof window === 'undefined') return 'available';
        const hash = window.location.hash.replace('#', '');
        return isTab(hash) ? hash : 'available';
    };

    const [activeTab, setActiveTab] = useState<TabType>(getTabFromHash);

    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [quizzesTotalPages, setQuizzesTotalPages] = useState(0);
    const [search, setSearch] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [page, setPage] = useState(1);

    const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
    const [myQuizzesTotal, setMyQuizzesTotal] = useState(0);
    const [myQuizzesTotalPages, setMyQuizzesTotalPages] = useState(0);
    const [mySearch, setMySearch] = useState('');
    const [myCategoryId, setMyCategoryId] = useState('');
    const [myPage, setMyPage] = useState(1);

    const [myScores, setMyScores] = useState<UserScore[]>([]);
    const [unoStats, setUnoStats] = useState<UnoStats | null>(null);
    const [scorePage, setScorePage] = useState(1);
    const [unoPage, setUnoPage] = useState(1);

    const [loading, setLoading] = useState(true);
    const [quizPoints, setQuizPoints] = useState<Record<string, number>>({});
    const [categories, setCategories] = useState<Category[]>([]);

    const totalQuizScore = myScores.reduce((sum, s) => sum + s.totalScore, 0);

    useEffect(() => {
        const handleHashChange = () => setActiveTab(getTabFromHash());
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchQuizzes = useCallback(
        async (p = 1, s = search, cat = categoryId) => {
            const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
            if (s) params.set('search', s);
            if (cat) params.set('categoryId', cat);
            const res = await fetch(`/api/quiz?${params}`);
            if (!res.ok) return;
            const data = await res.json();
            const list = Array.isArray(data) ? data : data.quizzes;
            setQuizzes(list);
            setQuizzesTotalPages(Array.isArray(data) ? Math.ceil(list.length / PAGE_SIZE) : data.totalPages);
            setQuizPoints((prev) => ({ ...prev, ...computePoints(list) }));
        },
        [search, categoryId]
    );

    const fetchMyQuizzes = useCallback(
        async (p = 1, s = mySearch, cat = myCategoryId) => {
            const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
            if (s) params.set('search', s);
            if (cat) params.set('categoryId', cat);
            if (session?.user?.id) params.set('creatorId', session.user.id);
            const res = await fetch(`/api/quiz?${params}`);
            if (!res.ok) return;
            const data = await res.json();
            const rawList = Array.isArray(data) ? data : data.quizzes;
            const list = rawList.filter((q: Quiz) => q.creatorId === session?.user?.id);
            setMyQuizzes(list);
            setMyQuizzesTotal(Array.isArray(data) ? list.length : data.total);
            setMyQuizzesTotalPages(Array.isArray(data) ? Math.ceil(list.length / PAGE_SIZE) : data.totalPages);
            setQuizPoints((prev) => ({ ...prev, ...computePoints(list) }));
        },
        [mySearch, myCategoryId, session?.user?.id]
    );

    const fetchUnoStats = useCallback(async (unoPageValue = 1) => {
        const params = new URLSearchParams({ unoPage: String(unoPageValue), unoPageSize: String(PAGE_SIZE) });
        const res = await fetch(`/api/user/scores?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.quizScores) setMyScores(Array.isArray(data.quizScores) ? data.quizScores : []);
        if (data?.unoStats) setUnoStats(data.unoStats);
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const catRes = await fetch('/api/categories');
            await Promise.all([fetchQuizzes(1), fetchMyQuizzes(1), fetchUnoStats(1)]);
            if (catRes.ok) setCategories(await catRes.json());
        } catch (error) {
            console.error('Erreur:', error);
        } finally {
            setLoading(false);
        }
    }, [fetchQuizzes, fetchMyQuizzes, fetchUnoStats]);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=' + encodeURIComponent('/dashboard'));
            return;
        }
        if (status === 'authenticated') {
            fetchData();
            setActiveTab(getTabFromHash());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    const handlePageChange = (p: number) => { setPage(p); fetchQuizzes(p, search, categoryId); };
    const handleMyPageChange = (p: number) => { setMyPage(p); fetchMyQuizzes(p, mySearch, myCategoryId); };
    const handleSearchChange = (v: string) => { setSearch(v); setPage(1); fetchQuizzes(1, v, categoryId); };
    const handleCategoryChange = (v: string) => { setCategoryId(v); setPage(1); fetchQuizzes(1, search, v); };
    const handleMySearchChange = (v: string) => { setMySearch(v); setMyPage(1); fetchMyQuizzes(1, v, myCategoryId); };
    const handleMyCategoryChange = (v: string) => { setMyCategoryId(v); setMyPage(1); fetchMyQuizzes(1, mySearch, v); };
    const handleUnoPageChange = async (p: number) => { setUnoPage(p); await fetchUnoStats(p); };

    const handleDeleteQuiz = async (quizId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce quiz ?')) return;
        try {
            const res = await fetch(`/api/quiz/${quizId}`, { method: 'DELETE' });
            if (res.ok) {
                setMyQuizzes(myQuizzes.filter(q => q.id !== quizId));
                setQuizzes(quizzes.filter(q => q.id !== quizId));
            } else {
                alert('Erreur lors de la suppression du quiz');
            }
        } catch {
            alert('Erreur lors de la suppression du quiz');
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <LoadingSpinner />
                </div>
            </div>
        );
    }

    if (!session) return null;

    const scoreTotalPages = Math.ceil(myScores.length / PAGE_SIZE);
    const paginatedScores = myScores.slice((scorePage - 1) * PAGE_SIZE, scorePage * PAGE_SIZE);

    return (
        <main className="flex-1 p-4 md:p-8">

            {activeTab === 'available' && (
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 md:p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Quiz disponibles</h2>
                    <div className="mb-6">
                        <QuizFilters
                            search={search}
                            onSearchChange={handleSearchChange}
                            categoryId={categoryId}
                            onCategoryChange={handleCategoryChange}
                            categories={categories}
                            onQuizzesChange={(data) => {
                                setQuizzes(data);
                                setPage(1);
                                setQuizPoints((prev) => ({ ...prev, ...computePoints(data) }));
                            }}
                        />
                    </div>
                    {quizzes.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-gray-600 text-lg">Aucun quiz disponible</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                                {quizzes.map((quiz) => {
                                    const userScore = myScores.find(s => s.quiz.id === quiz.id);
                                    return (
                                        <QuizCard
                                            key={quiz.id}
                                            quiz={quiz}
                                            currentUserId={session?.user?.id}
                                            score={userScore?.totalScore}
                                            totalPoints={quizPoints[quiz.id] || 0}
                                        />
                                    );
                                })}
                            </div>
                            <Pagination currentPage={page} totalPages={quizzesTotalPages} onPageChange={handlePageChange} />
                        </>
                    )}
                </div>
            )}

            {activeTab === 'admin' && session.user?.role === 'ADMIN' && <AdminPanel />}

            {activeTab === 'my-quizzes' && (
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {plural(myQuizzesTotal, 'Mon quiz', 'Mes quizzes')}
                        </h2>
                        <span className="text-xs font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">{myQuizzesTotal}</span>
                    </div>
                    <div className="mb-6">
                        <QuizFilters
                            search={mySearch}
                            onSearchChange={handleMySearchChange}
                            categoryId={myCategoryId}
                            onCategoryChange={handleMyCategoryChange}
                            categories={categories}
                            onQuizzesChange={(data) => {
                                setMyQuizzes(data.filter(q => q.creatorId === session?.user?.id));
                                setMyPage(1);
                                setQuizPoints((prev) => ({ ...prev, ...computePoints(data) }));
                            }}
                        />
                    </div>
                    {myQuizzes.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-gray-600 text-lg mb-2">Aucun quiz créé</p>
                            <p className="text-gray-500 dark:text-gray-400">Créez votre premier quiz personnalisé</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                                {myQuizzes.map(quiz => (
                                    <QuizCard
                                        key={quiz.id}
                                        quiz={quiz}
                                        currentUserId={session?.user?.id}
                                        showActions={true}
                                        onEdit={() => router.push(`/quiz/${quiz.id}/edit`)}
                                        onDelete={() => handleDeleteQuiz(quiz.id)}
                                    />
                                ))}
                            </div>
                            <Pagination currentPage={myPage} totalPages={myQuizzesTotalPages} onPageChange={handleMyPageChange} />
                        </>
                    )}
                </div>
            )}

            {activeTab === 'quiz-score' && (
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 md:p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Mes scores Quiz</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-semibold tracking-wide text-blue-700 uppercase">Score total</p>
                                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{totalQuizScore} pts</p>
                                </div>
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-xl shadow-inner">🧠</div>
                            </div>
                            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Total cumulé sur tous tes quiz complétés</p>
                        </div>
                        <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">{plural(myScores.length, 'Quiz complété', 'Quizzes complétés')}</p>
                                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{myScores.length}</p>
                                </div>
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-xl shadow-inner">✅</div>
                            </div>
                            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Nombre de quiz terminés avec un score enregistré</p>
                        </div>
                        <div className="rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-semibold tracking-wide text-violet-700 uppercase">{plural(myQuizzesTotal, 'Quiz créé', 'Quizzes créés')}</p>
                                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{myQuizzesTotal}</p>
                                </div>
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-xl shadow-inner">✍️</div>
                            </div>
                            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Tes quiz publiés ou conservés dans ton espace</p>
                        </div>
                    </div>
                    {myScores.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-gray-600 text-lg mb-2">Aucun score enregistré</p>
                            <p className="text-gray-500 dark:text-gray-400">Complétez des quiz pour voir vos scores ici</p>
                        </div>
                    ) : (
                        <>
                            <ScoreList scores={paginatedScores} />
                            <Pagination currentPage={scorePage} totalPages={scoreTotalPages} onPageChange={setScorePage} />
                        </>
                    )}
                </div>
            )}

            {activeTab === 'uno-score' && (
                <div className="rounded-3xl border border-slate-200 bg-white/90 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm p-6 md:p-8">
                    <div className="mb-6 flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Mes scores UNO</h2>
                            <p className="mt-1 text-sm text-slate-500">Résumé de tes performances et de tes dernières parties</p>
                        </div>
                        <div className="hidden md:flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-2xl shadow-lg shadow-orange-200">🎴</div>
                    </div>

                    <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white">
                        <div className="border-b border-slate-200 px-5 py-4">
                            <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">Système de points</p>
                        </div>
                        <div className="grid gap-3 p-4 md:grid-cols-4">
                            {[
                                { label: '1ère place', emoji: '🥇', pts: 20, color: 'amber' },
                                { label: '2ème place', emoji: '🥈', pts: 13, color: 'indigo' },
                                { label: '3ème place', emoji: '🥉', pts: 6,  color: 'rose' },
                                { label: 'Autres',     emoji: '🎴', pts: 2,  color: 'slate' },
                            ].map(({ label, emoji, pts, color }) => (
                                <div key={label} className={`rounded-2xl border border-${color}-200 bg-${color}-50 px-4 py-3`}>
                                    <div className={`flex items-center gap-2 text-sm font-semibold text-${color}-700`}>
                                        <span>{emoji}</span><span>{label}</span>
                                    </div>
                                    <p className="mt-2 text-2xl font-bold text-slate-900">{pts}</p>
                                    <p className="text-xs text-slate-500">points</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {!unoStats || unoStats.gamesPlayed === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 text-2xl">🎴</div>
                            <p className="text-lg font-semibold text-slate-700">Aucune partie UNO jouée</p>
                            <p className="mt-1 text-sm text-slate-500">Créez un lobby et lancez une partie !</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5 mb-8">
                                {[
                                    { label: 'Points totaux', value: unoStats.totalScore ?? 0, emoji: '🔥', color: 'orange' },
                                    { label: '1ère place',    value: unoStats.top1 ?? unoStats.wins, emoji: '🥇', color: 'amber' },
                                    { label: '2ème place',    value: unoStats.top2 ?? 0, emoji: '🥈', color: 'indigo' },
                                    { label: '3ème place',    value: unoStats.top3 ?? 0, emoji: '🥉', color: 'rose' },
                                    { label: 'Participations', value: unoStats.gamesPlayed, emoji: '🎮', color: 'sky' },
                                ].map(({ label, value, emoji, color }) => (
                                    <div key={label} className={`rounded-3xl border border-${color}-200 bg-gradient-to-br from-${color}-50 to-white p-5 shadow-sm`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className={`text-xs font-semibold uppercase tracking-wide text-${color}-700`}>{label}</p>
                                                <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
                                            </div>
                                            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-${color}-100 text-xl`}>{emoji}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mb-4">
                                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Parties récentes</h3>
                                <p className="mt-1 text-sm text-slate-400">Tes dernières performances sur UNO</p>
                            </div>

                            <div className="space-y-3">
                                {unoStats.recentGames.map((game, i) => {
                                    const p = game.placement;
                                    const isTop1 = p === 1;
                                    const isTop2 = p === 2;
                                    const isTop3 = p === 3;
                                    const isPodium = p !== null && p <= 3;
                                    const cardClass = isTop1
                                        ? 'border-amber-200 bg-gradient-to-r from-amber-50 to-white'
                                        : isTop2 ? 'border-indigo-200 bg-gradient-to-r from-indigo-50 to-white'
                                        : isTop3 ? 'border-rose-200 bg-gradient-to-r from-rose-50 to-white'
                                        : 'border-slate-200 bg-white';
                                    return (
                                        <div key={`${game.createdAt}-${i}`}
                                            className={`group flex items-center justify-between rounded-2xl border px-4 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${cardClass}`}>
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl">
                                                    {p !== null ? (PLACEMENT_EMOJI[p] ?? `#${p}`) : '🎴'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-900">
                                                        {p === 1 ? 'Victoire' : p !== null ? `${p}ème place` : 'Partie terminée'}
                                                    </p>
                                                    <p className="mt-1 text-sm text-slate-500">
                                                        {isPodium ? 'Très belle performance' : 'Continue, la prochaine est peut-être la bonne'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right ml-4 flex-shrink-0">
                                                <p className="text-sm font-medium text-slate-700">
                                                    {new Date(game.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-400">
                                                    {new Date(game.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-6">
                                <Pagination currentPage={unoPage} totalPages={unoStats.recentGamesTotalPages} onPageChange={handleUnoPageChange} />
                            </div>
                        </>
                    )}
                </div>
            )}
        </main>
    );
}
