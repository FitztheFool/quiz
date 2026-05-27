'use client';

import { notFound } from 'next/navigation';
import { useGamePage } from '@/hooks/useGamePage';
import { usePerudo, isBot } from '@/hooks/usePerudo';
import GameOverModal from '@/components/GameOverModal';
import GameScoreLeaderboard from '@/components/GameScoreLeaderboard';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';
import GameIcon from '@/components/GameIcon';
import TimerBar from '@/components/TimerBar';
import GamePageHeader from '@/components/GamePageHeader';
import SurrenderButton from '@/components/SurrenderButton';
import AfkCountdown from '@/components/AfkCountdown';
import Die from '@/components/Perudo/Die';
import BidInput from '@/components/Perudo/BidInput';
import PlayerChip from '@/components/Perudo/PlayerChip';
import RoundRecap from '@/components/Perudo/RoundRecap';
import { colorForIndex } from '@/components/Perudo/colors';
import BotBadge from '@/components/shared/BotBadge';
import { GameLogSidebar } from '@/components/GameLog';
import { TrophyIcon, XCircleIcon, CpuChipIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function PerudoPage() {
    const { status, router, me, lobbyId, isNotFound, setIsNotFound } = useGamePage();

    const {
        state, finished, me: myPlayer, isMyTurn, vsBot,
        inactivityUserId, inactivityEndsAt,
        bid, dudo, surrender,
    } = usePerudo({
        lobbyId,
        userId: me.userId,
        username: me.username ?? '',
        onNotFound: () => setIsNotFound(true),
    });

    if (status === 'loading') return <LoadingSpinner message="Vérification de la session..." />;
    if (isNotFound) notFound();
    if (!state) return (
        <GameWaitingScreen
            gameType="perudo"
            gameName="Perudo"
            lobbyId={lobbyId}
            players={[]}
            myUserId={me.userId}
        />
    );

    const currentPlayer = state.players[state.currentPlayerIndex] ?? null;
    const currentIsBot = isBot(currentPlayer);
    const showSurrender = state.phase !== 'ended' && myPlayer?.alive === true;

    // Game over computation
    const winnerEntry = finished?.winner ?? null;
    const isWinner = winnerEntry?.userId === me.userId;
    const allEntries = (() => {
        if (!finished) return [];
        const eliminatedSorted = [...finished.eliminated].sort((a, b) => a.placement - b.placement);
        const rows: { userId: string; username: string; placement: number | null; isMe: boolean; bot: boolean; afk?: boolean; abandon?: boolean }[] = [];
        const seen = new Set<string>();
        if (finished.winner) {
            rows.push({
                userId: finished.winner.userId,
                username: finished.winner.username,
                placement: 1,
                isMe: finished.winner.userId === me.userId,
                bot: isBot(finished.winner),
            });
            seen.add(finished.winner.userId);
        }
        // Surviving non-winner players (e.g. remaining bots when human forfeits) — show between winner and eliminated.
        for (const p of state.players) {
            if (seen.has(p.userId)) continue;
            if (eliminatedSorted.some(e => e.userId === p.userId)) continue;
            if (!p.alive) continue;
            rows.push({
                userId: p.userId,
                username: p.username,
                placement: rows.length + 1,
                isMe: p.userId === me.userId,
                bot: isBot(p),
            });
            seen.add(p.userId);
        }
        for (const e of eliminatedSorted) {
            rows.push({
                userId: e.userId,
                username: e.username,
                placement: e.afk || e.abandon ? null : e.placement,
                isMe: e.userId === me.userId,
                bot: isBot(e),
                afk: e.afk,
                abandon: e.abandon,
            });
        }
        return rows;
    })();

    return (
        <div className="flex-1 flex flex-col wood-table text-gray-900 dark:text-white">
            <GamePageHeader
                left={
                    <>
                        <GameIcon gameType="perudo" className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        <span className="font-bold">
                            Perudo
                            {vsBot && <span className="ml-2 text-xs font-normal text-indigo-600 dark:text-indigo-400">vs Bot</span>}
                        </span>
                    </>
                }
                center={
                    <div className="flex items-center gap-2 text-xs flex-wrap justify-center">
                        <span className="text-gray-500 dark:text-gray-400">Round {state.round}</span>
                        <span className="text-gray-400 dark:text-gray-600">·</span>
                        <span className="text-gray-500 dark:text-gray-400">{state.totalDice} dés en jeu</span>
                        {!state.pacosWild && (
                            <>
                                <span className="text-gray-400 dark:text-gray-600">·</span>
                                <span className="text-amber-600 dark:text-amber-400">1 non-wild</span>
                            </>
                        )}
                    </div>
                }
                right={showSurrender && <SurrenderButton onSurrender={surrender} />}
            />

            {state.phase === 'bidding' && (
                <TimerBar
                    endsAt={state.turnStartedAt ? state.turnStartedAt + state.turnDuration * 1000 : null}
                    duration={state.turnDuration}
                    label={
                        isMyTurn ? 'À vous de jouer'
                            : currentIsBot ? 'Le bot réfléchit…'
                                : `Tour de ${currentPlayer?.username ?? '…'}`
                    }
                />
            )}

            <main className="flex-1 flex flex-col lg:flex-row gap-4 p-3 md:p-6">
              <div className="flex-1 flex flex-col items-center gap-4 min-w-0">
                {/* Opponents — wood-tile cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 w-full max-w-5xl">
                    {state.players
                        .map((p, idx) => ({ p, idx }))
                        .filter(({ p }) => p.userId !== me.userId)
                        .map(({ p, idx }) => {
                            const isCurrent = currentPlayer?.userId === p.userId;
                            const color = colorForIndex(idx);
                            return (
                                <div
                                    key={p.userId}
                                    className={`wood-tile rounded-xl px-3 py-2.5 transition-all
                                        ${!p.alive ? 'opacity-40 grayscale' : ''}
                                        ${isCurrent && p.alive ? 'ring-4 ring-yellow-300/80 shadow-yellow-200/40' : ''}`}
                                >
                                    <div className="flex flex-col items-center gap-1">
                                        <div className={`flex items-center gap-1.5 font-extrabold ${color.text} drop-shadow-sm`}>
                                            <span className="truncate max-w-[110px]">{p.username}</span>
                                            {isBot(p) && <BotBadge />}
                                            {inactivityUserId === p.userId && inactivityEndsAt != null && <AfkCountdown endsAt={inactivityEndsAt} />}
                                        </div>
                                        {state.phase === 'reveal' && p.dice ? (
                                            <div className="flex gap-1">
                                                {p.dice.map((v, i) => (
                                                    <Die key={i} value={v} size={26} />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 font-mono text-base font-bold text-gray-800">
                                                <span>{p.diceCount}</span>
                                                <PlayerChip color={color} dimmed={!p.alive} />
                                            </div>
                                        )}
                                        {!p.alive && <span className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold">Éliminé</span>}
                                    </div>
                                </div>
                            );
                        })}
                </div>

                {/* Last bid — center plaque (hidden during reveal — recap shows full info) */}
                {state.lastBid && state.phase !== 'reveal' && (
                    <div className="wood-tile rounded-2xl px-5 py-3 flex items-center gap-3">
                        <span className="text-[10px] uppercase tracking-widest text-gray-700 font-bold">Annonce</span>
                        <span className="font-mono text-lg font-black text-gray-900">{state.lastBid.count}</span>
                        <span className="text-gray-600">×</span>
                        <Die value={state.lastBid.face} size={36} />
                    </div>
                )}

                {/* Bottom row: my cup + bid input */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl mt-2">
                    {/* Mon gobelet */}
                    {myPlayer && myPlayer.alive && myPlayer.dice && (() => {
                        const myIdx = state.players.findIndex(pp => pp.userId === me.userId);
                        const myColor = myIdx >= 0 ? colorForIndex(myIdx) : colorForIndex(0);
                        return (
                            <div className="wood-tile rounded-2xl px-5 py-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className={`font-extrabold text-lg ${myColor.text}`}>Mon gobelet</h2>
                                    {inactivityUserId === me.userId && inactivityEndsAt != null && <AfkCountdown endsAt={inactivityEndsAt} />}
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 justify-items-center">
                                    {myPlayer.dice.map((d, i) => (
                                        <Die key={i} value={d} size={56} />
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {myPlayer && !myPlayer.alive && state.phase !== 'ended' && (
                        <div className="wood-tile rounded-2xl px-5 py-4 text-sm text-gray-700 inline-flex items-center gap-2">
                            <ExclamationTriangleIcon className="w-4 h-4 text-amber-700" />
                            Vous êtes éliminé — observez la fin de la partie.
                        </div>
                    )}

                    {/* Faites votre proposition */}
                    {state.phase === 'bidding' && myPlayer?.alive && (
                        <div className="wood-tile rounded-2xl px-5 py-4">
                            <h2 className="font-extrabold text-lg text-gray-900 mb-3">Faites votre proposition</h2>
                            <BidInput
                                lastBid={state.lastBid}
                                pacosWild={state.pacosWild}
                                totalDice={state.totalDice}
                                disabled={!isMyTurn}
                                onBid={(count, face) => bid(count, face)}
                                onDudo={dudo}
                                canDudo={isMyTurn && !!state.lastBid}
                            />
                        </div>
                    )}

                </div>

                {state.phase === 'reveal' && state.lastReveal && (
                    <RoundRecap state={state} />
                )}
                {state.phase === 'reveal' && (
                    <p className="text-xs text-gray-200/80 font-semibold animate-pulse">Préparation du round suivant…</p>
                )}
              </div>

              <GameLogSidebar entries={state.log ?? []} />
            </main>

            {finished && (
                <GameOverModal
                    icon={
                        isWinner ? <TrophyIcon className="w-8 h-8 text-amber-500" />
                            : isBot(winnerEntry) ? <CpuChipIcon className="w-8 h-8 text-indigo-400" />
                                : <XCircleIcon className="w-8 h-8 text-red-400" />
                    }
                    title={
                        isWinner ? 'Vous avez gagné !'
                            : isBot(winnerEntry) ? 'Le bot gagne !'
                                : `${winnerEntry?.username ?? 'Adversaire'} gagne !`
                    }
                    subtitle={isWinner ? 'Dernier joueur avec des dés' : undefined}
                    onLobby={() => router.push(`/lobby/create/${lobbyId}`)}
                    onLeave={() => router.push('/')}
                    asModal
                >
                    <GameScoreLeaderboard
                        myUserId={me.userId}
                        entries={allEntries.map(row => ({
                            userId: row.userId,
                            username: row.username,
                            score: row.placement === 1 ? '🏆 Victoire' : (row.placement ? `${row.placement}ᵉ` : '—'),
                            badges: [
                                ...(row.bot ? ['Bot'] : []),
                                ...(row.abandon ? ['Abandon'] : []),
                                ...(row.afk ? ['AFK'] : []),
                            ],
                            disqualified: !!row.abandon || !!row.afk,
                        }))}
                    />
                </GameOverModal>
            )}
        </div>
    );
}
