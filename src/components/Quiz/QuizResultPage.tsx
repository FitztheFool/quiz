'use client';
import LoadingSpinner from '@/components/LoadingSpinner';

import Link from 'next/link';
import { notFound as nextNotFound } from 'next/navigation';
import { useMemo } from 'react';
import QuizResults from '@/components/Quiz/QuizResults';
import { useRouter } from 'next/navigation';
import { useQuizResult, LeaderboardEntry, PlayerProgress } from '@/hooks/useQuizResult';
import { getQuizSocket } from '@/lib/socket';
import { TrophyIcon, CheckIcon } from '@heroicons/react/24/outline';

function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) return <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-300 text-amber-900 text-lg font-black shadow-md">1</span>;
    if (rank === 2) return <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-300 text-slate-800 text-lg font-black shadow-md">2</span>;
    return <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-400 text-orange-950 text-lg font-black shadow-md">3</span>;
}

// Consistent medal palette (gold / silver / bronze) — independent of light/dark mode
// so the row keeps the same color whether the row belongs to "me" or not.
const rankStyle = (i: number) => ({
    border:
        i === 0
            ? 'border-amber-400'
            : i === 1
                ? 'border-slate-400'
                : 'border-orange-400',
    bg:
        i === 0
            ? 'bg-amber-200/40'
            : i === 1
                ? 'bg-slate-200/40'
                : 'bg-orange-200/40',
    text:
        i === 0
            ? 'text-amber-950'
            : i === 1
                ? 'text-slate-900'
                : 'text-orange-950',
    score:
        i === 0
            ? 'text-amber-900'
            : i === 1
                ? 'text-slate-800'
                : 'text-orange-900',
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
    const displayLeaderboard: LeaderboardEntry[] = isSolo
        ? [{
            userId: session?.user?.id ?? 'me',
            username: session?.user?.username ?? session?.user?.email ?? 'Vous',
            totalScore: payload.score,
            questionResults: payload.questionResults,
        }]
        : leaderboard;

    return (
        <div className="min-h-screen wood-table">
            <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="mb-8 rounded-xl wood-tile p-8 shadow-2xl">
                    <div className="mb-6 text-center">
                        <div className="mb-3 flex justify-center"><TrophyIcon className="w-16 h-16 text-amber-500" /></div>
                        <h1 className="mb-1 text-3xl font-bold text-gray-800 dark:text-gray-100">
                            Classement final
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

                    {displayLeaderboard.length > 0 && (
                        <>
                            <div className="mb-4 space-y-3">
                                {displayLeaderboard.slice(0, 3).map((entry, i) => {
                                    const s = rankStyle(i);
                                    return (
                                        <div
                                            key={entry.userId}
                                            className={`flex items-center gap-4 rounded-xl border-2 p-4 ${s.border} ${s.bg}`}
                                        >
                                            <RankBadge rank={i + 1} />
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

                            {displayLeaderboard.length > 3 && (
                                <div className="space-y-2">
                                    {displayLeaderboard.slice(3).map((entry, i) => (
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
        <div className="flex min-h-screen items-center justify-center wood-table p-4">
            <div className="w-full max-w-lg">
                <div className="mb-4 flex items-center justify-between rounded-xl wood-tile p-6 shadow-lg">
                    <div>
                        <p className="font-bold text-gray-800 dark:text-gray-100">Quiz terminé !</p>
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

                <div className="rounded-xl wood-tile p-6 shadow-lg">
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
                                <CheckIcon className="w-5 h-5 shrink-0 text-green-500 dark:text-green-400" />
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
                                    <LoadingSpinner fullScreen={false} message="En cours..." />
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
