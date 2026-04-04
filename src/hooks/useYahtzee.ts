'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getYahtzeeSocket } from '@/lib/socket';

export type ScoreCard = {
    ones: number | null; twos: number | null; threes: number | null;
    fours: number | null; fives: number | null; sixes: number | null;
    threeOfAKind: number | null; fourOfAKind: number | null;
    fullHouse: number | null; smallStraight: number | null;
    largeStraight: number | null; yahtzee: number | null; chance: number | null;
    yahtzeeBonus: number;
};

export type PlayerState = {
    userId: string; username: string;
    dice: number[]; held: boolean[]; rollsLeft: number;
    scoreCard: ScoreCard; upperBonus: number; total: number;
};

export type GameState = {
    players: PlayerState[];
    currentIndex: number; turn: number;
    phase: 'rolling' | 'scoring' | 'ended';
    currentUserId: string;
};

export type ResultEntry = {
    userId: string; username: string; total: number;
    afk?: boolean; abandon?: boolean; scoreCard?: ScoreCard;
};

export type EliminatedEntry = {
    userId: string; username: string; total: number;
    scoreCard: ScoreCard; abandon?: boolean; afk?: boolean;
};

export type Toast = { id: number; message: string; type: 'warning' | 'kick' };

export function isBot(player: Pick<PlayerState, 'userId'> | Pick<ResultEntry, 'userId'> | null | undefined): boolean {
    return !!player?.userId?.startsWith('bot-');
}

export function useYahtzee({
    lobbyId,
    userId,
    username,
    onNotFound,
}: {
    lobbyId: string;
    userId: string;
    username: string;
    onNotFound: () => void;
}) {
    const socket = useMemo(() => getYahtzeeSocket(), []);
    const joinedRef = useRef(false);
    const toastIdRef = useRef(0);

    const [game, setGame] = useState<GameState | null>(null);
    const [results, setResults] = useState<ResultEntry[] | null>(null);
    const [eliminatedPlayers, setEliminatedPlayers] = useState<EliminatedEntry[]>([]);
    const [rolling, setRolling] = useState(false);
    const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const vsBot = useMemo(
        () => (game?.players ?? []).some(p => isBot(p) && p.userId !== userId),
        [game?.players, userId],
    );

    useEffect(() => {
        if (!socket || !lobbyId || !userId) return;

        const doJoin = () => {
            if (joinedRef.current) return;
            joinedRef.current = true;
            socket.emit('yahtzee:join', { lobbyId, userId, username });
        };

        if (socket.connected) { doJoin(); } else { socket.once('connect', doJoin); }

        const addToast = (message: string, type: 'warning' | 'kick') => {
            const id = ++toastIdRef.current;
            setToasts(prev => [...prev, { id, message, type }]);
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
        };

        const onState = (state: GameState) => {
            setGame(state);
            setRolling(false);
            setTimerEndsAt(Date.now() + 120 * 1000);
        };
        const onResults = ({ results }: { results: ResultEntry[] }) => setResults(results);
        const onAfkWarning = ({ username: uname, secondsLeft }: { username: string; secondsLeft: number | null }) => {
            if (secondsLeft !== null) {
                addToast(`⏰ ${uname} va être exclu pour inactivité dans ${secondsLeft}s !`, 'warning');
            } else {
                addToast(`⚠️ ${uname} n'a pas joué — sera exclu au prochain timeout`, 'warning');
            }
        };
        const onSurrendered = ({ userId: uid, username: uname, scoreCard, total }: { userId: string; username: string; scoreCard: ScoreCard; total: number }) => {
            setEliminatedPlayers(prev => [...prev, { userId: uid, username: uname, total, scoreCard, abandon: true }]);
        };
        const onKicked = ({ userId: uid, username: uname, scoreCard, total }: { userId: string; username: string; scoreCard?: ScoreCard; total?: number }) => {
            if (uid && scoreCard) setEliminatedPlayers(prev => [...prev, { userId: uid, username: uname, total: total ?? 0, scoreCard, afk: true }]);
            addToast(`🚫 ${uname} a été exclu pour inactivité`, 'kick');
        };

        socket.on('notFound', onNotFound);
        socket.on('yahtzee:state', onState);
        socket.on('yahtzee:ended', onResults);
        socket.on('yahtzee:finished', onResults);
        socket.on('yahtzee:afkWarning', onAfkWarning);
        socket.on('yahtzee:playerSurrendered', onSurrendered);
        socket.on('yahtzee:playerKicked', onKicked);

        return () => {
            socket.off('notFound', onNotFound);
            socket.off('yahtzee:state', onState);
            socket.off('yahtzee:ended', onResults);
            socket.off('yahtzee:finished', onResults);
            socket.off('yahtzee:afkWarning', onAfkWarning);
            socket.off('yahtzee:playerSurrendered', onSurrendered);
            socket.off('yahtzee:playerKicked', onKicked);
            joinedRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, lobbyId, userId]);

    const roll = useCallback(() => {
        setRolling(true);
        socket?.emit('yahtzee:roll', { lobbyId, userId });
    }, [socket, lobbyId, userId]);

    const toggleHold = useCallback((index: number) => {
        socket?.emit('yahtzee:toggleHold', { lobbyId, userId, index });
    }, [socket, lobbyId, userId]);

    const scoreCategory = useCallback((category: string) => {
        socket?.emit('yahtzee:score', { lobbyId, userId, category });
    }, [socket, lobbyId, userId]);

    const forceScore = useCallback(() => {
        socket?.emit('yahtzee:forceScore', { lobbyId, userId });
    }, [socket, lobbyId, userId]);

    const surrender = useCallback(() => {
        socket?.emit('yahtzee:surrender', { lobbyId });
    }, [socket, lobbyId]);

    return {
        game, results, eliminatedPlayers,
        rolling, timerEndsAt, toasts,
        vsBot,
        roll, toggleHold, scoreCategory, forceScore, surrender,
    };
}
