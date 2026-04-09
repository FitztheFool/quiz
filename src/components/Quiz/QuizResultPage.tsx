'use client';
import LoadingSpinner from '@/components/LoadingSpinner';

import Link from 'next/link';
import { notFound as nextNotFound } from 'next/navigation';
import { useMemo } from 'react';
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
    border:
        i === 0
            ? 'border-yellow-400 dark:border-yellow-600'
            : i === 1
                ? 'border-gray-300 dark:border-gray-600'
                : 'border-amber-500/40 dark:border-amber-700/40',
    bg:
        i === 0
            ? 'bg-yellow-50 dark:bg-yellow-900/20'
            : i === 1
                ? 'bg-gray-50 dark:bg-gray-800'
                : 'bg-amber-50/50 dark:bg-amber-900/10',
    text:
        i === 0
            ? 'text-yellow-800 dark:text-yellow-300'
            : i === 1
                ? 'text-gray-700 dark:text-gray-200'
                : 'text-amber-800 dark:text-amber-300',
    score:
        i === 0
            ? 'text-yellow-700 dark:text-yellow-400'
            : i === 1
                ? 'text-gray-600 dark:text-gray-300'
                : 'text-amber-700 dark:text-amber-400',
});

function MeTag() {
    return (
        <span className="ml-2 text-sm font-normal text-gray-400 dark:text-gray-500">
            (moi)
        </span>
    );
}

