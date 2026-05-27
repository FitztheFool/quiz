// src/app/skyjow/[lobbyId]/page.tsx
'use client';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';
import GameIcon from '@/components/GameIcon';
import TimerBar from '@/components/TimerBar';
import SurrenderButton from '@/components/SurrenderButton';
import GamePageHeader from '@/components/GamePageHeader';
import GameOverModal from '@/components/GameOverModal';
import GameScoreLeaderboard from '@/components/GameScoreLeaderboard';

import { notFound } from 'next/navigation';
import { useGamePage } from '@/hooks/useGamePage';
import { useSkyjow } from '@/hooks/useSkyjow';

import type { CardState, Phase } from '@/hooks/useSkyjow';
import Card, { cardColor } from '@/components/Skyjow/Card';
import GameLog from '@/components/GameLog';
import PlayerGrid from '@/components/Skyjow/PlayerGrid';
import { ChartBarIcon, ClockIcon, NoSymbolIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { BoltIcon } from '@heroicons/react/24/solid';

const isPlayingPhase = (p: Phase) => p === 'playing' || p === 'last_round';

// ── Page principale ───────────────────────────────────────────────────────────

export default function skyjowGamePage() {
    const { status, router, me: meInfo, lobbyId, isNotFound, setIsNotFound, modalDismissed, setModalDismissed } = useGamePage();

    const userId = meInfo.userId;
    const username = meInfo.username ?? '';

    const {
        myCards,
        phase,
        round,
        currentPlayerIndex,
        discardTop,
        drawnCard,
        players,
        scores,
        notification,
        roundEndData,
        gameEndData,
        surrenderedPlayers,
        drawnAction,
        setDrawnAction,
        readyCount,
        flip2Count,
        inactivityEndsAt,
        inactivityUserId,
        isCurrent,
        turnStartedAt,
        turnDuration,
        flip2EndsAt,
        flip2Duration,
        log,
        drawDeck,
        takeDiscard,
        handleCardClick,
        readyNextRound,
        surrender,
    } = useSkyjow({
        lobbyId,
        userId,
        username,
        onNotFound: () => setIsNotFound(true),
    });

    // ── Computed ───────────────────────────────────────────────────────────────

    const myPlayer = players.find(p => p.userId === userId);
    const myScore = myPlayer?.liveScore ?? scores.find(s => s.userId === userId)?.totalScore ?? 0;
    const iSurrendered = !!surrenderedPlayers.find(p => p.userId === userId);

    const selectableIndices: number[] = [];
    if (phase === 'flip2') {
        if (flip2Count < 2) {
            myCards.forEach((c, i) => { if (!c.revealed && !c.removed) selectableIndices.push(i); });
        }
    } else if (isCurrent && drawnCard !== null) {
        myCards.forEach((c, i) => { if (!c.removed) selectableIndices.push(i); });
    }

    const otherPlayers = players.filter(p =>
        p.userId !== userId &&
        !surrenderedPlayers.find(s => s.userId === p.userId) &&
        !scores.find(s => s.userId === p.userId)?.abandon  // ← ajouter
    );
    const currentPlayerId = players[currentPlayerIndex]?.userId;
    const isMeInactive = inactivityUserId === userId;

    // ── Render guards ──────────────────────────────────────────────────────────

    if (status === 'loading') return <LoadingSpinner message="Vérification de la session..." />;
    if (isNotFound) notFound();

    // ── Écran fin de manche ────────────────────────────────────────────────────

    if (phase === 'round_end' && roundEndData) {
        const sortedScores = [...roundEndData.scores].sort((a, b) => a.totalScore - b.totalScore);
        const MEDAL: Record<number, string> = { 0: '1', 1: '2', 2: '3' };
        const totalPlayers = players.length + surrenderedPlayers.length;
        return (
            <GameOverModal
                icon={<ChartBarIcon className="w-8 h-8 text-blue-400" />}
                title={`Fin de la manche ${round}`}
                subtitle={scores.some(s => s.totalScore >= 100) ? 'Un joueur a atteint 100 points — fin de partie !' : undefined}
                onLobby={readyNextRound}
                onLeave={() => router.push('/')}
                lobbyLabel={readyCount > 0 ? `Prêt (${readyCount}/${players.length})` : 'Manche suivante'}
            >
                <div className="space-y-2">
                    {sortedScores.map((s, i) => {
                        const playerData = roundEndData.players.find(p => p.userId === s.userId)
                            ?? surrenderedPlayers.find(p => p.userId === s.userId);  // ← ajouter ça
                        const isAbandoned = !!s.abandon;
                        const isAfk = !!s.afk;
                        return (
                            <div key={s.userId} className={`rounded-xl border px-4 py-3 ${i === 0 && !isAbandoned
                                ? 'bg-amber-400/20 border-amber-400/50'
                                : isAbandoned
                                    ? 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
                                    : s.userId === userId
                                        ? 'bg-sky-900/40 border border-sky-500/40'
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                }`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-800 dark:text-gray-200 font-medium flex items-center gap-2">
                                        <span>{isAbandoned ? (isAfk ? <ClockIcon className="w-4 h-4 text-gray-400" /> : <NoSymbolIcon className="w-4 h-4 text-gray-400" />) : (MEDAL[i] ?? `${i + 1}.`)}</span>
                                        <span className={s.userId === userId ? 'text-amber-600 dark:text-amber-300 font-bold' : ''}>
                                            {s.username}{s.userId === userId && ' (moi)'}
                                        </span>
                                        {isAbandoned && (
                                            <span className="text-xs bg-orange-500/30 text-orange-400 px-1.5 py-0.5 rounded">
                                                {isAfk ? 'AFK' : 'Abandon'}
                                            </span>
                                        )}
                                    </span>
                                    <div className="text-right">
                                        <span className={`text-sm font-semibold ${s.roundScore > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                                            {s.roundScore > 0 ? '+' : ''}{s.roundScore}
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">= {s.totalScore} pts</span>
                                    </div>
                                </div>
                                {playerData && (
                                    <div className="grid grid-cols-4 gap-1 mt-1">
                                        {playerData.cards.map((card, idx) => (
                                            <Card key={idx} card={{ ...card, revealed: true }} size="sm" />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </GameOverModal>
        );
    }

    // ── Écran d'attente ────────────────────────────────────────────────────────

    if (phase === 'waiting' || players.length === 0) return (
        <GameWaitingScreen gameType="skyjow" gameName="Skyjow" lobbyId={lobbyId} players={players} myUserId={userId} />
    );

    // ── Écran fin de partie ────────────────────────────────────────────────────

    if (phase === 'game_end' && gameEndData) {
        const sortedScores = [...gameEndData.scores].sort((a, b) => {
            if (a.abandon && !b.abandon) return 1;
            if (!a.abandon && b.abandon) return -1;
            return a.totalScore - b.totalScore;
        });
        const MEDAL: Record<number, string> = { 0: '1', 1: '2', 2: '3' };
        return (
            <GameOverModal
                title="Fin de partie !"
                subtitle={`${gameEndData.winnerUsername} remporte la victoire !`}
                onLobby={() => router.push(`/lobby/create/${lobbyId}`)}
                onLeave={() => router.push('/')}
            >
                <div className="space-y-3">
                    {sortedScores.map((s, i) => {
                        const disq = !!s.abandon;
                        const isAfk = !!s.afk;
                        const playerCards = (gameEndData as any).players?.find((p: any) => p.userId === s.userId)?.cards
                            ?? roundEndData?.players.find(p => p.userId === s.userId)?.cards
                            ?? surrenderedPlayers.find(p => p.userId === s.userId)?.cards;
                        return (
                            <div key={s.userId} className={`rounded-xl border px-4 py-3 ${i === 0 && !disq ? 'bg-amber-400/20 border-amber-400/50' : disq ? 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{disq ? (isAfk ? <ClockIcon className="w-5 h-5 text-gray-400" /> : <NoSymbolIcon className="w-5 h-5 text-gray-400" />) : (MEDAL[i] ?? `${i + 1}.`)}</span>
                                        <span className={`font-bold ${s.userId === userId ? 'text-amber-600 dark:text-amber-300' : 'text-gray-800 dark:text-white'}`}>
                                            {s.username}{s.userId === userId && ' (moi)'}
                                        </span>
                                        {disq && <span className="text-xs bg-orange-500/30 text-orange-400 px-1.5 py-0.5 rounded flex items-center gap-0.5">{isAfk ? <><ClockIcon className="w-3 h-3" />AFK</> : <><NoSymbolIcon className="w-3 h-3" />Abandon</>}</span>}
                                    </div>
                                    <span className={`font-black text-xl ${i === 0 && !disq ? 'text-amber-500 dark:text-amber-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                        {s.totalScore} pts
                                    </span>
                                </div>
                                {playerCards && (
                                    <div className="grid grid-cols-4 gap-1 mt-1">
                                        {playerCards.map((card: CardState, idx: number) => (
                                            <Card
                                                key={idx}
                                                card={{ ...card, revealed: true, value: card.value ?? null }}
                                                size="sm"
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </GameOverModal>
        );
    }

    // ── Interface principale ───────────────────────────────────────────────────

    return (
        <div className="flex-1 flex flex-col overflow-hidden casino-felt text-gray-100" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

            {/* ── Notification ── */}
            {notification && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200">
                    {notification}
                </div>
            )}

            {/* ── Header ── */}
            <GamePageHeader
                left={<>
                    <GameIcon gameType="skyjow" className="shrink-0 w-5 h-5 text-gray-700 dark:text-gray-300" />
                    <span className="hidden sm:inline font-bold text-gray-900 dark:text-white">Skyjow</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Manche {round}</span>
                </>}
                right={<>
                    <div className="hidden sm:flex gap-2">
                        {[...scores].sort((a, b) => a.totalScore - b.totalScore).map(s => (
                            <div key={s.userId}
                                className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${s.abandon ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 line-through opacity-60' : s.userId === userId ? 'bg-sky-100 dark:bg-sky-700 text-sky-700 dark:text-sky-100' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                                {s.afk ? <ClockIcon className="w-3.5 h-3.5 text-gray-400" title="AFK" /> : s.abandon ? <NoSymbolIcon className="w-3.5 h-3.5 text-gray-400" title="Abandon" /> : null}
                                {s.username.split(' ')[0]}: {s.totalScore}
                            </div>
                        ))}
                    </div>
                    {phase !== 'ended' && phase !== 'game_end' && !iSurrendered && (
                        <SurrenderButton onSurrender={surrender} />
                    )}
                </>}
            />

            {/* ── Timer header ── */}
            {phase === 'flip2' && (
                <TimerBar endsAt={flip2EndsAt} duration={flip2Duration} />
            )}
            {isPlayingPhase(phase) && (
                <TimerBar endsAt={turnStartedAt !== null ? turnStartedAt + turnDuration * 1000 : null} duration={turnDuration} />
            )}

            {/* ── Corps principal ── */}
            <main className="flex-1 flex flex-col lg:flex-row gap-0 lg:min-h-0 lg:overflow-hidden">

                {/* ── Zone adversaires ── (passe en second sur mobile) */}
                <div className="lg:w-72 bg-black/30 backdrop-blur-sm border-b lg:border-b-0 lg:border-r border-black/40 p-3 lg:overflow-y-auto lg:shrink-0 order-3 lg:order-1">
                    <p className="text-xs text-emerald-100 uppercase font-bold mb-3 tracking-wider">Adversaires</p>
                    <div className="space-y-4">
                        {otherPlayers.map((p) => {
                            const isTurn = p.userId === currentPlayerId;
                            const pScore = p.liveScore ?? scores.find(s => s.userId === p.userId)?.totalScore ?? 0;
                            return (
                                <div key={p.userId}
                                    className={`rounded-xl p-3 border transition-all ${isTurn ? 'bg-emerald-900/40 border-yellow-400 shadow-lg shadow-yellow-400/20' : 'bg-emerald-900/30 border-emerald-700/40'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {isTurn && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                                            <span className="font-semibold text-sm text-white">{p.username}</span>
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pScore >= 80 ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' : pScore >= 50 ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                                            {pScore} pts
                                        </span>
                                    </div>
                                    <PlayerGrid
                                        player={p}
                                        isMe={false}
                                        isCurrent={isTurn}
                                        compact={true}
                                    />
                                </div>
                            );
                        })}
                        {surrenderedPlayers.map((p) => (
                            <div key={p.userId} className="rounded-xl p-3 border border-gray-200 dark:border-gray-700 opacity-50">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5">
                                        {scores.find(s => s.userId === p.userId)?.afk ? <ClockIcon className="w-3.5 h-3.5 text-gray-400" /> : <NoSymbolIcon className="w-3.5 h-3.5 text-gray-400" />}

                                        <span className="font-semibold text-sm text-white/70 line-through">{p.username}</span>
                                    </div>
                                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                                        {scores.find(s => s.userId === p.userId)?.afk ? 'AFK' : 'Abandon'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-4 gap-1">
                                    {p.cards.map((card, idx) => (
                                        <Card key={idx} card={{ ...card, revealed: true }} size="sm" />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Zone centrale ── (passe en premier sur mobile) */}
                <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6 lg:overflow-y-auto order-2 lg:order-2">

                    {/* ── Message abandon ── */}
                    {iSurrendered && (
                        <div className="bg-orange-500/20 border border-orange-500/40 rounded-xl px-5 py-3 text-center">
                            <p className="text-orange-400 font-semibold">Tu as abandonné la partie</p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">En attente de la fin de partie…</p>
                        </div>
                    )}

                    {/* ── Badge tour ── */}
                    {!iSurrendered && (
                        <div className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${phase === 'flip2'
                            ? 'bg-amber-100 dark:bg-amber-900/50 border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-300'
                            : inactivityEndsAt !== null
                                ? 'bg-orange-400 border-orange-500 text-white'
                                : phase === 'last_round'
                                    ? 'bg-red-100 dark:bg-red-900/50 border-red-400 dark:border-red-600 text-red-700 dark:text-red-300'
                                    : 'bg-green-100 dark:bg-emerald-900/50 border-green-400 dark:border-emerald-600 text-green-700 dark:text-emerald-300'
                            }`}>
                            {phase === 'flip2'
                                ? (() => {
                                    const waiting = players.filter(p =>
                                        p.cards.filter(c => c.revealed).length < 2 &&
                                        !surrenderedPlayers.find(s => s.userId === p.userId)
                                    );
                                    const waitingNames = waiting
                                        .map(p => p.userId === userId ? 'toi' : p.username)
                                        .join(', ');
                                    return `En attente de — ${waitingNames || '…'}`;
                                })()
                                : phase === 'last_round'
                                    ? 'Dernier tour !'
                                    : isCurrent
                                        ? isMeInactive
                                            ? 'Joue vite ! exclusion imminente'
                                            : 'Ton tour'
                                        : inactivityUserId === currentPlayerId && inactivityEndsAt !== null
                                            ? `${players[currentPlayerIndex]?.username ?? '…'} — inactivité`
                                            : `Tour: ${players[currentPlayerIndex]?.username ?? '…'}`}
                        </div>
                    )}

                    {/* ── Zone de jeu centrale ── */}
                    {isPlayingPhase(phase) && !iSurrendered && (
                        <div className="flex items-center gap-8">
                            {/* Pioche */}
                            <div className="flex flex-col items-center gap-2">
                                <p className="text-xs text-emerald-100 uppercase tracking-wider font-bold">Pioche</p>
                                <button
                                    onClick={drawDeck}
                                    disabled={!isCurrent || drawnCard !== null}
                                    className={[
                                        'w-14 h-20 rounded-lg border-2 flex items-center justify-center font-bold text-xl transition-all',
                                        isCurrent && drawnCard === null
                                            ? 'bg-gray-100 dark:bg-gray-800 border-sky-500 hover:border-sky-300 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer shadow-lg shadow-sky-900/20 hover:scale-105 active:scale-95'
                                            : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-50',
                                    ].join(' ')}
                                >
                                    🂠
                                </button>
                            </div>

                            {/* Carte piochée (si du deck) */}
                            {drawnCard && drawnCard.from === 'deck' && (
                                <div className="flex flex-col items-center gap-2">
                                    <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold animate-pulse">En main</p>
                                    <div className={[
                                        'w-14 h-20 rounded-lg border-2 flex items-center justify-center font-bold text-xl',
                                        cardColor(drawnCard.value, true, false),
                                        'ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
                                    ].join(' ')}>
                                        {drawnCard.value}
                                    </div>
                                    <div className="flex gap-2 text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">← Échange ou retourne →</span>
                                    </div>
                                </div>
                            )}

                            {!drawnCard && (
                                <div className="text-gray-400 dark:text-gray-600 text-2xl">⇄</div>
                            )}

                            {/* Défausse */}
                            <div className="flex flex-col items-center gap-2">
                                <p className="text-xs text-emerald-100 uppercase tracking-wider font-bold">Défausse</p>
                                <button
                                    onClick={takeDiscard}
                                    disabled={!isCurrent || drawnCard !== null || discardTop === null}
                                    className={[
                                        'w-14 h-20 rounded-lg border-2 flex items-center justify-center font-bold text-xl transition-all',
                                        discardTop !== null ? cardColor(discardTop, true, false) : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
                                        isCurrent && drawnCard === null && discardTop !== null
                                            ? 'hover:scale-105 active:scale-95 cursor-pointer ring-1 ring-white/20 hover:ring-white/60'
                                            : 'cursor-not-allowed opacity-60',
                                    ].join(' ')}
                                >
                                    {discardTop !== null ? discardTop : '—'}
                                </button>
                            </div>

                            {/* Carte piochée (si de la défausse) */}
                            {drawnCard && drawnCard.from === 'discard' && (
                                <div className="flex flex-col items-center gap-2">
                                    <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold animate-pulse">À échanger</p>
                                    <div className={[
                                        'w-14 h-20 rounded-lg border-2 flex items-center justify-center font-bold text-xl',
                                        cardColor(drawnCard.value, true, false),
                                        'ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
                                    ].join(' ')}>
                                        {drawnCard.value}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Instructions contextuelles ── */}
                    {!iSurrendered && (
                        <div className="text-center max-w-sm">
                            {phase === 'flip2' && (
                                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700/50 rounded-xl px-5 py-3">
                                    <p className="text-amber-700 dark:text-amber-300 font-semibold">Retourne 2 cartes de ton plateau</p>
                                    <p className="text-amber-600 dark:text-amber-500 text-sm mt-1">{flip2Count}/2 cartes retournées</p>
                                </div>
                            )}
                            {isPlayingPhase(phase) && isCurrent && drawnCard === null && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700/50 rounded-xl px-5 py-3">
                                    <p className="text-emerald-700 dark:text-emerald-300 font-semibold">C'est ton tour !</p>
                                    <p className="text-emerald-600 dark:text-emerald-500 text-sm mt-1">Pioche dans la pioche ou prends la carte de la défausse</p>
                                </div>
                            )}
                            {isPlayingPhase(phase) && isCurrent && drawnCard !== null && drawnCard.from === 'deck' && (
                                <div className="bg-sky-50 dark:bg-sky-900/30 border border-sky-300 dark:border-sky-700/50 rounded-xl px-5 py-3">
                                    <p className="text-sky-700 dark:text-sky-300 font-semibold mb-3">Carte piochée : <span className="text-gray-900 dark:text-white font-bold">{drawnCard.value}</span></p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setDrawnAction('swap')}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${drawnAction === 'swap' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-emerald-500'}`}
                                        >
                                            ↔ Échanger
                                        </button>
                                        <button
                                            onClick={() => setDrawnAction('discard_flip')}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${drawnAction === 'discard_flip' ? 'bg-amber-600 border-amber-400 text-white' : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-amber-500'}`}
                                        >
                                            <span className="inline-flex items-center justify-center gap-1.5"><TrashIcon className="w-4 h-4" />Jeter & retourner</span>
                                        </button>
                                    </div>
                                    {drawnAction === 'swap' && <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-2">Clique sur n'importe quelle carte pour l'échanger</p>}
                                    {drawnAction === 'discard_flip' && <p className="text-amber-600 dark:text-amber-400 text-xs mt-2">Clique sur une carte cachée pour la retourner</p>}
                                    {drawnAction === null && <p className="text-gray-500 dark:text-gray-400 text-xs mt-2">Choisis une action ci-dessus</p>}
                                </div>
                            )}
                            {isPlayingPhase(phase) && isCurrent && drawnCard !== null && drawnCard.from === 'discard' && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700/50 rounded-xl px-5 py-3">
                                    <p className="text-emerald-700 dark:text-emerald-300 font-semibold">Carte de la défausse : <span className="text-gray-900 dark:text-white font-bold">{drawnCard.value}</span></p>
                                    <p className="text-emerald-600 dark:text-emerald-500 text-sm mt-1">Tu dois l'échanger avec une de tes cartes</p>
                                </div>
                            )}
                            {isPlayingPhase(phase) && !isCurrent && (
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Tour de <span className="text-gray-700 dark:text-gray-300 font-semibold">{players[currentPlayerIndex]?.username}</span>…</p>
                            )}
                            {phase === 'last_round' && isCurrent && (
                                <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700/50 rounded-xl px-5 py-3 mt-2">
                                    <p className="text-red-700 dark:text-red-300 font-bold flex items-center gap-1.5"><BoltIcon className="w-4 h-4 text-yellow-500" />Dernier tour !</p>
                                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">C'est encore ton tour — joue normalement</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Mon plateau ── */}
                    {!iSurrendered && (
                        <div className={`rounded-2xl p-5 border-2 transition-all ${isCurrent ? 'border-green-500 dark:border-green-600 bg-white dark:bg-gray-900 shadow-xl shadow-green-900/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    {isCurrent && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                                    <span className="font-bold text-gray-800 dark:text-gray-200">{username} <span className="text-gray-500 dark:text-gray-400 font-normal text-sm">(moi)</span></span>
                                </div>
                                <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${myScore >= 80 ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' : myScore >= 50 ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400' : 'bg-gray-100 dark:bg-gray-800 text-emerald-600 dark:text-emerald-500'}`}>
                                    {myScore} pts
                                </span>
                            </div>

                            <PlayerGrid
                                player={myPlayer ?? { userId, username, cards: myCards, score: myScore }}
                                myCards={myCards}
                                isMe={true}
                                isCurrent={isCurrent}
                                selectableIndices={selectableIndices}
                                onCardClick={handleCardClick}
                            />

                            {/* Légende des couleurs */}
                            <div className="flex gap-2 mt-3 flex-wrap justify-center">
                                {[[-2, 'bg-blue-900'], [-1, 'bg-blue-600'], [0, 'bg-cyan-400'], ['1-3', 'bg-emerald-400'], ['4-6', 'bg-yellow-300'], ['7-9', 'bg-orange-400'], ['10-12', 'bg-red-500']].map(([v, cls]) => (
                                    <div key={String(v)} className="flex items-center gap-1">
                                        <div className={`w-3 h-3 rounded ${cls}`} />
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Journal ── */}
                <div className="lg:w-72 lg:shrink-0 p-3 order-4 lg:order-3 lg:overflow-y-auto border-t lg:border-t-0 lg:border-l border-black/40">
                    <GameLog entries={log ?? []} />
                </div>
            </main>
        </div>
    );
}
