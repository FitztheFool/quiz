// src/app/puissance4/[lobbyId]/page.tsx
'use client';

/**
 * Page de jeu — Puissance 4
 * Route : /puissance4/[lobbyId]
 *
 * Connexion socket vers le serveur Puissance 4 (port 10006)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getPuissance4Socket } from '@/lib/socket';
import { useChat } from '@/context/ChatContext';
import GameOverModal from '@/components/GameOverModal';
import LoadingSpinner from '@/components/LoadingSpinner';

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
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const ROWS = 6;
const COLS = 7;

const PLAYER_COLORS: Record<0 | 1, { ring: string; bg: string; text: string; glow: string; emoji: string }> = {
    0: { ring: 'ring-red-500', bg: 'bg-red-500', text: 'text-red-500', glow: 'shadow-red-500/60', emoji: '🔴' },
    1: { ring: 'ring-yellow-400', bg: 'bg-yellow-400', text: 'text-yellow-400', glow: 'shadow-yellow-400/60', emoji: '🟡' },
};

// ─── Composant timer ─────────────────────────────────────────────────────────

function TurnTimer({ turnStartedAt, turnDuration, active }: { turnStartedAt: number | null; turnDuration: number; active: boolean }) {
    const [remaining, setRemaining] = useState(turnDuration);

    useEffect(() => {
        if (!active || !turnStartedAt) { setRemaining(turnDuration); return; }
        const tick = () => {
            const elapsed = (Date.now() - turnStartedAt) / 1000;
            setRemaining(Math.max(0, turnDuration - elapsed));
        };
        tick();
        const id = setInterval(tick, 200);
        return () => clearInterval(id);
    }, [active, turnStartedAt, turnDuration]);

    const pct = (remaining / turnDuration) * 100;
    const urgent = remaining <= 10;

    return (
        <div className="flex items-center gap-3 w-full max-w-xs mx-auto">
            <span className={`text-2xl font-black tabular-nums w-12 text-right transition-colors ${urgent ? 'text-red-400 animate-pulse' : 'text-white/80'}`}>
                {Math.ceil(remaining)}s
            </span>
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-200 ${urgent ? 'bg-red-400' : 'bg-white/60'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

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
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams<{ lobbyId: string }>();
    const lobbyId = params?.lobbyId ?? '';

    const socket = useMemo(() => getPuissance4Socket(), []);
    const joinedRef = useRef(false);

    const [players, setPlayers] = useState<PlayerInfo[]>([]);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [hoverCol, setHoverCol] = useState<number | null>(null);
    const [playerLeft, setPlayerLeft] = useState(false);
    const [dropping, setDropping] = useState(false);

    // Trouver mon index de couleur
    const me = session?.user
        ? { userId: session.user.id, username: session.user.username ?? session.user.email ?? 'Joueur' }
        : null;

    const myPlayer = players.find(p => p.userId === me?.userId);
    const myColorIndex = myPlayer?.colorIndex ?? null;
    const isMyTurn = gameState?.status === 'playing' && gameState.currentTurn === myColorIndex;

    // Ensemble des cellules gagnantes pour lookup O(1)
    const winSet = useMemo(() => {
        if (!gameState?.winCells) return new Set<string>();
        return new Set(gameState.winCells.map(([r, c]) => `${r}-${c}`));
    }, [gameState?.winCells]);


    const { setLobbyId } = useChat();

    useEffect(() => {
        setLobbyId(lobbyId);
        return () => setLobbyId(null);
    }, [lobbyId]);

    // Connexion socket
    useEffect(() => {
        if (!socket || !lobbyId || status !== 'authenticated' || !me) return;

        const onPlayers = (data: PlayerInfo[]) => setPlayers(data);
        const onState = (state: GameState) => { setGameState(state); setDropping(false); };
        const onPlayerLeft = () => setPlayerLeft(true);

        socket.on('p4:players', onPlayers);
        socket.on('p4:state', onState);
        socket.on('p4:playerLeft', onPlayerLeft);

        if (!joinedRef.current) {
            joinedRef.current = true;
            socket.emit('p4:join', { lobbyId, userId: me.userId, username: me.username });
        }

        return () => {
            socket.off('p4:players', onPlayers);
            socket.off('p4:state', onState);
            socket.off('p4:playerLeft', onPlayerLeft);
            joinedRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, lobbyId, status, me?.userId]);

    const handleDrop = useCallback((col: number) => {
        if (!isMyTurn || dropping || !gameState) return;
        if (gameState.grid[0][col] !== null) return; // colonne pleine
        setDropping(true);
        socket?.emit('p4:drop', { lobbyId, col });
    }, [isMyTurn, dropping, gameState, socket, lobbyId]);

    const handleRematch = () => socket?.emit('p4:rematch', { lobbyId });

    if (status === 'loading') return <LoadingSpinner />;

    const winnerPlayer = gameState?.winner !== null && gameState?.winner !== 'draw'
        ? players.find(p => p.colorIndex === gameState?.winner)
        : null;

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

            <div
                className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 gap-6"
            >
                {/* ── Header ── */}

                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight" style={{ fontFamily: 'system-ui, sans-serif' }}>
                    Puissance <span style={{ color: '#f59e0b' }}>4</span>
                </h1>

                {/* ── Scores ── */}
                {players.length === 2 && (
                    <div className="flex items-center gap-6">
                        {players.map((p) => {
                            const c = PLAYER_COLORS[p.colorIndex];
                            const score = gameState?.scores[p.colorIndex] ?? 0;
                            const isTurn = gameState?.status === 'playing' && gameState.currentTurn === p.colorIndex;
                            return (
                                <div key={p.userId}
                                    className={`flex flex-col items-center px-5 py-3 rounded-2xl transition-all duration-300 ${isTurn ? 'bg-white/10 scale-105' : 'bg-white/5'}`}
                                >
                                    <span className="text-lg">{c.emoji}</span>
                                    <span className="text-white font-semibold text-sm mt-1 max-w-[100px] truncate">{p.username}</span>
                                    <span className={`text-3xl font-black ${c.text}`}>{score}</span>
                                    {p.userId === me?.userId && <span className="text-[10px] text-white/30 mt-0.5">vous</span>}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Indicateur de tour ── */}
                {gameState?.status === 'playing' && (
                    <div className="flex flex-col items-center gap-2 text-white/70 text-sm">
                        {isMyTurn
                            ? <span className="text-white font-bold animate-pulse">🎯 C'est votre tour !</span>
                            : <span>⏳ Tour de <strong className="text-white">{players.find(p => p.colorIndex === gameState.currentTurn)?.username}</strong>…</span>
                        }
                        <TurnTimer
                            turnStartedAt={gameState.turnStartedAt}
                            turnDuration={gameState.turnDuration}
                            active={gameState.status === 'playing'}
                        />
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
                  ${isMyTurn ? 'cursor-pointer text-white/30 hover:text-white/70' : 'text-white/10 cursor-default'}`}
                            >
                                {col + 1}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Overlay fin de partie ── */}
                {gameState?.status === 'finished' && (
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
                            winnerPlayer && gameState.winner !== 'draw'
                                ? `${PLAYER_COLORS[winnerPlayer.colorIndex].emoji} 4 en ligne !`
                                : undefined
                        }
                        onLobby={() => router.push(`/lobby/create/${lobbyId}`)}
                        onLeave={() => router.push('/')}
                        asModal
                    />
                )}

                {/* ── En attente d'un joueur ── */}
                {gameState?.status === 'waiting' && !playerLeft && (
                    <div className="flex flex-col items-center gap-2">
                        <LoadingSpinner fullScreen={false} message="En attente d'un adversaire…" />
                        <p className="text-xs text-white/30 font-mono">{lobbyId}</p>
                    </div>
                )}

                {/* ── Joueur parti ── */}
                {playerLeft && (
                    <div className="flex flex-col items-center gap-3">
                        <p className="text-white/70">⚠️ Votre adversaire a quitté la partie.</p>
                        <button
                            onClick={() => router.push(`/lobby/create/${lobbyId}`)}
                            className="px-5 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all text-sm"
                        >
                            Retour au lobby
                        </button>
                        <button
                            onClick={() => router.push('/')}
                            className="px-5 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-all text-sm"
                        >
                            Quitter
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
