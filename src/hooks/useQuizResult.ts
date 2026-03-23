// src/hooks/useQuizResult.ts
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getQuizSocket } from '@/lib/socket';
import { QuestionResult } from '@/components/Quiz/QuizResults';

export interface ResultPayload {
    score: number;
    totalPoints: number;
    quizTitle: string;
    isOwnQuiz: boolean;
    questionResults: QuestionResult[];
    lobbyCode: string | null;
}

export interface LeaderboardEntry {
    userId: string;
    username: string;
    totalScore: number;
    questionResults: QuestionResult[];
}

export interface PlayerProgress {
    userId: string;
    username: string;
    currentQuestion: number;
    totalQuestions: number;
    finished: boolean;
}

export function useQuizResult() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { data: session, status } = useSession();
    const quizId = params?.id as string;
    const [isHost, setIsHost] = useState(false);
    const lobbyCodeFromUrl = searchParams.get('lobby');

    const [payload, setPayload] = useState<ResultPayload | null>(() => {
        if (typeof window === 'undefined') return null;
        try {
            const raw = sessionStorage.getItem(`quiz_result_${quizId}`);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    });

    // Ajouter ce useEffect (indépendant du lobbyCode)
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.quizId !== quizId) return;
            try {
                const raw = sessionStorage.getItem(`quiz_result_${quizId}`);
                if (raw) setPayload(JSON.parse(raw));
            } catch { }
        };
        window.addEventListener('quiz:result:ready', handler);
        return () => window.removeEventListener('quiz:result:ready', handler);
    }, [quizId]);

    const [timeMode] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        const code = new URLSearchParams(window.location.search).get('lobby');
        return sessionStorage.getItem(`lobby_timeMode_${code}`) ?? null;
    });

    const [timePerQuestion] = useState<number>(() => {
        if (typeof window === 'undefined') return 0;
        const code = new URLSearchParams(window.location.search).get('lobby');
        return parseInt(sessionStorage.getItem(`lobby_timePerQuestion_${code}`) ?? '0', 10);
    });

    useEffect(() => {
        return () => { sessionStorage.removeItem(`quiz_result_${quizId}`); };
    }, [quizId]);

    const lobbyCode = lobbyCodeFromUrl ?? payload?.lobbyCode ?? null;

    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [playerProgress, setPlayerProgress] = useState<PlayerProgress[]>([]);
    const [totalPlayers, setTotalPlayers] = useState(0);
    const [allFinished, setAllFinished] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timeModeRef = useRef(timeMode);
    const timePerQuestionRef = useRef(timePerQuestion);
    timeModeRef.current = timeMode;
    timePerQuestionRef.current = timePerQuestion;

    const socket = useMemo(() => getQuizSocket(), []);

    const startCountdown = (initialSeconds: number) => {
        if (countdownRef.current) clearInterval(countdownRef.current);
        setTimeLeft(initialSeconds);
        countdownRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === null || prev <= 1) {
                    if (countdownRef.current) clearInterval(countdownRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        if (!lobbyCode || !session?.user?.id) return;

        const onLeaderboard = ({ leaderboard: lb, totalPlayers: total, allFinished: done }: {
            leaderboard: LeaderboardEntry[];
            totalPlayers: number;
            allFinished: boolean;
        }) => {
            setTotalPlayers(total);
            setLeaderboard(lb);
            if (done) {
                setAllFinished(true);
                setTimeLeft(null);
                if (countdownRef.current) clearInterval(countdownRef.current);
            }
        };

        const onProgress = (progress: PlayerProgress[]) => {
            setPlayerProgress(progress);
        };

        const onTimeLeft = ({ timeLeft: t }: { timeLeft: number }) => {
            if (timeModeRef.current === 'total') setTimeLeft(t);
        };

        const onServerTimeLeft = ({ timeLeft: t }: { timeLeft: number }) => {
            if (timeModeRef.current === 'quiz:per_question') {
                setTimeLeft(prev => {
                    if (prev === null || Math.abs(t - prev) > 5) {
                        startCountdown(t);
                        return t;
                    }
                    return prev;
                });
            }
        };

        const onLobbyState = ({ hostId }: { hostId: string }) => {
            setIsHost(hostId === session?.user?.id);
        };

        if (!socket) return;

        socket.on('game:leaderboard', onLeaderboard);
        socket.on('game:progress', onProgress);
        socket.on('game:timeLeft', onTimeLeft);
        socket.on('game:perQuestionTimeLeft', onServerTimeLeft);
        socket.on('lobby:state', onLobbyState);

        socket.on('lobby:redirectTo', ({ newLobbyId }) => {
            router.push(`/lobby/create/${newLobbyId}`);
        });

        // ✅ quiz:rejoin (était lobby:rejoin)
        socket.emit('quiz:rejoin', {
            lobbyId: lobbyCode,
            userId: session.user.id,
            username: session.user.username ?? session.user.email ?? 'User',
        });

        return () => {
            socket.off('game:leaderboard', onLeaderboard);
            socket.off('game:progress', onProgress);
            socket.off('game:timeLeft', onTimeLeft);
            socket.off('game:perQuestionTimeLeft', onServerTimeLeft);
            socket.off('lobby:state', onLobbyState);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [lobbyCode, socket, session?.user?.id, session?.user?.username, session?.user?.email]);

    const handleRestart = () => {
        router.push(`/quiz/${quizId}${lobbyCode ? `?lobby=${lobbyCode}` : ''}`);
    };

    return {
        quizId,
        lobbyCode,
        session,
        authStatus: status,
        payload,
        notFound: payload === null,
        leaderboard,
        playerProgress,
        totalPlayers,
        allFinished,
        timeLeft,
        isHost,
        handleRestart,
    };
}
