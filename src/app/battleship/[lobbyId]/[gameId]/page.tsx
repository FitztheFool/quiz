// src/app/Battleship/[lobbyId]/page.tsx
'use client';

import { useMemo, useState } from 'react';
import { notFound } from 'next/navigation';
import { useBattleship } from '@/hooks/useBattleship';
import { useGamePage } from '@/hooks/useGamePage';
import PlacementPhase from '@/components/Battleship/PlacementPhase';
import BattleshipBoard from '@/components/Battleship/BattleshipBoard';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';
import GameOverModal from '@/components/GameOverModal';
import GameScoreLeaderboard from '@/components/GameScoreLeaderboard';

// ── Turn timer bar ────────────────────────────────────────────────────────────

import TurnTimer from '@/components/TurnTimer';
const TurnTimerBar = ({ endsAt, duration }: { endsAt: number; duration: number }) => <TurnTimer endsAt={endsAt} duration={duration} label="Temps restant" />;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BattleshipPage() {
    const { session, status, router, me: meInfo, lobbyId, modalDismissed, setModalDismissed } = useGamePage();

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

    const { state, placeShips, shoot, surrender, clearError, gameNotFound } = useBattleship({
        lobbyId,
        userId: meInfo.userId,
        username: meInfo.username,
        avatar: session?.user?.image ?? null,
        options,
    });

    const [lastShot, setLastShot] = useState<string | null>(null);

    if (status === 'loading') return <LoadingSpinner />;
    if (gameNotFound) notFound();
    if (status !== 'authenticated') { router.push('/login'); return null; }

    const myUserId = meInfo.userId;
    const isMyTurn = state.currentTurnUserId === myUserId;

    if (state.phase === 'waiting') return (
        <GameWaitingScreen icon="🚢" gameName="Bataille Navale" lobbyId={lobbyId}
            players={state.players.filter((p): p is NonNullable<typeof p> => p !== null)}
            myUserId={myUserId} />
    );

    // Spectator view
    if (state.yourSeat === null && state.players.some(p => p !== null)) {
        const p0 = state.players[0];
        const p1 = state.players[1];
        const currentTurnPlayer = state.players.find(p => p?.userId === state.currentTurnUserId);
        const winnerPlayer = state.players.find(p => p?.userId === state.winnerUserId);
        return (
            <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
                <header className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center gap-2">
                    <span className="text-xl">⚓</span>
                    <h1 className="text-sm font-bold tracking-tight">Bataille Navale</h1>
                    <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">Spectateur</span>
                </header>
                <main className="flex-1 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 flex flex-col items-center gap-4 text-center max-w-sm w-full">
                        <div className="text-3xl">👁️</div>
                        <p className="font-semibold text-gray-700 dark:text-gray-200">
                            {p0?.username ?? '?'} <span className="text-gray-400">vs</span> {p1?.username ?? '?'}
                        </p>
                        {state.phase === 'placement' && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Phase de placement…</p>
                        )}
                        {state.phase === 'playing' && currentTurnPlayer && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Tour de <span className="font-semibold text-gray-700 dark:text-gray-200">{currentTurnPlayer.username}</span></p>
                        )}
                        {state.phase === 'finished' && (
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                {winnerPlayer ? `${winnerPlayer.username} a gagné !` : 'Partie terminée'}
                            </p>
                        )}
                        <button onClick={() => router.push(`/lobby/create/${lobbyId}`)} className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                            Retour au lobby
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    const opponent = state.players.find((p) => p?.userId !== myUserId) ?? null;
    const me = state.players.find((p) => p?.userId === myUserId) ?? null;

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">

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
                            {opponent?.username ?? 'Adversaire'}
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
            {state.phase === 'finished' && !modalDismissed && (() => {
                const won = state.winnerUserId === myUserId;
                const reasonLabel: Record<string, string> = {
                    all_sunk: won ? 'Vous avez coulé toute la flotte ennemie !' : 'Votre flotte a été détruite.',
                    surrender: won ? "L'adversaire a abandonné." : 'Vous avez abandonné.',
                    disconnect: won ? "L'adversaire s'est déconnecté." : 'Vous avez été déconnecté.',
                };
                const orderedPlayers = [...state.players].sort((a, b) =>
                    (b?.userId === state.winnerUserId ? 1 : 0) - (a?.userId === state.winnerUserId ? 1 : 0)
                );
                return (
                    <GameOverModal
                        emoji={won ? '🏆' : '💀'}
                        title={won ? 'Victoire !' : 'Défaite'}
                        subtitle={reasonLabel[state.gameOverReason ?? ''] ?? ''}
                        onLobby={() => router.push(`/lobby/create/${lobbyId}`)}
                        onLeave={() => router.push('/')}
                        onClose={() => setModalDismissed(true)}
                        asModal
                    >
                        <GameScoreLeaderboard
                            myUserId={myUserId}
                            entries={orderedPlayers.filter(Boolean).map((p) => {
                                const isWinner = p!.userId === state.winnerUserId;
                                const isLoserByForfeit = !isWinner && (state.gameOverReason === 'surrender' || state.gameOverReason === 'disconnect');
                                return {
                                    userId: p!.userId,
                                    username: p!.username,
                                    score: isWinner ? 'Victoire' : 'Défaite',
                                    badges: isLoserByForfeit ? [state.gameOverReason === 'surrender' ? 'Abandon' : 'Déconnexion'] : undefined,
                                    disqualified: isLoserByForfeit,
                                };
                            })}
                        />
                    </GameOverModal>
                );
            })()}
        </div>
    );
}
