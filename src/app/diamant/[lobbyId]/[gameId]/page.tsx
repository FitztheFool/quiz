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
    lava: 'Puits de lave',
    boulder: 'Boule de pierre',
    ram: 'Bélier de bois',
};

const DANGER_EMOJI: Record<string, string> = {
    spider: '🕷️',
    snake: '🐍',
    lava: '🌋',
    boulder: '🪨',
    ram: '🐏',
};

// ── Timer bar ─────────────────────────────────────────────────────────────────

import TurnTimer from '@/components/TurnTimer';
const TimerBar = ({ endsAt, duration }: { endsAt: number; duration: number }) => <TurnTimer endsAt={endsAt} duration={duration} label="Temps pour décider" />;

// ── Card component ────────────────────────────────────────────────────────────

function ExpeditionCard({
    card,
    index,
    rubisOnCard,
    isLast,
    isRelic,
}: {
    card: Card;
    index: number;
    rubisOnCard: number;
    isLast: boolean;
    isRelic: boolean;
}) {
    const isTreasure = card.type === 'treasure';
    const isDanger = card.type === 'danger';
    const isRelicCard = card.type === 'relic';

    return (
        <div
            className={`relative flex-shrink-0 w-28 rounded-2xl border-2 transition-all duration-300
                ${isLast ? 'scale-110 shadow-2xl z-10' : 'opacity-75'}
                ${isTreasure ? 'border-amber-500 bg-amber-100 dark:bg-amber-950/60' : ''}
                ${isDanger ? 'border-red-500 bg-red-100 dark:bg-red-950/60' : ''}
                ${isRelicCard ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-950/60' : ''}
            `}
            style={{ minHeight: '130px' }}
        >
            <div className="flex flex-col items-center justify-center gap-1.5 p-3 h-full">
                {isTreasure && (
                    <>
                        <span className="text-4xl">💎</span>
                        <span className="text-amber-800 dark:text-amber-300 font-black text-2xl leading-none">{card.value}</span>
                        <span className="text-amber-700 dark:text-amber-400 text-xs font-semibold">rubis</span>
                        {rubisOnCard > 0 && (
                            <div className="absolute -top-2.5 -right-2.5 bg-amber-500 text-black text-xs font-black rounded-full w-6 h-6 flex items-center justify-center shadow">
                                {rubisOnCard}
                            </div>
                        )}
                    </>
                )}
                {isDanger && (
                    <>
                        <span className="text-4xl">{DANGER_EMOJI[card.danger!] ?? '⚠️'}</span>
                        <span className="text-red-800 dark:text-red-300 text-xs text-center leading-tight font-semibold">
                            {DANGER_LABELS[card.danger!] ?? card.danger}
                        </span>
                    </>
                )}
                {isRelicCard && (
                    <>
                        <span className="text-4xl">🏺</span>
                        <span className="text-emerald-800 dark:text-emerald-300 text-xs text-center leading-tight font-semibold">
                            Relique
                        </span>
                        {isRelic && (
                            <div className="absolute -top-2.5 -right-2.5 bg-emerald-500 text-black text-xs font-black rounded-full w-6 h-6 flex items-center justify-center shadow">
                                ✓
                            </div>
                        )}
                    </>
                )}
            </div>
            {/* Index */}
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
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
            {/* Header */}
            <header className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center gap-4">
                {/* Left slot */}
                <div className="w-48 shrink-0 flex items-center gap-2">
                    <span className="text-xl">💎</span>
                    <h1 className="text-base font-black tracking-tight text-amber-800 dark:text-amber-100">Diamant</h1>
                </div>

                {/* Center slot — round dots + label */}
                <div className="flex-1 flex justify-center items-center gap-2">
                    {Array.from({ length: state.totalRounds }, (_, i) => (
                        <div
                            key={i}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${i < state.round - 1
                                ? 'bg-gray-400 dark:bg-gray-600'
                                : i === state.round - 1
                                    ? 'bg-amber-400 shadow-lg shadow-amber-400/50'
                                    : 'bg-gray-200 border border-gray-300 dark:bg-gray-800 dark:border-gray-700'
                                }`}
                        />
                    ))}
                    <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">
                        Manche {state.round}/{state.totalRounds}
                    </span>
                </div>

                {/* Right slot — my safe score + abandon */}
                <div className="w-48 shrink-0 flex justify-end items-center gap-2">
                    {me && (
                        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-sm">
                            <span className="text-amber-600 dark:text-amber-400 font-bold">💎{me.safeRubies}</span>
                            {me.relicPoints > 0 && (
                                <>
                                    <span className="text-gray-400 dark:text-gray-600">+</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                        🏺{me.relicPoints}pts
                                    </span>
                                </>
                            )}
                            <span className="text-gray-400 dark:text-gray-600">=</span>
                            <span className="text-gray-800 dark:text-white font-black">
                                {me.safeRubies + me.relicPoints}
                            </span>
                            <span className="text-gray-400 dark:text-gray-600 text-xs">pts</span>
                        </div>
                    )}
                    {state.phase === 'playing' && (
                        <button
                            onClick={() => { if (!iSurrendered && confirm('Abandonner la partie ?')) surrender(); }}
                            disabled={iSurrendered}
                            className={`text-xs px-3 py-1.5 rounded-lg transition-all border ${iSurrendered
                                ? 'text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                                : 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border-red-300 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600'
                                }`}
                        >
                            🏳️ Abandonner
                        </button>
                    )}
                </div>
            </header>

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
                                    <span className="text-2xl mr-2">{DANGER_EMOJI[state.doubleDanger]}</span>
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

                            {/* Timer */}
                            {state.decisionPhase && state.decisionEndsAt && amInCave && (
                                <TimerBar endsAt={state.decisionEndsAt} duration={state.decisionDuration} />
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
                                            {DANGER_EMOJI[state.lastCard.danger!]} Premier {DANGER_LABELS[state.lastCard.danger!]} — prudence !
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
                                    <button
                                        onClick={() => decide('continue')}
                                        disabled={state.myDecision !== null || !state.decisionPhase}
                                        className={`py-5 rounded-2xl border-2 font-black text-base transition-all
                                            ${state.myDecision === 'continue'
                                                ? 'border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-300 scale-105'
                                                : state.myDecision !== null || !state.decisionPhase
                                                    ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-600 opacity-40'
                                                    : 'border-amber-400 dark:border-amber-700 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:border-amber-500 hover:bg-amber-200 dark:hover:bg-amber-950/60 hover:scale-105 active:scale-100'
                                            }`}
                                    >
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-3xl">⚡</span>
                                            <span>Continuer</span>
                                            <span className="text-xs font-normal opacity-70">S'enfoncer dans la grotte</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => decide('leave')}
                                        disabled={state.myDecision !== null || !state.decisionPhase}
                                        className={`py-5 rounded-2xl border-2 font-black text-base transition-all
                                            ${state.myDecision === 'leave'
                                                ? 'border-gray-500 bg-gray-200/60 dark:bg-gray-700/40 text-gray-700 dark:text-gray-200 scale-105'
                                                : state.myDecision !== null || !state.decisionPhase
                                                    ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-600 opacity-40'
                                                    : 'border-gray-300 dark:border-gray-600 bg-gray-100/60 dark:bg-gray-900/60 text-gray-600 dark:text-gray-300 hover:border-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800/60 hover:scale-105 active:scale-100'
                                            }`}
                                    >
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-3xl">🏕️</span>
                                            <span>Sortir</span>
                                            <span className="text-xs font-normal opacity-70">Sécuriser ses rubis</span>
                                        </div>
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
