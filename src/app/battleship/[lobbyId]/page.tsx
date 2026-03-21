// src/app/Battleship/[lobbyId]/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useBattleship } from '@/hooks/useBattleship';
import PlacementPhase from '@/components/Battleship/PlacementPhase';
import BattleshipBoard from '@/components/Battleship/BattleshipBoard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useChat } from '@/context/ChatContext';
import GameOverModal from '@/components/GameOverModal';

// ── Turn timer bar ────────────────────────────────────────────────────────────

function TurnTimerBar({ endsAt, duration }: { endsAt: number; duration: number }) {
    const [pct, setPct] = useState(100);
    const [timeLeft, setTimeLeft] = useState(duration);

    useEffect(() => {
        const tick = () => {
            const remaining = Math.max(0, endsAt - Date.now());
            setPct((remaining / (duration * 1000)) * 100);
            setTimeLeft(Math.ceil(remaining / 1000));
        };
        tick();
        const id = setInterval(tick, 200);
        return () => clearInterval(id);
    }, [endsAt, duration]);

    const color = pct > 50 ? 'bg-green-500' : pct > 25 ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <div className="w-full space-y-1">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Temps restant</span>
                <span className={`font-mono font-bold ${timeLeft <= 5 ? 'text-red-500 dark:text-red-400 animate-pulse' : 'text-gray-500 dark:text-gray-400'}`}>{timeLeft}s</span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-200 ${color}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BattleshipPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams<{ lobbyId: string }>();
    const lobbyId = params?.lobbyId ?? '';

    const { setLobbyId } = useChat();

    useEffect(() => {
        setLobbyId(lobbyId);
        return () => setLobbyId(null);
    }, [lobbyId, setLobbyId]);

    // Read options from sessionStorage (set by lobby before redirect)
    const options = useMemo(() => {
        if (typeof window === 'undefined') return {};
        try {
            const raw = sessionStorage.getItem(`battleship_options_${lobbyId}`);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }, [lobbyId]);

    const { state, placeShips, shoot, surrender, rematch, clearError } = useBattleship({
        lobbyId,
        userId: session?.user?.id ?? '',
        username: session?.user?.username ?? session?.user?.email ?? 'Joueur',
        avatar: session?.user?.image ?? null,
        options,
    });

    const [lastShot, setLastShot] = useState<string | null>(null);

    // Track last shot for highlight
    useEffect(() => {
        // Detect new shots by watching enemy received shots size
    }, [state.enemyReceivedShots, state.myReceivedShots]);

    if (status === 'loading') return <LoadingSpinner />;
    if (status !== 'authenticated') { router.push('/login'); return null; }

    const myUserId = session.user.id;
    const isMyTurn = state.currentTurnUserId === myUserId;

    const opponent = state.players.find((p) => p?.userId !== myUserId) ?? null;
    const me = state.players.find((p) => p?.userId === myUserId) ?? null;

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">

            {/* Top bar */}
            <header className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center gap-4">
                {/* Left: game icon + name */}
                <div className="w-48 shrink-0 flex items-center gap-2">
                    <span className="text-xl">⚓</span>
                    <h1 className="text-sm font-bold tracking-tight">Bataille Navale</h1>
                </div>

                {/* Center: player vs player with turn indicator */}
                <div className="flex-1 flex justify-center">
                    <div className="flex items-center gap-2 text-sm">
                        <span className={`${state.phase === 'playing' && isMyTurn ? 'font-bold text-gray-900 dark:text-white' : 'font-normal text-gray-500 dark:text-gray-400'}`}>
                            {me?.username ?? 'Vous'}
                            {state.phase === 'playing' && isMyTurn && ' ⚡'}
                        </span>
                        <span className="text-gray-400 dark:text-gray-600">vs</span>
                        <span className={`${state.phase === 'playing' && !isMyTurn ? 'font-bold text-gray-900 dark:text-white' : 'font-normal text-gray-500 dark:text-gray-400'}`}>
                            {opponent?.username ?? (state.phase === 'waiting' ? 'En attente…' : 'Adversaire')}
                            {state.phase === 'playing' && !isMyTurn && ' ⚡'}
                        </span>
                    </div>
                </div>

                {/* Right: surrender */}
                <div className="w-48 shrink-0 flex justify-end">
                    {state.phase === 'playing' && (
                        <button
                            onClick={() => { if (confirm('Abandonner la partie ?')) surrender(); }}
                            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 px-3 py-1.5 rounded-lg transition-all"
                        >
                            🏳️ Abandonner
                        </button>
                    )}
                </div>
            </header>

            {/* Error toast */}
            {state.error && (
                <div
                    className="mx-4 mt-3 px-4 py-2 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-600 dark:text-red-400 text-sm flex justify-between items-center cursor-pointer"
                    onClick={clearError}
                >
                    <span>⚠️ {state.error}</span>
                    <span className="text-red-400 dark:text-red-600 ml-4">✕</span>
                </div>
            )}

            {/* Body */}
            <main className="flex-1 overflow-auto p-4">
                <div className="flex flex-col items-center gap-4 h-full">

                    {/* Waiting */}
                    {state.phase === 'waiting' && (
                        <div className="flex flex-1 items-center justify-center">
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 flex flex-col items-center gap-3">
                                <LoadingSpinner fullScreen={false} message="En attente du second joueur…" />
                                <p className="text-gray-500 dark:text-gray-400 text-xs font-mono">{lobbyId}</p>
                            </div>
                        </div>
                    )}

                    {/* Placement */}
                    {state.phase === 'placement' && (
                        <PlacementPhase
                            onConfirm={placeShips}
                            placementEndsAt={state.placementEndsAt}
                            opponentReady={state.opponentReady}
                            alreadyConfirmed={state.myShips.length > 0}
                        />
                    )}

                    {/* Playing */}
                    {state.phase === 'playing' && (
                        <div className="flex flex-col items-center gap-4 w-full">
                            {/* Turn info banner */}
                            <div className={`bg-white dark:bg-gray-900 border rounded-xl px-4 py-2 text-center text-sm font-semibold ${isMyTurn ? 'border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300' : 'border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300'}`}>
                                {isMyTurn ? '🎯 C\'est votre tour — Choisissez une case à tirer !' : `⏳ Tour de ${opponent?.username ?? 'l\'adversaire'}…`}
                            </div>
                            {/* Timer bar */}
                            {state.turnEndsAt && (
                                <div className="w-full max-w-[660px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
                                    <TurnTimerBar
                                        endsAt={state.turnEndsAt}
                                        duration={options.turnDuration ?? 30}
                                    />
                                </div>
                            )}
                            {/* Board */}
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                                <BattleshipBoard
                                    myShips={state.myShips}
                                    myReceivedShots={state.myReceivedShots}
                                    enemyReceivedShots={state.enemyReceivedShots}
                                    enemyHitShots={state.enemyHitShots}
                                    enemySunkShips={state.enemySunkShips}
                                    isMyTurn={isMyTurn}
                                    onShoot={(r, c) => {
                                        setLastShot(`${r},${c}`);
                                        shoot(r, c);
                                    }}
                                    lastShot={lastShot}
                                />
                            </div>
                        </div>
                    )}

                    {/* Finished */}
                    {state.phase === 'finished' && (
                        <div className="w-full max-w-4xl">
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                                <BattleshipBoard
                                    myShips={state.myShips}
                                    myReceivedShots={state.myReceivedShots}
                                    enemyReceivedShots={state.enemyReceivedShots}
                                    enemyHitShots={state.enemyHitShots}
                                    enemySunkShips={state.enemySunkShips}
                                    isMyTurn={false}
                                    onShoot={() => { }}
                                    gameOver
                                />
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Game over modal */}
            {state.phase === 'finished' && (() => {
                const won = state.winnerUserId === myUserId;
                const reasonLabel: Record<string, string> = {
                    all_sunk: won ? 'Vous avez coulé toute la flotte ennemie !' : 'Votre flotte a été détruite.',
                    surrender: won ? "L'adversaire a abandonné." : 'Vous avez abandonné.',
                    disconnect: won ? "L'adversaire s'est déconnecté." : 'Vous avez été déconnecté.',
                };
                return (
                    <GameOverModal
                        emoji={won ? '🏆' : '💀'}
                        title={won ? 'Victoire !' : 'Défaite'}
                        subtitle={reasonLabel[state.gameOverReason ?? ''] ?? ''}
                        onLobby={() => router.push(`/lobby/create/${lobbyId}`)}
                        onLeave={() => router.push('/')}
                        asModal
                    />
                );
            })()}
        </div>
    );
}