export default function QuizResultPage() {
    const router = useRouter();
    const {
        quizId,
        lobbyCode,
        session,
        authStatus,
        payload,
        notFound,
        leaderboard,
        playerProgress,
        totalPlayers,
        allFinished,
        handleRestart,
    } = useQuizResult();

    const socket = useMemo(() => (lobbyCode ? getQuizSocket() : null), [lobbyCode]);
    const mode = !lobbyCode ? 'solo' : !allFinished ? 'waiting' : 'podium';

    const handleRejouer = () => {
        if (lobbyCode) socket?.emit('lobby:restart');
        router.push(`/lobby/create/${lobbyCode}`);
    };

    if (authStatus === 'loading') {
        return <LoadingSpinner message="Chargement des résultats..." />;
    }

    if (notFound) {
        nextNotFound();
    }

    if (!payload) {
        return <LoadingSpinner message="Chargement des résultats..." />;
    }

    if (mode === 'waiting') {
        return (
            <LobbyWaitingRoom
                score={payload.score}
                totalPoints={payload.totalPoints}
                leaderboard={leaderboard}
                playerProgress={playerProgress}
                totalPlayers={totalPlayers}
                currentUserId={session?.user?.id}
            />
        );
    }

    // solo + podium use the same layout
    const isSolo = mode === 'solo';

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900">
            <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="mb-8 rounded-xl bg-white p-8 shadow-2xl dark:bg-gray-900">
                    <div className="mb-6 text-center">
                        <div className="mb-3 text-6xl">🏆</div>
                        <h1 className="mb-1 text-3xl font-bold text-gray-800 dark:text-gray-100">
                            {isSolo ? 'Résultats' : 'Classement final'}
                        </h1>
                        <p className="mb-4 text-gray-500 dark:text-gray-400">{payload.quizTitle}</p>
                        <div className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 dark:border-blue-700 dark:bg-blue-900/20">
                            <span className="font-medium text-gray-600 dark:text-gray-300">
                                Ton score
                            </span>
                            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                {payload.score}
                                <span className="text-sm font-normal text-gray-400 dark:text-gray-500">
                                    {' '}/ {payload.totalPoints} pts
                                </span>
                            </span>
                        </div>
                    </div>

                    {!isSolo && leaderboard.length > 0 && (
                        <>
                            <div className="mb-4 space-y-3">
                                {leaderboard.slice(0, 3).map((entry, i) => {
                                    const s = rankStyle(i);
                                    return (
                                        <div
                                            key={entry.userId}
                                            className={`flex items-center gap-4 rounded-xl border-2 p-4 ${s.border} ${s.bg}`}
                                        >
                                            <span className="w-10 text-center text-4xl">{PODIUM_EMOJIS[i]}</span>
                                            <span className={`flex-1 text-lg font-bold ${s.text}`}>
                                                {entry.username}
                                                {entry.userId === session?.user?.id && <MeTag />}
                                            </span>
                                            <span className={`text-xl font-bold ${s.score}`}>
                                                {entry.totalScore} pts
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {leaderboard.length > 3 && (
                                <div className="space-y-2">
                                    {leaderboard.slice(3).map((entry, i) => (
                                        <div
                                            key={entry.userId}
                                            className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
                                        >
                                            <span className="w-10 text-center font-bold text-gray-500 dark:text-gray-400">
                                                {i + 4}
                                            </span>
                                            <span className="flex-1 font-medium text-gray-700 dark:text-gray-200">
                                                {entry.username}
                                                {entry.userId === session?.user?.id && <MeTag />}
                                            </span>
                                            <span className="font-bold text-gray-600 dark:text-gray-300">
                                                {entry.totalScore} pts
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <button
                            onClick={isSolo ? handleRestart : handleRejouer}
                            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
                        >
                            Rejouer
                        </button>
                        <Link
                            href="/dashboard"
                            className="rounded-lg bg-gray-600 px-6 py-3 font-medium text-white transition-colors hover:bg-gray-700"
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/"
                            className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
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
                    isOwnQuiz={payload.isOwnQuiz}
                    isAuthenticated={authStatus === 'authenticated'}
                    leaderboard={leaderboard.length > 0 ? leaderboard : undefined}
                    currentUserId={session?.user?.id}
                    currentUsername={session?.user?.username ?? session?.user?.email ?? 'Vous'}
                    hideHeader
                />
            </div>
        </div>
    );
}

function LobbyWaitingRoom({
    score,
    totalPoints,
    leaderboard,
    playerProgress,
    totalPlayers,
    currentUserId,
}: {
    score: number;
    totalPoints: number;
    leaderboard: LeaderboardEntry[];
    playerProgress: PlayerProgress[];
    totalPlayers: number;
    currentUserId?: string;
}) {
    const finishedCount = leaderboard.length;
    const finishedPct = totalPlayers > 0 ? (finishedCount / totalPlayers) * 100 : 0;

    const inProgressPlayers = useMemo(
        () => playerProgress.filter(p => !leaderboard.find(l => l.userId === p.userId)),
        [playerProgress, leaderboard]
    );

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-950 dark:to-gray-900">
            <div className="w-full max-w-lg">
                <div className="mb-4 flex items-center justify-between rounded-xl bg-white p-6 shadow-lg dark:bg-gray-900">
                    <div>
                        <p className="font-bold text-gray-800 dark:text-gray-100">Quiz terminé ! 🎉</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500">
                            En attente des autres joueurs…
                        </p>
                    </div>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {score}
                        <span className="text-base font-normal text-gray-400 dark:text-gray-500">
                            {' '}
                            / {totalPoints} pts
                        </span>
                    </span>
                </div>

                <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-900">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="font-bold text-gray-800 dark:text-gray-100">Joueurs</h2>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {finishedCount} / {totalPlayers || '?'} terminé{finishedCount > 1 ? 's' : ''}
                        </span>
                    </div>

                    <div className="mb-5 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                        <div
                            className="h-2 rounded-full bg-green-500 transition-all duration-700"
                            style={{ width: `${finishedPct}%` }}
                        />
                    </div>

                    <div className="space-y-3">
                        {leaderboard.map((entry) => (
                            <div key={entry.userId} className="flex items-center gap-3">
                                <span className="w-6 shrink-0 text-center text-lg text-green-500 dark:text-green-400">✓</span>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    {entry.username}
                                    {entry.userId === currentUserId && <MeTag />}
                                </span>
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
                                        <div className="mb-1 flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                {player.username}
                                            </span>
                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                {player.currentQuestion}/{player.totalQuestions}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                                            <div
                                                className="h-1.5 rounded-full bg-blue-400 transition-all duration-500 dark:bg-blue-500"
                                                style={{ width: `${pct}%` }}
                                            />
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
