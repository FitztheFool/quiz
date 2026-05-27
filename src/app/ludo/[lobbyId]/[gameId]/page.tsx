'use client';

// no extra react hooks needed
import { notFound } from 'next/navigation';
import { useGamePage } from '@/hooks/useGamePage';
import { useLudo, isBot } from '@/hooks/useLudo';
import GameOverModal from '@/components/GameOverModal';
import GameScoreLeaderboard from '@/components/GameScoreLeaderboard';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';
import GameIcon from '@/components/GameIcon';
import TimerBar from '@/components/TimerBar';
import GamePageHeader from '@/components/GamePageHeader';
import SurrenderButton from '@/components/SurrenderButton';
import LudoBoard from '@/components/Ludo/Board';
import Dice from '@/components/Ludo/Dice';
import { COLOR_CLASSES } from '@/components/Ludo/boardLayout';
import PlayerLabel from '@/components/shared/PlayerLabel';
import { GameLogSidebar } from '@/components/GameLog';
import { TrophyIcon, XCircleIcon, CpuChipIcon } from '@heroicons/react/24/outline';

export default function LudoPage() {
    const { status, router, me, lobbyId, isNotFound, setIsNotFound, modalDismissed, setModalDismissed } = useGamePage();

    const {
        state, myColorIndex, currentPlayer, isMyTurn, canRoll, canMove,
        inactivityUserId, inactivityEndsAt,
        roll, move, surrender,
    } = useLudo({
        lobbyId,
        userId: me.userId,
        username: me.username ?? '',
        onNotFound: () => setIsNotFound(true),
        onModalReset: () => setModalDismissed(false),
    });

    if (status === 'loading') return <LoadingSpinner message="Vérification de la session..." />;
    if (isNotFound) notFound();
    if (!state || state.phase === 'waiting') return (
        <GameWaitingScreen
            gameType="ludo"
            gameName="Ludo"
            lobbyId={lobbyId}
            players={state?.players.map(p => ({ userId: p.userId, username: p.username })) ?? []}
            myUserId={me.userId}
        />
    );

    const vsBot = state.players.some(p => isBot(p) && p.userId !== me.userId);
    const showSurrender = state.phase !== 'finished';

    // Game over computation
    const winnerLabel = (() => {
        if (state.winner === null) return null;
        if (state.winner === 'team0' || state.winner === 'team1') {
            const teamNum: 0 | 1 = state.winner === 'team0' ? 0 : 1;
            const members = state.players.filter(p => p.team === teamNum).map(p => p.username).join(' & ');
            return { title: `Équipe ${teamNum + 1} gagne !`, members, isMe: state.players.some(p => p.team === teamNum && p.userId === me.userId) };
        }
        const w = state.players[state.winner];
        if (!w) return null;
        return { title: `${w.username} gagne !`, members: undefined, isMe: w.userId === me.userId };
    })();

    const currentTurnPlayer = currentPlayer;
    const currentIsBot = isBot(currentTurnPlayer);

    return (
        <div className="flex-1 flex flex-col wood-table text-gray-900 dark:text-white">
            <GamePageHeader
                left={
                    <>
                        <GameIcon gameType="ludo" className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        <span className="font-bold">Ludo{vsBot && <span className="ml-2 text-xs font-normal text-indigo-400">vs Bot</span>}</span>
                    </>
                }
                center={
                    <div className="flex items-center gap-2 text-sm flex-wrap justify-center">
                        {state.players.map((p, idx) => (
                            <PlayerLabel
                                key={p.userId}
                                username={p.username}
                                active={state.phase !== 'finished' && idx === state.currentTurn}
                                isBot={isBot(p)}
                                bgClass={COLOR_CLASSES[p.colorIndex].bg}
                                dotExtraClass="border border-white shadow-sm"
                                inactivityEndsAt={inactivityUserId === p.userId ? inactivityEndsAt : null}
                            />
                        ))}
                    </div>
                }
                right={showSurrender && <SurrenderButton onSurrender={surrender} />}
            />

            {state.phase !== 'finished' && (
                <TimerBar
                    endsAt={state.turnStartedAt ? state.turnStartedAt + state.turnDuration * 1000 : null}
                    duration={state.turnDuration}
                    label={
                        isMyTurn
                            ? state.phase === 'rolling' ? 'À vous de lancer le dé' : 'Choisissez un pion à déplacer'
                            : currentIsBot
                                ? 'Le bot réfléchit…'
                                : `Tour de ${currentTurnPlayer?.username ?? '…'}`
                    }
                />
            )}

            <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-6 p-4">
                <div className="flex flex-col items-center gap-4">
                    <LudoBoard
                        players={state.players}
                        movablePawns={state.movablePawns}
                        currentTurn={state.currentTurn}
                        canMove={canMove}
                        onPawnClick={(pawnIdx) => move(pawnIdx)}
                        highlightedPlayer={myColorIndex !== null && currentTurnPlayer?.colorIndex === myColorIndex ? state.currentTurn : undefined}
                    />
                </div>

                <div className="flex flex-col items-center gap-4 min-w-[180px]">
                    <Dice
                        value={state.dice}
                        canRoll={canRoll}
                        onRoll={roll}
                        label={
                            canRoll ? 'Cliquez pour lancer'
                            : state.phase === 'moving' ? 'Choisissez un pion'
                            : currentIsBot ? 'Bot…'
                            : state.phase !== 'finished' ? `Tour de ${currentTurnPlayer?.username ?? '…'}` : ''
                        }
                    />

                    {state.dice === 6 && state.consecutiveSixes > 0 && state.phase !== 'finished' && (
                        <div className="text-xs px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-semibold">
                            6 consécutifs : {state.consecutiveSixes}
                        </div>
                    )}

                    <div className="flex flex-col gap-1 text-xs text-amber-100 font-semibold drop-shadow">
                        <div>Sortie : {state.options.pawnExit === '6' ? '6' : state.options.pawnExit === '6_or_1' ? '6 ou 1' : 'tout score'}</div>
                        <div>Bonus 6 : {state.options.bonusOn6 === 'unlimited' ? 'illimité' : state.options.bonusOn6 === 'triple_lose' ? 'triple = perdu' : 'aucun'}</div>
                        {state.options.teamMode === '2v2' && <div className="font-semibold text-blue-500">Mode 2v2</div>}
                    </div>
                </div>

                <GameLogSidebar entries={state.log ?? []} />
            </main>

            {state.phase === 'finished' && winnerLabel && !modalDismissed && (
                <GameOverModal
                    icon={
                        winnerLabel.isMe ? <TrophyIcon className="w-8 h-8 text-amber-500" />
                        : (typeof state.winner === 'number' && isBot(state.players[state.winner])) ? <CpuChipIcon className="w-8 h-8 text-indigo-400" />
                        : <XCircleIcon className="w-8 h-8 text-red-400" />
                    }
                    title={winnerLabel.title}
                    subtitle={winnerLabel.members}
                    onLobby={() => router.push(`/lobby/create/${lobbyId}`)}
                    onLeave={() => router.push('/')}
                    onClose={() => setModalDismissed(true)}
                    asModal
                >
                    <GameScoreLeaderboard
                        myUserId={me.userId}
                        entries={state.players
                            .map((p, idx) => {
                                const finishedCount = p.pawns.filter(pn => pn.progress >= 57).length;
                                const rank = state.ranking.indexOf(idx);
                                const surrendered = state.surrenderedIdxs.includes(idx);
                                const afk = state.afkIdxs.includes(idx);
                                const abandoned = surrendered || afk;
                                return { p, idx, finishedCount, rank, abandoned, surrendered, afk };
                            })
                            .sort((a, b) => {
                                // Finished players (in ranking) come first, in ranking order.
                                if (a.rank !== -1 && b.rank !== -1) return a.rank - b.rank;
                                if (a.rank !== -1) return -1;
                                if (b.rank !== -1) return 1;
                                // Then by finished pion count desc.
                                if (a.finishedCount !== b.finishedCount) return b.finishedCount - a.finishedCount;
                                // Tie-break: abandoners last.
                                if (a.abandoned !== b.abandoned) return a.abandoned ? 1 : -1;
                                return a.idx - b.idx;
                            })
                            .map(({ p, finishedCount, abandoned, surrendered, afk }) => {
                                const bot = isBot(p);
                                const badges: string[] = [];
                                if (bot) badges.push('Bot');
                                if (surrendered) badges.push('Abandon');
                                else if (afk) badges.push('AFK');
                                return {
                                    userId: p.userId,
                                    username: p.username,
                                    score: `${finishedCount}/4 pions`,
                                    badges,
                                    disqualified: abandoned,
                                };
                            })}
                    />
                </GameOverModal>
            )}
        </div>
    );
}
