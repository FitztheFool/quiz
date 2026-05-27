'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getLudoSocket } from '@/lib/socket';
import type { GameLogEntry } from '@/components/GameLog';

export interface LudoPawn { progress: number; }

export interface LudoPlayer {
    userId: string;
    username: string;
    colorIndex: number;
    team: 0 | 1 | null;
    pawns: LudoPawn[];
    connected: boolean;
}

export interface LudoOptions {
    pawnExit: '6' | '6_or_1' | 'any';
    bonusOn6: 'unlimited' | 'triple_lose' | 'none';
    winMode: 'first_done' | 'full_ranking';
    teamMode: 'none' | '2v2';
}

export interface LudoState {
    phase: 'waiting' | 'rolling' | 'moving' | 'finished';
    currentTurn: number;
    dice: number | null;
    consecutiveSixes: number;
    movablePawns: number[];
    lastMove: { playerIdx: number; pawnIdx: number; captured: { playerIdx: number; pawnIdx: number }[] } | null;
    ranking: number[];
    surrenderedIdxs: number[];
    afkIdxs: number[];
    winner: number | 'team0' | 'team1' | null;
    turnStartedAt: number | null;
    turnDuration: number;
    options: LudoOptions;
    players: LudoPlayer[];
    log?: GameLogEntry[];
}

export function isBot(p: { userId: string } | null | undefined): boolean {
    return !!p?.userId?.startsWith('bot-');
}

export function useLudo({
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
    const socket = useMemo(() => getLudoSocket(), []);
    const joinedRef = useRef(false);
    const [state, setState] = useState<LudoState | null>(null);
    const [inactivityUserId, setInactivityUserId] = useState<string | null>(null);
    const [inactivityEndsAt, setInactivityEndsAt] = useState<number | null>(null);
    const [lastDiceFlash, setLastDiceFlash] = useState<number>(0);

    useEffect(() => {
        if (!socket || !lobbyId || !userId) return;

        const onState = (s: LudoState) => {
            setState(s);
            if (s.phase !== 'finished') onModalReset();
        };
        const onDice = () => { setLastDiceFlash(Date.now()); };

        socket.on('notFound', onNotFound);
        socket.on('ludo:state', onState);
        socket.on('ludo:diceRolled', onDice);
        socket.on('ludo:inactivityWarning', ({ userId: uid, secondsLeft }: { userId: string; secondsLeft: number }) => {
            setInactivityUserId(uid);
            setInactivityEndsAt(Date.now() + secondsLeft * 1000);
        });
        socket.on('ludo:playerKicked', ({ userId: uid }: { userId: string }) => {
            setInactivityUserId(prev => prev === uid ? null : prev);
            setInactivityEndsAt(null);
        });
        socket.on('ludo:playerReconnected', ({ userId: uid }: { userId: string }) => {
            setInactivityUserId(prev => prev === uid ? null : prev);
            setInactivityEndsAt(null);
        });

        if (!joinedRef.current) {
            joinedRef.current = true;
            socket.emit('ludo:join', { lobbyId, userId, username });
        }

        return () => {
            socket.off('notFound', onNotFound);
            socket.off('ludo:state', onState);
            socket.off('ludo:diceRolled', onDice);
            socket.off('ludo:inactivityWarning');
            socket.off('ludo:playerKicked');
            socket.off('ludo:playerReconnected');
        };
    }, [socket, lobbyId, userId, username, onNotFound, onModalReset]);

    const roll = useCallback(() => socket?.emit('ludo:roll'), [socket]);
    const move = useCallback((pawnIdx: number) => socket?.emit('ludo:move', { pawnIdx }), [socket]);
    const surrender = useCallback(() => socket?.emit('ludo:surrender'), [socket]);
    const rematch = useCallback(() => socket?.emit('ludo:rematch'), [socket]);

    const me = state?.players.find(p => p.userId === userId) ?? null;
    const myColorIndex = me?.colorIndex ?? null;
    const currentPlayer = state?.players[state.currentTurn ?? 0] ?? null;
    const isMyTurn = !!state && state.phase !== 'finished' && state.phase !== 'waiting' && currentPlayer?.userId === userId;
    const canRoll = isMyTurn && state?.phase === 'rolling';
    const canMove = isMyTurn && state?.phase === 'moving';

    return {
        state,
        me,
        myColorIndex,
        currentPlayer,
        isMyTurn,
        canRoll,
        canMove,
        inactivityUserId,
        inactivityEndsAt,
        lastDiceFlash,
        roll,
        move,
        surrender,
        rematch,
    };
}
