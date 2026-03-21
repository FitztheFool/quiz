// src/hooks/useDiamant.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CardType = 'treasure' | 'danger' | 'relic';

export interface Card {
    id: string;
    type: CardType;
    value?: number;    // Trésor
    danger?: string;   // Danger : spider | snake | lava | boulder | ram
}

export interface PlayerInfo {
    userId: string;
    username: string;
    handRubies: number;       // rubis en main (dans la grotte)
    safeRubies: number;       // rubis dans le coffre
    safeDiamonds: number;     // diamants dans le coffre (valeur 5)
    relicsOwned: number;      // reliques récupérées
    inCave: boolean;          // encore dans la grotte ?
    hasDecided: boolean;      // a voté ce tour ?
}

export interface DecisionResult {
    userId: string;
    decision: 'continue' | 'leave';
}

export interface LeavingPlayer {
    userId: string;
    username: string;
    shareFromCards: number;
    relicsCollected: number;
}

export interface FinalScore {
    userId: string;
    username: string;
    score: number;
    safeRubies: number;
    safeDiamonds: number;
    relicsOwned: number;
}

export type GamePhase = 'waiting' | 'playing' | 'finished';

export interface DiamantState {
    phase: GamePhase;
    round: number;
    totalRounds: number;
    // Cartes révélées dans la manche
    revealedCards: Card[];
    // Rubis restants sur chaque carte trésor (index → rubis)
    rubisOnCards: Record<number, number>;
    // Index des cartes relique encore dans la grotte
    relicsInCave: number[];
    // Combien de reliques ont déjà quitté la grotte (pour calcul valeur)
    relicsExited: number;
    // Joueurs
    players: PlayerInfo[];
    // Phase décision
    decisionPhase: boolean;
    decisionEndsAt: number | null;
    decisionDuration: number;
    myDecision: 'continue' | 'leave' | null;
    // Dernière résolution
    lastDecisions: DecisionResult[];
    lastLeavingPlayers: LeavingPlayer[];
    // Dernière carte révélée
    lastCard: Card | null;
    lastCardIndex: number | null;
    lastSharePerPlayer: number | null;
    // Double danger
    doubleDanger: string | null;
    // Fin de partie
    finalScores: FinalScore[];
    winnerId: string | null;
    // Erreur
    error: string | null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const DIAMANT_SERVER_URL =
    process.env.NEXT_PUBLIC_DIAMANT_SERVER_URL ?? 'http://localhost:10009';

export function useDiamant({
    lobbyId,
    userId,
    username,
}: {
    lobbyId: string;
    userId: string;
    username: string;
}) {
    const socketRef = useRef<Socket | null>(null);
    const joinedRef = useRef(false);

    const [state, setState] = useState<DiamantState>({
        phase: 'waiting',
        round: 1,
        totalRounds: 5,
        revealedCards: [],
        rubisOnCards: {},
        relicsInCave: [],
        relicsExited: 0,
        players: [],
        decisionPhase: false,
        decisionEndsAt: null,
        decisionDuration: 30,
        myDecision: null,
        lastDecisions: [],
        lastLeavingPlayers: [],
        lastCard: null,
        lastCardIndex: null,
        lastSharePerPlayer: null,
        doubleDanger: null,
        finalScores: [],
        winnerId: null,
        error: null,
    });

    // ── Helpers ───────────────────────────────────────────────────────────────

    const applyPublicState = (prev: DiamantState, s: any): DiamantState => ({
        ...prev,
        phase: s.phase ?? prev.phase,
        round: s.round ?? prev.round,
        revealedCards: s.revealedCards ?? prev.revealedCards,
        rubisOnCards: s.rubisonCards ?? prev.rubisOnCards,
        relicsInCave: s.relicsInCave ?? prev.relicsInCave,
        relicsExited: s.relicsExited ?? prev.relicsExited,
        players: s.players ?? prev.players,
    });

    // ── Connect ───────────────────────────────────────────────────────────────
    useEffect(() => {
        if (joinedRef.current) return;
        joinedRef.current = true;

        const socket = io(DIAMANT_SERVER_URL, {
            transports: ['websocket'],
            withCredentials: true,
        });
        socketRef.current = socket;

        let joinAttempts = 0;
        const joinRoom = () => {
            joinAttempts++;
            socket.emit('diamant:join', { lobbyId, userId, username });
        };

        socket.on('connect', joinRoom);

        // ── Joined ────────────────────────────────────────────────────────────
        socket.on('diamant:joined', (payload: any) => {
            setState((prev) => ({
                ...applyPublicState(prev, payload.state),
                phase: payload.phase,
                decisionEndsAt: payload.decisionEndsAt ?? null,
                decisionPhase: !!payload.decisionEndsAt,
            }));
        });

        // ── Round start ───────────────────────────────────────────────────────
        socket.on('diamant:roundStart', (payload: any) => {
            setState((prev) => ({
                ...applyPublicState(prev, payload.state),
                round: payload.round,
                totalRounds: payload.totalRounds,
                decisionPhase: false,
                decisionEndsAt: null,
                myDecision: null,
                lastDecisions: [],
                lastLeavingPlayers: [],
                lastCard: null,
                lastCardIndex: null,
                lastSharePerPlayer: null,
                doubleDanger: null,
            }));
        });

        // ── Card revealed ─────────────────────────────────────────────────────
        socket.on('diamant:cardRevealed', (payload: any) => {
            setState((prev) => ({
                ...applyPublicState(prev, payload.state),
                lastCard: payload.card,
                lastCardIndex: payload.cardIndex,
                lastSharePerPlayer: payload.sharePerPlayer ?? null,
                doubleDanger: null,
                // Reset décision pour le nouveau tour
                decisionPhase: false,
                myDecision: prev.myDecision,
            }));
        });

        // ── Double danger ─────────────────────────────────────────────────────
        socket.on('diamant:doubleDanger', (payload: any) => {
            setState((prev) => ({
                ...applyPublicState(prev, payload.state),
                doubleDanger: payload.danger,
                decisionPhase: false,
                decisionEndsAt: null,
                myDecision: null,
            }));
        });

        // ── Decision phase ────────────────────────────────────────────────────
        socket.on('diamant:decisionPhase', (payload: any) => {
            setState((prev) => ({
                ...applyPublicState(prev, payload.state),
                decisionPhase: true,
                decisionEndsAt: payload.endsAt,
                decisionDuration: payload.duration ?? prev.decisionDuration,
                myDecision: null,
                lastDecisions: [],
                lastLeavingPlayers: [],
            }));
        });

        // ── Player decided (quelqu'un a voté, sans révéler la décision) ───────
        socket.on('diamant:playerDecided', (payload: any) => {
            setState((prev) => ({
                ...applyPublicState(prev, payload.state),
            }));
        });

        // ── Decisions revealed ────────────────────────────────────────────────
        socket.on('diamant:decisionsRevealed', (payload: any) => {
            setState((prev) => ({
                ...applyPublicState(prev, payload.state),
                decisionPhase: false,
                decisionEndsAt: null,
                myDecision: null,
                lastDecisions: payload.decisions ?? [],
                lastLeavingPlayers: payload.leavingPlayers ?? [],
            }));
        });

        // ── Round end ─────────────────────────────────────────────────────────
        socket.on('diamant:roundEnd', (payload: any) => {
            setState((prev) => ({
                ...applyPublicState(prev, payload.state),
                decisionPhase: false,
                decisionEndsAt: null,
                myDecision: null,
                doubleDanger: prev.doubleDanger,
            }));
        });

        // ── Game over ─────────────────────────────────────────────────────────
        socket.on('diamant:gameOver', (payload: any) => {
            setState((prev) => ({
                ...prev,
                phase: 'finished',
                finalScores: payload.scores ?? [],
                winnerId: payload.winnerId ?? null,
                decisionPhase: false,
            }));
        });

        // ── Error ─────────────────────────────────────────────────────────────
        socket.on('diamant:error', (payload: { message: string }) => {
            if (payload.message === 'Room not found' && joinAttempts < 6) {
                // configure n'est peut-être pas encore arrivé au serveur — retry
                setTimeout(joinRoom, 500);
                return;
            }
            setState((prev) => ({ ...prev, error: payload.message }));
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
            joinedRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Actions ───────────────────────────────────────────────────────────────

    const decide = useCallback((decision: 'continue' | 'leave') => {
        socketRef.current?.emit('diamant:decision', { lobbyId, decision });
        setState((prev) => ({ ...prev, myDecision: decision }));
    }, [lobbyId]);

    const clearError = useCallback(() => {
        setState((prev) => ({ ...prev, error: null }));
    }, []);

    return { state, decide, clearError };
}
