'use client';

// no extra react hooks needed
import { notFound } from 'next/navigation';
import { useGamePage } from '@/hooks/useGamePage';
import { useLudo, isBot, type LudoPlayer } from '@/hooks/useLudo';
import GameOverModal from '@/components/GameOverModal';
import GameScoreLeaderboard from '@/components/GameScoreLeaderboard';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';
import GameIcon from '@/components/GameIcon';
import TimerBar from '@/components/TimerBar';
import GamePageHeader from '@/components/GamePageHeader';
import SurrenderButton from '@/components/SurrenderButton';
import AfkCountdown from '@/components/AfkCountdown';
import LudoBoard from '@/components/Ludo/Board';
import Dice from '@/components/Ludo/Dice';
import { COLOR_CLASSES } from '@/components/Ludo/boardLayout';
import { TrophyIcon, XCircleIcon, CpuChipIcon } from '@heroicons/react/24/outline';

function BotBadge() {
    return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 leading-none">
            BOT
        </span>
    );
}

function PlayerLabel({ player, active, inactivityEndsAt }: { player: LudoPlayer; active: boolean; inactivityEndsAt?: number | null }) {
    const color = COLOR_CLASSES[player.colorIndex];
    return (
        <span className={`flex items-center gap-1.5 transition-all ${active ? 'font-bold' : 'font-normal opacity-60'}`}>
            <span className={`inline-block w-3 h-3 rounded-full ${color.bg} border border-white shadow-sm`} />
            {player.username}
            {isBot(player) && <BotBadge />}
            {inactivityEndsAt != null && <AfkCountdown endsAt={inactivityEndsAt} />}
        </span>
    );
}

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
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
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
                                player={p}
                                active={state.phase !== 'finished' && idx === state.currentTurn}
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

                    <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <div>Sortie : {state.options.pawnExit === '6' ? '6' : state.options.pawnExit === '6_or_1' ? '6 ou 1' : 'tout score'}</div>
                        <div>Bonus 6 : {state.options.bonusOn6 === 'unlimited' ? 'illimité' : state.options.bonusOn6 === 'triple_lose' ? 'triple = perdu' : 'aucun'}</div>
                        {state.options.teamMode === '2v2' && <div className="font-semibold text-blue-500">Mode 2v2</div>}
                    </div>
                </div>
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
                            .map(p => ({ p, rank: state.ranking.indexOf(state.players.indexOf(p)) }))
                            .sort((a, b) => {
                                const ra = a.rank === -1 ? 9999 : a.rank;
                                const rb = b.rank === -1 ? 9999 : b.rank;
                                return ra - rb;
                            })
                            .map(({ p }, _i) => {
                                const finishedCount = p.pawns.filter(pn => pn.progress >= 57).length;
                                const bot = isBot(p);
                                return {
                                    userId: p.userId,
                                    username: p.username,
                                    score: `${finishedCount}/4 pions`,
                                    badges: bot ? ['Bot'] : [],
                                    disqualified: false,
                                };
                            })}
                    />
                </GameOverModal>
            )}
        </div>
    );
}
