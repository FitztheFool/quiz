// src/hooks/useSkyjow.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSkyjowSocket } from '@/lib/socket';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CardState = { value: number | null; revealed: boolean; removed: boolean };
export type PlayerPublic = {
    userId: string;
    username: string;
    cards: CardState[];
    score: number;
    liveScore?: number;
};
export type ScoreEntry = {
    userId: string; username: string; roundScore: number; totalScore: number; abandon?: boolean; afk?: boolean;
};
export type Phase = 'waiting' | 'flip2' | 'playing' | 'last_round' | 'ended' | 'round_end' | 'game_end';

export type GameState = {
    phase: Phase;
    round: number;
    currentPlayerIndex: number;
    discardTop: number | null;
    players: PlayerPublic[];
    scores: ScoreEntry[];
    lastRoundStarterIndex: number | null;
};

// ── Hook ──────────────────────────────────────────────────────────────────────

const isPlayingPhase = (p: Phase) => p === 'playing' || p === 'last_round';

export function useSkyjow({
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
    const skyjowRef = useRef<ReturnType<typeof getSkyjowSocket>>(null);
    const joinedRef = useRef(false);

    const [gameState, setGameState] = useState<GameState | null>(null);
    const [myCards, setMyCards] = useState<CardState[]>([]);
    const [phase, setPhase] = useState<Phase>('waiting');
    const [round, setRound] = useState(1);
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
    const [discardTop, setDiscardTop] = useState<number | null>(null);
    const [drawnCard, setDrawnCard] = useState<{ value: number; from: 'deck' | 'discard'; mustSwap?: boolean } | null>(null);
    const [players, setPlayers] = useState<PlayerPublic[]>([]);
    const [scores, setScores] = useState<ScoreEntry[]>([]);
    const [notification, setNotification] = useState<string | null>(null);
    const [roundEndData, setRoundEndData] = useState<{ scores: ScoreEntry[]; players: { userId: string; username: string; cards: CardState[] }[] } | null>(null);
    const [gameEndData, setGameEndData] = useState<{ scores: ScoreEntry[]; winnerId: string; winnerUsername: string } | null>(null);
    const [surrenderedPlayers, setSurrenderedPlayers] = useState<{ userId: string; username: string; cards: CardState[] }[]>([]);
    const [drawnAction, setDrawnAction] = useState<'swap' | 'discard_flip' | null>(null);
    const [readyCount, setReadyCount] = useState(0);
    const [flip2Count, setFlip2Count] = useState(0);
    const [inactivityEndsAt, setInactivityEndsAt] = useState<number | null>(null);
    const [inactivityUserId, setInactivityUserId] = useState<string | null>(null);
    const [turnStartedAt, setTurnStartedAt] = useState<number | null>(null);
    const [turnDuration, setTurnDuration] = useState<number>(90);
    // ── Nouveau : timer commun flip2 ──────────────────────────────────────────
    const [flip2EndsAt, setFlip2EndsAt] = useState<number | null>(null);
    const [flip2Duration, setFlip2Duration] = useState<number>(90);

    const isCurrent = players[currentPlayerIndex]?.userId === userId;

    const notify = useCallback((msg: string, duration = 3000) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), duration);
    }, []);

    useEffect(() => {
        if (!lobbyId || !userId) return;
        const sock = getSkyjowSocket();
        if (!sock) return;
        skyjowRef.current = sock;

        if (!joinedRef.current) {
            joinedRef.current = true;
            sock.emit('skyjow:join', { lobbyId, userId, username });
        }

        sock.on('notFound', onNotFound);

        sock.on('skyjow:game_started', (data: {
            players: PlayerPublic[]; discardTop: number; phase: Phase; round: number;
        }) => {
            setPlayers(data.players);
            setDiscardTop(data.discardTop);
            setPhase(data.phase);
            setRound(data.round);
            setMyCards(Array(12).fill({ value: null, revealed: false, removed: false }));
            setDrawnCard(null);
            setRoundEndData(null);
            setGameEndData(null);
            setFlip2Count(0);
            setSurrenderedPlayers([]);
            // Réinitialiser le timer flip2 (le serveur va émettre flip2TimerStarted juste après)
            setFlip2EndsAt(null);
        });

        // ── NOUVEAU : timer commun flip2 ──────────────────────────────────────
        sock.on('skyjow:flip2TimerStarted', ({ endsAt, duration }: { endsAt: number; warningAt: number; duration: number }) => {
            setFlip2EndsAt(endsAt);
            setFlip2Duration(duration);
        });

        sock.on('skyjow:my_cards', ({ cards }: { cards: CardState[] }) => {
            setMyCards(cards);
            setFlip2Count(cards.filter(c => c.revealed).length);
        });

        sock.on('skyjow:state', (state: GameState) => {
            setGameState(state);
            setPlayers(state.players);
            setDiscardTop(state.discardTop);
            setPhase(state.phase);
            setRound(state.round);
            setCurrentPlayerIndex(state.currentPlayerIndex);
            setScores(state.scores);
        });

        sock.on('skyjow:turn', ({ currentUserId }) => {
            setInactivityEndsAt(null);
            setInactivityUserId(null);
            setTurnStartedAt(Date.now());
            setTurnDuration(90);
            // Quand le tour de jeu commence, le timer flip2 n'a plus lieu d'être affiché
            setFlip2EndsAt(null);
            if (currentUserId === userId) notify('🎯 C\'est ton tour !');
        });

        sock.on('skyjow:drawn_card', (data: { value: number; from: 'deck' | 'discard'; mustSwap?: boolean }) => {
            setDrawnCard(data);
            setDrawnAction(data.from === 'discard' ? 'swap' : null);
        });

        sock.on('skyjow:last_round', ({ triggerUsername }: { triggerUserId: string; triggerUsername: string }) => {
            notify(`⚡ ${triggerUsername} a retourné toutes ses cartes ! Dernier tour pour tous !`, 5000);
            setPhase('last_round');
        });

        sock.on('skyjow:columns_removed', ({ username: uname, columns }: { userId: string; username: string; columns: { col: number; value: number }[] }) => {
            notify(`🗑️ ${uname} a éliminé une colonne de ${columns[0]?.value} !`);
        });

        sock.on('skyjow:round_end', (data: { scores: ScoreEntry[]; players: { userId: string; username: string; cards: CardState[] }[] }) => {
            setRoundEndData(data);
            setScores(data.scores);
            setPhase('round_end');
            setFlip2EndsAt(null);
        });

        sock.on('skyjow:finished', (data: {
            scores: ScoreEntry[];
            winnerId: string;
            winnerUsername: string;
            players?: { userId: string; username: string; cards: CardState[] }[];
        }) => {
            setGameEndData(data);
            setScores(data.scores);
            if (data.players) {
                setPlayers(prev => prev.map(p => {
                    const updated = data.players!.find(dp => dp.userId === p.userId);
                    return updated ? { ...p, cards: updated.cards } : p;
                }));
            }
            setPhase('game_end');
            setFlip2EndsAt(null);
        });

        sock.on('skyjow:playerSurrendered', ({ userId: uid, username: uname, cards }) => {
            setSurrenderedPlayers(prev =>
                prev.find(p => p.userId === uid) ? prev : [...prev, { userId: uid, username: uname, cards }]
            );
        });

        sock.on('skyjow:inactivityWarning', ({ userId: uid, secondsLeft }: { userId: string; secondsLeft: number }) => {
            setInactivityUserId(uid);
            setInactivityEndsAt(Date.now() + secondsLeft * 1000);
        });

        sock.on('skyjow:playerKicked', ({ userId: uid, username: uname, cards }) => {
            setInactivityEndsAt(null);
            setInactivityUserId(null);
            if (cards) {
                setSurrenderedPlayers(prev =>
                    prev.find(p => p.userId === uid) ? prev : [...prev, { userId: uid, username: uname, cards }]
                );
            }
        });

        sock.on('skyjow:waiting_next_round', ({ scores: s }: { scores: ScoreEntry[] }) => {
            setScores(s);
            setReadyCount(0);
        });

        sock.on('skyjow:ready_count', ({ ready, total }: { ready: number; total: number }) => {
            setReadyCount(ready);
            notify(`${ready}/${total} joueurs prêts…`);
        });

        sock.on('skyjow:new_round', (data: {
            round: number; phase: Phase; discardTop: number; players: PlayerPublic[]; scores: ScoreEntry[];
        }) => {
            setRound(data.round);
            setPhase(data.phase);
            setDiscardTop(data.discardTop);
            setPlayers(data.players);
            setScores(data.scores);
            setDrawnCard(null);
            setRoundEndData(null);
            setFlip2Count(0);
            setSurrenderedPlayers([]);
            // Réinitialiser le timer flip2 (le serveur va émettre flip2TimerStarted juste après)
            setFlip2EndsAt(null);
            notify(`🔄 Manche ${data.round} !`);
        });

        return () => {
            sock.off('notFound', onNotFound);
            sock.off('skyjow:game_started');
            sock.off('skyjow:flip2TimerStarted');
            sock.off('skyjow:my_cards');
            sock.off('skyjow:state');
            sock.off('skyjow:turn');
            sock.off('skyjow:drawn_card');
            sock.off('skyjow:last_round');
            sock.off('skyjow:columns_removed');
            sock.off('skyjow:round_end');
            sock.off('skyjow:finished');
            sock.off('skyjow:playerSurrendered');
            sock.off('skyjow:inactivityWarning');
            sock.off('skyjow:playerKicked');
            sock.off('skyjow:waiting_next_round');
            sock.off('skyjow:ready_count');
            sock.off('skyjow:new_round');
            joinedRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lobbyId, userId, username, notify]);

    // ── Actions ───────────────────────────────────────────────────────────────

    const flipInitial = useCallback((cardIndex: number) => {
        if (phase !== 'flip2') return;
        if (flip2Count >= 2) return;
        skyjowRef.current?.emit('skyjow:flip_initial', { cardIndex });
    }, [phase, flip2Count]);

    const drawDeck = useCallback(() => {
        if (!isCurrent || !isPlayingPhase(phase) || drawnCard !== null) return;
        skyjowRef.current?.emit('skyjow:draw_deck');
    }, [isCurrent, phase, drawnCard]);

    const takeDiscard = useCallback(() => {
        if (!isCurrent || !isPlayingPhase(phase) || drawnCard !== null) return;
        skyjowRef.current?.emit('skyjow:take_discard');
    }, [isCurrent, phase, drawnCard]);

    const handleCardClick = useCallback((cardIndex: number) => {
        if (phase === 'flip2') {
            flipInitial(cardIndex);
            return;
        }
        if (!isCurrent || drawnCard === null || drawnAction === null) return;
        if (!isPlayingPhase(phase)) return;

        const card = myCards[cardIndex];
        if (!card || card.removed) return;

        if (drawnAction === 'swap') {
            skyjowRef.current?.emit('skyjow:swap_card', { cardIndex });
            setDrawnCard(null);
            setDrawnAction(null);
        } else if (drawnAction === 'discard_flip') {
            if (card.revealed) return;
            skyjowRef.current?.emit('skyjow:discard_and_flip', { cardIndex });
            setDrawnCard(null);
            setDrawnAction(null);
        }
    }, [phase, isCurrent, drawnCard, drawnAction, myCards, flipInitial]);

    const readyNextRound = useCallback(() => {
        skyjowRef.current?.emit('skyjow:ready_next_round');
    }, []);

    const surrender = useCallback(() => {
        skyjowRef.current?.emit('skyjow:surrender');
    }, []);

    return {
        gameState,
        myCards,
        phase,
        round,
        currentPlayerIndex,
        discardTop,
        drawnCard,
        players,
        scores,
        notification,
        roundEndData,
        gameEndData,
        surrenderedPlayers,
        drawnAction,
        readyCount,
        flip2Count,
        inactivityEndsAt,
        inactivityUserId,
        isCurrent,
        setDrawnAction,
        drawDeck,
        takeDiscard,
        handleCardClick,
        readyNextRound,
        surrender,
        turnStartedAt,
        turnDuration,
        flip2EndsAt,
        flip2Duration,
    };
}
