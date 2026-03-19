// src/components/ScoreList.tsx
import Link from 'next/link';
import { GAME_CONFIG } from '@/lib/gameConfig';

const PLACEMENT_EMOJI: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

interface Score {
    type: string;
    quiz?: { id: string; title: string };
    totalScore: number;
    completedAt: string;
    maxScore?: number;
    placement?: number | null;
}

function getGameConfig(gameType: string) {
    return Object.values(GAME_CONFIG).find(c => c.gameType === gameType);
}

export default function ScoreList({ scores }: { scores: Score[] }) {
    return (
        <div className="space-y-3">
            {scores.map((score, index) => {
                const isQuiz = score.type === 'QUIZ';
                const config = getGameConfig(score.type);
                const totalPoints = score.maxScore || 0;
                const pct = totalPoints > 0 ? Math.round((score.totalScore / totalPoints) * 100) : 0;
                const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';

                return (
                    <div key={index} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 flex items-center gap-4">
                        <div className="text-2xl flex-shrink-0">{config?.icon ?? '🎮'}</div>
                        <div className="flex-1 min-w-0">
                            {isQuiz && score.quiz ? (
                                <Link href={`/quiz/${score.quiz.id}`}
                                    className="text-sm font-semibold text-gray-800 dark:text-gray-200 hover:text-blue-600 truncate block">
                                    {score.quiz.title}
                                </Link>
                            ) : (
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                    {config?.label ?? score.type}
                                    {score.placement && (
                                        <span className="ml-2">{PLACEMENT_EMOJI[score.placement] ?? `#${score.placement}`}</span>
                                    )}
                                </p>
                            )}
                            <p className="text-xs text-gray-400 mt-0.5">
                                {new Date(score.completedAt).toLocaleDateString('fr-FR', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                })}
                            </p>
                            {isQuiz && totalPoints > 0 && (
                                <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                                </div>
                            )}
                        </div>
                        <div className="text-right shrink-0">
                            <span className="text-base font-bold text-gray-900 dark:text-white">{score.totalScore}</span>
                            {isQuiz && totalPoints > 0 && (
                                <>
                                    <span className="text-xs text-gray-400">/{totalPoints}</span>
                                    <p className="text-xs font-medium mt-0.5" style={{ color }}>{pct}%</p>
                                </>
                            )}
                            {!isQuiz && <p className="text-xs text-gray-400">pts</p>}
                        </div>
                        {isQuiz && score.quiz && (
                            <Link href={`/quiz/${score.quiz.id}`}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm whitespace-nowrap">
                                Jouer →
                            </Link>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
