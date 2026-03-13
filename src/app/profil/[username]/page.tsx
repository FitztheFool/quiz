'use client';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import QuizCard from '@/components/QuizCard';
import Pagination from '@/components/Pagination';
import ScoreList from '@/components/ScoreList';
import { GAME_CONFIG } from '@/lib/gameConfig';

const PAGE_SIZE = 6;

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  createdAt?: string;
  creatorId?: string;
  _count: { questions: number };
  category?: { name: string } | null;
  questions?: { points: number }[];
}

interface UserScore {
  type: string;
  quiz?: { id: string; title: string };
  totalScore: number;
  completedAt: string;
  maxScore?: number;
  placement?: number | null;
}

interface GameStat {
  type: string;
  count: number;
}

interface Playerprofil {
  id: string;
  name: string | null;
  totalScore: number;
  quizzesCompleted: number;
  quizzesCreated: number;
  scores: UserScore[];
  quizzes: Quiz[];
  gameStats: GameStat[];
}

type TabType = 'quizzes' | 'scores';

const computePoints = (quizzesList: Quiz[]) => {
  const map: Record<string, number> = {};
  quizzesList.forEach((q: any) => {
    map[q.id] = q.questions?.reduce((sum: number, qq: any) => sum + (qq.points || 0), 0) || 0;
  });
  return map;
};

export default function PlayerprofilPage() {
  const params = useParams();
  const router = useRouter();
  const username = params?.username as string;

  const { data: session, status: sessionStatus } = useSession();
  const [profil, setprofil] = useState<Playerprofil | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('quizzes');
  const [quizPage, setQuizPage] = useState(1);
  const [scorePage, setScorePage] = useState(1);
  const [quizPoints, setQuizPoints] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!username) return;
    if (sessionStatus === 'loading') return;

    if (sessionStatus === 'authenticated' && session?.user?.username === username) {
      router.replace('/dashboard');
      return;
    }

    const fetchprofil = async () => {
      try {
        const res = await fetch(`/api/profil/${username}`);
        if (!res.ok) { setNotFound(true); return; }
        const data = await res.json();
        setprofil(data);
        setQuizPoints(computePoints(data.quizzes));
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchprofil();
  }, [username, sessionStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center"><LoadingSpinner /></div>
      </div>
    );
  }

  if (notFound || !profil) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-700 mb-2">Joueur introuvable</p>
          <p className="text-gray-500 mb-6">Ce profil n'existe pas ou n'est pas accessible.</p>
          <button onClick={() => router.back()} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all">
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  const displayName = profil.name || 'Joueur anonyme';
  const quizTotalPages = Math.ceil(profil.quizzes.length / PAGE_SIZE);
  const paginatedQuizzes = profil.quizzes.slice((quizPage - 1) * PAGE_SIZE, quizPage * PAGE_SIZE);
  const scoreTotalPages = Math.ceil(profil.scores.length / PAGE_SIZE);
  const paginatedScores = profil.scores.slice((scorePage - 1) * PAGE_SIZE, scorePage * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 md:p-8 mb-8">
          <button onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-flex items-center gap-1 transition-colors">
            ← Retour
          </button>

          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{displayName}</h1>
              <p className="text-gray-500 text-sm">Profil joueur</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
              <div className="text-sm opacity-90 mb-2">Score Total</div>
              <div className="text-4xl font-bold">{profil.totalScore}</div>
              <div className="text-xs opacity-80 mt-1">points gagnés</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
              <div className="text-sm opacity-90 mb-2">Quiz Complétés</div>
              <div className="text-4xl font-bold">{profil.quizzesCompleted}</div>
              <div className="text-xs opacity-80 mt-1">quiz terminés</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
              <div className="text-sm opacity-90 mb-2">Quiz Créés</div>
              <div className="text-4xl font-bold">{profil.quizzesCreated}</div>
              <div className="text-xs opacity-80 mt-1">quiz publics</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-8 border-b-2 border-gray-200 dark:border-gray-700">
            <div className="flex gap-6">
              {(['quizzes', 'scores'] as TabType[]).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`pb-4 px-2 font-semibold text-base transition-colors border-b-4 ${activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {tab === 'quizzes' ? 'Quiz créés' : 'Scores'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab: Quiz créés */}
        {activeTab === 'quizzes' && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Quiz créés par {displayName}</h2>
            {profil.quizzes.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-600 text-lg mb-2">Aucun quiz public créé</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                  {paginatedQuizzes.map((quiz) => (
                    <QuizCard key={quiz.id} quiz={quiz} currentUserId={undefined} totalPoints={quizPoints[quiz.id] || 0} />
                  ))}
                </div>
                <Pagination currentPage={quizPage} totalPages={quizTotalPages} onPageChange={setQuizPage} />
              </>
            )}
          </div>
        )}

        {/* Tab: Scores */}
        {activeTab === 'scores' && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Scores de {displayName}</h2>

            {/* Stats par jeu */}
            {profil.gameStats?.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-6">
                {profil.gameStats.map(({ type, count }) => {
                  const config = Object.values(GAME_CONFIG).find(c => c.gameType === type);
                  return (
                    <div key={type} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span>{config?.icon ?? '🎮'}</span>
                      <span>{config?.label ?? type}</span>
                      <span className="font-bold text-gray-900 dark:text-white">{count} partie{count > 1 ? 's' : ''}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {profil.scores.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-600 text-lg mb-2">Aucun score enregistré</p>
                <p className="text-gray-500 dark:text-gray-400">Ce joueur n'a encore complété aucun quiz.</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <ScoreList scores={paginatedScores} />
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
