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
            <div className="flex justify-between text-xs text-slate-500">
                <span>Temps restant</span>
                <span className={`font-mono font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : ''}`}>{timeLeft}s</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
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
        <div className="min-h-screen bg-sky-50 text-slate-900 flex flex-col">

            {/* Header */}
            <header className="border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-xl">⚓</span>
                    <h1 className="text-base font-bold tracking-tight">Bataille Navale</h1>
                </div>

                {/* Players */}
                <div className="flex items-center gap-2 text-sm">
                    <span className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${isMyTurn && state.phase === 'playing' ? 'border-blue-500 bg-blue-100 text-blue-700' : 'border-slate-300 text-slate-500'}`}>
                        {me?.username ?? 'Vous'}
                        {isMyTurn && state.phase === 'playing' && ' ⚡'}
                    </span>
                    <span className="text-slate-400">VS</span>
                    <span className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${!isMyTurn && state.phase === 'playing' ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-slate-300 text-slate-500'}`}>
                        {opponent?.username ?? (state.phase === 'waiting' ? 'En attente…' : 'Adversaire')}
                        {!isMyTurn && state.phase === 'playing' && ' ⚡'}
                    </span>
                </div>

                {/* Surrender */}
                {state.phase === 'playing' && (
                    <button
                        onClick={() => { if (confirm('Abandonner la partie ?')) surrender(); }}
                        className="text-xs text-red-500 hover:text-red-600 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-all"
                    >
                        🏳️ Abandonner
                    </button>
                )}
            </header>

            {/* Error toast */}
            {state.error && (
                <div
                    className="mx-4 mt-3 px-4 py-2 bg-red-50 border border-red-300 rounded-lg text-red-600 text-sm flex justify-between items-center cursor-pointer"
                    onClick={clearError}
                >
                    <span>⚠️ {state.error}</span>
                    <span className="text-red-400 ml-4">✕</span>
                </div>
            )}

            {/* Body */}
            <main className="flex flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto py-6 flex flex-col items-center gap-6">

                    {/* Waiting */}
                    {state.phase === 'waiting' && (
                        <div className="flex flex-col items-center gap-2 py-16">
                            <LoadingSpinner fullScreen={false} message="En attente du second joueur…" />
                            <p className="text-slate-400 text-xs font-mono">{lobbyId}</p>
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
                            <div className={`px-4 py-2 rounded-xl text-center text-sm font-semibold ${isMyTurn ? 'bg-blue-100 text-blue-700 border border-blue-400' : 'bg-orange-50 text-orange-600 border border-orange-300'}`}>
                                {isMyTurn ? '🎯 C\'est votre tour — Choisissez une case à tirer !' : `⏳ Tour de ${opponent?.username ?? 'l\'adversaire'}…`}
                            </div>
                            {state.turnEndsAt && (
                                <div className="w-[660px]">
                                    <TurnTimerBar
                                        endsAt={state.turnEndsAt}
                                        duration={options.turnDuration ?? 30}
                                    />
                                </div>
                            )}
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
                    )}

                    {/* Finished */}
                    {state.phase === 'finished' && (
                        <div className="w-full max-w-4xl">
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
