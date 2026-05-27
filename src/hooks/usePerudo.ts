'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPerudoSocket } from '@/lib/socket';
import type { GameLogEntry } from '@/components/GameLog';

export type Phase = 'rolling' | 'bidding' | 'reveal' | 'ended';

export interface Bid {
    userId: string;
    count: number;
    face: number;
}

export interface PerudoPlayerView {
    userId: string;
    username: string;
    diceCount: number;
    alive: boolean;
    dice?: number[];
}

export interface RevealResult {
    bid: Bid;
    actualCount: number;
    loserUserId: string;
    challengerUserId: string;
    revealedDice: { userId: string; username: string; dice: number[] }[];
    pacosWild: boolean;
}

export interface EliminatedEntry {
    userId: string;
    username: string;
    placement: number;
    afk?: boolean;
    abandon?: boolean;
}

export interface PerudoState {
    code: string;
    round: number;
    phase: Phase;
    currentPlayerIndex: number;
    currentUserId: string | null;
    initialDice: number;
    lastBid: Bid | null;
    pacosWild: boolean;
    totalDice: number;
    aliveCount: number;
    lastReveal: RevealResult | null;
    turnStartedAt: number | null;
    turnDuration: number;
    players: PerudoPlayerView[];
    spectator: boolean;
    log?: GameLogEntry[];
}

export interface PerudoFinished {
    winner: { userId: string; username: string } | null;
    eliminated: EliminatedEntry[];
    gameId: string;
}

export function isBot(player: { userId?: string } | null | undefined): boolean {
    return !!player?.userId?.startsWith('bot-');
}

export function usePerudo({
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
    onModalReset?: () => void;
}) {
    void username;
    const socket = useMemo(() => getPerudoSocket(), []);
    const joinedRef = useRef(false);
    const onNotFoundRef = useRef(onNotFound);
    const onModalResetRef = useRef(onModalReset);
    useEffect(() => { onNotFoundRef.current = onNotFound; }, [onNotFound]);
    useEffect(() => { onModalResetRef.current = onModalReset; }, [onModalReset]);

    const [state, setState] = useState<PerudoState | null>(null);
    const [finished, setFinished] = useState<PerudoFinished | null>(null);
    const [inactivityUserId, setInactivityUserId] = useState<string | null>(null);
    const [inactivityEndsAt, setInactivityEndsAt] = useState<number | null>(null);

    useEffect(() => {
        if (!socket || !lobbyId || !userId) return;

        const onState = (s: PerudoState) => {
            if (!('players' in s) || !Array.isArray((s as PerudoState).players)) return;
            setState(s);
            setInactivityUserId(null);
            setInactivityEndsAt(null);
            if (s.phase !== 'ended') {
                setFinished(prev => prev ? null : prev);
                onModalResetRef.current?.();
            }
        };
        const onFinished = (f: PerudoFinished) => setFinished(f);
        const onNotFoundEvt = () => onNotFoundRef.current?.();
        const onAfkWarning = ({ userId: uid, secondsLeft }: { userId: string; secondsLeft: number | null }) => {
            setInactivityUserId(uid);
            setInactivityEndsAt(secondsLeft != null ? Date.now() + secondsLeft * 1000 : null);
        };
        const onPlayerKicked = () => { setInactivityUserId(null); setInactivityEndsAt(null); };

        socket.on('perudo:state', onState);
        socket.on('perudo:finished', onFinished);
        socket.on('perudo:afkWarning', onAfkWarning);
        socket.on('perudo:playerKicked', onPlayerKicked);
        socket.on('perudo:playerSurrendered', onPlayerKicked);
        socket.on('perudo:playerEliminated', onPlayerKicked);
        socket.on('notFound', onNotFoundEvt);
        socket.on('perudo:accessDenied', onNotFoundEvt);

        const join = () => {
            if (joinedRef.current) return;
            joinedRef.current = true;
            socket.emit('perudo:join', { lobbyId });
        };
        socket.on('connect', join);
        if (socket.connected) join();

        return () => {
            socket.off('perudo:state', onState);
            socket.off('perudo:finished', onFinished);
            socket.off('perudo:afkWarning', onAfkWarning);
            socket.off('perudo:playerKicked', onPlayerKicked);
            socket.off('perudo:playerSurrendered', onPlayerKicked);
            socket.off('perudo:playerEliminated', onPlayerKicked);
            socket.off('notFound', onNotFoundEvt);
            socket.off('perudo:accessDenied', onNotFoundEvt);
            socket.off('connect', join);
        };
    }, [socket, lobbyId, userId]);

    const bid = useCallback((count: number, face: number) => {
        socket?.emit('perudo:bid', { lobbyId, count, face });
    }, [socket, lobbyId]);

    const dudo = useCallback(() => {
        socket?.emit('perudo:dudo', { lobbyId });
    }, [socket, lobbyId]);

    const surrender = useCallback(() => {
        socket?.emit('perudo:surrender', { lobbyId });
    }, [socket, lobbyId]);

    const me = state?.players.find(p => p.userId === userId) ?? null;
    const isMyTurn = state?.currentUserId === userId && state.phase === 'bidding' && me?.alive === true;
    const vsBot = (state?.players ?? []).some(p => isBot(p) && p.userId !== userId);

    return {
        state,
        finished,
        me,
        isMyTurn,
        vsBot,
        inactivityUserId,
        inactivityEndsAt,
        bid,
        dudo,
        surrender,
    };
}
