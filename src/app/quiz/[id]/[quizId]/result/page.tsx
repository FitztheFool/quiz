// src/app/quiz/[id]/[quizId]/result/page.tsx  (id = lobbyId, quizId = quiz DB id)
'use client';
import LoadingSpinner from '@/components/LoadingSpinner';

import Link from 'next/link';
import { notFound as nextNotFound } from 'next/navigation';
import { useRef, useEffect, useMemo } from 'react';
import QuizResults from '@/components/Quiz/QuizResults';
import { useRouter } from 'next/navigation';
import { useQuizResult, LeaderboardEntry } from '@/hooks/useQuizResult';
import { getQuizSocket } from '@/lib/socket';

export type PlayerProgress = {
    userId: string;
    username: string;
    currentQuestion: number;
    totalQuestions: number;
    finished: boolean;
};

const PODIUM_EMOJIS = ['🥇', '🥈', '🥉'];

const rankStyle = (i: number) => ({
    border: i === 0 ? 'border-yellow-400 dark:border-yellow-600' : i === 1 ? 'border-gray-300 dark:border-gray-600' : 'border-amber-500/40 dark:border-amber-700/40',
    bg: i === 0 ? 'bg-yellow-50 dark:bg-yellow-900/20' : i === 1 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-amber-50/50 dark:bg-amber-900/10',
    text: i === 0 ? 'text-yellow-800 dark:text-yellow-300' : i === 1 ? 'text-gray-700 dark:text-gray-200' : 'text-amber-800 dark:text-amber-300',
    score: i === 0 ? 'text-yellow-700 dark:text-yellow-400' : i === 1 ? 'text-gray-600 dark:text-gray-300' : 'text-amber-700 dark:text-amber-400',
});

function MeTag() {
    return <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-2">(moi)</span>;
}

