// src/hooks/useSpyfall.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSpyfallSocket } from '@/lib/socket';
import type { GameLogEntry } from '@/components/GameLog';

// ── Types ─────────────────────────────────────────────────────────────────────

export type RoundState = 'WAITING' | 'ASKING' | 'VOTING' | 'SPY_GUESS' | 'END';
export type Role = 'civilian' | 'spy';
export type Player = { id: string; name: string };

export type GameEndPayload = {
    winner: 'civilians' | 'spy';
    spyId: string;
    spyName: string | null;
    location: string | null;
    scores: Record<string, number>;
    votes?: Record<string, string>;
    spyCaught?: boolean;
    spyGuess?: string | null;
    spyGuessCorrect?: boolean;
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSpyfall({
    lobbyId,
    userId,
    playerName,
    onNotFound,
}: {
    lobbyId: string;
    userId: string;
    playerName: string;
    onNotFound: () => void;
}) {
    const socket = getSpyfallSocket();
    const joinedRef = useRef(false);
    const pendingVoteRef = useRef<string | null>(null);
    const votedForRef = useRef<string | null>(null);

    const [players, setPlayers] = useState<Player[]>([]);
    const [role, setRole] = useState<Role | null>(null);
    const [location, setLocation] = useState<string | null>(null);
    const [yourRole, setYourRole] = useState<string | null>(null);
    const [board, setBoard] = useState<string[]>([]);
    const [roundState, setRoundState] = useState<RoundState>('WAITING');

    const [askerId, setAskerId] = useState<string>('');
    const [askerName, setAskerName] = useState<string>('');
    const [exchangeCount, setExchangeCount] = useState(0);
    const [totalExchanges, setTotalExchanges] = useState(0);

    const [voteRequestCount, setVoteRequestCount] = useState(0);
    const [voteRequestThreshold, setVoteRequestThreshold] = useState(0);
    const [hasRequestedVote, setHasRequestedVote] = useState(false);

    const [votedFor, setVotedFor] = useState<string | null>(null);
    const [pendingVoteFor, setPendingVoteFor] = useState<string | null>(null);
    const [votedCount, setVotedCount] = useState(0);

    const [spyName, setSpyName] = useState<string>('');
    const [guessResult, setGuessResult] = useState<{ guess: string; correct: boolean; location: string } | null>(null);

    const [gameEnd, setGameEnd] = useState<GameEndPayload | null>(null);
    const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
    const [timerDuration, setTimerDuration] = useState(60);
    const [inactivityUserId, setInactivityUserId] = useState<string | null>(null);
    const [inactivityEndsAt, setInactivityEndsAt] = useState<number | null>(null);
    const [kickedPlayerIds, setKickedPlayerIds] = useState<string[]>([]);
    const [log, setLog] = useState<GameLogEntry[]>([]);

    function startTimer(seconds: number) {
        setTimerDuration(seconds);
        setTimerEndsAt(Date.now() + seconds * 1000);
    }

    useEffect(() => {
        if (!socket || !userId || !lobbyId) return;
        if (joinedRef.current) return;
        joinedRef.current = true;

        socket.emit('spyfall:join', { lobbyId, userId, playerName });

        socket.on('notFound', onNotFound);
        socket.on('spyfall:players', ({ players }: { players: Player[] }) => setPlayers(players));
        socket.on('spyfall:log', ({ log: l }: { log: GameLogEntry[] }) => setLog(l ?? []));

        socket.on('spyfall:gameStart', ({ role, location, yourRole, board, players, totalExchanges, turnTime }: {
            role: Role; location: string | null; yourRole: string | null; board: string[];
            players: Player[]; totalExchanges: number; turnTime: number;
        }) => {
            setRole(role);
            setLocation(location);
            setYourRole(yourRole);
            setBoard(board);
            setPlayers(players);
            setTotalExchanges(totalExchanges);
            setTimerDuration(turnTime ?? 60);
        });

        socket.on('spyfall:turn', ({ askerId, askerName, exchangeCount, totalExchanges, turnTime }: {
            askerId: string; askerName: string; exchangeCount: number; totalExchanges: number; turnTime: number;
        }) => {
            setAskerId(askerId);
            setAskerName(askerName ?? '');
            setExchangeCount(exchangeCount);
            setTotalExchanges(totalExchanges);
            setRoundState('ASKING');
            startTimer(turnTime ?? 60);
        });

        socket.on('spyfall:voteRequestUpdate', ({ count, threshold }: { count: number; threshold: number; requesters: string[] }) => {
            setVoteRequestCount(count);
            setVoteRequestThreshold(threshold);
        });

        socket.on('spyfall:votingPhase', ({ players: ps, turnTime }: { players: Player[]; turnTime: number }) => {
            setPlayers(ps);
            setVotedFor(null); votedForRef.current = null;
            setPendingVoteFor(null); pendingVoteRef.current = null;
            setVotedCount(0);
            setRoundState('VOTING');
            startTimer(turnTime ?? 45);
        });

        socket.on('spyfall:voteUpdate', ({ votedCount: vc }: { votedCount: number }) => setVotedCount(vc));

        socket.on('spyfall:eliminated', () => {
            // Resolution detail is shown via the log + the next phase / finished payload.
            setTimerEndsAt(null);
        });

        socket.on('spyfall:guessPhase', ({ spyName, board }: { spyId: string; spyName: string | null; board: string[] }) => {
            setSpyName(spyName ?? '');
            if (Array.isArray(board) && board.length) setBoard(board);
            setRoundState('SPY_GUESS');
            startTimer(30);
        });

        socket.on('spyfall:locationGuessResult', (payload: { guess: string; correct: boolean; location: string }) => {
            setGuessResult(payload);
        });

        socket.on('spyfall:finished', (payload: GameEndPayload) => {
            setTimerEndsAt(null);
            setGameEnd(payload);
            setRoundState('END');
        });

        socket.on('spyfall:inactivityWarning', ({ userId: uid, secondsLeft }: { userId: string; username: string; secondsLeft: number }) => {
            setInactivityUserId(uid);
            setInactivityEndsAt(Date.now() + secondsLeft * 1000);
        });

        socket.on('spyfall:playerKicked', ({ userId: uid }: { userId: string }) => {
            setKickedPlayerIds(prev => prev.includes(uid) ? prev : [...prev, uid]);
            setInactivityUserId(prev => prev === uid ? null : prev);
            setInactivityEndsAt(null);
        });

        socket.on('spyfall:playerReconnected', ({ userId: uid }: { userId: string }) => {
            setInactivityUserId(prev => prev === uid ? null : prev);
            setInactivityEndsAt(null);
        });

        return () => {
            socket.off('notFound', onNotFound);
            socket.off('spyfall:players');
            socket.off('spyfall:log');
            socket.off('spyfall:gameStart');
            socket.off('spyfall:turn');
            socket.off('spyfall:voteRequestUpdate');
            socket.off('spyfall:votingPhase');
            socket.off('spyfall:voteUpdate');
            socket.off('spyfall:eliminated');
            socket.off('spyfall:guessPhase');
            socket.off('spyfall:locationGuessResult');
            socket.off('spyfall:finished');
            socket.off('spyfall:inactivityWarning');
            socket.off('spyfall:playerKicked');
            socket.off('spyfall:playerReconnected');
            joinedRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, userId, lobbyId]);

    // ── Actions ───────────────────────────────────────────────────────────────

    const ask = useCallback((targetId: string) => {
        if (askerId !== userId) return;
        socket?.emit('spyfall:ask', { lobbyId, targetId });
    }, [socket, lobbyId, askerId, userId]);

    const requestVote = useCallback(() => {
        if (hasRequestedVote) return;
        setHasRequestedVote(true);
        socket?.emit('spyfall:requestVote', { lobbyId });
    }, [socket, lobbyId, hasRequestedVote]);

    const declareSpy = useCallback(() => {
        socket?.emit('spyfall:declareSpy', { lobbyId });
    }, [socket, lobbyId]);

    const vote = useCallback((targetId: string) => {
        if (votedForRef.current) return;
        pendingVoteRef.current = targetId;
        setPendingVoteFor(targetId);
    }, []);

    const confirmVote = useCallback(() => {
        if (!pendingVoteRef.current || votedForRef.current) return;
        const target = pendingVoteRef.current;
        votedForRef.current = target;
        setVotedFor(target);
        socket?.emit('spyfall:vote', { lobbyId, targetId: target });
    }, [socket, lobbyId]);

    const guessLocation = useCallback((loc: string) => {
        socket?.emit('spyfall:guessLocation', { lobbyId, location: loc });
    }, [socket, lobbyId]);

    const surrender = useCallback(() => {
        socket?.emit('spyfall:surrender');
    }, [socket]);

    // Auto-submit a pending vote ~500ms before the server timer fires.
    useEffect(() => {
        if (roundState !== 'VOTING' || !timerEndsAt) return;
        const remaining = timerEndsAt - Date.now() - 500;
        if (remaining <= 0) return;
        const id = setTimeout(() => {
            if (pendingVoteRef.current && !votedForRef.current) {
                const target = pendingVoteRef.current;
                votedForRef.current = target;
                setVotedFor(target);
                socket?.emit('spyfall:vote', { lobbyId, targetId: target });
            }
        }, remaining);
        return () => clearTimeout(id);
    }, [timerEndsAt, roundState, socket, lobbyId]);

    return {
        players,
        role,
        location,
        yourRole,
        board,
        roundState,
        askerId,
        askerName,
        exchangeCount,
        totalExchanges,
        voteRequestCount,
        voteRequestThreshold,
        hasRequestedVote,
        votedFor,
        pendingVoteFor,
        votedCount,
        spyName,
        guessResult,
        gameEnd,
        timerEndsAt,
        timerDuration,
        inactivityUserId,
        inactivityEndsAt,
        kickedPlayerIds,
        log,
        ask,
        requestVote,
        declareSpy,
        vote,
        confirmVote,
        guessLocation,
        surrender,
    };
}
