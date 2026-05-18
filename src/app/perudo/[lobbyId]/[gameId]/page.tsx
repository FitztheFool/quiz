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
import { TrophyIcon, XCircleIcon, CpuChipIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

function BotBadge() {
    return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 leading-none">
            BOT
        </span>
    );
}

export default function PerudoPage() {
    const { status, router, me, lobbyId, isNotFound, setIsNotFound, modalDismissed, setModalDismissed } = useGamePage();

    const {
        state, finished, me: myPlayer, isMyTurn, vsBot,
        inactivityUserId, inactivityEndsAt,
        bid, dudo, surrender,
    } = usePerudo({
        lobbyId,
        userId: me.userId,
        username: me.username ?? '',
        onNotFound: () => setIsNotFound(true),
        onModalReset: () => setModalDismissed(false),
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
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
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

            <main className="flex-1 flex flex-col items-center gap-6 p-4 md:p-6">
                {/* Other players */}
                <div className="flex flex-wrap justify-center gap-3 w-full max-w-4xl">
                    {state.players
                        .filter(p => p.userId !== me.userId)
                        .map(p => {
                            const isCurrent = currentPlayer?.userId === p.userId;
                            return (
                                <div
                                    key={p.userId}
                                    className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl transition-all
                                        ${p.alive ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700' : 'bg-gray-100 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800/60 opacity-50'}
                                        ${isCurrent && p.alive ? 'ring-2 ring-yellow-400 shadow-md' : ''}`}
                                >
                                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                                        <span>{p.username}</span>
                                        {isBot(p) && <BotBadge />}
                                        {inactivityUserId === p.userId && inactivityEndsAt != null && <AfkCountdown endsAt={inactivityEndsAt} />}
                                    </div>
                                    <div className="flex gap-1">
                                        {Array.from({ length: p.diceCount }).map((_, i) => (
                                            <Die
                                                key={i}
                                                value={state.phase === 'reveal' && p.dice ? (p.dice[i] ?? 0) : 0}
                                                size={28}
                                                hidden={state.phase !== 'reveal' && !p.dice}
                                            />
                                        ))}
                                        {!p.alive && <span className="text-xs text-gray-400 dark:text-gray-500">éliminé</span>}
                                    </div>
                                </div>
                            );
                        })}
                </div>

                {/* Last bid */}
                {state.lastBid && (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-3 shadow-sm flex items-center gap-3">
                        <span className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">Annonce</span>
                        <span className="font-mono text-lg font-bold">{state.lastBid.count}</span>
                        <span className="text-gray-400 dark:text-gray-500">×</span>
                        <Die value={state.lastBid.face} size={36} />
                        {state.lastReveal && state.phase === 'reveal' && (
                            <span className="ml-3 text-sm">
                                Réel : <span className="font-bold">{state.lastReveal.actualCount}</span>
                                <span className={`ml-2 text-xs font-semibold ${state.lastReveal.actualCount >= state.lastReveal.bid.count ? 'text-green-500' : 'text-red-500'}`}>
                                    {state.lastReveal.actualCount >= state.lastReveal.bid.count ? 'Annonce tenue !' : 'Bluff démasqué !'}
                                </span>
                            </span>
                        )}
                    </div>
                )}

                {/* My dice */}
                {myPlayer && myPlayer.alive && myPlayer.dice && (
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
                            Vos dés
                            {inactivityUserId === me.userId && inactivityEndsAt != null && <AfkCountdown endsAt={inactivityEndsAt} />}
                        </span>
                        <div className="flex gap-2">
                            {myPlayer.dice.map((d, i) => (
                                <Die key={i} value={d} size={48} />
                            ))}
                        </div>
                    </div>
                )}

                {myPlayer && !myPlayer.alive && state.phase !== 'ended' && (
                    <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-3 text-sm text-gray-500 dark:text-gray-400 inline-flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
                        Vous êtes éliminé — observez la fin de la partie.
                    </div>
                )}

                {/* Bid controls */}
                {state.phase === 'bidding' && myPlayer?.alive && (
                    <BidInput
                        lastBid={state.lastBid}
                        pacosWild={state.pacosWild}
                        totalDice={state.totalDice}
                        disabled={!isMyTurn}
                        onBid={(count, face) => bid(count, face)}
                        onDudo={dudo}
                        canDudo={isMyTurn && !!state.lastBid}
                    />
                )}

                {state.phase === 'reveal' && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Préparation du round suivant…</p>
                )}
            </main>

            {finished && !modalDismissed && (
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
                    onClose={() => setModalDismissed(true)}
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
