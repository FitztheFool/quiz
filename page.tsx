'use client';

import { useEffect, useState } from 'react';
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
  creator: { username: string };
  category?: { name: string } | null;
  _count: { questions: number };
}

interface UserScore {
  quiz: { id: string };
  totalScore: number;
}

type SortOption = 'name_asc' | 'name_desc' | 'category';

async function fetchQuizPoints(quizzesList: Quiz[]): Promise<Record<string, number>> {
  const pointsMap: Record<string, number> = {};
  await Promise.all(
    quizzesList.map(async (quiz) => {
      try {
        const res = await fetch(`/api/quiz/${quiz.id}`);
        if (res.ok) {
          const data = await res.json();
          pointsMap[quiz.id] = data.questions?.reduce((sum: number, q: any) => sum + (q.points || 0), 0) || 0;
        }
      } catch (err) {
        console.error(`Erreur points quiz ${quiz.id}:`, err);
      }
    })
  );
  return pointsMap;
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [myScores, setMyScores] = useState<UserScore[]>([]);
  const [quizPoints, setQuizPoints] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState<SortOption>('name_asc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [catRes, quizRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/quiz'),
        ]);

        if (cancelled) return;

        if (catRes.ok) setCategories(await catRes.json());

        if (quizRes.ok) {
          const quizData: Quiz[] = await quizRes.json();
          setQuizzes(quizData);
          fetchQuizPoints(quizData).then((points) => {
            if (!cancelled) setQuizPoints(points);
          });
        }
      } catch (err) {
        console.error('Erreur chargement initial:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/user/scores')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setMyScores(data); })
      .catch(console.error);
  }, [status]);

  const handleQuizzesChange = async (data: Quiz[]) => {
    setQuizzes(data);
    setPage(1);
    const points = await fetchQuizPoints(data);
    setQuizPoints(points);
  };

  const sortedQuizzes = [...quizzes].sort((a, b) => {
    if (sort === 'name_asc') return a.title.localeCompare(b.title);
    if (sort === 'name_desc') return b.title.localeCompare(a.title);
    if (sort === 'category') return (a.category?.name ?? 'zzz').localeCompare(b.category?.name ?? 'zzz');
    return 0;
  });

  const totalPages = Math.ceil(sortedQuizzes.length / PAGE_SIZE);
  const paginatedQuizzes = sortedQuizzes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl mb-4">
            Testez vos connaissances
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Jouez à des quiz, gagnez des points et grimpez dans le classement !
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="card text-center">
            <div className="text-4xl font-bold text-primary-600">{quizzes.length}</div>
            <div className="text-gray-600 mt-2">Quiz disponibles</div>
          </div>
          <Link href="/quiz/generate" className="card text-center hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-400 hover:border-green-500">
            <div className="text-4xl font-bold text-green-500">✨</div>
            <div className="text-gray-600 mt-2 font-semibold">Générer un quiz</div>
          </Link>
          <Link href="/leaderboard" className="card text-center hover:shadow-lg transition-shadow cursor-pointer border-2 border-yellow-300 hover:border-yellow-400" style={{ boxShadow: '0 0 0 1px #fde68a' }}>
            <div className="text-4xl font-bold text-yellow-500">∞</div>
            <div className="text-gray-600 mt-2 font-semibold">Voir le classement</div>
          </Link>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-gray-900">Quiz disponibles</h3>
          </div>
          <QuizFilters
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(1); }}
            categoryId={categoryId}
            onCategoryChange={(v) => { setCategoryId(v); setPage(1); }}
            sort={sort}
            onSortChange={(v) => { setSort(v); setPage(1); }}
            categories={categories}
            onQuizzesChange={handleQuizzesChange}
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Chargement des quiz...</p>
          </div>
        ) : sortedQuizzes.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 text-lg">Aucun quiz disponible pour le moment.</p>
            <p className="text-gray-500 mt-2">Connectez-vous pour créer le premier !</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {paginatedQuizzes.map((quiz) => {
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
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
