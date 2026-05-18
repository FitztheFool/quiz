'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import QuizCard from '@/components/Quiz/QuizCard';
import QuizFilters from '@/components/Quiz/QuizFilters';
import Pagination from '@/components/Pagination';
import LoadingSpinner from '@/components/LoadingSpinner';

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
    imageUrl?: string | null;
    createdAt?: string;
    _count: { questions: number };
    creatorId?: string;
    category?: { name: string } | null;
    questions?: { points: number }[];
}

interface Props {
    creatorId?: string;
    title?: string;
    emptyTitle?: string;
    emptySubtitle?: string;
}

const computePoints = (list: Quiz[]): Record<string, number> => {
    const map: Record<string, number> = {};
    list.forEach((q) => {
        map[q.id] = q.questions?.reduce((sum, qq) => sum + (qq.points || 0), 0) || 0;
    });
    return map;
};

export default function MyQuizzesPanel({ creatorId, title, emptyTitle, emptySubtitle }: Props = {}) {
    const { data: session, status } = useSession();
    const router = useRouter();

    const targetUserId = creatorId ?? session?.user?.id;
    const isOwn = !!targetUserId && targetUserId === session?.user?.id;

    const resolvedTitle = title ?? (isOwn ? 'Mes quizzes' : 'Quiz');
    const resolvedEmptyTitle = emptyTitle ?? (isOwn ? 'Aucun quiz créé' : 'Aucun quiz public');
    const resolvedEmptySubtitle = emptySubtitle ?? (isOwn ? 'Créez votre premier quiz personnalisé' : '');

    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [search, setSearch] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [page, setPage] = useState(1);
    const [quizPoints, setQuizPoints] = useState<Record<string, number>>({});
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchQuizzes = useCallback(async (p = 1, s = search, cat = categoryId) => {
        if (!targetUserId) return;
        const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
        if (s) params.set('search', s);
        if (cat) params.set('categoryId', cat);
        params.set('creatorId', targetUserId);
        const res = await fetch(`/api/quiz?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        const list: Quiz[] = Array.isArray(data) ? data : data.quizzes;
        setQuizzes(list);
        setTotal(Array.isArray(data) ? list.length : data.total);
        setTotalPages(Array.isArray(data) ? Math.ceil(list.length / PAGE_SIZE) : data.totalPages);
        setQuizPoints((prev) => ({ ...prev, ...computePoints(list) }));
    }, [search, categoryId, targetUserId]);

    useEffect(() => {
        if (status === 'loading') return;
        if (!targetUserId) { setLoading(false); return; }
        Promise.all([
            fetchQuizzes(1),
            fetch('/api/categories').then(r => r.ok ? r.json() : []).then(setCategories),
        ]).finally(() => setLoading(false));
    }, [status, fetchQuizzes, targetUserId]);

    const handlePageChange = (p: number) => { setPage(p); fetchQuizzes(p, search, categoryId); };
    const handleSearchChange = (v: string) => { setSearch(v); setPage(1); fetchQuizzes(1, v, categoryId); };
    const handleCategoryChange = (v: string) => { setCategoryId(v); setPage(1); fetchQuizzes(1, search, v); };

    const handleDeleteQuiz = async (quizId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce quiz ?')) return;
        try {
            const res = await fetch(`/api/quiz/${quizId}`, { method: 'DELETE' });
            if (res.ok) {
                setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
            } else {
                alert('Erreur lors de la suppression du quiz');
            }
        } catch {
            alert('Erreur lors de la suppression du quiz');
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 md:p-8 flex items-center justify-center min-h-[200px]">
                <LoadingSpinner fullScreen={false} message="Chargement des quiz..." />
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {resolvedTitle}
                </h2>
                <span className="text-xs font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                    {total}
                </span>
            </div>
            <div className="mb-6">
                <QuizFilters
                    search={search}
                    onSearchChange={handleSearchChange}
                    categoryId={categoryId}
                    onCategoryChange={handleCategoryChange}
                    categories={categories}
                    onQuizzesChange={(data) => {
                        setQuizzes(data.filter((q) => q.creatorId === targetUserId));
                        setPage(1);
                        setQuizPoints((prev) => ({ ...prev, ...computePoints(data) }));
                    }}
                />
            </div>
            {quizzes.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-gray-600 dark:text-gray-300 text-lg mb-2">{resolvedEmptyTitle}</p>
                    {resolvedEmptySubtitle && <p className="text-gray-500 dark:text-gray-400">{resolvedEmptySubtitle}</p>}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                        {quizzes.map((quiz) => (
                            <QuizCard
                                key={quiz.id}
                                quiz={quiz}
                                currentUserId={session?.user?.id}
                                totalPoints={quizPoints[quiz.id] || 0}
                                showActions={isOwn}
                                onEdit={() => router.push(`/quiz/${quiz.id}/edit`)}
                                onDelete={() => handleDeleteQuiz(quiz.id)}
                            />
                        ))}
                    </div>
                    <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
                </>
            )}
        </div>
    );
}
