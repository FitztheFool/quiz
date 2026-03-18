'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useBattleship } from '@/hooks/useBattleship';
import PlacementPhase from '@/components/PlacementPhase';
import BattleshipBoard from '@/components/BattleshipBoard';
import LoadingSpinner from '@/components/LoadingSpinner';
import FloatingChat from '@/components/FloatingChat';
import { useChat } from '@/context/ChatContext';

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
            <div className="flex justify-between text-xs text-slate-400">
                <span>Temps restant</span>
                <span className={`font-mono font-bold ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : ''}`}>{timeLeft}s</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-200 ${color}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

// ── Game over screen ──────────────────────────────────────────────────────────

function GameOverScreen({
    winnerUserId,
    myUserId,
    reason,
    onLobby,
    onLeave,
}: {
    winnerUserId: string | null;
    myUserId: string;
    reason: string | null;
    onLobby: () => void;
    onLeave: () => void;
}) {
    const won = winnerUserId === myUserId;

    const reasonLabel: Record<string, string> = {
        all_sunk: won ? 'Vous avez coulé toute la flotte ennemie !' : 'Votre flotte a été détruite.',
        surrender: won ? 'L\'adversaire a abandonné.' : 'Vous avez abandonné.',
        disconnect: won ? 'L\'adversaire s\'est déconnecté.' : 'Vous avez été déconnecté.',
    };

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-sm w-full mx-4 text-center space-y-6 shadow-2xl">
                <div className="text-6xl">{won ? '🏆' : '💀'}</div>
                <div>
                    <h2 className={`text-2xl font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>
                        {won ? 'Victoire !' : 'Défaite'}
                    </h2>
                    <p className="text-slate-400 text-sm mt-2">{reasonLabel[reason ?? ''] ?? ''}</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onLobby}
                        className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/20"
                    >
                        Retour au lobby
                    </button>
                    <button
                        onClick={onLeave}
                        className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-400 text-sm font-semibold hover:border-slate-500 hover:text-slate-200 transition-all"
                    >
                        Quitter
                    </button>
                </div>
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
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">

            {/* Header */}
            <header className="border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-xl">⚓</span>
                    <h1 className="text-base font-bold tracking-tight">Bataille Navale</h1>
                </div>

                {/* Players */}
                <div className="flex items-center gap-2 text-sm">
                    <span className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${isMyTurn && state.phase === 'playing' ? 'border-blue-400 bg-blue-500/20 text-blue-300' : 'border-slate-700 text-slate-400'}`}>
                        {me?.username ?? 'Vous'}
                        {isMyTurn && state.phase === 'playing' && ' ⚡'}
                    </span>
                    <span className="text-slate-600">VS</span>
                    <span className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${!isMyTurn && state.phase === 'playing' ? 'border-orange-400 bg-orange-500/20 text-orange-300' : 'border-slate-700 text-slate-400'}`}>
                        {opponent?.username ?? (state.phase === 'waiting' ? 'En attente…' : 'Adversaire')}
                        {!isMyTurn && state.phase === 'playing' && ' ⚡'}
                    </span>
                </div>

                {/* Surrender */}
                {state.phase === 'playing' && (
                    <button
                        onClick={() => { if (confirm('Abandonner la partie ?')) surrender(); }}
                        className="text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-3 py-1.5 rounded-lg transition-all"
                    >
                        🏳️ Abandonner
                    </button>
                )}
            </header>

            {/* Error toast */}
            {state.error && (
                <div
                    className="mx-4 mt-3 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm flex justify-between items-center cursor-pointer"
                    onClick={clearError}
                >
                    <span>⚠️ {state.error}</span>
                    <span className="text-red-400 ml-4">✕</span>
                </div>
            )}

            {/* Body */}
            <main className="flex flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col items-center gap-6">

                    {/* Waiting */}
                    {state.phase === 'waiting' && (
                        <div className="flex flex-col items-center gap-4 py-16">
                            <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-400">En attente du second joueur…</p>
                            <p className="text-slate-600 text-xs font-mono">{lobbyId}</p>
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
                        <div className="w-full max-w-4xl space-y-4">
                            {/* Turn indicator */}
                            <div className={`px-4 py-2 rounded-xl text-center text-sm font-semibold ${isMyTurn ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                                {isMyTurn ? '🎯 C\'est votre tour — Choisissez une case à tirer !' : `⏳ Tour de ${opponent?.username ?? 'l\'adversaire'}…`}
                            </div>

                            {/* Timer */}
                            {state.turnEndsAt && (
                                <TurnTimerBar
                                    endsAt={state.turnEndsAt}
                                    duration={options.turnDuration ?? 30}
                                />
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

                    {/* Finished — show final grids */}
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

                {/* Chat sidebar */}
                <div className="hidden lg:flex w-72 border-l border-slate-800 flex-col">
                    <FloatingChat />
                </div>
            </main>

            {/* Game over modal */}
            {state.phase === 'finished' && (
                <GameOverScreen
                    winnerUserId={state.winnerUserId}
                    myUserId={myUserId}
                    reason={state.gameOverReason}
                    onLobby={() => router.push(`/lobby/create/${lobbyId}`)}
                    onLeave={() => router.push('/')}
                />
            )}
        </div>
    );
}
