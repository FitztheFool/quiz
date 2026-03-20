// src/app/diamant/[lobbyId]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useDiamant, Card, PlayerInfo } from '@/hooks/useDiamant';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useChat } from '@/context/ChatContext';
import GameOverModal from '@/components/GameOverModal';

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

function TimerBar({ endsAt, duration }: { endsAt: number; duration: number }) {
    const [pct, setPct] = useState(100);
    const [timeLeft, setTimeLeft] = useState(duration);

    useEffect(() => {
        const tick = () => {
            const remaining = Math.max(0, endsAt - Date.now());
            setPct((remaining / (duration * 1000)) * 100);
            setTimeLeft(Math.ceil(remaining / 1000));
        };
        tick();
        const id = setInterval(tick, 200);
        return () => clearInterval(id);
    }, [endsAt, duration]);

    const color = pct > 50 ? 'bg-amber-500' : pct > 25 ? 'bg-orange-500' : 'bg-red-500';

    return (
        <div className="w-full space-y-1">
            <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400">
                <span>Temps pour décider</span>
                <span className={`font-mono font-bold ${timeLeft <= 5 ? 'text-red-500 dark:text-red-400 animate-pulse' : ''}`}>
                    {timeLeft}s
                </span>
            </div>
            <div className="w-full h-2 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-200 ${color}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

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
            className={`relative flex-shrink-0 w-20 rounded-xl border-2 transition-all duration-300
                ${isLast ? 'scale-110 shadow-2xl z-10' : 'opacity-80'}
                ${isTreasure ? 'border-amber-600 bg-amber-50/80 dark:bg-amber-950/60' : ''}
                ${isDanger ? 'border-red-600 bg-red-50/80 dark:bg-red-950/60' : ''}
                ${isRelicCard ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/60' : ''}
            `}
            style={{ minHeight: '96px' }}
        >
            <div className="flex flex-col items-center justify-center gap-1 p-2 h-full">
                {isTreasure && (
                    <>
                        <span className="text-2xl">💎</span>
                        <span className="text-amber-700 dark:text-amber-300 font-black text-lg leading-none">{card.value}</span>
                        <span className="text-amber-600 text-[10px]">rubis</span>
                        {rubisOnCard > 0 && (
                            <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                                {rubisOnCard}
                            </div>
                        )}
                    </>
                )}
                {isDanger && (
                    <>
                        <span className="text-2xl">{DANGER_EMOJI[card.danger!] ?? '⚠️'}</span>
                        <span className="text-red-700 dark:text-red-300 text-[10px] text-center leading-tight font-semibold">
                            {DANGER_LABELS[card.danger!] ?? card.danger}
                        </span>
                    </>
                )}
                {isRelicCard && (
                    <>
                        <span className="text-2xl">🏺</span>
                        <span className="text-emerald-700 dark:text-emerald-300 text-[10px] text-center leading-tight font-semibold">
                            Relique
                        </span>
                        {isRelic && (
                            <div className="absolute -top-2 -right-2 bg-emerald-500 text-black text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                                ✓
                            </div>
                        )}
                    </>
                )}
            </div>
            {/* Index */}
            <div className="absolute bottom-1 left-0 right-0 text-center text-[9px] text-stone-400 dark:text-stone-600 font-mono">
                #{index + 1}
            </div>
        </div>
    );
}

// ── Player row ────────────────────────────────────────────────────────────────

