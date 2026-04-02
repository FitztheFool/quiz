// src/app/puissance4/[lobbyId]/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { notFound } from 'next/navigation';
import { useGamePage } from '@/hooks/useGamePage';
import { usePuissance4, PlayerInfo, Cell } from '@/hooks/usePuissance4';
import GameOverModal from '@/components/GameOverModal';
import GameScoreLeaderboard from '@/components/GameScoreLeaderboard';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';
import TurnTimer from '@/components/TurnTimer';

// ─── Constantes ───────────────────────────────────────────────────────────────

const ROWS = 6;
const COLS = 7;

const PLAYER_COLORS: Record<0 | 1, { ring: string; bg: string; text: string; glow: string; emoji: string }> = {
    0: { ring: 'ring-red-500', bg: 'bg-red-500', text: 'text-red-500', glow: 'shadow-red-500/60', emoji: '🔴' },
    1: { ring: 'ring-yellow-400', bg: 'bg-yellow-400', text: 'text-yellow-400', glow: 'shadow-yellow-400/60', emoji: '🟡' },
};

// ─── Composant cellule ────────────────────────────────────────────────────────

function CellPiece({ value, isWin }: { value: Cell; isWin: boolean }) {
    if (value === null) return null;
    const c = PLAYER_COLORS[value];
    return (
        <div
            className={`absolute inset-1 rounded-full ${c.bg} ${isWin ? `ring-4 ring-white shadow-lg ${c.glow} shadow-xl` : ''} transition-all duration-300`}
            style={{ animation: 'dropIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both' }}
        />
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Puissance4Page() {
    const { status, router, me, lobbyId, isNotFound, setIsNotFound, modalDismissed, setModalDismissed } = useGamePage();

    const { players, gameState, myColorIndex, isMyTurn, winSet, drop, surrender } = usePuissance4({
        lobbyId,
        userId: me.userId,
        username: me.username ?? '',
        onNotFound: () => setIsNotFound(true),
        onModalReset: () => setModalDismissed(false),
    });

    const [hoverCol, setHoverCol] = useState<number | null>(null);

    if (status === 'loading') return <LoadingSpinner />;
    if (isNotFound) notFound();

    if (!gameState || gameState.status === 'waiting') return (
        <GameWaitingScreen icon="🔴" gameName="Puissance 4" lobbyId={lobbyId} players={players} myUserId={me.userId} />
    );

    const winnerPlayer = gameState.winner !== null && gameState.winner !== 'draw'
        ? players.find(p => p.colorIndex === gameState.winner)
        : null;

    const player0 = players.find(p => p.colorIndex === 0);
    const player1 = players.find(p => p.colorIndex === 1);

    return (
        <>
            <style>{`
        @keyframes dropIn {
          from { transform: translateY(-400%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.1); }
          50%       { box-shadow: 0 0 24px 6px rgba(255,255,255,0.15); }
        }
        .col-hover { animation: pulse-glow 1.5s ease-in-out infinite; }
      `}</style>

            <div className="flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">

                {/* ── Header ── */}
                <header className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center gap-4">
                    <div className="w-48 shrink-0 font-bold text-base">
                        🔴 Puissance 4
                    </div>

                    <div className="flex-1 flex justify-center items-center gap-2 text-sm">
                        {players.length === 2 && player0 && player1 ? (
                            <>
                                <span className={`flex items-center gap-1 transition-all ${gameState.status === 'playing' && gameState.currentTurn === 0 ? 'font-bold' : 'font-normal opacity-60'}`}>
                                    {PLAYER_COLORS[0].emoji} {player0.username}
                                </span>
                                <span className="text-gray-400 dark:text-gray-600">vs</span>
                                <span className={`flex items-center gap-1 transition-all ${gameState.status === 'playing' && gameState.currentTurn === 1 ? 'font-bold' : 'font-normal opacity-60'}`}>
                                    {player1.username} {PLAYER_COLORS[1].emoji}
                                </span>
                            </>
                        ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-xs">En attente de joueurs…</span>
                        )}
                    </div>

                    <div className="w-48 shrink-0 flex justify-end items-center gap-2 text-sm font-medium">
                        {gameState.status === 'playing' && (
                            <button
                                onClick={() => { if (confirm('Abandonner la partie ?')) surrender(); }}
                                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 px-3 py-1.5 rounded-lg transition-all"
                            >
                                🏳️ Abandonner
                            </button>
                        )}
                    </div>
                </header>

                {/* ── Main ── */}
                <main className="flex-1 flex flex-col items-center justify-center p-4 gap-6">

                    {gameState.status === 'playing' && (
                        <div className="flex flex-col items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            {isMyTurn
                                ? <span className="font-bold text-gray-900 dark:text-white animate-pulse">🎯 C'est votre tour !</span>
                                : <span>⏳ Tour de <strong className="text-gray-900 dark:text-white">{players.find(p => p.colorIndex === gameState.currentTurn)?.username}</strong>…</span>
                            }
                            {gameState.turnStartedAt && (
                                <TurnTimer
                                    endsAt={gameState.turnStartedAt + gameState.turnDuration * 1000}
                                    duration={gameState.turnDuration}
                                />
                            )}
                        </div>
                    )}

                    <div className="relative select-none" onMouseLeave={() => setHoverCol(null)}>
                        {isMyTurn && hoverCol !== null && gameState.grid[0][hoverCol] === null && (
                            <div
                                className="absolute -top-8 transition-all duration-100"
                                style={{ left: `calc(${hoverCol} * (56px + 8px) + 4px)`, width: 56 }}
                            >
                                <div className={`w-12 h-6 rounded-full mx-auto ${PLAYER_COLORS[myColorIndex!].bg} opacity-80`}
                                    style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
                            </div>
                        )}

                        <div
                            className="rounded-2xl p-3 gap-2 grid"
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                gridTemplateColumns: `repeat(${COLS}, 56px)`,
                                gridTemplateRows: `repeat(${ROWS}, 56px)`,
                            }}
                        >
                            {Array.from({ length: ROWS }, (_, row) =>
                                Array.from({ length: COLS }, (_, col) => {
                                    const cellValue = gameState.grid[row][col] ?? null;
                                    const isWin = winSet.has(`${row}-${col}`);
                                    const colHovered = hoverCol === col;
                                    const colFull = gameState.grid[0][col] !== null;
                                    return (
                                        <div
                                            key={`${row}-${col}`}
                                            className={`relative rounded-full transition-all duration-150
                                                ${isMyTurn && !colFull ? 'cursor-pointer' : 'cursor-default'}
                                                ${colHovered && isMyTurn && !colFull ? 'col-hover bg-white/5' : 'bg-black/30'}
                                            `}
                                            onClick={() => drop(col)}
                                            onMouseEnter={() => isMyTurn && setHoverCol(col)}
                                        >
                                            <CellPiece value={cellValue} isWin={isWin} />
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="flex mt-1" style={{ gap: 8 }}>
                            {Array.from({ length: COLS }, (_, col) => (
                                <div key={col}
                                    onClick={() => drop(col)}
                                    onMouseEnter={() => isMyTurn && setHoverCol(col)}
                                    className={`w-14 text-center text-xs font-semibold rounded transition-colors duration-150
                                        ${isMyTurn
                                            ? 'cursor-pointer text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                            : 'text-gray-300 dark:text-gray-700 cursor-default'}`}
                                >
                                    {col + 1}
                                </div>
                            ))}
                        </div>
                    </div>
                </main>

                {/* ── Overlay fin de partie ── */}
                {gameState.status === 'finished' && !modalDismissed && (
                    <GameOverModal
                        emoji={gameState.winner === 'draw' ? '🤝' : winnerPlayer?.userId === me.userId ? '🏆' : '😔'}
                        title={
                            gameState.winner === 'draw'
                                ? 'Match nul !'
                                : winnerPlayer?.userId === me.userId
                                    ? 'Vous avez gagné !'
                                    : `${winnerPlayer?.username ?? 'Adversaire'} gagne !`
                        }
                        subtitle={
                            gameState.reason === 'surrender'
                                ? 'Abandon'
                                : winnerPlayer && gameState.winner !== 'draw'
                                    ? `${PLAYER_COLORS[winnerPlayer.colorIndex].emoji} 4 en ligne !`
                                    : undefined
                        }
                        onLobby={() => router.push(`/lobby/create/${lobbyId}`)}
                        onLeave={() => router.push('/')}
                        onClose={() => setModalDismissed(true)}
                        asModal
                    >
                        <GameScoreLeaderboard
                            myUserId={me.userId}
                            entries={[player0, player1].filter(Boolean).sort((a, b) =>
                                (gameState.scores[b!.colorIndex] ?? 0) - (gameState.scores[a!.colorIndex] ?? 0)
                            ).map((p) => {
                                const isWinner = p!.userId === winnerPlayer?.userId;
                                const isLoserBySurrender = !isWinner && gameState.reason === 'surrender';
                                return {
                                    userId: p!.userId,
                                    username: p!.username,
                                    score: `${gameState.scores[p!.colorIndex] ?? 0} victoire${(gameState.scores[p!.colorIndex] ?? 0) !== 1 ? 's' : ''}`,
                                    badges: isLoserBySurrender ? ['Abandon'] : undefined,
                                    disqualified: isLoserBySurrender,
                                };
                            })}
                        />
                    </GameOverModal>
                )}
            </div>
        </>
    );
}
