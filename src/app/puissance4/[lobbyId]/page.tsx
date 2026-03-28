// src/app/puissance4/[lobbyId]/page.tsx
'use client';

/**
 * Page de jeu — Puissance 4
 * Route : /puissance4/[lobbyId]
 *
 * Connexion socket vers le serveur Puissance 4 (port 10006)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { notFound } from 'next/navigation';
import { getPuissance4Socket } from '@/lib/socket';
import GameOverModal from '@/components/GameOverModal';
import GameScoreLeaderboard from '@/components/GameScoreLeaderboard';
import { useGamePage } from '@/hooks/useGamePage';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';

// ─── Types ────────────────────────────────────────────────────────────────────

type Cell = 0 | 1 | null;
type Grid = Cell[][];

interface PlayerInfo {
    userId: string;
    username: string;
    colorIndex: 0 | 1;
}

interface GameState {
    grid: Grid;
    currentTurn: 0 | 1;
    status: 'waiting' | 'playing' | 'finished';
    winner: 0 | 1 | 'draw' | null;
    winCells: [number, number][] | null;
    scores: [number, number];
    turnStartedAt: number | null;
    turnDuration: number;
    reason?: 'surrender' | null;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const ROWS = 6;
const COLS = 7;

const PLAYER_COLORS: Record<0 | 1, { ring: string; bg: string; text: string; glow: string; emoji: string }> = {
    0: { ring: 'ring-red-500', bg: 'bg-red-500', text: 'text-red-500', glow: 'shadow-red-500/60', emoji: '🔴' },
    1: { ring: 'ring-yellow-400', bg: 'bg-yellow-400', text: 'text-yellow-400', glow: 'shadow-yellow-400/60', emoji: '🟡' },
};

// ─── Composant timer ─────────────────────────────────────────────────────────

import TurnTimer from '@/components/TurnTimer';

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
    const { session, status, router, me, lobbyId, isNotFound, setIsNotFound, modalDismissed, setModalDismissed } = useGamePage();

    const socket = useMemo(() => getPuissance4Socket(), []);
    const joinedRef = useRef(false);

    const [players, setPlayers] = useState<PlayerInfo[]>([]);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [hoverCol, setHoverCol] = useState<number | null>(null);
    const [playerLeft, setPlayerLeft] = useState(false);
    const [dropping, setDropping] = useState(false);

    const myPlayer = players.find(p => p.userId === me.userId);
    const myColorIndex = myPlayer?.colorIndex ?? null;
    const isMyTurn = gameState?.status === 'playing' && gameState.currentTurn === myColorIndex;

    // Ensemble des cellules gagnantes pour lookup O(1)
    const winSet = useMemo(() => {
        if (!gameState?.winCells) return new Set<string>();
        return new Set(gameState.winCells.map(([r, c]) => `${r}-${c}`));
    }, [gameState?.winCells]);

    // Connexion socket
    useEffect(() => {
        if (!socket || !lobbyId || status !== 'authenticated' || !me.userId) return;

        const onPlayers = (data: PlayerInfo[]) => setPlayers(data);
        const onState = (state: GameState) => {
            setGameState(state);
            setDropping(false);
            if (state.status === 'playing') setModalDismissed(false);
        };
        const onPlayerLeft = () => setPlayerLeft(true);

        socket.on('notFound', () => setIsNotFound(true));
        socket.on('p4:players', onPlayers);
        socket.on('p4:state', onState);
        socket.on('p4:playerLeft', onPlayerLeft);

        if (!joinedRef.current) {
            joinedRef.current = true;
            socket.emit('p4:join', { lobbyId, userId: me.userId, username: me.username });
        }

        return () => {
            socket.off('notFound');
            socket.off('p4:players', onPlayers);
            socket.off('p4:state', onState);
            socket.off('p4:playerLeft', onPlayerLeft);
            joinedRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, lobbyId, status, me.userId]);

    const handleDrop = useCallback((col: number) => {
        if (!isMyTurn || dropping || !gameState) return;
        if (gameState.grid[0][col] !== null) return; // colonne pleine
        setDropping(true);
        socket?.emit('p4:drop', { lobbyId, col });
    }, [isMyTurn, dropping, gameState, socket, lobbyId]);

    if (status === 'loading') return <LoadingSpinner />;
    if (isNotFound) notFound();

    if (gameState?.status === 'waiting' && me.userId) return (
        <GameWaitingScreen icon="🔴" gameName="Puissance 4" lobbyId={lobbyId} players={players} myUserId={me.userId} />
    );

    const winnerPlayer = gameState?.winner !== null && gameState?.winner !== 'draw'
        ? players.find(p => p.colorIndex === gameState?.winner)
        : null;

    // Determine the active player for header center
    const player0 = players.find(p => p.colorIndex === 0);
    const player1 = players.find(p => p.colorIndex === 1);
    const activeTurn = gameState?.currentTurn;

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

            <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">

                {/* ── Header ── */}
                <header className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center gap-4">
                    {/* Left: title */}
                    <div className="w-48 shrink-0 font-bold text-base">
                        🔴 Puissance 4
                    </div>

                    {/* Center: player vs player with turn indicator */}
                    <div className="flex-1 flex justify-center items-center gap-2 text-sm">
                        {players.length === 2 && player0 && player1 ? (
                            <>
                                <span className={`flex items-center gap-1 transition-all ${gameState?.status === 'playing' && activeTurn === 0 ? 'font-bold' : 'font-normal opacity-60'}`}>
                                    {PLAYER_COLORS[0].emoji} {player0.username}
                                </span>
                                <span className="text-gray-400 dark:text-gray-600">vs</span>
                                <span className={`flex items-center gap-1 transition-all ${gameState?.status === 'playing' && activeTurn === 1 ? 'font-bold' : 'font-normal opacity-60'}`}>
                                    {player1.username} {PLAYER_COLORS[1].emoji}
                                </span>
                            </>
                        ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-xs">En attente de joueurs…</span>
                        )}
                    </div>

                    {/* Right: abandon */}
                    <div className="w-48 shrink-0 flex justify-end items-center gap-2 text-sm font-medium">
                        {gameState?.status === 'playing' && (
                            <button
                                onClick={() => { if (confirm('Abandonner la partie ?')) socket?.emit('p4:surrender'); }}
                                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 px-3 py-1.5 rounded-lg transition-all"
                            >
                                🏳️ Abandonner
                            </button>
                        )}
                    </div>
                </header>

                {/* ── Main ── */}
                <main className="flex-1 flex flex-col items-center justify-center p-4 gap-6">

                    {/* ── Indicateur de tour ── */}
                    {gameState?.status === 'playing' && (
                        <div className="flex flex-col items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            {isMyTurn
                                ? <span className="font-bold text-gray-900 dark:text-white animate-pulse">🎯 C'est votre tour !</span>
                                : <span>⏳ Tour de <strong className="text-gray-900 dark:text-white">{players.find(p => p.colorIndex === gameState.currentTurn)?.username}</strong>…</span>
                            }
                            {gameState.status === 'playing' && gameState.turnStartedAt && (
                                <TurnTimer
                                    endsAt={gameState.turnStartedAt + gameState.turnDuration * 1000}
                                    duration={gameState.turnDuration}
                                />
                            )}
                        </div>
                    )}

                    {/* ── Grille ── */}
                    <div
                        className="relative select-none"
                        onMouseLeave={() => setHoverCol(null)}
                    >
                        {/* Indicateur de colonne survolée */}
                        {isMyTurn && hoverCol !== null && gameState?.grid[0][hoverCol] === null && (
                            <div
                                className="absolute -top-8 transition-all duration-100"
                                style={{ left: `calc(${hoverCol} * (56px + 8px) + 4px)`, width: 56 }}
                            >
                                <div className={`w-12 h-6 rounded-full mx-auto ${PLAYER_COLORS[myColorIndex!].bg} opacity-80`}
                                    style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
                            </div>
                        )}

                        {/* Plateau */}
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
                                    const cellValue = gameState?.grid[row][col] ?? null;
                                    const isWin = winSet.has(`${row}-${col}`);
                                    const colHovered = hoverCol === col;
                                    const colFull = gameState?.grid[0][col] !== null;

                                    return (
                                        <div
                                            key={`${row}-${col}`}
                                            className={`relative rounded-full cursor-pointer transition-all duration-150
                      ${isMyTurn && !colFull ? 'cursor-pointer' : 'cursor-default'}
                      ${colHovered && isMyTurn && !colFull ? 'col-hover bg-white/5' : 'bg-black/30'}
                    `}
                                            onClick={() => handleDrop(col)}
                                            onMouseEnter={() => isMyTurn && setHoverCol(col)}
                                        >
                                            <CellPiece value={cellValue} isWin={isWin} />
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Numéros de colonnes */}
                        <div className="flex mt-1" style={{ gap: 8 }}>
                            {Array.from({ length: COLS }, (_, col) => (
                                <div key={col}
                                    onClick={() => handleDrop(col)}
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

                    {/* ── Joueur parti ── */}
                    {playerLeft && (
                        <div className="flex flex-col items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-8 py-6 shadow-sm">
                            <p className="text-gray-600 dark:text-gray-400">⚠️ Votre adversaire a quitté la partie.</p>
                            <button
                                onClick={() => router.push(`/lobby/create/${lobbyId}`)}
                                className="px-5 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-sm"
                            >
                                Retour au lobby
                            </button>
                            <button
                                onClick={() => router.push('/')}
                                className="px-5 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-sm"
                            >
                                Quitter
                            </button>
                        </div>
                    )}

                </main>

                {/* ── Overlay fin de partie ── */}
                {gameState?.status === 'finished' && !modalDismissed && (
                    <GameOverModal
                        emoji={gameState.winner === 'draw' ? '🤝' : winnerPlayer?.userId === me?.userId ? '🏆' : '😔'}
                        title={
                            gameState.winner === 'draw'
                                ? 'Match nul !'
                                : winnerPlayer?.userId === me?.userId
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
