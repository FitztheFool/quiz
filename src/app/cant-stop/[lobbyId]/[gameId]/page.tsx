'use client';

import { notFound } from 'next/navigation';
import { useGamePage } from '@/hooks/useGamePage';
import { useCantStop, isBot } from '@/hooks/useCantStop';
import GameOverModal from '@/components/GameOverModal';
import GameScoreLeaderboard from '@/components/GameScoreLeaderboard';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';
import GameIcon from '@/components/GameIcon';
import TimerBar from '@/components/TimerBar';
import GamePageHeader from '@/components/GamePageHeader';
import SurrenderButton from '@/components/SurrenderButton';
import BotBadge from '@/components/shared/BotBadge';
import Board from '@/components/CantStop/Board';
import SplitChoice from '@/components/CantStop/SplitChoice';
import { colorForIndex } from '@/components/CantStop/colors';
import { GameLogSidebar } from '@/components/GameLog';
import { TrophyIcon, XCircleIcon, CpuChipIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function CantStopPage() {
    const { status, router, me, lobbyId, isNotFound, setIsNotFound, modalDismissed, setModalDismissed } = useGamePage();

    const { state, me: myPlayer, isMyTurn, vsBot, bustedFlash, pickSplit, roll, stop, surrender } = useCantStop({
        lobbyId,
        userId: me.userId,
        username: me.username ?? '',
        onNotFound: () => setIsNotFound(true),
        onModalReset: () => setModalDismissed(false),
    });

    if (status === 'loading') return <LoadingSpinner message="Vérification de la session..." />;
    if (isNotFound) notFound();
    if (!state) return (
        <GameWaitingScreen gameType="cant_stop" gameName="Can't Stop" lobbyId={lobbyId} players={[]} myUserId={me.userId} />
    );

    const currentPlayer = state.players[state.currentPlayerIndex] ?? null;
    const currentIsBot = isBot(currentPlayer);
    const showSurrender = state.phase !== 'ended' && myPlayer?.alive === true;
    const winner = state.winnerUserId ? state.players.find(p => p.userId === state.winnerUserId) ?? null : null;
    const isWinner = winner?.userId === me.userId;

    return (
        <div className="flex-1 flex flex-col wood-table text-amber-50">
            <GamePageHeader
                left={
                    <>
                        <GameIcon gameType="cant_stop" className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        <span className="font-bold">
                            Can&apos;t Stop
                            {vsBot && <span className="ml-2 text-xs font-normal text-indigo-600 dark:text-indigo-400">vs Bot</span>}
                        </span>
                    </>
                }
                center={
                    <div className="flex items-center gap-2 text-xs flex-wrap justify-center">
                        <span className="text-gray-500 dark:text-gray-400">Premier à {state.options.columnsToWin} colonnes</span>
                    </div>
                }
                right={showSurrender && <SurrenderButton onSurrender={surrender} />}
            />

            {state.phase !== 'ended' && (
                <TimerBar
                    endsAt={state.turnStartedAt ? state.turnStartedAt + state.turnDuration * 1000 : null}
                    duration={state.turnDuration}
                    label={
                        isMyTurn ? (state.phase === 'rolling' ? 'Choisissez un split' : 'Continuer ou stopper ?')
                            : currentIsBot ? 'Le bot réfléchit…'
                                : `Tour de ${currentPlayer?.username ?? '…'}`
                    }
                />
            )}

            <main className="flex-1 flex flex-col lg:flex-row gap-4 p-3 md:p-6">
              <div className="flex-1 flex flex-col items-center gap-4 min-w-0">
                {bustedFlash && (
                    <div className="px-4 py-2 rounded-xl bg-red-600/80 text-white font-bold text-sm animate-pulse">
                        <ExclamationTriangleIcon className="inline-block w-4 h-4 align-middle mr-1" />
                        {bustedFlash.username} a fait un bust ! Progression perdue.
                    </div>
                )}

                {/* Players bar */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                    {state.players.map((p, idx) => {
                        const color = colorForIndex(idx);
                        const isCurrent = idx === state.currentPlayerIndex;
                        return (
                            <div key={p.userId}
                                className={`wood-tile px-3 py-1.5 rounded-xl flex items-center gap-2 ${isCurrent && p.alive ? 'ring-2 ring-yellow-400 shadow-yellow-300/30 shadow-lg' : ''} ${!p.alive ? 'opacity-50 grayscale' : ''}`}>
                                <span className="w-4 h-4 rounded-full border-2 shadow" style={{ background: color.bg, borderColor: color.border }} />
                                <span className="text-sm font-extrabold text-amber-950 drop-shadow-sm">{p.username}</span>
                                {isBot(p) && <BotBadge />}
                                <span className="text-xs font-mono font-bold text-amber-50 bg-amber-900/80 px-1.5 py-0.5 rounded">{p.claimed.length}/{state.options.columnsToWin}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Board */}
                <Board state={state} />

                {/* Action zone */}
                {state.phase !== 'ended' && myPlayer?.alive && isMyTurn && (
                    <div className="wood-tile rounded-2xl px-5 py-4 w-full max-w-xl space-y-3">
                        {state.phase === 'rolling' && (
                            <>
                                <h2 className="font-extrabold text-amber-950">Choisissez un split</h2>
                                <SplitChoice dice={state.dice} splits={state.splits} onPick={pickSplit} />
                            </>
                        )}
                        {state.phase === 'choosing' && (
                            <>
                                <h2 className="font-extrabold text-amber-950">Continuer ou stopper ?</h2>
                                <div className="flex gap-2">
                                    <button onClick={roll}
                                        className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/30">
                                        Re-lancer
                                    </button>
                                    <button onClick={stop}
                                        className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold shadow-lg shadow-green-500/30">
                                        Stopper (banker)
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {state.phase !== 'ended' && !isMyTurn && (
                    <p className="text-sm text-amber-100/80 animate-pulse">Tour de <span className="font-bold">{currentPlayer?.username ?? '…'}</span></p>
                )}

                {myPlayer && !myPlayer.alive && state.phase !== 'ended' && (
                    <div className="wood-tile px-5 py-3 rounded-xl text-sm text-amber-900 inline-flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-4 h-4 text-amber-700" />
                        Vous êtes éliminé — observez la fin de la partie.
                    </div>
                )}
              </div>

              <GameLogSidebar entries={state.log ?? []} />
            </main>

            {state.phase === 'ended' && winner && !modalDismissed && (
                <GameOverModal
                    icon={isWinner ? <TrophyIcon className="w-8 h-8 text-amber-500" />
                        : isBot(winner) ? <CpuChipIcon className="w-8 h-8 text-indigo-400" />
                            : <XCircleIcon className="w-8 h-8 text-red-400" />
                    }
                    title={isWinner ? 'Vous avez gagné !' : isBot(winner) ? 'Le bot gagne !' : `${winner?.username} gagne !`}
                    subtitle={`${state.options.columnsToWin} colonnes revendiquées`}
                    onLobby={() => router.push(`/lobby/create/${lobbyId}`)}
                    onLeave={() => router.push('/')}
                    onClose={() => setModalDismissed(true)}
                    asModal
                >
                    <GameScoreLeaderboard
                        myUserId={me.userId}
                        entries={state.players.map(p => ({
                            userId: p.userId,
                            username: p.username,
                            score: p.userId === state.winnerUserId ? '🏆 Victoire' : (p.abandon || p.afk ? '—' : `${p.claimed.length} col.`),
                            badges: [
                                ...(isBot(p) ? ['Bot'] : []),
                                ...(p.abandon ? ['Abandon'] : []),
                                ...(p.afk ? ['AFK'] : []),
                            ],
                            disqualified: !!p.abandon || !!p.afk,
                        }))}
                    />
                </GameOverModal>
            )}
        </div>
    );
}
