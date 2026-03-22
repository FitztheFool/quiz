// src/hooks/useBattleship.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { getBattleshipSocket } from '@/lib/socket';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlacedShip {
    name: string;
    size: number;
    row: number;
    col: number;
    horizontal: boolean;
    sunk: boolean;
}

export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';

export interface PlayerInfo {
    userId: string;
    username: string;
    avatar: string | null;
    ready: boolean;
}

export type GamePhase = 'waiting' | 'placement' | 'playing' | 'finished';

export interface ShotResult {
    shooterUserId: string;
    row: number;
    col: number;
    hit: boolean;
    sunkShip: PlacedShip | null;
    isTimeout: boolean;
    currentTurnUserId: string;
    endsAt: number;
}

export interface GameOverPayload {
    winnerUserId: string;
    reason: 'all_sunk' | 'surrender' | 'disconnect';
    grids: {
        userId: string;
        ships: PlacedShip[];
        receivedShots: string[];
    }[];
}

export interface BattleshipState {
    phase: GamePhase;
    yourSeat: 0 | 1 | null;
    players: [PlayerInfo | null, PlayerInfo | null];
    // Your grid
    myShips: PlacedShip[];
    myReceivedShots: Set<string>;   // shots enemy fired AT you
    // Enemy grid (only hits/misses visible, ships hidden)
    enemyReceivedShots: Set<string>; // shots YOU fired
    enemyHitShots: Set<string>;      // shots YOU fired that hit
    enemySunkShips: PlacedShip[];    // revealed when sunk or game over
    // Turn
    currentTurnUserId: string | null;
    turnEndsAt: number | null;
    placementEndsAt: number | null;
    // End
    winnerUserId: string | null;
    gameOverReason: string | null;
    // Flags
    opponentReady: boolean;
    error: string | null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────


export function useBattleship({
    lobbyId,
    userId,
    username,
    avatar,
    options,
}: {
    lobbyId: string;
    userId: string;
    username: string;
    avatar?: string | null;
    options?: { turnDuration?: number; placementDuration?: number };
}) {
    const socketRef = useRef<Socket | null>(null);
    const joinedRef = useRef(false);

    const [state, setState] = useState<BattleshipState>({
        phase: 'waiting',
        yourSeat: null,
        players: [null, null],
        myShips: [],
        myReceivedShots: new Set(),
        enemyReceivedShots: new Set(),
        enemyHitShots: new Set(),
        enemySunkShips: [],
        currentTurnUserId: null,
        turnEndsAt: null,
        placementEndsAt: null,
        winnerUserId: null,
        gameOverReason: null,
        opponentReady: false,
        error: null,
    });

    // ── Connect ───────────────────────────────────────────────────────────────
    useEffect(() => {
        if (joinedRef.current) return;
        joinedRef.current = true;

        const socket = getBattleshipSocket();
        if (!socket) return;
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('battleship:join', {
                lobbyId,
                userId,
                username,
                avatar: avatar ?? null,
                options,
            });
        });

        // ── Joined ────────────────────────────────────────────────────────────
        socket.on('battleship:joined', (payload: any) => {
            setState((prev) => ({
                ...prev,
                yourSeat: payload.yourSeat,
                phase: payload.phase,
                players: payload.players,
                placementEndsAt: payload.placementEndsAt ?? null,
                currentTurnUserId: payload.currentTurnUserId ?? null,
                turnEndsAt: payload.turnEndsAt ?? null,
            }));
        });

        // ── Placement start ───────────────────────────────────────────────────
        socket.on('battleship:placementStart', (payload: any) => {
            setState((prev) => ({
                ...prev,
                phase: 'placement',
                placementEndsAt: payload.endsAt,
            }));
        });

        // ── Placement confirmed ───────────────────────────────────────────────
        socket.on('battleship:placementConfirmed', (payload: { ships: PlacedShip[] }) => {
            setState((prev) => ({ ...prev, myShips: payload.ships }));
        });

        // ── Auto-placed (timeout) ─────────────────────────────────────────────
        socket.on('battleship:autoPlaced', (payload: { ships: PlacedShip[] }) => {
            setState((prev) => ({ ...prev, myShips: payload.ships }));
        });

        // ── Opponent ready ────────────────────────────────────────────────────
        socket.on('battleship:opponentReady', () => {
            setState((prev) => ({ ...prev, opponentReady: true }));
        });

        // ── Player update ─────────────────────────────────────────────────────
        socket.on('battleship:playerUpdate', (payload: { players: [PlayerInfo | null, PlayerInfo | null] }) => {
            setState((prev) => ({ ...prev, players: payload.players }));
        });

        // ── Game start ────────────────────────────────────────────────────────
        socket.on('battleship:gameStart', (payload: any) => {
            setState((prev) => ({
                ...prev,
                phase: 'playing',
                currentTurnUserId: payload.currentTurnUserId,
                turnEndsAt: payload.endsAt,
                placementEndsAt: null,
            }));
        });

        // ── Shot result ───────────────────────────────────────────────────────
        socket.on('battleship:shotResult', (payload: ShotResult) => {
            setState((prev) => {
                const isMyShot = payload.shooterUserId === userId;

                // Update enemy grid (shots I fired)
                const newEnemyShots = new Set(prev.enemyReceivedShots);
                const newEnemyHits = new Set(prev.enemyHitShots);
                const newEnemySunk = [...prev.enemySunkShips];

                // Update my grid (shots enemy fired at me)
                const newMyShots = new Set(prev.myReceivedShots);

                if (isMyShot) {
                    newEnemyShots.add(`${payload.row},${payload.col}`);
                    if (payload.hit) newEnemyHits.add(`${payload.row},${payload.col}`);
                    if (payload.sunkShip) newEnemySunk.push(payload.sunkShip);
                } else {
                    newMyShots.add(`${payload.row},${payload.col}`);
                    // Update my ships sunk status
                }

                return {
                    ...prev,
                    enemyReceivedShots: newEnemyShots,
                    enemyHitShots: newEnemyHits,
                    enemySunkShips: newEnemySunk,
                    myReceivedShots: newMyShots,
                    currentTurnUserId: payload.currentTurnUserId,
                    turnEndsAt: payload.endsAt,
                };
            });
        });

        // ── Game over ─────────────────────────────────────────────────────────
        socket.on('battleship:gameOver', (payload: GameOverPayload) => {
            setState((prev) => {
                // Reveal full grids
                const myGrid = payload.grids.find((g) => g.userId === userId);
                const enemyGrid = payload.grids.find((g) => g.userId !== userId);

                return {
                    ...prev,
                    phase: 'finished',
                    winnerUserId: payload.winnerUserId,
                    gameOverReason: payload.reason,
                    enemySunkShips: enemyGrid?.ships ?? prev.enemySunkShips,
                    enemyReceivedShots: new Set(enemyGrid?.receivedShots ?? []),
                    myReceivedShots: new Set(myGrid?.receivedShots ?? []),
                };
            });
        });

        // ── Restore on reconnect ──────────────────────────────────────────────
        socket.on('battleship:shipsRestored', (payload: any) => {
            setState((prev) => ({
                ...prev,
                myShips: payload.ships,
                myReceivedShots: new Set(payload.receivedShots),
            }));
        });

        socket.on('battleship:opponentShotsRestored', (payload: any) => {
            setState((prev) => ({
                ...prev,
                enemyReceivedShots: new Set(payload.receivedShots),
                enemySunkShips: payload.ships ?? [],
            }));
        });

        // ── Errors ────────────────────────────────────────────────────────────
        socket.on('battleship:error', (payload: { message: string }) => {
            setState((prev) => ({ ...prev, error: payload.message }));
        });

        socket.on('battleship:placementError', (payload: { message: string }) => {
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

    const placeShips = useCallback((ships: PlacedShip[]) => {
        socketRef.current?.emit('battleship:placeShips', { lobbyId, ships });
    }, [lobbyId]);

    const shoot = useCallback((row: number, col: number) => {
        socketRef.current?.emit('battleship:shoot', { lobbyId, row, col });
    }, [lobbyId]);

    const surrender = useCallback(() => {
        socketRef.current?.emit('battleship:surrender', { lobbyId });
    }, [lobbyId]);

    const rematch = useCallback(() => {
        socketRef.current?.emit('battleship:rematch', { lobbyId });
    }, [lobbyId]);

    const clearError = useCallback(() => {
        setState((prev) => ({ ...prev, error: null }));
    }, []);

    return { state, placeShips, shoot, surrender, rematch, clearError };
}
