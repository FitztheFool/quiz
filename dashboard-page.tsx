'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
  createdAt?: string;
  _count: { questions: number };
  creatorId?: string;
  category?: { name: string } | null;
}

interface UserScore {
  quiz: { id: string; title: string };
  totalScore: number;
  completedAt: string;
}

type TabType = 'available' | 'my-quizzes' | 'scores';
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
        console.error(`Erreur pour quiz ${quiz.id}:`, err);
      }
    })
  );
  return pointsMap;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
  const [myScores, setMyScores] = useState<UserScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('available');
  const [quizPoints, setQuizPoints] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<Category[]>([]);

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState<SortOption>('name_asc');
  const [page, setPage] = useState(1);

  const [mySearch, setMySearch] = useState('');
  const [myCategoryId, setMyCategoryId] = useState('');
  const [mySort, setMySort] = useState<SortOption>('name_asc');
  const [myPage, setMyPage] = useState(1);

  const [scorePage, setScorePage] = useState(1);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=' + encodeURIComponent('/dashboard'));
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, router]);

  const fetchData = async () => {
    try {
      const [quizzesRes, scoresRes, catRes] = await Promise.all([
        fetch('/api/quiz'),
        fetch('/api/user/scores'),
        fetch('/api/categories'),
      ]);

      if (quizzesRes.ok) {
        const quizzesData = await quizzesRes.json();
        setQuizzes(quizzesData);
        setMyQuizzes(quizzesData.filter((q: Quiz) => q.creatorId === session?.user?.id));
        const points = await fetchQuizPoints(quizzesData);
        setQuizPoints(points);
      }

      if (scoresRes.ok) setMyScores(await scoresRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizzesChange = async (data: Quiz[]) => {
    setQuizzes(data);
    setPage(1);
    const points = await fetchQuizPoints(data);
    setQuizPoints(points);
  };

  const handleMyQuizzesChange = async (data: Quiz[]) => {
    setMyQuizzes(data.filter((q) => q.creatorId === session?.user?.id));
    setMyPage(1);
    const points = await fetchQuizPoints(data);
    setQuizPoints(prev => ({ ...prev, ...points }));
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce quiz ?')) return;
    try {
      const res = await fetch(`/api/quiz/${quizId}`, { method: 'DELETE' });
      if (res.ok) {
        setMyQuizzes(myQuizzes.filter((q) => q.id !== quizId));
        setQuizzes(quizzes.filter((q) => q.id !== quizId));
      } else {
        alert('Erreur lors de la suppression du quiz');
      }
    } catch {
      alert('Erreur lors de la suppression du quiz');
    }
  };

  const sortQuizzes = (list: Quiz[], s: SortOption) => [...list].sort((a, b) => {
    if (s === 'name_asc') return a.title.localeCompare(b.title);
    if (s === 'name_desc') return b.title.localeCompare(a.title);
    if (s === 'category') return (a.category?.name ?? 'zzz').localeCompare(b.category?.name ?? 'zzz');
    return 0;
  });

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 text-lg font-semibold">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const totalScore = myScores.reduce((sum, score) => sum + score.totalScore, 0);

  const sortedQuizzes = sortQuizzes(quizzes, sort);
  const totalPages = Math.ceil(sortedQuizzes.length / PAGE_SIZE);
  const paginatedQuizzes = sortedQuizzes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const sortedMyQuizzes = sortQuizzes(myQuizzes, mySort);
  const myTotalPages = Math.ceil(sortedMyQuizzes.length / PAGE_SIZE);
  const paginatedMyQuizzes = sortedMyQuizzes.slice((myPage - 1) * PAGE_SIZE, myPage * PAGE_SIZE);

  const scoreTotalPages = Math.ceil(myScores.length / PAGE_SIZE);
  const paginatedScores = myScores.slice((scorePage - 1) * PAGE_SIZE, scorePage * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Plateforme de Quiz</h1>
            <p className="text-gray-600 text-lg">
              Bienvenue, <span className="font-semibold">{session.user?.name || session.user?.email}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
              <div className="text-sm opacity-90 mb-2">Score Total</div>
              <div className="text-4xl font-bold">{totalScore}</div>
              <div className="text-xs opacity-80 mt-1">points gagnés</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
              <div className="text-sm opacity-90 mb-2">Quiz Complétés</div>
              <div className="text-4xl font-bold">{myScores.length}</div>
              <div className="text-xs opacity-80 mt-1">sur {quizzes.length} disponibles</div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
              <div className="text-sm opacity-90 mb-2">Mes Quiz Créés</div>
              <div className="text-4xl font-bold">{myQuizzes.length}</div>
              <div className="text-xs opacity-80 mt-1">quiz personnalisés</div>
            </div>
          </div>

          <div className="mt-8 border-b-2 border-gray-200">
            <div className="flex gap-6">
              {(['available', 'my-quizzes', 'scores'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 px-2 font-semibold text-base transition-colors border-b-4 ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  {tab === 'available' ? 'Quiz disponibles' : tab === 'my-quizzes' ? 'Mes quiz' : 'Mes scores'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab: Quiz disponibles */}
        {activeTab === 'available' && (
          <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quiz disponibles</h2>
            <div className="mb-6">
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
            {sortedQuizzes.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-600 text-lg mb-2">Aucun quiz disponible</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                  {paginatedQuizzes.map((quiz) => {
                    const userScore = myScores.find((s) => s.quiz.id === quiz.id);
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
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
              </>
            )}
          </div>
        )}

        {/* Tab: Mes quiz */}
        {activeTab === 'my-quizzes' && (
          <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Mes quiz</h2>
              <Link href="/quiz/create" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2">
                <span className="text-xl">+</span> Créer un quiz
              </Link>
            </div>
            <div className="mb-6">
              <QuizFilters
                search={mySearch}
                onSearchChange={(v) => { setMySearch(v); setMyPage(1); }}
                categoryId={myCategoryId}
                onCategoryChange={(v) => { setMyCategoryId(v); setMyPage(1); }}
                sort={mySort}
                onSortChange={(v) => { setMySort(v); setMyPage(1); }}
                categories={categories}
                onQuizzesChange={handleMyQuizzesChange}
              />
            </div>
            {sortedMyQuizzes.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-600 text-lg mb-2">Aucun quiz créé</p>
                <p className="text-gray-500 mb-6">Créez votre premier quiz personnalisé</p>
                <Link href="/quiz/create" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg">
                  Créer un quiz
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                  {paginatedMyQuizzes.map((quiz) => (
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
                <Pagination currentPage={myPage} totalPages={myTotalPages} onPageChange={setMyPage} />
              </>
            )}
          </div>
        )}

        {/* Tab: Mes scores */}
        {activeTab === 'scores' && (
          <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Mes scores</h2>
            {myScores.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-600 text-lg mb-2">Aucun score enregistré</p>
                <p className="text-gray-500">Complétez des quiz pour voir vos scores ici</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {paginatedScores.map((score, index) => {
                    const totalPoints = quizPoints[score.quiz.id] || 0;
                    const isPerfect = totalPoints > 0 && score.totalScore === totalPoints;
                    return (
                      <div key={index} className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200 hover:border-blue-400 hover:shadow-xl transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-gray-900 mb-1">{score.quiz.title}</h4>
                          <p className="text-sm text-gray-500">
                            Complété le {new Date(score.completedAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className={`text-3xl font-bold ${isPerfect ? 'text-green-600' : 'text-orange-500'}`}>
                              {score.totalScore}{totalPoints > 0 ? `/${totalPoints}` : ''}
                            </div>
                            <div className="text-xs text-gray-500">points</div>
                          </div>
                          <Link href={`/quiz/${score.quiz.id}`} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg whitespace-nowrap">
                            Rejouer →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Pagination currentPage={scorePage} totalPages={scoreTotalPages} onPageChange={setScorePage} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
