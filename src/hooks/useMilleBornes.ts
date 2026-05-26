'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMilleBornesSocket } from '@/lib/socket';

export type Phase = 'playing' | 'ended';
export type HazardType = 'stop' | 'speedLimit' | 'accident' | 'outOfGas' | 'flatTire';
export type RemedyType = 'go' | 'endLimit' | 'repairs' | 'gas' | 'spareTire';
export type SafetyType = 'rightOfWay' | 'drivingAce' | 'fuelTank' | 'punctureProof';
export type CardKind = 'distance' | 'hazard' | 'remedy' | 'safety';
export type BattleTop = null | 'go' | 'stop' | 'accident' | 'outOfGas' | 'flatTire' | 'repairs' | 'gas' | 'spareTire';

export interface MBCard {
    id: string;
    kind: CardKind;
    km?: number;
    hazard?: HazardType;
    remedy?: RemedyType;
    safety?: SafetyType;
}

export interface MBPlayerView {
    userId: string;
    username: string;
    distance: number;
    battleTop: BattleTop;
    speedLimited: boolean;
    safeties: SafetyType[];
    handCount: number;
    canRoll: boolean;
    alive: boolean;
    finished: boolean;
    exitReason?: 'abandon' | 'afk' | null;
    team: 0 | 1 | null;
    coupsFourres: number;
    hand?: MBCard[];
}

export interface CoupFourreWindow {
    userId: string;
    safety: SafetyType;
    hazard: HazardType;
    fromUserId: string;
    deadline: number;
}

export type LogTone = 'move' | 'attack' | 'defend' | 'safety' | 'coup' | 'system';

export interface MBLogEntry {
    id: number;
    tone: LogTone;
    text: string;
}

export interface MBState {
    code: string;
    phase: Phase;
    target: number;
    currentPlayerIndex: number;
    currentUserId: string | null;
    drawCount: number;
    lastDiscard: MBCard | null;
    coupFourre: CoupFourreWindow | null;
    turnStartedAt: number | null;
    turnDuration: number;
    teamMode: 'none' | '2v2';
    teamDistance: 'individual' | 'shared';
    winningTeam: 0 | 1 | null;
    log: MBLogEntry[];
    players: MBPlayerView[];
    spectator: boolean;
}

export interface MBScore {
    userId: string;
    username: string;
    team: 0 | 1 | null;
    distance: number;
    safetyPts: number;
    coupFourrePts: number;
    arrivalPts: number;
    total: number;
    abandon?: boolean;
    afk?: boolean;
}

export interface MBFinished {
    winnerUserId: string | null;
    winningTeam?: 0 | 1 | null;
    scores: MBScore[];
    gameId: string;
}

export function isBot(player: { userId?: string } | null | undefined): boolean {
    return !!player?.userId?.startsWith('bot-');
}

