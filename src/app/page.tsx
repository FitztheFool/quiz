'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import QuizCard from '@/components/QuizCard';

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

export default function HomePage() {
  const { data: session } = useSession();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [myScores, setMyScores] = useState<UserScore[]>([]);
  const [quizPoints, setQuizPoints] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Remplace l'ancien useEffect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, session]);

  const fetchData = async (searchTerm = '') => {
    try {
      const res = await fetch(`/api/quiz?search=${encodeURIComponent(searchTerm)}`);
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

  const completedQuizIds = myScores.map((s) => s.quiz.id);

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

        {/* Titre + Recherche + Leaderboard */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-gray-900">Quiz disponibles</h3>
            <Link
              href="/leaderboard"
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              🏆 Voir le classement
            </Link>
          </div>
          <input
            type="text"
            placeholder="🔍 Rechercher un quiz par titre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field w-full sm:w-1/3"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Chargement des quiz...</p>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 text-lg">Aucun quiz disponible pour le moment.</p>
            <p className="text-gray-500 mt-2">Connectez-vous pour créer le premier !</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
