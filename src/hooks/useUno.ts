// src/hooks/useUno.ts
'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { getUnoSocket } from '@/lib/socket';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CardColor = 'red' | 'green' | 'blue' | 'yellow' | 'wild';
export type Card = { id: string; color: CardColor; value: string };

export type PlayerInfo = {
    userId: string;
    username: string;
    cardCount: number;
    saidUno: boolean;
    team: 0 | 1 | null;
};

export type UnoOptions = {
    stackable: boolean;
    jumpIn: boolean;
    teamMode: 'none' | '2v2';
    teamWinMode: 'one' | 'both';
};

export type FinalScore = {
    userId: string;
    username: string;
    cardsLeft: number;
    pointsInHand: number;
    score: number;
    rank: number;
    kicked: boolean;
    abandon?: boolean;
    afk?: boolean;
    team: 0 | 1 | null;
    hand?: Card[];
};

export type GameState = {
    hand: Card[];
    currentColor: CardColor;
    topCard: Card | null;
    currentPlayerIndex: number;
    players: PlayerInfo[];
    direction: number;
    drawStack: number;
    status: 'WAITING' | 'PLAYING' | 'FINISHED';
    winner: { userId: string; username: string } | null;
    finalScores: FinalScore[] | null;
    options: UnoOptions;
    isMyTurn: boolean;
    spectator: boolean;
    gameId?: string;
    teams: Record<string, 0 | 1> | null;
    teammateHand: Card[] | null;
    teammateId: string | null;
    myTeam: 0 | 1 | null;
    turnEndsAt: number | null;
};

export type LobbyState = {
    hostId: string;
    status: string;
    players: { userId: string; username: string }[];
    options: UnoOptions;
    teams: Record<string, 0 | 1> | null;
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useUno({
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
    const socket = useMemo(() => getUnoSocket(), []);
    const joinedRef = useRef(false);

    const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [unoReady, setUnoReady] = useState(false);
    const [inactivitySeconds, setInactivitySeconds] = useState<number | null>(null);
    const [inactivityUserId, setInactivityUserId] = useState<string | null>(null);
    const inactivityIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!socket || !userId || !lobbyId) return;

        const clearInactivity = () => {
            setInactivitySeconds(null);
            setInactivityUserId(null);
            if (inactivityIntervalRef.current) {
                clearInterval(inactivityIntervalRef.current);
                inactivityIntervalRef.current = null;
            }
        };

        const onLobbyState = (s: LobbyState) => setLobbyState(s);

        const onGameState = (s: GameState) => {
            setGameState(s);
            setUnoReady(prev => s.hand.length !== 1 ? false : prev);
            clearInactivity();
        };

        const onInactivityWarning = ({ userId: uid, secondsLeft }: { userId: string; secondsLeft: number }) => {
            if (inactivityIntervalRef.current) clearInterval(inactivityIntervalRef.current);
            setInactivityUserId(uid);
            setInactivitySeconds(secondsLeft);
            let remaining = secondsLeft;
            inactivityIntervalRef.current = setInterval(() => {
                remaining -= 1;
                setInactivitySeconds(remaining <= 0 ? 0 : remaining);
                if (remaining <= 0) {
                    clearInterval(inactivityIntervalRef.current!);
                    inactivityIntervalRef.current = null;
                }
            }, 1000);
        };

        socket.on('notFound', onNotFound);
        socket.on('uno:lobbyState', onLobbyState);
        socket.on('uno:state', onGameState);
        socket.on('uno:inactivityWarning', onInactivityWarning);
        socket.on('uno:playerKicked', clearInactivity);

        if (!joinedRef.current) {
            joinedRef.current = true;
            socket.emit('uno:join', { lobbyId, userId, username });
        }

        return () => {
            socket.off('notFound', onNotFound);
            socket.off('uno:lobbyState', onLobbyState);
            socket.off('uno:state', onGameState);
            socket.off('uno:inactivityWarning', onInactivityWarning);
            socket.off('uno:playerKicked', clearInactivity);
            if (inactivityIntervalRef.current) clearInterval(inactivityIntervalRef.current);
            joinedRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, userId, lobbyId]);

    // ── Helpers ───────────────────────────────────────────────────────────────

    const isPlayable = useCallback((card: Card): boolean => {
        if (!gameState || !gameState.isMyTurn || gameState.spectator) return false;
        const top = gameState.topCard;
        if (!top) return true;
        if (card.value === 'wild' || card.value === 'wild4') return true;
        if (gameState.drawStack > 0 && gameState.options.stackable) return card.value === 'draw2' || card.value === 'wild4';
        if (gameState.drawStack > 0 && !gameState.options.stackable) return false;
        return card.color === gameState.currentColor || card.value === top.value;
    }, [gameState]);

    // ── Actions ───────────────────────────────────────────────────────────────

    const playCard = useCallback((card: Card) => {
        if (!gameState || gameState.spectator) return;
        const top = gameState.topCard;
        const isJumpIn = gameState.options.jumpIn && !gameState.isMyTurn &&
            top && card.color === top.color && card.value === top.value && card.color !== 'wild';

        if (!isPlayable(card) && !isJumpIn) return;

        setSelectedCard(card);
        if (card.value === 'wild' || card.value === 'wild4') {
            setShowColorPicker(true);
        } else {
            socket?.emit('uno:playCard', {
                cardId: card.id,
                sayUno: gameState.hand.length - 1 === 1 ? unoReady : false,
            });
            setSelectedCard(null);
            setUnoReady(false);
        }
    }, [gameState, isPlayable, socket, unoReady]);

    const chooseColor = useCallback((color: string) => {
        if (!selectedCard) return;
        socket?.emit('uno:playCard', {
            cardId: selectedCard.id,
            chosenColor: color,
            sayUno: (gameState?.hand.length ?? 1) - 1 === 1 ? unoReady : false,
        });
        setSelectedCard(null);
        setShowColorPicker(false);
        setUnoReady(false);
    }, [selectedCard, gameState, socket, unoReady]);

    const drawCard = useCallback(() => {
        socket?.emit('uno:drawCard');
    }, [socket]);

    const callUno = useCallback((targetId: string) => {
        socket?.emit('uno:callUno', { targetId });
    }, [socket]);

    const surrender = useCallback(() => {
        socket?.emit('uno:surrender');
    }, [socket]);

    return {
        lobbyState,
        gameState,
        selectedCard,
        showColorPicker,
        unoReady,
        setUnoReady,
        inactivitySeconds,
        inactivityUserId,
        isPlayable,
        playCard,
        chooseColor,
        drawCard,
        callUno,
        surrender,
    };
}
