// src/app/diamant/[lobbyId]/page.tsx
'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import { useDiamant, Card, PlayerInfo } from '@/hooks/useDiamant';
import { useGamePage } from '@/hooks/useGamePage';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';
import GameOverModal from '@/components/GameOverModal';
import GameScoreLeaderboard from '@/components/GameScoreLeaderboard';

// ── Design tokens ─────────────────────────────────────────────────────────────

const DANGER_LABELS: Record<string, string> = {
    spider: 'Araignée géante',
    snake: 'Serpent',
    fireball: 'Boule de feu',
    mummy: 'Momie',
    landslide: 'Éboulement',
};

const DANGER_IMG: Record<string, string> = {
    spider: '/diamant/cards/spider.png',
    snake: '/diamant/cards/snake.png',
    fireball: '/diamant/cards/fireball.png',
    mummy: '/diamant/cards/mummy.png',
    landslide: '/diamant/cards/landslide.png',
};

const TREASURE_IMG: Record<number, string> = {
    1: '/diamant/cards/1.png',
    2: '/diamant/cards/2.png',
    3: '/diamant/cards/3.png',
    4: '/diamant/cards/4.png',
    5: '/diamant/cards/5a.png',
    7: '/diamant/cards/7a.png',
    9: '/diamant/cards/9.png',
    11: '/diamant/cards/11a.png',
    13: '/diamant/cards/13.png',
    14: '/diamant/cards/14.png',
    15: '/diamant/cards/15.png',
    17: '/diamant/cards/17.png',
};

import TimerBar from '@/components/TimerBar';
import GamePageHeader from '@/components/GamePageHeader';
import SurrenderButton from '@/components/SurrenderButton';

// ── Card component ────────────────────────────────────────────────────────────

const TREASURE_VARIANT: Record<string, string> = {
    'treasure-4': '/diamant/cards/5b.png',
    'treasure-6': '/diamant/cards/7b.png',
    'treasure-10': '/diamant/cards/11b.png',
};

function getTreasureImg(card: Card): string {
    return TREASURE_VARIANT[card.id] ?? TREASURE_IMG[card.value!] ?? '/diamant/cards/1.png';
}

function getRelicImg(relicsExited: number): string {
    const n = Math.min(Math.max(relicsExited, 1), 5);
    return `/diamant/cards/relic_${n}.png`;
}

function ExpeditionCard({
    card,
    index,
    rubisOnCard,
    isLast,
    isRelic,
    relicsExited,
}: {
    card: Card;
    index: number;
    rubisOnCard: number;
    isLast: boolean;
    isRelic: boolean;
    relicsExited: number;
}) {
    const isTreasure = card.type === 'treasure';
    const isDanger = card.type === 'danger';
    const isRelicCard = card.type === 'relic';

    return (
        <div
            className={`relative flex-shrink-0 w-20 rounded-xl border-2 transition-all duration-300
                ${isLast ? 'scale-110 shadow-2xl z-10' : 'opacity-75'}
                ${isTreasure ? 'border-amber-500' : ''}
                ${isDanger ? 'border-red-500' : ''}
                ${isRelicCard ? 'border-emerald-500' : ''}
            `}
        >
            {isTreasure && (
                <>
                    <img src={getTreasureImg(card)} alt={`${card.value} rubis`} className="w-full rounded-xl" />
                    {rubisOnCard > 0 && (
                        <div className="absolute -top-2.5 -right-2.5 bg-amber-500 text-black text-xs font-black rounded-full w-6 h-6 flex items-center justify-center shadow">
                            {rubisOnCard}
                        </div>
                    )}
                </>
            )}
            {isDanger && (
                <img src={DANGER_IMG[card.danger!] ?? ''} alt={DANGER_LABELS[card.danger!] ?? card.danger} className="w-full rounded-xl" />
            )}
            {isRelicCard && (
                <>
                    <img src={getRelicImg(relicsExited)} alt="Relique" className="w-full rounded-xl" />
                    {isRelic && (
                        <div className="absolute -top-2.5 -right-2.5 bg-emerald-500 text-black text-xs font-black rounded-full w-6 h-6 flex items-center justify-center shadow">
                            ✓
                        </div>
                    )}
                </>
            )}
            <div className="absolute bottom-1.5 left-0 right-0 text-center text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                #{index + 1}
            </div>
        </div>
    );
}

