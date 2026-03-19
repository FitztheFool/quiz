// src/components/QuizResults.tsx
'use client';

import Link from 'next/link';
import { plural } from '@/lib/utils';

export interface QuestionResult {
    questionId: string;
    questionText: string;
    type: 'TRUE_FALSE' | 'MCQ' | 'TEXT' | 'MULTI_TEXT';
    points: number;
    earnedPoints: number;
    isCorrect: boolean;
    userAnswerText: string;
    correctAnswerText: string;
    strictOrder?: boolean;
}

export interface LeaderboardEntry {
    userId: string;
    username: string;
    totalScore: number;
    questionResults?: QuestionResult[];
}

export interface QuizResultsProps {
    quizTitle: string;
    quizId: string;
    score: number;
    totalPoints: number;
    questionResults: QuestionResult[];
    isOwnQuiz?: boolean;
    isAuthenticated?: boolean;
    onRestart?: () => void;
    extraActions?: { label: string; onClick: () => void; variant?: 'primary' | 'secondary' }[];
    leaderboard?: LeaderboardEntry[];
    currentUserId?: string;
    hideHeader?: boolean;
}

export default function QuizResults({
    quizTitle,
    quizId,
    score,
    totalPoints,
    questionResults,
    isOwnQuiz = false,
    isAuthenticated = true,
    onRestart,
    extraActions = [],
    leaderboard,
    currentUserId,
    hideHeader = false,
}: QuizResultsProps) {
    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const correctCount = questionResults.filter((r) => r.isCorrect).length;
    const totalCount = questionResults.length;

    return (
        <div className={hideHeader ? '' : 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900'}>
            <div className={hideHeader ? '' : 'max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8'}>

                {/* ── Carte score ── */}
                {!hideHeader && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 mb-8">
                        <div className="text-center">
                            <div className="text-6xl mb-4">
                                {percentage >= 80 ? '🏆' : percentage >= 60 ? '👍' : '📚'}
                            </div>
                            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Quiz terminé !</h2>
                            <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">{quizTitle}</p>

                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-6 mb-6">
                                <p className="text-lg font-semibold opacity-90 mb-1">{score}/{totalPoints} pts</p>
                                <p className="text-5xl font-bold mb-1">
                                    {correctCount}/{totalCount}{' '}
                                    {plural(totalCount, 'question correcte', 'questions correctes')}
                                </p>
                                <p className="text-base opacity-80">{percentage}% des points obtenus</p>
                            </div>

                            {!isAuthenticated && (
                                <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 rounded-xl px-5 py-4 mb-6 shadow-sm">
                                    <span className="text-xl shrink-0">🔒</span>
                                    <p className="text-sm">
                                        Vos scores ne sont enregistrés que lorsque vous êtes connecté.{' '}
                                        <Link
                                            href={`/login?callbackUrl=${encodeURIComponent(`/quiz/${quizId}`)}`}
                                            className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-200 transition-colors"
                                        >
                                            Se connecter
                                        </Link>
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3 justify-center flex-wrap">
                                {onRestart && (
                                    <button onClick={onRestart} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                                        Rejouer
                                    </button>
                                )}
                                {extraActions.map((action, i) => (
                                    <button key={i} onClick={action.onClick}
                                        className={`px-6 py-3 rounded-lg transition-colors font-medium ${action.variant === 'primary' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-600 text-white hover:bg-gray-700'}`}>
                                        {action.label}
                                    </button>
                                ))}
                                <Link href="/dashboard" className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium">
                                    Dashboard
                                </Link>
                                <Link href="/" className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium">
                                    Accueil
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {isOwnQuiz && (
                    <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300 rounded-xl px-5 py-4 mb-6 shadow-sm">
                        <span className="text-xl shrink-0">ℹ️</span>
                        <p className="text-sm">Ce quiz étant le vôtre, il ne vous rapporte pas de points au classement.</p>
                    </div>
                )}

                {/* ── Récapitulatif ── */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">📋 Récapitulatif</h3>
                    <div className="space-y-4">
                        {questionResults.map((result, index) => (
                            <QuestionCard
                                key={result.questionId}
                                result={result}
                                index={index}
                                leaderboard={leaderboard}
                                currentUserId={currentUserId}
                            />
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}

// ─── AnswerText ───────────────────────────────────────────────────────────────

function AnswerText({ result }: { result: QuestionResult }) {
    if (result.type === 'MULTI_TEXT') {
        return (
            <div className="mt-2">
                <div className={`text-sm mb-2 ${result.isCorrect ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                    <span className="font-medium">Votre réponse : </span>
                    {result.userAnswerText
                        ? <span>{result.userAnswerText}</span>
                        : <span className="italic opacity-70">Aucune réponse</span>}
                </div>
                <div className="border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Réponses attendues :</p>
                    <div className="space-y-1">
                        {result.correctAnswerText.split(', ').map((c, i) => {
                            const isGood = result.userAnswerText.split(', ').some(u => u.trim().toLowerCase() === c.trim().toLowerCase());
                            return (
                                <div key={i} className={`text-sm px-3 py-1.5 rounded-lg border font-medium ${isGood
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300'
                                    : 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                                    }`}>
                                    {isGood ? '✓' : '•'} {c}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className={`text-sm mb-2 ${result.isCorrect ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                <span className="font-medium">Votre réponse : </span>
                {result.userAnswerText
                    ? <span>{result.userAnswerText}</span>
                    : <span className="italic opacity-70">Aucune réponse</span>}
            </div>
            {!result.isCorrect && (
                <div className="text-sm text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg px-3 py-2">
                    <span className="font-medium">✅ Réponse attendue : </span>
                    <span>{result.correctAnswerText}</span>
                </div>
            )}
        </div>
    );
}

// ─── QuestionCard ─────────────────────────────────────────────────────────────

function QuestionCard({ result, index, leaderboard, currentUserId }: {
    result: QuestionResult;
    index: number;
    leaderboard?: LeaderboardEntry[];
    currentUserId?: string;
}) {
    const isMultiplayer = leaderboard && leaderboard.length > 0;

    return (
        <div className={
            isMultiplayer
                ? 'border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden'
                : `p-5 rounded-xl border-2 ${result.isCorrect
                    ? 'border-green-400 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                    : 'border-red-400 dark:border-red-700 bg-red-50 dark:bg-red-900/20'}`
        }>
            {isMultiplayer ? (
                <div className="bg-gray-50 dark:bg-gray-800 px-5 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-800 dark:text-gray-100">
                            <span className="text-gray-400 dark:text-gray-500 font-normal mr-2">Q{index + 1}.</span>
                            {result.questionText}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 font-medium">{result.points} pts</span>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        ✅ <span className="font-medium">{result.correctAnswerText}</span>
                    </p>
                </div>
            ) : (
                <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                        <span className="text-gray-500 dark:text-gray-400 font-normal mr-2">Q{index + 1}.</span>
                        {result.questionText}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xl ${result.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {result.isCorrect ? '✓' : '✗'}
                        </span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${result.isCorrect
                            ? 'bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                            : 'bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                            }`}>
                            {result.earnedPoints > 0 ? `+${result.earnedPoints} pts` : '0 pt'}
                        </span>
                    </div>
                </div>
            )}

            {isMultiplayer ? (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {leaderboard.map((entry) => {
                        const playerResult = entry.questionResults?.find(r => r.questionId === result.questionId);
                        const isMe = entry.userId === currentUserId;
                        return (
                            <div key={entry.userId} className={`flex items-center gap-3 px-5 py-3 ${isMe ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                <span className={`text-lg w-5 text-center font-bold ${playerResult
                                    ? (playerResult.isCorrect ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400')
                                    : 'text-gray-300 dark:text-gray-600'
                                    }`}>
                                    {playerResult ? (playerResult.isCorrect ? '✓' : '✗') : '—'}
                                </span>
                                <span className="font-medium text-gray-700 dark:text-gray-200 text-sm w-24 shrink-0">
                                    {entry.username}
                                    {isMe && <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">(moi)</span>}
                                </span>
                                <span className={`text-xs flex-1 ${playerResult
                                    ? (playerResult.isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400')
                                    : 'text-gray-400 dark:text-gray-500 italic'
                                    }`}>
                                    {playerResult?.userAnswerText || 'Aucune réponse'}
                                </span>
                                <span className={`text-xs font-bold shrink-0 ${playerResult?.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                    {playerResult ? `${playerResult.earnedPoints}/${playerResult.points} pts` : '—'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <AnswerText result={result} />
            )}
        </div>
    );
}
