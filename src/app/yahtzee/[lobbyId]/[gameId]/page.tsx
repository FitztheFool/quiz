// src/app/yahtzee/[lobbyId]/page.tsx
'use client';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';
import GameOverModal from '@/components/GameOverModal';
import GameScoreLeaderboard from '@/components/GameScoreLeaderboard';

import TurnTimer from '@/components/TurnTimer';
import { useState } from 'react';
import { notFound } from 'next/navigation';
import { useGamePage } from '@/hooks/useGamePage';
import { useYahtzee, ScoreCard, PlayerState, GameState } from '@/hooks/useYahtzee';

// ── Score calculation (client-side preview) ───────────────────────────────
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

// ── Die component ──────────────────────────────────────────────────────────
const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 22], [75, 22], [25, 50], [75, 50], [25, 78], [75, 78]],
};

function Die({ value, held, onClick, rolling, disabled }: {
  value: number; held: boolean; onClick: () => void;
  rolling: boolean; disabled: boolean;
}) {
  const dots = value > 0 ? DOT_POSITIONS[value] : [];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative w-16 h-16 rounded-xl transition-all duration-200 select-none
        ${held ? 'ring-4 ring-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-500 shadow-amber-200 shadow-lg scale-105 text-amber-600' : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-500 shadow-md hover:shadow-lg hover:scale-105 text-gray-800 dark:text-gray-100'}
        ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer'}
        ${rolling && !held ? 'animate-bounce' : ''}
      `}
      title={held ? 'Gardé (cliquer pour relâcher)' : 'Cliquer pour garder'}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full p-1">
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={9} fill="currentColor" />
        ))}
        {value === 0 && <text x="50" y="60" textAnchor="middle" fontSize="30" fill="#cbd5e1">?</text>}
      </svg>
      {held && (
        <span className="absolute -top-2 -right-2 bg-amber-400 text-white text-[9px] font-black px-1 rounded-full">GARDÉ</span>
      )}
    </button>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function YahtzeePage() {
  const { session, status, router, me: meInfo, lobbyId, isNotFound, setIsNotFound } = useGamePage();

  const myId = session?.user?.id ?? meInfo.userId;
  const myUsername = session?.user?.name ?? session?.user?.email ?? meInfo.username ?? 'Joueur';

  const { game, results, eliminatedPlayers, rolling, timerEndsAt, toasts, roll, toggleHold, scoreCategory, forceScore, surrender } = useYahtzee({
    lobbyId,
    userId: myId,
    username: myUsername,
    onNotFound: () => setIsNotFound(true),
  });

  const [hoveredCat, setHoveredCat] = useState<string | null>(null);

  if (status === 'loading') return <LoadingSpinner />;
  if (isNotFound) notFound();

  if (!game) return (
    <GameWaitingScreen icon="🎲" gameName="Yahtzee" lobbyId={lobbyId} players={[]} myUserId={myId} />
  );
  const isMyTurn = game?.currentUserId === myId;
  const myPlayer = game?.players.find(p => p.userId === myId);
  const currentPlayer = game ? game.players[game.currentIndex] : null;
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
        subtitle={hasForfeits ? sorted.filter(p => !p.abandon && !p.afk).map(p => p.username).join(', ') + ' remporte la victoire !' : 'Classement final'}
        onLobby={() => router.push(`/lobby/create/${lobbyId}`)}
        onLeave={() => router.push('/')}
      >
        <div className="space-y-2">
          {sorted.map((p) => {
            const disq = !!(p.abandon || p.afk);
            const isFirst = !disq && rankIdx === 0;
            const rank = disq ? null : rankIdx++;
            return (
              <div key={p.userId} className={`rounded-xl border px-4 py-3 ${isFirst ? 'bg-amber-400/20 border-amber-400/50' : disq ? 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{disq ? '🚫' : (MEDAL[rank!] ?? `${rank! + 1}.`)}</span>
                    <span className={`font-bold ${p.userId === myId ? 'text-amber-600 dark:text-amber-300' : 'text-gray-800 dark:text-white'}`}>
                      {p.username}{p.userId === myId && ' (moi)'}
                    </span>
                    {p.abandon && <span className="text-xs bg-orange-500/30 text-orange-400 px-1.5 py-0.5 rounded">Abandon</span>}
                    {!p.abandon && p.afk && <span className="text-xs bg-red-500/30 text-red-400 px-1.5 py-0.5 rounded">AFK</span>}
                  </div>
                  <span className={`font-black text-xl ${isFirst ? 'text-amber-500 dark:text-amber-400' : 'text-gray-600 dark:text-gray-300'}`}>{p.total} pts</span>
                </div>
                {p.scoreCard && (() => {
                  const { total: _, upperBonus } = (() => {
                    const upper = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
                    const upperSum = upper.reduce((a, k) => a + (p.scoreCard![k as keyof ScoreCard] as number ?? 0), 0);
                    return { total: 0, upperBonus: upperSum >= 63 ? 35 : 0 };
                  })();
                  const leftCats = UPPER_CATS;
                  const rightCats = LOWER_CATS;
                  return (
                    <div className="mt-2 grid grid-cols-2 gap-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <div className="space-y-0.5">
                        {leftCats.map(cat => (
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
                        {rightCats.map(cat => (
                          <div key={cat} className="flex justify-between">
                            <span>{CAT_LABELS[cat]}</span>
                            <span className="font-mono">{p.scoreCard![cat as keyof ScoreCard] ?? 0}</span>
                          </div>
                        ))}
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
    <div className="flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* AFK Toasts */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className={`px-4 py-3 rounded-xl shadow-lg text-sm font-semibold border animate-fade-in
              ${t.type === 'kick'
                ? 'bg-red-900/90 border-red-700 text-red-100'
                : 'bg-orange-900/90 border-orange-700 text-orange-100'}`}>
              {t.message}
            </div>
          ))}
        </div>
      )}
      {/* Header */}
      <div className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center gap-4">
        {/* Left */}
        <div className="w-48 shrink-0 flex items-center gap-2">
          <span className="text-xl">🎲</span>
          <div>
            <span className="font-bold leading-none">Yahtzee</span>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-none">Tour {game.turn} / 13</p>
          </div>
        </div>
        {/* Center */}
        <div className="flex-1 flex justify-center">
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${isMyTurn ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30' : 'text-gray-400 dark:text-gray-500'}`}>
            {isMyTurn ? '🎯 À vous de jouer !' : `⏳ Tour de ${currentPlayer?.username}`}
          </span>
        </div>
        {/* Right */}
        <div className="w-48 shrink-0 flex justify-end items-center gap-2">
          {game?.phase !== 'ended' && (
            <button
              onClick={() => { if (confirm('Abandonner la partie ?')) surrender(); }}
              className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 px-3 py-1.5 rounded-lg transition-all"
            >
              🏳️ Abandonner
            </button>
          )}
        </div>
      </div>

      {timerEndsAt && game?.phase !== 'ended' && (
        <div className="shrink-0 px-4 py-1 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <TurnTimer endsAt={timerEndsAt} duration={120} label="Temps restant" />
        </div>
      )}
      <div className="p-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">

          {/* ── Left ─────────────────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-600 dark:text-gray-300">{isMyTurn ? 'Vos dés' : `Dés de ${currentPlayer?.username}`}</h2>
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
              {isMyTurn && myPlayer && myPlayer.rollsLeft < 3 && myPlayer.rollsLeft > 0 && (
                <p className="text-center text-xs text-gray-500 mt-3">Cliquez sur un dé pour le garder, puis relancez ou marquez des points.</p>
              )}
              {isMyTurn && game.phase === 'scoring' && (
                <p className="text-center text-sm text-amber-500 dark:text-amber-400 mt-3 font-semibold">✍️ Choisissez une catégorie à scorer ci-dessous</p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <h2 className="font-bold text-gray-600 dark:text-gray-300 mb-4">Votre feuille de score</h2>
              <div className="mb-2">
                <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Section haute</div>
                <div className="space-y-1">{UPPER_CATS.map(cat => <ScoreRow key={cat} cat={cat} />)}</div>
                <div className="flex justify-between px-3 py-2 mt-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
                  <span className="text-gray-500">Sous-total</span>
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
                {myPlayer?.upperBonus === 35 && <div className="px-3 py-1.5 text-center text-xs text-green-500 dark:text-green-400 font-bold">✅ Bonus +35 débloqué !</div>}
              </div>
              <div className="mt-3">
                <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Section basse</div>
                <div className="space-y-1">{LOWER_CATS.map(cat => <ScoreRow key={cat} cat={cat} />)}</div>
                {(myPlayer?.scoreCard.yahtzeeBonus ?? 0) > 0 && (
                  <div className="flex justify-between px-3 py-2 mt-1 bg-amber-400/10 border border-amber-400/30 rounded-lg text-sm">
                    <span className="text-amber-500 dark:text-amber-400 font-semibold">🎲 Bonus Yahtzee</span>
                    <span className="font-black text-amber-500 dark:text-amber-400">+{myPlayer?.scoreCard.yahtzeeBonus}</span>
                  </div>
                )}
                <div className="flex justify-between px-3 py-2.5 mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-500/30 rounded-lg">
                  <span className="font-black text-blue-700 dark:text-blue-300">TOTAL</span>
                  <span className="font-black text-xl text-blue-700 dark:text-blue-300">{myPlayer?.total ?? 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right ────────────────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <h2 className="font-bold text-gray-600 dark:text-gray-300 mb-4">Scores des joueurs</h2>
              <div className="space-y-3">
                {game.players.map((p, i) => {
                  const isCurrent = i === game.currentIndex;
                  const isMe = p.userId === myId;
                  const filled = Object.entries(p.scoreCard ?? {}).filter(([k, v]) => k !== 'yahtzeeBonus' && v !== null).length;
                  return (
                    <div key={p.userId} className={`p-4 rounded-xl border transition-all ${isCurrent ? 'border-blue-500/60 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isCurrent && <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
                          <span className={`font-bold ${isMe ? 'text-blue-600 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>{p.username}{isMe && ' (moi)'}</span>
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
            {game.players.filter(p => p.userId !== myId).map(p => (
              <details key={p.userId} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <summary className="px-5 py-4 cursor-pointer font-semibold text-gray-600 dark:text-gray-300 flex items-center justify-between">
                  <span>Fiche de {p.username}</span>
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
                  <div className="flex justify-between text-sm pt-2">
                    <span className="font-bold text-blue-600 dark:text-blue-300">Total</span>
                    <span className="font-black text-blue-600 dark:text-blue-300">{p.total}</span>
                  </div>
                </div>
              </details>
            ))}
            {eliminatedPlayers.filter(p => p.userId !== myId).map(p => (
              <details key={p.userId} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden opacity-50">
                <summary className="px-5 py-4 cursor-pointer font-semibold text-gray-500 dark:text-gray-400 flex items-center justify-between">
                  <span className="flex items-center gap-2">🚫 Fiche de {p.username} <span className="text-xs font-normal">{p.abandon ? '(Abandon)' : '(AFK)'}</span></span>
                  <span className="text-gray-400 dark:text-gray-500 text-sm">{p.total} pts</span>
                </summary>
                <div className="px-5 pb-4 space-y-1">
                  {[...UPPER_CATS, ...LOWER_CATS].map(cat => (
                    <div key={cat} className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-700/50">
                      <span className="text-gray-500 dark:text-gray-400">{CAT_LABELS[cat]}</span>
                      <span className="text-gray-400 dark:text-gray-500">{p.scoreCard[cat as keyof ScoreCard] as number}</span>
                    </div>
                  ))}
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