export function useMilleBornes({
    lobbyId,
    userId,
    onNotFound,
    onModalReset,
}: {
    lobbyId: string;
    userId: string;
    onNotFound: () => void;
    onModalReset?: () => void;
}) {
    const socket = useMemo(() => getMilleBornesSocket(), []);
    const joinedRef = useRef(false);
    const onNotFoundRef = useRef(onNotFound);
    const onModalResetRef = useRef(onModalReset);
    useEffect(() => { onNotFoundRef.current = onNotFound; }, [onNotFound]);
    useEffect(() => { onModalResetRef.current = onModalReset; }, [onModalReset]);

    const [state, setState] = useState<MBState | null>(null);
    const [finished, setFinished] = useState<MBFinished | null>(null);
    const [inactivityUserId, setInactivityUserId] = useState<string | null>(null);
    const [inactivityEndsAt, setInactivityEndsAt] = useState<number | null>(null);
    const [coupFlash, setCoupFlash] = useState<{ userId: string; hazard: HazardType } | null>(null);
    const coupFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!socket || !lobbyId || !userId) return;

        const onState = (s: MBState) => {
            if (!s || !Array.isArray(s.players)) return;
            setState(s);
            setInactivityUserId(null);
            setInactivityEndsAt(null);
            if (s.phase !== 'ended') {
                setFinished(prev => prev ? null : prev);
                onModalResetRef.current?.();
            }
        };
        const onFinished = (f: MBFinished) => setFinished(f);
        const onNotFoundEvt = () => onNotFoundRef.current?.();
        const onAfkWarning = ({ userId: uid, secondsLeft }: { userId: string; secondsLeft: number | null }) => {
            setInactivityUserId(uid);
            setInactivityEndsAt(secondsLeft != null ? Date.now() + secondsLeft * 1000 : null);
        };
        const onInactivityWarning = ({ userId: uid, secondsLeft }: { userId: string; secondsLeft: number | null }) => {
            setInactivityUserId(uid);
            setInactivityEndsAt(secondsLeft != null ? Date.now() + secondsLeft * 1000 : null);
        };
        const onCleared = () => { setInactivityUserId(null); setInactivityEndsAt(null); };
        const onCoup = ({ userId: uid, hazard }: { userId: string; hazard: HazardType }) => {
            setInactivityUserId(null); setInactivityEndsAt(null);
            setCoupFlash({ userId: uid, hazard });
            if (coupFlashTimer.current) clearTimeout(coupFlashTimer.current);
            coupFlashTimer.current = setTimeout(() => setCoupFlash(null), 2600);
        };

        socket.on('mb:state', onState);
        socket.on('mb:finished', onFinished);
        socket.on('mb:afkWarning', onAfkWarning);
        socket.on('mb:inactivityWarning', onInactivityWarning);
        socket.on('mb:playerKicked', onCleared);
        socket.on('mb:playerSurrendered', onCleared);
        socket.on('mb:coupFourre', onCoup);
        socket.on('notFound', onNotFoundEvt);
        socket.on('mb:accessDenied', onNotFoundEvt);

        const join = () => {
            if (joinedRef.current) return;
            joinedRef.current = true;
            socket.emit('mb:join', { lobbyId });
        };
        socket.on('connect', join);
        if (socket.connected) join();

        return () => {
            socket.off('mb:state', onState);
            socket.off('mb:finished', onFinished);
            socket.off('mb:afkWarning', onAfkWarning);
            socket.off('mb:inactivityWarning', onInactivityWarning);
            socket.off('mb:playerKicked', onCleared);
            socket.off('mb:playerSurrendered', onCleared);
            socket.off('mb:coupFourre', onCoup);
            socket.off('notFound', onNotFoundEvt);
            socket.off('mb:accessDenied', onNotFoundEvt);
            socket.off('connect', join);
        };
    }, [socket, lobbyId, userId]);

    const playCard = useCallback((cardId: string, targetUserId?: string) => {
        socket?.emit('mb:playCard', { lobbyId, cardId, targetUserId });
    }, [socket, lobbyId]);

    const discard = useCallback((cardId: string) => {
        socket?.emit('mb:discard', { lobbyId, cardId });
    }, [socket, lobbyId]);

    const acceptCoupFourre = useCallback(() => {
        socket?.emit('mb:coupFourre', { lobbyId });
    }, [socket, lobbyId]);

    const declineCoupFourre = useCallback(() => {
        socket?.emit('mb:declineCoupFourre', { lobbyId });
    }, [socket, lobbyId]);

    const surrender = useCallback(() => {
        socket?.emit('mb:surrender', { lobbyId });
    }, [socket, lobbyId]);

    const me = state?.players.find(p => p.userId === userId) ?? null;
    const isMyTurn = state?.currentUserId === userId && state.phase === 'playing' && me?.alive === true && !state.coupFourre;
    const vsBot = (state?.players ?? []).some(p => isBot(p) && p.userId !== userId);
    const coupFourreForMe = state?.coupFourre && state.coupFourre.userId === userId ? state.coupFourre : null;

    return {
        state,
        finished,
        me,
        isMyTurn,
        vsBot,
        coupFourreForMe,
        coupFlash,
        inactivityUserId,
        inactivityEndsAt,
        playCard,
        discard,
        acceptCoupFourre,
        declineCoupFourre,
        surrender,
    };
}
