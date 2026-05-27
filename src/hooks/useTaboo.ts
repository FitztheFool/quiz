// src/hooks/useTaboo.ts
'use client';

import { useEffect, useRef, useState } from 'react';
import { getTabooSocket } from '@/lib/socket';
import type { TrapSlotData } from '@/components/TrapPhase';
import type { GameLogEntry } from '@/components/GameLog';

// ── Types ─────────────────────────────────────────────────────────────────────

type Attempt = { word: string; userId: string; username: string };

export type TabooState = {
    phase: 'trap' | 'playing' | 'between_turns' | 'finished' | 'recap';
    currentTeam: 0 | 1 | null;
    currentWord: string | null;
    currentTraps: string[];
    attempts: Attempt[];
    turnTimeLeft: number;
    turnDuration: number;
    paused: boolean;
    scores: Record<string, number>;
    round: number;
    totalRounds: number;
    maxAttempts: number;
    trapWordCount: number;
    players: { userId: string; username: string; team: 0 | 1 | null }[];
    teams: Record<string, 0 | 1> | null;
    hostId: string;
    trapTimeLeft: number | null;
    trapDeadline: number | null;
    turnDeadline: number | null;
    trapStarted: boolean;
    team0Traps: string[];
    team1Traps: string[];
    team0Slots?: TrapSlotData[];
    team1Slots?: TrapSlotData[];
    team0Word: string | null;
    team1Word: string | null;
    firstTeam: 0 | 1 | null;
    gameStarted: boolean;
    trapsByPlayer: Record<string, string[]>;
    orators?: { '0': string | null; '1': string | null };
    lastTurnResult: 'validated' | 'fail' | 'timeout' | 'max_attempts' | null;
    trapDuration: number;
    log?: GameLogEntry[];
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTaboo({
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
    const socketRef = useRef<ReturnType<typeof getTabooSocket>>(null);
    const joinedRef = useRef(false);
    const startGameSentRef = useRef(false);

    const [game, setGame] = useState<TabooState | null>(null);
    const [kickedPlayers, setKickedPlayers] = useState<{ userId: string; username: string; team: 0 | 1 | null }[]>([]);

    // Host auto-start: start trap once both words are set
    useEffect(() => {
        if (!socketRef.current || !game) return;
        const isHost = game.hostId === userId;
        if (game.phase === 'trap' && !game.trapStarted && game.team0Word && game.team1Word && isHost) {
            socketRef.current.emit('taboo:startTrap', { lobbyId });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game?.phase, game?.trapStarted, game?.team0Word, game?.team1Word, game?.hostId, userId]);

    // Reset startGameSent on new round
    useEffect(() => {
        if (game?.phase === 'trap') startGameSentRef.current = false;
    }, [game?.round, game?.phase]);

    // Host auto-start: start round once trap timer ends
    useEffect(() => {
        if (!socketRef.current || !game) return;
        const isHost = game.hostId === userId;
        if (
            game.phase === 'trap' &&
            game.trapStarted &&
            game.team0Word &&
            game.team1Word &&
            game.trapTimeLeft !== null &&
            game.trapTimeLeft <= 0 &&
            isHost &&
            !startGameSentRef.current
        ) {
            startGameSentRef.current = true;
            const event = game.gameStarted ? 'taboo:startRound' : 'taboo:startGame';
            socketRef.current.emit(event, { lobbyId });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game?.trapTimeLeft]);

    useEffect(() => {
        if (!lobbyId || !userId) return;

        const socket = getTabooSocket();
        if (!socket) return;
        socketRef.current = socket;

        const join = () => {
            if (joinedRef.current) return;
            joinedRef.current = true;
            socket.emit('taboo:join', { lobbyId, userId, username });
        };

        socket.on('notFound', onNotFound);
        socket.on('taboo:state', (state: TabooState) => setGame(state));
        socket.on('taboo:playerKicked', ({ userId: uid }: { userId: string }) => {
            setGame(current => {
                if (current) {
                    const p = current.players.find(pl => pl.userId === uid);
                    if (p) setKickedPlayers(prev => prev.some(k => k.userId === uid) ? prev : [...prev, { userId: uid, username: p.username, team: p.team }]);
                }
                return current;
            });
        });

        socket.on('taboo:requestWords', async ({ count }: { count: number }) => {
            const res = await fetch(`/api/taboo/word?count=${count}`);
            if (!res.ok) return;
            const words: string[] = await res.json();
            socket.emit('taboo:setWords', { lobbyId, team0Word: words[0], team1Word: words[1] });
        });

        socket.on('taboo:needWords', () => {
            setGame(currentGame => {
                if (currentGame?.hostId !== userId) return currentGame;
                fetch(`/api/taboo/word?count=2`)
                    .then(r => r.json())
                    .then((words: string[]) => {
                        socket.emit('taboo:setWordsForRound', { lobbyId, team0Word: words[0], team1Word: words[1] });
                    });
                return currentGame;
            });
        });

        socket.on('connect', join);
        if (!socket.connected) socket.connect();
        else join();

        return () => {
            socket.off('notFound', onNotFound);
            socket.off('connect', join);
            socket.off('taboo:state');
            socket.off('taboo:playerKicked');
            socket.off('taboo:requestWords');
            socket.off('taboo:needWords');
            joinedRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lobbyId, userId]);

    return { socketRef, game, kickedPlayers };
}
