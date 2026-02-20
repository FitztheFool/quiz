'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import QuizCard from '@/components/QuizCard';

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
  creator: {
    username: string;
  };
  category?: { name: string } | null;
  _count: {
    questions: number;
  };
}

interface UserScore {
  quiz: {
    id: string;
  };
  totalScore: number;
}

type SortOption = 'name_asc' | 'name_desc' | 'category';

export default function HomePage() {
  const { data: session } = useSession();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [myScores, setMyScores] = useState<UserScore[]>([]);
  const [quizPoints, setQuizPoints] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState<SortOption>('name_asc');

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(setCategories);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(search, categoryId);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, categoryId, session]);

  const fetchData = async (searchTerm = '', catId = '') => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (catId) params.set('categoryId', catId);

      const res = await fetch(`/api/quiz?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data);
        fetchQuizPoints(data);
      }

      if (session) {
        const scoresRes = await fetch('/api/user/scores');
        if (scoresRes.ok) {
          const scoresData = await scoresRes.json();
          setMyScores(scoresData);
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizPoints = async (quizzesList: Quiz[]) => {
    const pointsMap: Record<string, number> = {};
    await Promise.all(
      quizzesList.map(async (quiz) => {
        try {
          const res = await fetch(`/api/quiz/${quiz.id}`);
          if (res.ok) {
            const data = await res.json();
            const total = data.questions?.reduce((sum: number, q: any) => sum + (q.points || 0), 0) || 0;
            pointsMap[quiz.id] = total;
          }
        } catch (err) {
          console.error(`Erreur pour quiz ${quiz.id}:`, err);
        }
      })
    );
    setQuizPoints(pointsMap);
  };

  const sortedQuizzes = [...quizzes].sort((a, b) => {
    if (sort === 'name_asc') return a.title.localeCompare(b.title);
    if (sort === 'name_desc') return b.title.localeCompare(a.title);
    if (sort === 'category') {
      const catA = a.category?.name ?? 'zzz';
      const catB = b.category?.name ?? 'zzz';
      return catA.localeCompare(catB);
    }
    return 0;
  });

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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="card text-center">
            <div className="text-4xl font-bold text-primary-600">{quizzes.length}</div>
            <div className="text-gray-600 mt-2">Quiz disponibles</div>
          </div>
          <div className="card text-center">
            <div className="text-4xl font-bold text-primary-600">4</div>
            <div className="text-gray-600 mt-2">Types de questions</div>
          </div>
          <div className="card text-center">
            <div className="text-4xl font-bold text-primary-600">∞</div>
            <div className="text-gray-600 mt-2">Parties illimitées</div>
          </div>
        </div>

        {/* Titre + Leaderboard */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-gray-900">Quiz disponibles</h3>
            <Link
              href="/leaderboard"
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              🏆 Voir le classement
            </Link>
          </div>

          {/* Filtres + Tri */}
          <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">🔍 Recherche</label>
              <input
                type="text"
                placeholder="Rechercher par titre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field w-full"
              />
            </div>

            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">🏷️ Catégorie</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="input-field w-full"
              >
                <option value="">Toutes les catégories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">↕️ Trier par</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="input-field w-full"
              >
                <option value="name_asc">Nom (A → Z)</option>
                <option value="name_desc">Nom (Z → A)</option>
                <option value="category">Catégorie</option>
              </select>
            </div>

            {(search || categoryId) && (
              <button
                onClick={() => { setSearch(''); setCategoryId(''); }}
                className="text-sm text-gray-500 hover:text-gray-700 underline whitespace-nowrap"
              >
                Réinitialiser
              </button>
            )}
          </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedQuizzes.map((quiz) => {
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
        )}
      </div>

      <footer className="bg-white mt-16 border-t">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500">
            <p>Quiz App - Testez vos connaissances et défiez vos amis</p>
            <p className="mt-2 text-sm">Propulsé par Next.js, Prisma et PostgreSQL</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
