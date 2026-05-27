'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCantStopSocket } from '@/lib/socket';
import type { GameLogEntry } from '@/components/GameLog';

export type Phase = 'rolling' | 'choosing' | 'busted' | 'ended';

export interface CantStopPlayerView {
    userId: string;
    username: string;
    claimed: number[];
    permanent: Record<number, number>;
    alive: boolean;
    abandon?: boolean;
    afk?: boolean;
}

export interface CantStopSplit {
    pairs: [[number, number], [number, number]];
    sums: [number, number];
    legal: boolean;
    partial?: boolean;
}

export interface CantStopState {
    code: string;
    phase: Phase;
    currentPlayerIndex: number;
    currentUserId: string | null;
    lockedColumns: number[];
    activeMarkers: Record<number, number>;
    dice: number[];
    splits: CantStopSplit[];
    options: { columnsToWin: number };
    winnerUserId: string | null;
    turnStartedAt: number | null;
    turnDuration: number;
    columnLengths: Record<number, number>;
    players: CantStopPlayerView[];
    spectator: boolean;
    log?: GameLogEntry[];
}

export function isBot(player: { userId?: string } | null | undefined): boolean {
    return !!player?.userId?.startsWith('bot-');
}

export function useCantStop({
    lobbyId,
    userId,
    onNotFound,
    onModalReset,
}: {
    lobbyId: string;
    userId: string;
    username: string;
    onNotFound: () => void;
    onModalReset?: () => void;
}) {
    const socket = useMemo(() => getCantStopSocket(), []);
    const [state, setState] = useState<CantStopState | null>(null);
    const [bustedFlash, setBustedFlash] = useState<{ userId: string; username: string } | null>(null);
    const joinedRef = useRef(false);
    const phaseRef = useRef<Phase | null>(null);
    const onNotFoundRef = useRef(onNotFound);
    const onModalResetRef = useRef(onModalReset);

    useEffect(() => {
        onNotFoundRef.current = onNotFound;
        onModalResetRef.current = onModalReset;
    }, [onNotFound, onModalReset]);

    useEffect(() => {
        if (!socket) return;
        if (joinedRef.current) return;
        joinedRef.current = true;

        const sendJoin = () => socket.emit('cant_stop:join', { lobbyId });
        socket.on('connect', sendJoin);
        if (socket.connected) sendJoin();

        const onState = (s: CantStopState) => {
            const previousPhase = phaseRef.current;
            phaseRef.current = s.phase;
            setState(s);
            if (s.phase === 'ended' && previousPhase !== 'ended') {
                onModalResetRef.current?.();
            }
        };
        const onNF = () => onNotFoundRef.current();
        const onBusted = (p: { userId: string; username: string }) => {
            setBustedFlash(p);
            setTimeout(() => setBustedFlash(null), 1500);
        };

        socket.on('cant_stop:state', onState);
        socket.on('notFound', onNF);
        socket.on('cant_stop:busted', onBusted);

        return () => {
            socket.off('connect', sendJoin);
            socket.off('cant_stop:state', onState);
            socket.off('notFound', onNF);
            socket.off('cant_stop:busted', onBusted);
            joinedRef.current = false;
            phaseRef.current = null;
        };
    }, [socket, lobbyId]);

    const pickSplit = useCallback((splitIndex: number) => {
        socket?.emit('cant_stop:pickSplit', { lobbyId, splitIndex });
    }, [socket, lobbyId]);

    const roll = useCallback(() => {
        socket?.emit('cant_stop:roll', { lobbyId });
    }, [socket, lobbyId]);

    const stop = useCallback(() => {
        socket?.emit('cant_stop:stop', { lobbyId });
    }, [socket, lobbyId]);

    const surrender = useCallback(() => {
        socket?.emit('cant_stop:surrender', { lobbyId });
    }, [socket, lobbyId]);

    const me = state?.players.find(p => p.userId === userId) ?? null;
    const isMyTurn = state?.currentUserId === userId;
    const vsBot = (state?.players ?? []).some(p => isBot(p) && p.userId !== userId);

    return {
        state, me, isMyTurn, vsBot,
        bustedFlash,
        pickSplit, roll, stop, surrender,
    };
}