// ── Player row ────────────────────────────────────────────────────────────────

function PlayerRow({ player, isMe }: { player: PlayerInfo; isMe: boolean }) {
    return (
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all
            ${!player.inCave ? 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900/40' : ''}
            ${player.inCave && isMe ? 'border-amber-400 dark:border-amber-600/50 bg-amber-100 dark:bg-amber-950/30' : ''}
            ${player.inCave && !isMe ? 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40' : ''}
        `}>
            {/* Status indicator */}
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${player.inCave ? 'bg-green-500 dark:bg-green-400 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`} />

            {/* Name */}
            <span className={`text-sm font-semibold flex-1 ${player.surrendered ? 'line-through text-gray-400 dark:text-gray-600' : isMe ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-gray-300'}`}>
                {player.username}
                {isMe && <span className="text-gray-400 dark:text-gray-500 text-xs font-normal ml-1">(moi)</span>}
            </span>

            {/* Cave status */}
            {player.inCave ? (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                    {player.hasDecided ? '✅ décidé' : '⏳ réfléchit…'}
                </span>
            ) : (
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">🏕️ au camp</span>
            )}

            {/* Hand rubies (only for me) */}
            {isMe && player.inCave && (
                <div className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400 font-bold">
                    <span>💎</span>
                    <span>{player.handRubies}</span>
                </div>
            )}

            {/* Safe total (only for me) */}
            {isMe && (
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>🔒</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                        💎{player.safeRubies}
                    </span>
                    {player.relicPoints > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            +🏺{player.relicPoints}pts
                        </span>
                    )}
                    <span className="text-gray-400 dark:text-gray-600">=</span>
                    <span className="font-black text-gray-800 dark:text-white text-sm">
                        {player.safeRubies + player.relicPoints}
                    </span>
                </div>
            )}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DiamantPage() {
    const { status, router, me: meInfo, lobbyId } = useGamePage();

    const { state, decide, clearError, gameNotFound, surrender } = useDiamant({
        lobbyId,
        userId: meInfo.userId,
        username: meInfo.username,
    });

    if (status === 'loading') return <LoadingSpinner />;
    if (gameNotFound) notFound();
    if (status !== 'authenticated') { router.push('/login'); return null; }

    const myUserId = meInfo.userId;
    const me = state.players.find((p) => p.userId === myUserId);
    const amInCave = me?.inCave ?? false;
    const iSurrendered = me?.surrendered ?? false;
    const canDecide = state.decisionPhase && amInCave && state.myDecision === null;

    if (state.phase === 'waiting') return (
        <GameWaitingScreen icon="💎" gameName="Diamant" lobbyId={lobbyId} players={state.players} myUserId={myUserId} />
    );

    return (
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
            <GamePageHeader
                left={<><span className="text-xl">💎</span><h1 className="text-base font-black tracking-tight text-amber-800 dark:text-amber-100">Diamant</h1></>}
                center={<>
                    {Array.from({ length: state.totalRounds }, (_, i) => (
                        <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${i < state.round - 1 ? 'bg-gray-400 dark:bg-gray-600' : i === state.round - 1 ? 'bg-amber-400 shadow-lg shadow-amber-400/50' : 'bg-gray-200 border border-gray-300 dark:bg-gray-800 dark:border-gray-700'}`} />
                    ))}
                    <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">Manche {state.round}/{state.totalRounds}</span>
                </>}
                right={<>
                    {me && (
                        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-sm">
                            <span className="text-amber-600 dark:text-amber-400 font-bold">💎{me.safeRubies}</span>
                            {me.relicPoints > 0 && (<><span className="text-gray-400 dark:text-gray-600">+</span><span className="text-emerald-600 dark:text-emerald-400 font-bold">🏺{me.relicPoints}pts</span></>)}
                            <span className="text-gray-400 dark:text-gray-600">=</span>
                            <span className="text-gray-800 dark:text-white font-black">{me.safeRubies + me.relicPoints}</span>
                            <span className="text-gray-400 dark:text-gray-600 text-xs">pts</span>
                        </div>
                    )}
                    {state.phase === 'playing' && <SurrenderButton onSurrender={surrender} disabled={iSurrendered} />}
                </>}
            />

            {/* Timer bar */}
            {state.phase === 'playing' && state.decisionPhase && (
                <TimerBar endsAt={state.decisionEndsAt} duration={state.decisionDuration} label="Temps pour décider" />
            )}

            {/* Error toast */}
            {state.error && (
                <div
                    className="mx-4 mt-3 px-4 py-2 bg-red-50 dark:bg-red-500/20 border border-red-300 dark:border-red-500/50 rounded-lg text-red-600 dark:text-red-300 text-sm flex justify-between items-center cursor-pointer"
                    onClick={clearError}
                >
                    <span>⚠️ {state.error}</span>
                    <span className="text-red-400 ml-4">✕</span>
                </div>
            )}

            {/* Body */}
            <main className="flex-1 overflow-visible p-4 flex flex-col items-center gap-4">

                <div className="w-full max-w-3xl flex flex-col gap-5">

                    {/* Playing */}
                    {state.phase === 'playing' && (
                        <>
                            {/* Double danger banner */}
                            {state.doubleDanger && (
                                <div className="px-4 py-3 bg-red-50/80 dark:bg-red-950/80 border border-red-300 dark:border-red-700 rounded-xl text-center animate-pulse">
                                    <img src={DANGER_IMG[state.doubleDanger]} alt="" className="inline w-8 h-8 mr-2 object-contain" />
                                    <span className="text-red-700 dark:text-red-300 font-black">
                                        Double {DANGER_LABELS[state.doubleDanger]} ! Tout le monde sort les mains vides…
                                    </span>
                                </div>
                            )}

                            {/* Status bar */}
                            {!state.doubleDanger && (
                                <div className={`px-4 py-2.5 rounded-xl text-center text-sm font-semibold border
                                    ${state.decisionPhase
                                        ? amInCave
                                            ? 'bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/50 text-amber-800 dark:text-amber-300'
                                            : 'bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600'
                                        : 'bg-gray-50 dark:bg-gray-900/60 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400'
                                    }`}>
                                    {state.decisionPhase
                                        ? amInCave
                                            ? state.myDecision
                                                ? state.myDecision === 'continue'
                                                    ? '⚡ Vous continuez l\'exploration…'
                                                    : '🏕️ Vous rentrez au campement…'
                                                : '⏳ Continuez ou rentrez au camp ?'
                                            : '👀 Les explorateurs décident…'
                                        : state.revealedCards.length === 0
                                            ? '🕯️ L\'expédition commence…'
                                            : '🃏 Révélation de la prochaine carte…'
                                    }
                                </div>
                            )}

                            {/* Cards path */}
                            {state.revealedCards.length > 0 && (
                                <div className="relative">
                                    <div className="p-4 rounded-2xl border border-amber-200 dark:border-gray-800 bg-amber-50 dark:bg-amber-950/20">
                                        <p className="text-[10px] text-amber-800 dark:text-gray-500 uppercase tracking-widest mb-3 font-semibold">
                                            Chemin de la grotte — {state.revealedCards.length} carte{state.revealedCards.length > 1 ? 's' : ''}
                                        </p>
                                        <div className="flex flex-wrap gap-2 py-4 px-2 items-center">
                                            {state.revealedCards.map((card, i) => (
                                                <ExpeditionCard
                                                    key={card.id}
                                                    card={card}
                                                    index={i}
                                                    rubisOnCard={state.rubisOnCards[i] ?? 0}
                                                    isLast={i === state.revealedCards.length - 1}
                                                    isRelic={state.relicsInCave.includes(card.id)}
                                                    relicsExited={state.relicsExited}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Last card info */}
                            {state.lastCard && !state.doubleDanger && (
                                <div className={`px-4 py-3 rounded-xl border text-sm
                                    ${state.lastCard.type === 'treasure' ? 'bg-amber-100 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/50 text-amber-800 dark:text-amber-300' : ''}
                                    ${state.lastCard.type === 'danger' ? 'bg-red-100 dark:bg-red-950/30 border-red-300 dark:border-red-800/50 text-red-800 dark:text-red-300' : ''}
                                    ${state.lastCard.type === 'relic' ? 'bg-emerald-100 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300' : ''}
                                `}>
                                    {state.lastCard.type === 'treasure' && (
                                        <span>💎 Trésor de <strong>{state.lastCard.value}</strong> rubis —
                                            chaque explorateur reçoit <strong>{state.lastSharePerPlayer ?? 0}</strong> rubis
                                            {(state.rubisOnCards[state.lastCardIndex!] ?? 0) > 0 &&
                                                ` (${state.rubisOnCards[state.lastCardIndex!]} restant sur la carte)`
                                            }
                                        </span>
                                    )}
                                    {state.lastCard.type === 'danger' && (
                                        <span>
                                            <img src={DANGER_IMG[state.lastCard.danger!]} alt="" className="inline w-5 h-5 mr-1 object-contain" />
                                            Premier {DANGER_LABELS[state.lastCard.danger!]} — prudence !
                                        </span>
                                    )}
                                    {state.lastCard.type === 'relic' && (
                                        <span>🏺 Une relique ! Elle ne vaudra quelque chose que si vous sortez seul.</span>
                                    )}
                                </div>
                            )}


                            {/* Decision buttons */}
                            {amInCave && (
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Continuer */}
                                    <button
                                        onClick={() => decide('continue')}
                                        disabled={state.myDecision !== null || !state.decisionPhase}
                                        className={`relative overflow-hidden rounded-2xl border-2 transition-all h-36
                                            ${state.myDecision === 'continue' ? 'border-amber-500 scale-105 shadow-2xl' : ''}
                                            ${state.myDecision === 'leave' || !state.decisionPhase ? 'opacity-40 border-gray-700' : 'border-amber-700 hover:scale-105 hover:border-amber-500 active:scale-100'}
                                        `}
                                    >
                                        <img src="/diamant/cards/explorer.png" alt="Continuer" className="absolute inset-0 w-full h-full object-cover" />
                                    </button>
                                    {/* Sortir */}
                                    <button
                                        onClick={() => decide('leave')}
                                        disabled={state.myDecision !== null || !state.decisionPhase}
                                        className={`relative overflow-hidden rounded-2xl border-2 transition-all h-36
                                            ${state.myDecision === 'leave' ? 'border-gray-400 scale-105 shadow-2xl' : ''}
                                            ${state.myDecision === 'continue' || !state.decisionPhase ? 'opacity-40 border-gray-700' : 'border-gray-600 hover:scale-105 hover:border-gray-400 active:scale-100'}
                                        `}
                                    >
                                        <img src="/diamant/cards/back.png" alt="Sortir" className="absolute inset-0 w-full h-full object-cover" />
                                    </button>
                                </div>
                            )}

                            {/* Hors de la grotte */}
                            {!amInCave && state.decisionPhase && (
                                <div className="px-4 py-4 bg-gray-100 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl text-center text-gray-400 dark:text-gray-500 text-sm">
                                    🏕️ Vous êtes au campement — en attente de la fin du tour…
                                </div>
                            )}

                            {/* Players */}
                            <div className="space-y-2">
                                <p className="text-[10px] text-gray-600 dark:text-gray-500 uppercase tracking-widest font-semibold">Explorateurs</p>
                                {state.players.map((p) => (
                                    <PlayerRow key={p.userId} player={p} isMe={p.userId === myUserId} />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Game over */}
            {state.phase === 'finished' && (
                <GameOverModal
                    emoji={state.winnerId === myUserId ? '🏆' : '💀'}
                    title={state.winnerId === myUserId ? 'Victoire !' : 'Partie terminée'}
                    subtitle="Fin de l'expédition dans la grotte de Tacora"
                    onLobby={() => router.push(`/lobby/create/${lobbyId}`)}
                    onLeave={() => router.push('/')}
                    asModal
                >
                    <GameScoreLeaderboard
                        myUserId={myUserId}
                        entries={state.finalScores.map((p) => {
                            const surrendered = state.players.find(pl => pl.userId === p.userId)?.surrendered ?? false;
                            const parts = [`💎 ${p.safeRubies} rubis`];
                            if (p.relicPoints > 0) parts.push(`🏺 ${p.relicPoints} pts reliques`);
                            return {
                                userId: p.userId,
                                username: p.username,
                                score: `${p.score} pts`,
                                subScore: parts.join('  ·  '),
                                badges: surrendered ? ['Abandon'] : undefined,
                                disqualified: surrendered,
                            };
                        })}
                    />
                </GameOverModal>
            )}
        </div>
    );
}