export default function QuizResultPage() {
    const router = useRouter();
    const {
        quizId, lobbyCode, session, authStatus, payload,
        notFound, leaderboard, playerProgress, totalPlayers,
        allFinished, timeLeft, handleRestart,
    } = useQuizResult();

    const socket = useMemo(() => lobbyCode ? getQuizSocket() : null, [lobbyCode]);
    const mode = !lobbyCode ? 'solo' : !allFinished ? 'waiting' : 'podium';

    const handleRejouer = () => {
        if (lobbyCode) socket?.emit('lobby:restart');
        router.push(`/lobby/create/${lobbyCode}`);
    };

    if (authStatus === 'loading') return <LoadingSpinner message="Chargement des résultats..." />;

    if (notFound || !payload) nextNotFound();

    if (mode === 'waiting') {
        return (
            <LobbyWaitingRoom
                score={payload.score}
                totalPoints={payload.totalPoints}
                leaderboard={leaderboard}
                playerProgress={playerProgress}
                totalPlayers={totalPlayers}
                currentUserId={session?.user?.id}
                timeLeft={timeLeft}
            />
        );
    }

    if (mode === 'podium') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900">
                <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 mb-8">

                        <div className="text-center mb-6">
                            <div className="text-6xl mb-3">🏆</div>
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-1">Classement final</h1>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">{payload.quizTitle}</p>
                            <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-5 py-3">
                                <span className="text-gray-600 dark:text-gray-300 font-medium">Ton score</span>
                                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                    {payload.score}
                                    <span className="text-sm text-gray-400 dark:text-gray-500 font-normal"> / {payload.totalPoints} pts</span>
                                </span>
                            </div>
                        </div>

                        {/* Top 3 */}
                        <div className="space-y-3 mb-4">
                            {leaderboard.slice(0, 3).map((entry, i) => {
                                const s = rankStyle(i);
                                return (
                                    <div key={entry.userId} className={`flex items-center gap-4 p-4 rounded-xl border-2 ${s.border} ${s.bg}`}>
                                        <span className="text-4xl w-10 text-center">{PODIUM_EMOJIS[i]}</span>
                                        <span className={`flex-1 font-bold text-lg ${s.text}`}>
                                            {entry.username}
                                            {entry.userId === session?.user?.id && <MeTag />}
                                        </span>
                                        <span className={`font-bold text-xl ${s.score}`}>{entry.totalScore} pts</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Reste du classement */}
                        {leaderboard.length > 3 && (
                            <div className="space-y-2">
                                {leaderboard.slice(3).map((entry, i) => (
                                    <div key={entry.userId} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                        <span className="text-gray-500 dark:text-gray-400 font-bold w-10 text-center">{i + 4}</span>
                                        <span className="flex-1 text-gray-700 dark:text-gray-200 font-medium">
                                            {entry.username}
                                            {entry.userId === session?.user?.id && <MeTag />}
                                        </span>
                                        <span className="text-gray-600 dark:text-gray-300 font-bold">{entry.totalScore} pts</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-3 justify-center mt-8 flex-wrap">
                            <button onClick={handleRejouer} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                                Rejouer
                            </button>
                            <Link href="/dashboard" className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium">
                                Dashboard
                            </Link>
                            <Link href="/" className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium">
                                Accueil
                            </Link>
                        </div>
                    </div>

                    <QuizResults
                        quizTitle={payload.quizTitle}
                        quizId={quizId}
                        score={payload.score}
                        totalPoints={payload.totalPoints}
                        questionResults={payload.questionResults}
                        isAuthenticated={authStatus === 'authenticated'}
                        leaderboard={leaderboard}
                        currentUserId={session?.user?.id}
                        hideHeader
                    />
                </div>
            </div>
        );
    }

    return (
        <QuizResults
            quizTitle={payload.quizTitle}
            quizId={quizId}
            score={payload.score}
            totalPoints={payload.totalPoints}
            questionResults={payload.questionResults}
            isOwnQuiz={payload.isOwnQuiz}
            isAuthenticated={authStatus === 'authenticated'}
            onRestart={handleRestart}
        />
    );
}

function LobbyWaitingRoom({ score, totalPoints, leaderboard, playerProgress, totalPlayers, currentUserId, timeLeft }: {
    score: number;
    totalPoints: number;
    leaderboard: LeaderboardEntry[];
    playerProgress: PlayerProgress[];
    totalPlayers: number;
    currentUserId?: string;
    timeLeft: number | null;
}) {
    const finishedPlayersCount = leaderboard.length;

    const maxTimeLeftRef = useRef<number>(timeLeft ?? 0);
    useEffect(() => {
        if (timeLeft !== null && timeLeft > maxTimeLeftRef.current) {
            maxTimeLeftRef.current = timeLeft;
        }
    }, [timeLeft]);

    const timerPct = maxTimeLeftRef.current > 0 && timeLeft !== null
        ? (timeLeft / maxTimeLeftRef.current) * 100
        : 0;

    const inProgressPlayers = useMemo(
        () => playerProgress.filter(p => !leaderboard.find(l => l.userId === p.userId)),
        [playerProgress, leaderboard]
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
            <div className="max-w-lg w-full">

                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 mb-4 flex items-center justify-between">
                    <div>
                        <p className="font-bold text-gray-800 dark:text-gray-100">Quiz terminé ! 🎉</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500">En attente des autres joueurs…</p>
                    </div>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {score}
                        <span className="text-base text-gray-400 dark:text-gray-500 font-normal"> / {totalPoints} pts</span>
                    </span>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="font-bold text-gray-800 dark:text-gray-100">Joueurs</h2>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {finishedPlayersCount} / {totalPlayers ?? '?'} terminé{finishedPlayersCount > 1 ? 's' : ''}
                        </span>
                    </div>

                    {timeLeft !== null && timeLeft > 0 && (
                        <div className="flex justify-between items-center mb-4 text-sm">
                            <span className="text-gray-500 dark:text-gray-400">⏱ Temps max restant</span>
                            <span className={`font-bold tabular-nums ${timeLeft <= 10 ? 'text-red-500 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                {timeLeft >= 60
                                    ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`
                                    : `${timeLeft}s`}
                            </span>
                        </div>
                    )}

                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-5"
                        role="progressbar" aria-valuenow={Math.round(timerPct)} aria-valuemin={0} aria-valuemax={100} aria-label="Temps restant">
                        <div className={`h-2 rounded-full transition-all duration-500 ${timerPct > 60 ? 'bg-green-500' : timerPct > 30 ? 'bg-orange-400' : 'bg-red-500'}`}
                            style={{ width: `${timerPct}%` }} />
                    </div>

                    <div className="space-y-4">
                        {leaderboard.map((entry) => (
                            <div key={entry.userId} className="flex items-center gap-3">
                                <span className="text-green-500 dark:text-green-400 text-lg w-6 text-center">✓</span>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                            {entry.username}
                                            {entry.userId === currentUserId && <MeTag />}
                                        </span>
                                        <span className="text-sm font-bold text-green-600 dark:text-green-400">{entry.totalScore}/{totalPoints} pts</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5"
                                        role="progressbar" aria-valuenow={100} aria-valuemin={0} aria-valuemax={100} aria-label={`Progression de ${entry.username}`}>
                                        <div className="bg-green-400 dark:bg-green-500 h-1.5 rounded-full w-full" />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {inProgressPlayers.map((player) => {
                            const pct = player.totalQuestions > 0
                                ? (player.currentQuestion / player.totalQuestions) * 100
                                : 0;
                            return (
                                <div key={player.userId} className="flex items-center gap-3">
                                    <LoadingSpinner fullScreen={false} />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{player.username}</span>
                                            <span className="text-xs text-gray-400 dark:text-gray-500">{player.currentQuestion}/{player.totalQuestions}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5"
                                            role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progression de ${player.username}`}>
                                            <div className="bg-blue-400 dark:bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                                                style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
