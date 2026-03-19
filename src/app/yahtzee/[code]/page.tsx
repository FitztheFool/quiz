// src/app/yahtzee/[code]/page.tsx
'use client';
import LoadingSpinner from '@/components/LoadingSpinner';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getYahtzeeSocket } from '@/lib/socket';
import { useChat } from '@/context/ChatContext';

// ── Types ──────────────────────────────────────────────────────────────────
type ScoreCard = {
  ones: number | null; twos: number | null; threes: number | null;
  fours: number | null; fives: number | null; sixes: number | null;
  threeOfAKind: number | null; fourOfAKind: number | null;
  fullHouse: number | null; smallStraight: number | null;
  largeStraight: number | null; yahtzee: number | null; chance: number | null;
  yahtzeeBonus: number;
};

type PlayerState = {
  userId: string; username: string;
  dice: number[]; held: boolean[]; rollsLeft: number;
  scoreCard: ScoreCard; upperBonus: number; total: number;
};

type GameState = {
  players: PlayerState[];
  currentIndex: number; turn: number;
  phase: 'rolling' | 'scoring' | 'ended';
  currentUserId: string;
};

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
        ${held ? 'ring-4 ring-amber-400 bg-amber-50 shadow-amber-200 shadow-lg scale-105' : 'bg-white shadow-md hover:shadow-lg hover:scale-105'}
        ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer'}
        ${rolling && !held ? 'animate-bounce' : ''}
      `}
      title={held ? 'Gardé (cliquer pour relâcher)' : 'Cliquer pour garder'}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full p-1">
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={9} fill={held ? '#d97706' : '#1e293b'} />
        ))}
        {value === 0 && <text x="50" y="60" textAnchor="middle" fontSize="30" fill="#cbd5e1">?</text>}
      </svg>
      {held && (
        <span className="absolute -top-2 -right-2 bg-amber-400 text-white text-[9px] font-black px-1 rounded-full">GARDÉ</span>
      )}
    </button>
  );
}

function TimerBadge({ timeLeft }: { timeLeft: number }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold tabular-nums
      ${timeLeft <= 10 ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
        : timeLeft <= 30 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          : 'bg-slate-700 text-slate-300'}`}>
      ⏱ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function YahtzeePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const lobbyId = params?.code ?? '';

  const socket = useMemo(() => getYahtzeeSocket(), []);
  const joinedRef = useRef(false);

  const [game, setGame] = useState<GameState | null>(null);
  const [results, setResults] = useState<{ userId: string; username: string; total: number }[] | null>(null);
  const [rolling, setRolling] = useState(false);
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const me = session?.user;
  const { setLobbyId } = useChat();

  useEffect(() => {
    setLobbyId(lobbyId);
    return () => setLobbyId(null);
  }, [lobbyId]);


  useEffect(() => {
    if (!socket || !lobbyId || status !== 'authenticated' || !me?.id) return;

    const doJoin = () => {
      socket.emit('yahtzee:join', { lobbyId, playerId: me?.id, username: me?.name ?? me?.email ?? 'Joueur' });
    };

    if (socket.connected) { doJoin(); } else { socket.once('connect', doJoin); }

    socket.on('yahtzee:state', (state: GameState) => { setGame(state); setRolling(false); setTimeLeft(120); });
    socket.on('yahtzee:timer', ({ remaining }: { remaining: number }) => { setTimeLeft(remaining); });
    socket.on('yahtzee:ended', ({ results }: { results: { userId: string; username: string; total: number }[] }) => { setResults(results); });

    return () => {
      socket.off('yahtzee:state');
      socket.off('yahtzee:timer');
      socket.off('yahtzee:ended');
    };
  }, [socket, lobbyId, status, me?.id]);

  if (status === 'loading' || !me) return <LoadingSpinner />;

  const myId = me.id;
  const isMyTurn = game?.currentUserId === myId;
  const myPlayer = game?.players.find(p => p.userId === myId);
  const currentPlayer = game ? game.players[game.currentIndex] : null;
  const canRoll = isMyTurn && game?.phase === 'rolling' && (myPlayer?.rollsLeft ?? 0) > 0;
  const canScore = isMyTurn && (myPlayer?.rollsLeft ?? 3) < 3;

  const roll = () => { if (!canRoll) return; setRolling(true); socket?.emit('yahtzee:roll', { lobbyId, userId: myId }); };
  const toggleHold = (i: number) => {
    if (!isMyTurn || !myPlayer || myPlayer.rollsLeft === 3 || myPlayer.rollsLeft === 0) return;
    socket?.emit('yahtzee:toggleHold', { lobbyId, userId: myId, index: i });
  };
  const scoreCategory = (cat: string) => {
    if (!canScore || myPlayer?.scoreCard[cat as keyof ScoreCard] !== null) return;
    socket?.emit('yahtzee:score', { lobbyId, userId: myId, category: cat });
  };
  const forceScore = () => { if (!isMyTurn || !canScore) return; socket?.emit('yahtzee:forceScore', { lobbyId, userId: myId }); };

  if (results) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-3xl font-black text-white mb-2">Partie terminée !</h1>
          <p className="text-slate-400 mb-6">Classement final</p>
          <div className="space-y-3">
            {[...results].sort((a, b) => b.total - a.total).map((p, i) => (
              <div key={p.userId} className={`flex items-center justify-between px-4 py-3 rounded-xl ${i === 0 ? 'bg-amber-400/20 border border-amber-400/50' : 'bg-slate-700/50'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                  <span className={`font-bold ${p.userId === myId ? 'text-amber-300' : 'text-white'}`}>{p.username}{p.userId === myId && ' (moi)'}</span>
                </div>
                <span className={`font-black text-xl ${i === 0 ? 'text-amber-400' : 'text-slate-300'}`}>{p.total} pts</span>
              </div>
            ))}
          </div>
          <button onClick={() => router.push(`/lobby/create/${lobbyId}`)} className="mt-3 w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors">
            Retour au lobby
          </button>
          <button onClick={() => router.push('/')} className="mt-3 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors">
            Quitter
          </button>
        </div>
      </div>
    );
  }

  if (!game) return <LoadingSpinner />;

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
          ${val !== null ? 'opacity-60 cursor-default border-transparent' : canScore ? 'cursor-pointer hover:bg-indigo-500/20 hover:border-indigo-500/40 border-transparent' : 'cursor-default border-transparent'}
          ${isHovered ? 'bg-indigo-500/20 !border-indigo-500/40 scale-[1.01]' : ''}`}>
        <div>
          <span className="font-semibold text-sm">{CAT_LABELS[cat]}</span>
          <span className="text-xs text-slate-500 ml-2">{CAT_DESC[cat]}</span>
        </div>
        <div className="text-right min-w-[40px]">
          {val !== null ? <span className="font-black text-slate-300">{val}</span>
            : isHovered && preview !== null ? <span className="font-black text-indigo-400">{preview}</span>
              : <span className="text-slate-600">—</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎲</span>
            <div>
              <h1 className="font-black text-lg leading-none">Yahtzee</h1>
              <p className="text-xs text-slate-400">Tour {game.turn} / 13</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TimerBadge timeLeft={timeLeft} />
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${isMyTurn ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-700 text-slate-400'}`}>
              {isMyTurn ? '🎯 À vous de jouer !' : `⏳ Tour de ${currentPlayer?.username}`}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">

        {/* ── Left ─────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-300">{isMyTurn ? 'Vos dés' : `Dés de ${currentPlayer?.username}`}</h2>
              {isMyTurn && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">Lancers restants :</span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map(n => (
                      <div key={n} className={`w-3 h-3 rounded-full ${(myPlayer?.rollsLeft ?? 0) >= n ? 'bg-indigo-400' : 'bg-slate-600'}`} />
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
                  className={`px-8 py-3 rounded-xl font-black text-lg transition-all ${canRoll ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
                  🎲 Lancer {myPlayer?.rollsLeft !== undefined && myPlayer.rollsLeft < 3 ? `(${myPlayer.rollsLeft} restant${myPlayer.rollsLeft > 1 ? 's' : ''})` : ''}
                </button>
              </div>
            )}
            {isMyTurn && myPlayer && myPlayer.rollsLeft < 3 && myPlayer.rollsLeft > 0 && (
              <p className="text-center text-xs text-slate-500 mt-3">Cliquez sur un dé pour le garder, puis relancez ou marquez des points.</p>
            )}
            {isMyTurn && game.phase === 'scoring' && (
              <p className="text-center text-sm text-amber-400 mt-3 font-semibold">✍️ Choisissez une catégorie à scorer ci-dessous</p>
            )}
          </div>

          <div className="bg-slate-800 rounded-2xl p-5">
            <h2 className="font-bold text-slate-300 mb-4">Votre feuille de score</h2>
            <div className="mb-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Section haute</div>
              <div className="space-y-1">{UPPER_CATS.map(cat => <ScoreRow key={cat} cat={cat} />)}</div>
              <div className="flex justify-between px-3 py-2 mt-1 bg-slate-700/50 rounded-lg text-sm">
                <span className="text-slate-400">Sous-total</span>
                <span className="font-bold">{upperTotal} / 63</span>
              </div>
              {upperNeeded > 0 && (
                <div className="px-3 py-1">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Progression bonus (+35)</span><span>{upperTotal}/63</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${Math.min(100, (upperTotal / 63) * 100)}%` }} />
                  </div>
                </div>
              )}
              {myPlayer?.upperBonus === 35 && <div className="px-3 py-1.5 text-center text-xs text-green-400 font-bold">✅ Bonus +35 débloqué !</div>}
            </div>
            <div className="mt-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Section basse</div>
              <div className="space-y-1">{LOWER_CATS.map(cat => <ScoreRow key={cat} cat={cat} />)}</div>
              {(myPlayer?.scoreCard.yahtzeeBonus ?? 0) > 0 && (
                <div className="flex justify-between px-3 py-2 mt-1 bg-amber-400/10 border border-amber-400/30 rounded-lg text-sm">
                  <span className="text-amber-400 font-semibold">🎲 Bonus Yahtzee</span>
                  <span className="font-black text-amber-400">+{myPlayer?.scoreCard.yahtzeeBonus}</span>
                </div>
              )}
              <div className="flex justify-between px-3 py-2.5 mt-2 bg-indigo-600/20 border border-indigo-500/30 rounded-lg">
                <span className="font-black text-indigo-300">TOTAL</span>
                <span className="font-black text-xl text-indigo-300">{myPlayer?.total ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right ────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-2xl p-5">
            <h2 className="font-bold text-slate-300 mb-4">Scores des joueurs</h2>
            <div className="space-y-3">
              {game.players.map((p, i) => {
                const isCurrent = i === game.currentIndex;
                const isMe = p.userId === myId;
                const filled = Object.entries(p.scoreCard ?? {}).filter(([k, v]) => k !== 'yahtzeeBonus' && v !== null).length;
                return (
                  <div key={p.userId} className={`p-4 rounded-xl border transition-all ${isCurrent ? 'border-indigo-500/60 bg-indigo-500/10' : 'border-slate-700 bg-slate-700/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isCurrent && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />}
                        <span className={`font-bold ${isMe ? 'text-indigo-300' : 'text-white'}`}>{p.username}{isMe && ' (moi)'}</span>
                      </div>
                      <span className="font-black text-xl">{p.total}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{filled}/13 catégories</span>
                      <div className="w-24 h-1 bg-slate-600 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(filled / 13) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {game.players.filter(p => p.userId !== myId).map(p => (
            <details key={p.userId} className="bg-slate-800 rounded-2xl overflow-hidden">
              <summary className="px-5 py-4 cursor-pointer font-semibold text-slate-300 flex items-center justify-between">
                <span>Fiche de {p.username}</span>
                <span className="text-slate-500 text-sm">{p.total} pts</span>
              </summary>
              <div className="px-5 pb-4 space-y-1">
                {[...UPPER_CATS, ...LOWER_CATS].map(cat => (
                  <div key={cat} className="flex justify-between text-sm py-1 border-b border-slate-700/50">
                    <span className="text-slate-400">{CAT_LABELS[cat]}</span>
                    <span className={p.scoreCard?.[cat as keyof ScoreCard] !== null ? 'font-bold text-slate-200' : 'text-slate-600'}>
                      {p.scoreCard?.[cat as keyof ScoreCard] !== null ? p.scoreCard?.[cat as keyof ScoreCard] as number : '—'}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-2">
                  <span className="font-bold text-indigo-300">Total</span>
                  <span className="font-black text-indigo-300">{p.total}</span>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