function PlayerRow({ player, isMe }: { player: PlayerInfo; isMe: boolean }) {
    return (
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all
            ${!player.inCave ? 'opacity-50 border-stone-200 dark:border-stone-800 bg-stone-100/40 dark:bg-stone-900/40' : ''}
            ${player.inCave && isMe ? 'border-amber-400/50 dark:border-amber-600/50 bg-amber-50/80 dark:bg-amber-950/30' : ''}
            ${player.inCave && !isMe ? 'border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-900/60' : ''}
        `}>
            {/* Status indicator */}
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${player.inCave ? 'bg-green-500 dark:bg-green-400 animate-pulse' : 'bg-stone-300 dark:bg-stone-600'}`} />

            {/* Name */}
            <span className={`text-sm font-semibold flex-1 ${isMe ? 'text-amber-700 dark:text-amber-300' : 'text-stone-700 dark:text-stone-300'}`}>
                {player.username}
                {isMe && <span className="text-stone-400 dark:text-stone-500 text-xs font-normal ml-1">(moi)</span>}
            </span>

            {/* Cave status */}
            {player.inCave ? (
                <span className="text-xs text-stone-400 dark:text-stone-500">
                    {player.hasDecided ? '✅ décidé' : '⏳ réfléchit…'}
                </span>
            ) : (
                <span className="text-xs text-stone-400 dark:text-stone-500">🏕️ au camp</span>
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
                <div className="flex items-center gap-1 text-sm text-stone-500 dark:text-stone-400">
                    <span>🔒</span>
                    <span className="font-semibold text-stone-700 dark:text-stone-200">
                        {player.safeRubies + player.safeDiamonds * 5}
                    </span>
                </div>
            )}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DiamantPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams<{ lobbyId: string }>();
    const lobbyId = params?.lobbyId ?? '';

    const { setLobbyId } = useChat();
    useEffect(() => {
        setLobbyId(lobbyId);
        return () => setLobbyId(null);
    }, [lobbyId, setLobbyId]);

    const { state, decide, clearError } = useDiamant({
        lobbyId,
        userId: session?.user?.id ?? '',
        username: session?.user?.username ?? session?.user?.email ?? 'Joueur',
    });

    if (status === 'loading') return <LoadingSpinner />;
    if (status !== 'authenticated') { router.push('/login'); return null; }

    const myUserId = session.user.id;
    const me = state.players.find((p) => p.userId === myUserId);
    const amInCave = me?.inCave ?? false;
    const canDecide = state.decisionPhase && amInCave && state.myDecision === null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white flex flex-col"
            style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(120,80,20,0.1) 0%, transparent 70%)' }}>

            {/* Header */}
            <header className="border-b border-stone-200 dark:border-stone-800 px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-xl">💎</span>
                    <h1 className="text-base font-black tracking-tight text-amber-800 dark:text-amber-100">Diamant</h1>
                </div>

                {/* Round indicator */}
                <div className="flex items-center gap-2">
                    {Array.from({ length: state.totalRounds }, (_, i) => (
                        <div
                            key={i}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${i < state.round - 1
                                ? 'bg-stone-400 dark:bg-stone-600'
                                : i === state.round - 1
                                    ? 'bg-amber-400 shadow-lg shadow-amber-400/50'
                                    : 'bg-stone-200 border border-stone-300 dark:bg-stone-800 dark:border-stone-700'
                                }`}
                        />
                    ))}
                    <span className="text-stone-500 dark:text-stone-400 text-xs ml-1">
                        Manche {state.round}/{state.totalRounds}
                    </span>
                </div>

                {/* My safe score */}
                {me && (
                    <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-1.5">
                        <span className="text-xs text-stone-500 dark:text-stone-400">Coffre</span>
                        <span className="text-amber-600 dark:text-amber-400 font-black text-sm">
                            {me.safeRubies + me.safeDiamonds * 5}
                        </span>
                        <span className="text-stone-400 dark:text-stone-600 text-xs">pts</span>
                    </div>
                )}
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
            <main className="flex flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-6 items-center">

                    {/* Waiting */}
                    {state.phase === 'waiting' && (
                        <div className="py-16">
                            <LoadingSpinner fullScreen={false} message="En attente des explorateurs…" />
                        </div>
                    )}

                    {/* Playing */}
                    {state.phase === 'playing' && (
                        <div className="w-full max-w-3xl flex flex-col gap-5">

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
                                            ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300/50 dark:border-amber-700/50 text-amber-700 dark:text-amber-300'
                                            : 'bg-stone-100 dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-500'
                                        : 'bg-stone-50/60 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400'
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
                                <TimerBar endsAt={state.decisionEndsAt} duration={45} />
                            )}

                            {/* Cards path */}
                            {state.revealedCards.length > 0 && (
                                <div className="relative">
                                    <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-amber-50/50 dark:bg-stone-950/60">
                                        <p className="text-[10px] text-stone-400 dark:text-stone-600 uppercase tracking-widest mb-3 font-semibold">
                                            Chemin de la grotte — {state.revealedCards.length} carte{state.revealedCards.length > 1 ? 's' : ''}
                                        </p>
                                        <div className="flex gap-2 overflow-x-auto pb-2 items-center">
                                            {state.revealedCards.map((card, i) => (
                                                <ExpeditionCard
                                                    key={card.id}
                                                    card={card}
                                                    index={i}
                                                    rubisOnCard={state.rubisOnCards[i] ?? 0}
                                                    isLast={i === state.revealedCards.length - 1}
                                                    isRelic={state.relicsInCave.includes(i)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Last card info */}
                            {state.lastCard && !state.doubleDanger && (
                                <div className={`px-4 py-3 rounded-xl border text-sm
                                    ${state.lastCard.type === 'treasure' ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300/50 dark:border-amber-800/50 text-amber-700 dark:text-amber-300' : ''}
                                    ${state.lastCard.type === 'danger' ? 'bg-red-50/80 dark:bg-red-950/30 border-red-300/50 dark:border-red-800/50 text-red-700 dark:text-red-300' : ''}
                                    ${state.lastCard.type === 'relic' ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300/50 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300' : ''}
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

                            {/* Last decisions reveal */}
                            {state.lastDecisions.length > 0 && !state.decisionPhase && (
                                <div className="grid grid-cols-2 gap-2">
                                    {state.lastDecisions.map((d) => {
                                        const player = state.players.find((p) => p.userId === d.userId);
                                        return (
                                            <div key={d.userId} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs
                                                ${d.decision === 'leave'
                                                    ? 'border-stone-300 dark:border-stone-600 bg-stone-100/60 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400'
                                                    : 'border-amber-400/50 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                                                }`}>
                                                <span>{d.decision === 'leave' ? '🏕️' : '⚡'}</span>
                                                <span className="font-semibold">{player?.username ?? d.userId}</span>
                                                <span className="ml-auto">{d.decision === 'leave' ? 'Sort' : 'Continue'}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Decision buttons */}
                            {state.decisionPhase && amInCave && (
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => decide('continue')}
                                        disabled={state.myDecision !== null}
                                        className={`py-5 rounded-2xl border-2 font-black text-base transition-all
                                            ${state.myDecision === 'continue'
                                                ? 'border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-300 scale-105'
                                                : state.myDecision !== null
                                                    ? 'border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-900 text-stone-400 dark:text-stone-600 opacity-40'
                                                    : 'border-amber-400 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:border-amber-500 hover:bg-amber-100/80 dark:hover:bg-amber-950/60 hover:scale-105 active:scale-100'
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
                                        disabled={state.myDecision !== null}
                                        className={`py-5 rounded-2xl border-2 font-black text-base transition-all
                                            ${state.myDecision === 'leave'
                                                ? 'border-stone-500 bg-stone-200/60 dark:bg-stone-700/40 text-stone-700 dark:text-stone-200 scale-105'
                                                : state.myDecision !== null
                                                    ? 'border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-900 text-stone-400 dark:text-stone-600 opacity-40'
                                                    : 'border-stone-300 dark:border-stone-600 bg-stone-100/60 dark:bg-stone-900/60 text-stone-600 dark:text-stone-300 hover:border-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800/60 hover:scale-105 active:scale-100'
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
                                <div className="px-4 py-4 bg-stone-100/60 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl text-center text-stone-400 dark:text-stone-500 text-sm">
                                    🏕️ Vous êtes au campement — en attente de la fin du tour…
                                </div>
                            )}

                            {/* Players */}
                            <div className="space-y-2">
                                <p className="text-[10px] text-stone-400 dark:text-stone-600 uppercase tracking-widest font-semibold">Explorateurs</p>
                                {state.players.map((p) => (
                                    <PlayerRow key={p.userId} player={p} isMe={p.userId === myUserId} />
                                ))}
                            </div>

                        </div>
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
                />
            )}
        </div>
    );
}
