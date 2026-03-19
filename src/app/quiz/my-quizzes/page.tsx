// src/app/quiz/my-quizzes/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import QuizCard from '@/components/QuizCard';
import QuizFilters from '@/components/QuizFilters';
import Pagination from '@/components/Pagination';
import { plural } from '@/lib/utils';

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

const computePoints = (list: Quiz[]): Record<string, number> => {
    const map: Record<string, number> = {};
    list.forEach((q) => {
        map[q.id] = q.questions?.reduce((sum, qq) => sum + (qq.points || 0), 0) || 0;
    });
    return map;
};

export default function MyQuizzesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [search, setSearch] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [page, setPage] = useState(1);
    const [quizPoints, setQuizPoints] = useState<Record<string, number>>({});
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMyQuizzes = useCallback(async (p = 1, s = search, cat = categoryId) => {
        if (!session?.user?.id) return;
        const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
        if (s) params.set('search', s);
        if (cat) params.set('categoryId', cat);
        params.set('creatorId', session.user.id);
        const res = await fetch(`/api/quiz?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        const list: Quiz[] = Array.isArray(data) ? data : data.quizzes;
        setMyQuizzes(list);
        setTotal(Array.isArray(data) ? list.length : data.total);
        setTotalPages(Array.isArray(data) ? Math.ceil(list.length / PAGE_SIZE) : data.totalPages);
        setQuizPoints((prev) => ({ ...prev, ...computePoints(list) }));
    }, [search, categoryId, session?.user?.id]);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/quiz/my-quizzes');
            return;
        }
        if (status === 'authenticated') {
            Promise.all([
                fetchMyQuizzes(1),
                fetch('/api/categories').then(r => r.ok ? r.json() : []).then(setCategories),
            ]).finally(() => setLoading(false));
        }
    }, [status, fetchMyQuizzes, router]);

    const handlePageChange = (p: number) => { setPage(p); fetchMyQuizzes(p, search, categoryId); };
    const handleSearchChange = (v: string) => { setSearch(v); setPage(1); fetchMyQuizzes(1, v, categoryId); };
    const handleCategoryChange = (v: string) => { setCategoryId(v); setPage(1); fetchMyQuizzes(1, search, v); };

    const handleDeleteQuiz = async (quizId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce quiz ?')) return;
        try {
            const res = await fetch(`/api/quiz/${quizId}`, { method: 'DELETE' });
            if (res.ok) {
                setMyQuizzes((prev) => prev.filter((q) => q.id !== quizId));
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
                <LoadingSpinner />
            </div>
        );
    }

    if (!session) return null;

    return (
        <main className="flex-1 p-4 md:p-8">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Mes quizzes
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
                            setMyQuizzes(data.filter((q) => q.creatorId === session.user?.id));
                            setPage(1);
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
                            {myQuizzes.map((quiz) => (
                                <QuizCard
                                    key={quiz.id}
                                    quiz={quiz}
                                    currentUserId={session.user?.id}
                                    showActions={true}
                                    onEdit={() => router.push(`/quiz/${quiz.id}/edit`)}
                                    onDelete={() => handleDeleteQuiz(quiz.id)}
                                />
                            ))}
                        </div>
                        <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
                    </>
                )}
            </div>
        </main>
    );
}
