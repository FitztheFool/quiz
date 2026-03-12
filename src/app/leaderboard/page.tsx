'use client';
import LoadingSpinner from '@/components/LoadingSpinner';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

interface QuizScore {
  createdAt: any;
  quizId: string;
  quizTitle: string;
  score: number;
  maxScore: number;
  completedAt: string;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  totalScore?: number;
  score?: number;
  quizzesCompleted?: number;
  quizScores?: QuizScore[];
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreClick = async (entry: LeaderboardEntry) => {
    setSelectedUser(entry);

    // If quizScores already fetched, no need to refetch
    if (entry.quizScores) return;

    setDetailLoading(true);
    try {
      const res = await fetch(`/api/leaderboard/${entry.username}/scores`);
      if (res.ok) {
        const data = await res.json();
        // Update the entry in the leaderboard list with fetched quiz scores
        setLeaderboard((prev) =>
          prev.map((e) =>
            e.rank === entry.rank ? { ...e, quizScores: data.quizScores || [] } : e
          )
        );
        setSelectedUser((prev) =>
          prev ? { ...prev, quizScores: data.quizScores || [] } : prev
        );
      }
    } catch (error) {
      console.error('Erreur chargement scores:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => setSelectedUser(null);

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getScorePercentage = (score: number, max: number) =>
    max > 0 ? Math.round((score / max) * 100) : 0;

  const { data: session } = useSession();
  const getPercentageColor = (pct: number) => {
    if (pct >= 80) return '#16a34a';
    if (pct >= 50) return '#d97706';
    return '#dc2626';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
            🏆 Classement Global
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Les meilleurs joueurs de Quiz App
          </p>
        </div>

        {/* Leaderboard */}
        <div className="card">
          {loading ? (
            <div className="text-center py-12">
              <LoadingSpinner message="Chargement du classement..." />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">Aucun score enregistré pour le moment.</p>
              <p className="text-gray-500 mt-2">Soyez le premier à jouer !</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rang</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joueur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quiz Complétés</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaderboard.map((entry) => (
                    <tr key={entry.rank} className={entry.rank <= 3 ? 'bg-yellow-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-2xl font-bold">{getMedalEmoji(entry.rank)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={session?.user?.username === entry.username ? '/dashboard' : `/profile/${entry.username}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                        >
                          {entry.username}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleScoreClick(entry)}
                          className="text-sm font-bold text-primary-600 underline decoration-dotted underline-offset-2
                                     hover:text-primary-800 hover:decoration-solid transition-colors cursor-pointer
                                     focus:outline-none focus:ring-2 focus:ring-primary-400 rounded px-1"
                          title={`Voir le détail des scores de ${entry.username}`}
                        >
                          {(entry.totalScore ?? entry.score ?? 0)} pts
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{entry.quizzesCompleted || '-'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          {session ? (
            <Link href="/dashboard" className="btn-primary inline-block">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="btn-primary inline-block">
              Jouer pour entrer dans le classement
            </Link>
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
                  {getMedalEmoji(selectedUser.rank)}&nbsp;{selectedUser.username}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Score total :{' '}
                  <span className="font-bold text-primary-600">
                    {selectedUser.totalScore || selectedUser.score} pts
                  </span>
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none focus:outline-none transition-colors"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <LoadingSpinner message="Chargement des scores..." />
                </div>
              ) : !selectedUser.quizScores || selectedUser.quizScores.length === 0 ? (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                  <p className="text-3xl mb-2">📭</p>
                  <p>Aucun détail disponible pour ce joueur.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {selectedUser.quizScores.map((qs) => {
                    const pct = getScorePercentage(qs.score, qs.maxScore);
                    const color = getPercentageColor(pct);
                    return (
                      <li
                        key={`${qs.quizId}-${qs.completedAt}`}
                        className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 flex items-center gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{qs.quizTitle}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(qs.completedAt).toLocaleDateString('fr-FR', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })}
                          </p>
                          {/* Progress bar */}
                          <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-base font-bold" style={{ color }}>
                            {qs.score}
                          </span>
                          <span className="text-xs text-gray-400">/{qs.maxScore}</span>
                          <p className="text-xs font-medium mt-0.5" style={{ color }}>{pct}%</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={closeModal}
                className="btn-primary text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
}
