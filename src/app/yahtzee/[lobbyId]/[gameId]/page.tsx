'use client';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';
import GameIcon from '@/components/GameIcon';
import GameOverModal from '@/components/GameOverModal';
import TimerBar from '@/components/TimerBar';
import GamePageHeader from '@/components/GamePageHeader';
import SurrenderButton from '@/components/SurrenderButton';
import { NoSymbolIcon, CpuChipIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import AfkCountdown from '@/components/AfkCountdown';
import { useState } from 'react';
import { notFound } from 'next/navigation';
import { useGamePage } from '@/hooks/useGamePage';
import { useYahtzee, isBot, ScoreCard } from '@/hooks/useYahtzee';
import SharedDie from '@/components/Dice/Die';
import BotBadge from '@/components/shared/BotBadge';

// ── Score calculation (client-side preview) ───────────────────────────────────
function counts(dice: number[]) {
    const c: Record<number, number> = {};
    for (const d of dice) c[d] = (c[d] || 0) + 1;
    return c;
}
function sumDice(dice: number[]) { return dice.reduce((a, b) => a + b, 0); }

function previewScore(cat: string, dice: number[]): number {
    const c = counts(dice); const vals = Object.values(c); const s = sumDice(dice);
    switch (cat) {
        case 'ones': return dice.filter(d => d === 1).reduce((a, b) => a + b, 0);
        case 'twos': return dice.filter(d => d === 2).reduce((a, b) => a + b, 0);
        case 'threes': return dice.filter(d => d === 3).reduce((a, b) => a + b, 0);
        case 'fours': return dice.filter(d => d === 4).reduce((a, b) => a + b, 0);
        case 'fives': return dice.filter(d => d === 5).reduce((a, b) => a + b, 0);
        case 'sixes': return dice.filter(d => d === 6).reduce((a, b) => a + b, 0);
        case 'threeOfAKind': return vals.some(v => v >= 3) ? s : 0;
        case 'fourOfAKind': return vals.some(v => v >= 4) ? s : 0;
        case 'fullHouse': return (vals.includes(3) && vals.includes(2)) ? 25 : 0;
        case 'smallStraight': {
            const u = [...new Set(dice)].sort((a, b) => a - b).join('');
            return (u.includes('1234') || u.includes('2345') || u.includes('3456')) ? 30 : 0;
        }
        case 'largeStraight': {
            const u = [...new Set(dice)].sort((a, b) => a - b).join('');
            return (u === '12345' || u === '23456') ? 40 : 0;
        }
        case 'yahtzee': return new Set(dice).size === 1 ? 50 : 0;
        case 'chance': return s;
        default: return 0;
    }
}

const UPPER_CATS = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
const LOWER_CATS = ['threeOfAKind', 'fourOfAKind', 'fullHouse', 'smallStraight', 'largeStraight', 'yahtzee', 'chance'];

const CAT_LABELS: Record<string, string> = {
    ones: 'As', twos: 'Deux', threes: 'Trois', fours: 'Quatre', fives: 'Cinq', sixes: 'Six',
    threeOfAKind: 'Brelan', fourOfAKind: 'Carré', fullHouse: 'Full', smallStraight: 'Petite suite',
    largeStraight: 'Grande suite', yahtzee: 'Yahtzee', chance: 'Chance',
};

const CAT_DESC: Record<string, string> = {
    ones: 'Somme des 1', twos: 'Somme des 2', threes: 'Somme des 3',
    fours: 'Somme des 4', fives: 'Somme des 5', sixes: 'Somme des 6',
    threeOfAKind: '≥3 identiques → somme', fourOfAKind: '≥4 identiques → somme',
    fullHouse: '3+2 → 25 pts', smallStraight: '4 consécutifs → 30 pts',
    largeStraight: '5 consécutifs → 40 pts', yahtzee: '5 identiques → 50 pts',
    chance: 'Somme totale',
};

function Die({ value, held, onClick, rolling, disabled }: {
    value: number; held: boolean; onClick: () => void;
    rolling: boolean; disabled: boolean;
}) {
    return (
        <SharedDie
            value={value || null}
            size={64}
            held={held}
            rolling={rolling && !held}
            disabled={disabled}
            onClick={onClick}
            title={held ? 'Gardé (cliquer pour relâcher)' : 'Cliquer pour garder'}
        />
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function YahtzeePage() {
    const { session, status, router, me: meInfo, lobbyId, isNotFound, setIsNotFound } = useGamePage();

    const myId = session?.user?.id ?? meInfo.userId;
    const myUsername = session?.user?.name ?? session?.user?.email ?? meInfo.username ?? 'Joueur';

    const { game, results, eliminatedPlayers, rolling, timerEndsAt, toasts, vsBot, inactivityUserId, inactivityEndsAt, roll, toggleHold, scoreCategory, surrender } = useYahtzee({
        lobbyId,
        userId: myId,
        username: myUsername,
        onNotFound: () => setIsNotFound(true),
    });

    const [hoveredCat, setHoveredCat] = useState<string | null>(null);

    if (status === 'loading') return <LoadingSpinner message="Vérification de la session..." />;
    if (isNotFound) notFound();

    if (!game) return (
        <GameWaitingScreen gameType="yahtzee" gameName="Yahtzee" lobbyId={lobbyId} players={[]} myUserId={myId} />
    );

    const isMyTurn = game?.currentUserId === myId;
    const myPlayer = game?.players.find(p => p.userId === myId);
    const currentPlayer = game ? game.players[game.currentIndex] : null;
    const isBotTurn = vsBot && currentPlayer && isBot(currentPlayer);
    const canRoll = isMyTurn && game?.phase === 'rolling' && (myPlayer?.rollsLeft ?? 0) > 0 && !rolling;
    const canScore = isMyTurn && (myPlayer?.rollsLeft ?? 3) < 3;

    if (results) {
        const sorted = [...results].sort((a, b) => {
            if (a.abandon && !b.abandon) return 1;
            if (!a.abandon && b.abandon) return -1;
            if (a.afk && !b.afk) return 1;
            if (!a.afk && b.afk) return -1;
            return b.total - a.total;
        });
        const MEDAL: Record<number, string> = { 0: '🥇', 1: '🥈', 2: '🥉' };
        const hasForfeits = sorted.some(p => p.abandon || p.afk);
        let rankIdx = 0;
        return (
            <GameOverModal
                title="Partie terminée !"
                subtitle={hasForfeits ? `${sorted.find(p => !p.abandon && !p.afk)?.username ?? '?'} remporte la victoire !` : 'Classement final'}
                onLobby={() => router.push(`/lobby/create/${lobbyId}`)}
                onLeave={() => router.push('/')}
            >
                <div className="space-y-2">
                    {sorted.map((p) => {
                        const disq = !!(p.abandon || p.afk);
                        const bot = isBot(p);
                        const isFirst = !disq && rankIdx === 0;
                        const rank = disq ? null : rankIdx++;
                        return (
                            <div key={p.userId} className={`rounded-xl border px-4 py-3 ${isFirst ? 'bg-amber-400/20 border-amber-400/50' : disq ? 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl flex items-center">{disq ? <NoSymbolIcon className="w-6 h-6 text-gray-400" /> : (MEDAL[rank!] ?? `${rank! + 1}.`)}</span>
                                        <span className={`font-bold ${p.userId === myId ? 'text-amber-600 dark:text-amber-300' : 'text-gray-800 dark:text-white'}`}>
                                            {p.username}{p.userId === myId && ' (moi)'}
                                        </span>
                                        {bot && <BotBadge />}
                                        {p.abandon && <span className="text-xs bg-orange-500/30 text-orange-400 px-1.5 py-0.5 rounded">Abandon</span>}
                                        {!p.abandon && p.afk && <span className="text-xs bg-red-500/30 text-red-400 px-1.5 py-0.5 rounded">AFK</span>}
                                    </div>
                                    <span className={`font-black text-xl ${isFirst ? 'text-amber-500 dark:text-amber-400' : 'text-gray-600 dark:text-gray-300'}`}>{p.total} pts</span>
                                </div>
                                {p.scoreCard && (() => {
                                    const { upperBonus } = (() => {
                                        const upper = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
                                        const upperSum = upper.reduce((a, k) => a + (p.scoreCard![k as keyof ScoreCard] as number ?? 0), 0);
                                        return { upperBonus: upperSum >= 63 ? 35 : 0 };
                                    })();
                                    return (
                                        <div className="mt-2 grid grid-cols-2 gap-x-4 text-xs text-gray-500 dark:text-gray-400">
                                            <div className="space-y-0.5">
                                                {UPPER_CATS.map(cat => (
                                                    <div key={cat} className="flex justify-between">
                                                        <span>{CAT_LABELS[cat]}</span>
                                                        <span className="font-mono">{p.scoreCard![cat as keyof ScoreCard] ?? 0}</span>
                                                    </div>
                                                ))}
                                                <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-0.5 font-semibold text-gray-600 dark:text-gray-300">
                                                    <span>Bonus</span>
                                                    <span className="font-mono">{upperBonus}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-0.5">
                                                {LOWER_CATS.map(cat => (
                                                    <div key={cat} className="flex justify-between">
                                                        <span>{CAT_LABELS[cat]}</span>
                                                        <span className="font-mono">{p.scoreCard![cat as keyof ScoreCard] ?? 0}</span>
                                                    </div>
                                                ))}
                                                {(p.scoreCard!.yahtzeeBonus ?? 0) > 0 && (
                                                    <div className="flex justify-between border-t border-amber-400/30 pt-0.5 font-semibold text-amber-500 dark:text-amber-400">
                                                        <span>Bonus Yahtzee ×{p.scoreCard!.yahtzeeBonus}</span>
                                                        <span className="font-mono">+{(p.scoreCard!.yahtzeeBonus ?? 0) * 100}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        );
                    })}
                </div>
            </GameOverModal>
        );
    }

    const upperTotal = UPPER_CATS.reduce((a, c) => a + (myPlayer?.scoreCard[c as keyof ScoreCard] as number ?? 0), 0);
    const upperNeeded = Math.max(0, 63 - upperTotal);

    const ScoreRow = ({ cat }: { cat: string }) => {
        const val = myPlayer?.scoreCard[cat as keyof ScoreCard] as number | null ?? null;
        const preview = canScore && val === null && myPlayer ? previewScore(cat, myPlayer.dice) : null;
        const isHovered = hoveredCat === cat;
        return (
            <div
                onClick={() => val === null && canScore && scoreCategory(cat)}
                onMouseEnter={() => canScore && val === null && setHoveredCat(cat)}
                onMouseLeave={() => setHoveredCat(null)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all border
          ${val !== null ? 'opacity-60 cursor-default border-transparent' : canScore ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-500/40 border-transparent' : 'cursor-default border-transparent'}
          ${isHovered ? 'bg-blue-50 dark:bg-blue-900/20 !border-blue-300 dark:!border-blue-500/40 scale-[1.01]' : ''}`}>
                <div>
                    <span className="font-semibold text-sm">{CAT_LABELS[cat]}</span>
                    <span className="text-xs text-gray-500 ml-2">{CAT_DESC[cat]}</span>
                </div>
                <div className="text-right min-w-[40px]">
                    {val !== null ? <span className="font-black text-gray-300 dark:text-gray-300">{val}</span>
                        : isHovered && preview !== null ? <span className="font-black text-blue-600 dark:text-blue-400">{preview}</span>
                            : <span className="text-gray-400 dark:text-gray-600">—</span>}
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col wood-table text-gray-900 dark:text-white">
            {toasts.length > 0 && (
                <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                    {toasts.map(t => (
                        <div key={t.id} className={`px-4 py-3 rounded-xl shadow-lg text-sm font-semibold border animate-fade-in
              ${t.type === 'kick' ? 'bg-red-900/90 border-red-700 text-red-100' : 'bg-orange-900/90 border-orange-700 text-orange-100'}`}>
                            {t.message}
                        </div>
                    ))}
                </div>
            )}

            <GamePageHeader
                left={
                    <><GameIcon gameType="yahtzee" className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        <div>
                            <span className="font-bold leading-none">Yahtzee</span>
                            <p className="text-xs text-gray-400 dark:text-gray-500 leading-none">Tour {game.turn} / 13</p>
                        </div></>
                }
                center={
                    <span className={`text-sm font-semibold px-3 py-1 rounded-full ${isMyTurn ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30' : isBotTurn ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-gray-400 dark:text-gray-500'}`}>
                        {isMyTurn ? '🎯 À vous de jouer !'
                            : isBotTurn ? (<><CpuChipIcon className="w-4 h-4 inline-block align-middle text-indigo-500" /> Le bot joue…</>)
                                : `⏳ Tour de ${currentPlayer?.username}`}
                    </span>
                }
                right={game?.phase !== 'ended' && <SurrenderButton onSurrender={surrender} />}
            />

            {game?.phase !== 'ended' && (
                <TimerBar endsAt={timerEndsAt} duration={60} />
            )}

            <div className="p-4">
                <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">

                    {/* ── Left ── */}
                    <div className="space-y-4">
                        <div className="wood-tile rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold text-gray-600 dark:text-gray-300">
                                    {isMyTurn ? 'Vos dés'
                                        : isBotTurn ? `Dés du bot (${currentPlayer?.username})`
                                            : `Dés de ${currentPlayer?.username}`}
                                </h2>
                                {isMyTurn && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500">Lancers restants :</span>
                                        <div className="flex gap-1">
                                            {[1, 2, 3].map(n => (
                                                <div key={n} className={`w-3 h-3 rounded-full ${(myPlayer?.rollsLeft ?? 0) >= n ? 'bg-blue-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-center gap-3 mb-6">
                                {(isMyTurn ? myPlayer : currentPlayer)?.dice.map((val, i) => (
                                    <Die key={i} value={val}
                                        held={(isMyTurn ? myPlayer : currentPlayer)?.held[i] ?? false}
                                        onClick={() => toggleHold(i)} rolling={rolling}
                                        disabled={!isMyTurn || (myPlayer?.rollsLeft ?? 3) === 3 || (myPlayer?.rollsLeft ?? 0) === 0} />
                                ))}
                            </div>
                            {isMyTurn && (
                                <div className="flex gap-3 justify-center">
                                    <button onClick={roll} disabled={!canRoll}
                                        className={`px-8 py-3 rounded-xl font-black text-lg transition-all ${canRoll ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}>
                                        🎲 Lancer {myPlayer?.rollsLeft !== undefined && myPlayer.rollsLeft < 3 ? `(${myPlayer.rollsLeft} restant${myPlayer.rollsLeft > 1 ? 's' : ''})` : ''}
                                    </button>
                                </div>
                            )}
                            {isBotTurn && (
                                <p className="text-center text-sm text-indigo-400 mt-3 font-semibold animate-pulse"><CpuChipIcon className="inline-block w-4 h-4 text-indigo-500 align-text-bottom mr-1" />Le bot réfléchit…</p>
                            )}
                            {isMyTurn && myPlayer && myPlayer.rollsLeft < 3 && myPlayer.rollsLeft > 0 && (
                                <p className="text-center text-xs text-gray-500 mt-3">Cliquez sur un dé pour le garder, puis relancez ou marquez des points.</p>
                            )}
                            {isMyTurn && game.phase === 'scoring' && (
                                <p className="text-center text-sm text-amber-500 dark:text-amber-400 mt-3 font-semibold"><PencilSquareIcon className="inline-block w-4 h-4 align-text-bottom mr-1" />Choisissez une catégorie à scorer ci-dessous</p>
                            )}
                        </div>

                        <div className="wood-tile rounded-xl p-5">
                            <h2 className="font-bold text-gray-600 dark:text-gray-300 mb-4">Votre feuille de score</h2>
                            <div className="mb-2">
                                <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Section haute</div>
                                <div className="space-y-1">{UPPER_CATS.map(cat => <ScoreRow key={cat} cat={cat} />)}</div>
                                <div className="flex justify-between px-3 py-2 mt-1 bg-amber-900/20 border border-amber-700/30 rounded-lg text-sm">
                                    <span className="text-amber-900 dark:text-amber-100 font-semibold">Sous-total</span>
                                    <span className="font-bold">{upperTotal} / 63</span>
                                </div>
                                {upperNeeded > 0 && (
                                    <div className="px-3 py-1">
                                        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
                                            <span>Progression bonus (+35)</span><span>{upperTotal}/63</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, (upperTotal / 63) * 100)}%` }} />
                                        </div>
                                    </div>
                                )}
                                {myPlayer?.upperBonus === 35 && <div className="px-3 py-1.5 text-center text-xs text-green-500 dark:text-green-400 font-bold"><CheckCircleIcon className="inline-block w-4 h-4 align-text-bottom mr-1" />Bonus +35 débloqué !</div>}
                            </div>
                            <div className="mt-3">
                                <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Section basse</div>
                                <div className="space-y-1">{LOWER_CATS.map(cat => <ScoreRow key={cat} cat={cat} />)}</div>
                                {(myPlayer?.scoreCard.yahtzeeBonus ?? 0) > 0 && (
                                    <div className="flex justify-between px-3 py-2 mt-1 bg-amber-400/10 border border-amber-400/30 rounded-lg text-sm">
                                        <span className="text-amber-500 dark:text-amber-400 font-semibold">🎲 Bonus Yahtzee ×{myPlayer?.scoreCard.yahtzeeBonus}</span>
                                        <span className="font-black text-amber-500 dark:text-amber-400">+{(myPlayer?.scoreCard.yahtzeeBonus ?? 0) * 100}</span>
                                    </div>
                                )}
                                <div className="flex justify-between px-3 py-2.5 mt-2 bg-amber-800/40 border-2 border-amber-600/60 rounded-lg shadow-lg">
                                    <span className="font-black text-amber-900 dark:text-amber-100">TOTAL</span>
                                    <span className="font-black text-xl text-amber-900 dark:text-amber-100">{myPlayer?.total ?? 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Right ── */}
                    <div className="space-y-4">
                        <div className="wood-tile rounded-xl p-5">
                            <h2 className="font-bold text-gray-600 dark:text-gray-300 mb-4">Scores des joueurs</h2>
                            <div className="space-y-3">
                                {game.players.map((p, i) => {
                                    const isCurrent = i === game.currentIndex;
                                    const isMe = p.userId === myId;
                                    const bot = isBot(p);
                                    const filled = Object.entries(p.scoreCard ?? {}).filter(([k, v]) => k !== 'yahtzeeBonus' && v !== null).length;
                                    return (
                                        <div key={p.userId} className={`p-4 rounded-xl border transition-all ${isCurrent ? 'border-blue-500/60 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {isCurrent && <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
                                                    <span className={`font-bold ${isMe ? 'text-blue-600 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                                                        {p.username}{isMe && ' (moi)'}
                                                    </span>
                                                    {bot && <BotBadge />}
                                                    {inactivityUserId === p.userId && inactivityEndsAt != null && <AfkCountdown endsAt={inactivityEndsAt} />}
                                                </div>
                                                <span className="font-black text-xl">{p.total}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                                                <span>{filled}/13 catégories</span>
                                                <div className="w-24 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(filled / 13) * 100}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {game.players.filter(p => p.userId !== myId).map(p => {
                            const bot = isBot(p);
                            return (
                                <details key={p.userId} className="wood-tile rounded-xl overflow-hidden">
                                    <summary className="px-5 py-4 cursor-pointer font-semibold text-gray-600 dark:text-gray-300 flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                            {`Fiche de ${p.username}`}
                                            {bot && <BotBadge />}
                                        </span>
                                        <span className="text-gray-400 dark:text-gray-500 text-sm">{p.total} pts</span>
                                    </summary>
                                    <div className="px-5 pb-4 space-y-1">
                                        {[...UPPER_CATS, ...LOWER_CATS].map(cat => (
                                            <div key={cat} className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-700/50">
                                                <span className="text-gray-500 dark:text-gray-400">{CAT_LABELS[cat]}</span>
                                                <span className={p.scoreCard?.[cat as keyof ScoreCard] !== null ? 'font-bold text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-600'}>
                                                    {p.scoreCard?.[cat as keyof ScoreCard] !== null ? p.scoreCard?.[cat as keyof ScoreCard] as number : '—'}
                                                </span>
                                            </div>
                                        ))}
                                        {(p.scoreCard?.yahtzeeBonus ?? 0) > 0 && (
                                            <div className="flex justify-between text-sm py-1 border-b border-amber-400/30 text-amber-500 dark:text-amber-400 font-semibold">
                                                <span>🎲 Bonus Yahtzee ×{p.scoreCard!.yahtzeeBonus}</span>
                                                <span>+{(p.scoreCard!.yahtzeeBonus ?? 0) * 100}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm pt-2">
                                            <span className="font-bold text-blue-600 dark:text-blue-300">Total</span>
                                            <span className="font-black text-blue-600 dark:text-blue-300">{p.total}</span>
                                        </div>
                                    </div>
                                </details>
                            );
                        })}

                        {eliminatedPlayers.filter(p => p.userId !== myId).map(p => (
                            <details key={p.userId} className="wood-tile rounded-xl overflow-hidden opacity-50">
                                <summary className="px-5 py-4 cursor-pointer font-semibold text-gray-500 dark:text-gray-400 flex items-center justify-between">
                                    <span className="flex items-center gap-2"><NoSymbolIcon className="w-4 h-4 flex-shrink-0" /> Fiche de {p.username} <span className="text-xs font-normal">{p.abandon ? '(Abandon)' : '(AFK)'}</span></span>
                                    <span className="text-gray-400 dark:text-gray-500 text-sm">{p.total} pts</span>
                                </summary>
                                <div className="px-5 pb-4 space-y-1">
                                    {[...UPPER_CATS, ...LOWER_CATS].map(cat => (
                                        <div key={cat} className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-700/50">
                                            <span className="text-gray-500 dark:text-gray-400">{CAT_LABELS[cat]}</span>
                                            <span className="text-gray-400 dark:text-gray-500">{p.scoreCard[cat as keyof ScoreCard] as number}</span>
                                        </div>
                                    ))}
                                    {(p.scoreCard.yahtzeeBonus ?? 0) > 0 && (
                                        <div className="flex justify-between text-sm py-1 border-b border-amber-400/30 text-amber-500 dark:text-amber-400 font-semibold">
                                            <span>🎲 Bonus Yahtzee ×{p.scoreCard.yahtzeeBonus}</span>
                                            <span>+{(p.scoreCard.yahtzeeBonus ?? 0) * 100}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm pt-2">
                                        <span className="font-bold text-gray-500 dark:text-gray-400">Total</span>
                                        <span className="font-black text-gray-500 dark:text-gray-400">{p.total}</span>
                                    </div>
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
