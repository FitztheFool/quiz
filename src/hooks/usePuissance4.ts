'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPuissance4Socket } from '@/lib/socket';
import type { GameLogEntry } from '@/components/GameLog';

export type Cell = 0 | 1 | null;
export type Grid = Cell[][];

export interface PlayerInfo {
    userId: string;
    username: string;
    colorIndex: 0 | 1;
}

export interface GameState {
    grid: Grid;
    currentTurn: 0 | 1;
    status: 'waiting' | 'playing' | 'finished';
    winner: 0 | 1 | 'draw' | null;
    winCells: [number, number][] | null;
    scores: [number, number];
    turnStartedAt: number | null;
    turnDuration: number;
    reason?: 'surrender' | 'afk' | null;
    log?: GameLogEntry[];
}

export function isBot(player: Pick<PlayerInfo, 'userId'> | null | undefined): boolean {
    return !!player?.userId?.startsWith('bot-');
}

export function usePuissance4({
    lobbyId,
    userId,
    username,
    onNotFound,
    onModalReset,
}: {
    lobbyId: string;
    userId: string;
    username: string;
    onNotFound: () => void;
    onModalReset: () => void;
}) {
    const socket = useMemo(() => getPuissance4Socket(), []);
    const joinedRef = useRef(false);

    const [players, setPlayers] = useState<PlayerInfo[]>([]);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [dropping, setDropping] = useState(false);
    const [inactivityUserId, setInactivityUserId] = useState<string | null>(null);
    const [inactivityEndsAt, setInactivityEndsAt] = useState<number | null>(null);

    const myPlayer = players.find(p => p.userId === userId);
    const myColorIndex = myPlayer?.colorIndex ?? null;
    const isMyTurn = gameState?.status === 'playing' && gameState.currentTurn === myColorIndex;
    const vsBot = players.some(p => isBot(p) && p.userId !== userId);

    const winSet = useMemo(() => {
        if (!gameState?.winCells) return new Set<string>();
        return new Set(gameState.winCells.map(([r, c]) => `${r}-${c}`));
    }, [gameState?.winCells]);

    useEffect(() => {
        if (!socket || !lobbyId || !userId) return;

        const onPlayers = (data: PlayerInfo[]) => setPlayers(data);
        const onState = (state: GameState) => {
            setGameState(state);
            setDropping(false);
            if (state.status === 'playing') onModalReset();
        };

        const clearInactivity = () => { setInactivityUserId(null); setInactivityEndsAt(null); };

        socket.on('notFound', onNotFound);
        socket.on('p4:players', onPlayers);
        socket.on('p4:state', (state: GameState) => { onState(state); clearInactivity(); });
        socket.on('p4:inactivityWarning', ({ userId: uid, secondsLeft }: { userId: string; username: string; secondsLeft: number }) => {
            setInactivityUserId(uid);
            setInactivityEndsAt(Date.now() + secondsLeft * 1000);
        });
        socket.on('p4:playerKicked', ({ userId: uid }: { userId: string }) => {
            setInactivityUserId(prev => prev === uid ? null : prev);
            setInactivityEndsAt(null);
        });
        socket.on('p4:playerReconnected', ({ userId: uid }: { userId: string }) => {
            setInactivityUserId(prev => prev === uid ? null : prev);
            setInactivityEndsAt(null);
        });

        if (!joinedRef.current) {
            joinedRef.current = true;
            socket.emit('p4:join', { lobbyId, userId, username });
        }

        return () => {
            socket.off('notFound', onNotFound);
            socket.off('p4:players', onPlayers);
            socket.off('p4:state');
            socket.off('p4:inactivityWarning');
            socket.off('p4:playerKicked');
            socket.off('p4:playerReconnected');
            joinedRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, lobbyId, userId]);

    const drop = useCallback((col: number) => {
        if (!isMyTurn || dropping || !gameState) return;
        if (gameState.grid[0][col] !== null) return;
        setDropping(true);
        socket?.emit('p4:drop', { lobbyId, col });
    }, [isMyTurn, dropping, gameState, socket, lobbyId]);

    const surrender = useCallback(() => {
        socket?.emit('p4:surrender');
    }, [socket]);

    const rematch = useCallback(() => {
        socket?.emit('p4:rematch');
    }, [socket]);

    return {
        players,
        gameState,
        dropping,
        myColorIndex,
        isMyTurn,
        vsBot,
        winSet,
        inactivityUserId,
        inactivityEndsAt,
        drop,
        surrender,
        rematch,
    };
}
