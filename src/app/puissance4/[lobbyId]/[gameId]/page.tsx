'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import { useGamePage } from '@/hooks/useGamePage';
import { usePuissance4, isBot, PlayerInfo, Cell } from '@/hooks/usePuissance4';
import GameOverModal from '@/components/GameOverModal';
import GameScoreLeaderboard from '@/components/GameScoreLeaderboard';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';
import TimerBar from '@/components/TimerBar';
import GamePageHeader from '@/components/GamePageHeader';
import SurrenderButton from '@/components/SurrenderButton';

const ROWS = 6;
const COLS = 7;

const PLAYER_COLORS: Record<0 | 1, { ring: string; bg: string; text: string; glow: string; emoji: string }> = {
    0: { ring: 'ring-red-500', bg: 'bg-red-500', text: 'text-red-500', glow: 'shadow-red-500/60', emoji: '🔴' },
    1: { ring: 'ring-yellow-400', bg: 'bg-yellow-400', text: 'text-yellow-400', glow: 'shadow-yellow-400/60', emoji: '🟡' },
};

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

function BotBadge() {
    return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 leading-none">
            BOT
        </span>
    );
}

function PlayerLabel({ player, active, vsBot: _vsBot }: { player: PlayerInfo; active: boolean; vsBot: boolean }) {
    const bot = isBot(player);
    return (
        <span className={`flex items-center gap-1.5 transition-all ${active ? 'font-bold' : 'font-normal opacity-60'}`}>
            {PLAYER_COLORS[player.colorIndex].emoji}
            {bot ? '🤖' : ''} {player.username}
            {bot && <BotBadge />}
        </span>
    );
}

export default function Puissance4Page() {
    const { status, router, me, lobbyId, isNotFound, setIsNotFound, modalDismissed, setModalDismissed } = useGamePage();

    const { players, gameState, myColorIndex, isMyTurn, vsBot, winSet, drop, surrender } = usePuissance4({
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

    // En mode solo vs bot, le surrender n'a pas de sens (on peut juste quitter)
    const showSurrender = gameState.status === 'playing' && !vsBot;

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

            <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">

                <GamePageHeader
                    left={<span className="font-bold">🔴 Puissance 4{vsBot && <span className="ml-2 text-xs font-normal text-indigo-400">vs Bot</span>}</span>}
                    center={
                        <div className="flex items-center gap-2 text-sm">
                            {players.length === 2 && player0 && player1 ? (
                                <>
                                    <PlayerLabel player={player0} active={gameState.status === 'playing' && gameState.currentTurn === 0} vsBot={vsBot} />
                                    <span className="text-gray-400 dark:text-gray-600">vs</span>
                                    <PlayerLabel player={player1} active={gameState.status === 'playing' && gameState.currentTurn === 1} vsBot={vsBot} />
                                </>
                            ) : (
                                <span className="text-gray-400 dark:text-gray-500 text-xs">En attente de joueurs…</span>
                            )}
                        </div>
                    }
                    right={showSurrender && <SurrenderButton onSurrender={surrender} />}
                />

                {gameState.status === 'playing' && (
                    <TimerBar
                        endsAt={gameState.turnStartedAt ? gameState.turnStartedAt + gameState.turnDuration * 1000 : null}
                        duration={gameState.turnDuration}
                        label={
                            isMyTurn
                                ? '🎯 Votre tour'
                                : vsBot && isBot(players.find(p => p.colorIndex === gameState.currentTurn))
                                    ? '🤖 Le bot réfléchit…'
                                    : `⏳ Tour de ${players.find(p => p.colorIndex === gameState.currentTurn)?.username ?? '…'}`
                        }
                    />
                )}

                <main className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
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
                                background: 'rgba(15,30,80,0.95)',
                                backdropFilter: 'blur(12px)',
                                border: '2px solid rgba(30,60,140,0.8)',
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
                                                ${colHovered && isMyTurn && !colFull ? 'col-hover bg-white/10' : 'bg-black/60'}
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

                {gameState.status === 'finished' && !modalDismissed && (
                    <GameOverModal
                        emoji={gameState.winner === 'draw' ? '🤝' : winnerPlayer?.userId === me.userId ? '🏆' : isBot(winnerPlayer) ? '🤖' : '😔'}
                        title={
                            gameState.winner === 'draw'
                                ? 'Match nul !'
                                : winnerPlayer?.userId === me.userId
                                    ? 'Vous avez gagné !'
                                    : isBot(winnerPlayer)
                                        ? 'Le bot gagne !'
                                        : `${winnerPlayer?.username ?? 'Adversaire'} gagne !`
                        }
                        subtitle={
                            gameState.reason === 'surrender' ? 'Abandon'
                                : gameState.reason === 'afk' ? 'AFK'
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
                                const isLoserByAfk = !isWinner && gameState.reason === 'afk';
                                const bot = isBot(p);
                                return {
                                    userId: p!.userId,
                                    username: bot ? `🤖 ${p!.username}` : p!.username,
                                    score: `${gameState.scores[p!.colorIndex] ?? 0} victoire${(gameState.scores[p!.colorIndex] ?? 0) !== 1 ? 's' : ''}`,
                                    badges: [
                                        ...(bot ? ['Bot'] : []),
                                        ...(isLoserBySurrender ? ['Abandon'] : []),
                                        ...(isLoserByAfk ? ['AFK'] : []),
                                    ],
                                    disqualified: isLoserBySurrender || isLoserByAfk,
                                };
                            })}
                        />
                    </GameOverModal>
                )}
            </div>
        </>
    );
}
