'use client';
import LoadingSpinner from '@/components/LoadingSpinner';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import QuizCard from '@/components/QuizCard';
import QuizFilters from '@/components/QuizFilters';
import Pagination from '@/components/Pagination';

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
  creatorId?: string;
  createdAt?: string;
  creator: { id: string; username: string };
  category?: { name: string } | null;
  _count: { questions: number };
  questions?: { points: number }[];
}

interface UserScore {
  quiz: { id: string };
  totalScore: number;
}

const computePoints = (quizzesList: Quiz[] | any) => {
  const map: Record<string, number> = {};
  const list: Quiz[] = Array.isArray(quizzesList) ? quizzesList : quizzesList?.quizzes ?? [];
  list.forEach((q: any) => {
    map[q.id] = q.questions?.reduce((sum: number, qq: any) => sum + (qq.points || 0), 0) || 0;
  });
  return map;
};

export default function HomePage() {
  const { data: session, status } = useSession();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [myScores, setMyScores] = useState<UserScore[]>([]);
  const [quizPoints, setQuizPoints] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);

  const fetchQuizzes = useCallback(async (p = 1, s = '', cat = '') => {
    const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
    if (s) params.set('search', s);
    if (cat) params.set('categoryId', cat);
    const res = await fetch(`/api/quiz?${params}`);
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.quizzes;
      setQuizzes(list);
      setTotal(Array.isArray(data) ? list.length : data.total);
      setTotalPages(Array.isArray(data) ? Math.ceil(list.length / PAGE_SIZE) : data.totalPages);
      setQuizPoints(prev => ({ ...prev, ...computePoints(list) }));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const catRes = await fetch('/api/categories');
        if (!cancelled && catRes.ok) setCategories(await catRes.json());
        await fetchQuizzes(1);
      } catch (err) {
        console.error('Erreur chargement initial:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [fetchQuizzes]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/user/scores')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        setMyScores(data?.scores ?? []);
      })
      .catch(console.error);
  }, [status]);

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchQuizzes(p, search, categoryId);
  };

  const handleSearchChange = (v: string) => {
    setSearch(v);
    setPage(1);
    fetchQuizzes(1, v, categoryId);
  };

  const handleCategoryChange = (v: string) => {
    setCategoryId(v);
    setPage(1);
    fetchQuizzes(1, search, v);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl mb-4">
            Testez vos connaissances
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Jouez à des quiz, gagnez des points et grimpez dans le classement !
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="card text-center">
            <div className="text-4xl font-bold text-primary-600">{total}</div>
            <div className="text-gray-600 dark:text-gray-300 mt-2">Quiz disponibles</div>
          </div>
          <Link href="/quiz/generate" className="card text-center hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-400 hover:border-green-500">
            <div className="text-4xl font-bold text-green-500">✨</div>
            <div className="text-gray-600 dark:text-gray-300 mt-2 font-semibold">Générer un quiz</div>
          </Link>
          <Link href="/leaderboard" className="card text-center hover:shadow-lg transition-shadow cursor-pointer border-2 border-yellow-300 hover:border-yellow-400" style={{ boxShadow: '0 0 0 1px #fde68a' }}>
            <div className="text-4xl font-bold text-yellow-500">∞</div>
            <div className="text-gray-600 dark:text-gray-300 mt-2 font-semibold">Voir le classement</div>
          </Link>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Quiz disponibles</h3>
          </div>
          <QuizFilters
            search={search}
            onSearchChange={handleSearchChange}
            categoryId={categoryId}
            onCategoryChange={handleCategoryChange}
            categories={categories}

            onQuizzesChange={(data: any) => {
              const list = Array.isArray(data) ? data : data?.quizzes ?? [];
              setQuizzes(list);
              setPage(1);
              setQuizPoints(prev => ({ ...prev, ...computePoints(list) }));
            }}
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <LoadingSpinner message="Chargement des quiz..." />
          </div>
        ) : quizzes.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 dark:text-gray-300 text-lg">Aucun quiz disponible pour le moment.</p>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Connectez-vous pour créer le premier !</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {quizzes.map((quiz) => {
                const score = myScores.find((s) => s.quiz.id === quiz.id);
                const totalPoints = quizPoints[quiz.id] || 0;
                return (
                  <QuizCard
                    key={quiz.id}
                    quiz={quiz}
                    currentUserId={session?.user?.id}
                    score={score?.totalScore}
                    totalPoints={totalPoints}
                  />
                );
              })}
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </>
        )}
      </div>
    </div>
  );
}
