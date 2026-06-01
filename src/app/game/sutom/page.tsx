'use client';

import { useEffect, useRef } from 'react';
import { StarIcon, TrophyIcon } from '@heroicons/react/24/solid';
import { useSutom } from '@/hooks/useSutom';
import { MAX_TRIES, type LetterState } from '@/lib/sutom/engine';
import SoloGameOverlay from '@/components/SoloGameOverlay';
import SoloGameHeader from '@/components/SoloGame/SoloGameHeader';
import StatCell from '@/components/SoloGame/StatCell';

const KEYBOARD = [
    ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
    ['ENTER', 'W', 'X', 'C', 'V', 'B', 'N', 'BACKSPACE'],
];

const CELL_STATE: Record<LetterState, string> = {
    correct: 'bg-red-600 text-white border-red-600',
    present: 'bg-amber-400 text-gray-900 border-amber-400',
    absent: 'bg-slate-500 text-white border-slate-500',
};
const KEY_STATE: Record<LetterState, string> = {
    correct: 'bg-red-600 text-white',
    present: 'bg-amber-400 text-gray-900',
    absent: 'bg-slate-400 dark:bg-slate-700 text-white',
};

export default function SutomPage() {
    const {
        phase, length, rows, current, message, won, keyStates, answer, loading,
        bestScore, displayScore, isNewBest, submitState, session,
        category, hintRevealed, revealHint,
        start, onKey, setCurrentInput, submit, abandon,
    } = useSutom();

    const inputRef = useRef<HTMLInputElement>(null);
    // Open the native phone keyboard as soon as a game starts.
    useEffect(() => {
        if (phase === 'playing') {
            const t = setTimeout(() => inputRef.current?.focus(), 50);
            return () => clearTimeout(t);
        }
    }, [phase]);

    const triesUsed = rows.length;

    return (
        <div className="min-h-screen bg-transparent flex flex-col items-center pt-4 pb-14 px-4">
            <SoloGameHeader leaderboardHref="/leaderboard/sutom">
                <span className="text-red-500/40 text-xs tracking-widest">▮</span>
                <span className="text-red-600 dark:text-red-400 font-black text-2xl tracking-[0.2em] uppercase">SUTOM</span>
                <span className="text-red-500/40 text-xs tracking-widest">▮</span>
            </SoloGameHeader>

            <div className="w-full max-w-[440px] mb-4 grid grid-cols-2 gap-px rounded-2xl overflow-hidden border border-gray-200 dark:border-white/[0.07] bg-gray-200 dark:bg-white/[0.04]">
                <StatCell icon={<StarIcon className="w-3 h-3 text-yellow-500" />} label="ESSAIS" value={phase === 'idle' ? '—' : `${triesUsed}/${MAX_TRIES}`} color="text-gray-900 dark:text-white" align="left" />
                <StatCell icon={<TrophyIcon className="w-3 h-3 text-yellow-500" />} label="MEILLEUR" value={Math.max(bestScore, displayScore)} color="text-yellow-500 dark:text-yellow-400" align="right" />
            </div>

            {phase === 'playing' && (
                <div className="w-full max-w-[440px] mb-3 flex items-stretch gap-2">
                    {hintRevealed ? (
                        <div className="flex-1 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200/60 dark:border-amber-700/40 text-sm flex items-center gap-3">
                            <span className="text-amber-700 dark:text-amber-300">
                                <span className="text-[10px] font-bold tracking-wider uppercase mr-2 opacity-70">Catégorie</span>
                                <span className="font-bold">{category}</span>
                            </span>
                        </div>
                    ) : (
                        <button onClick={revealHint}
                            className="flex-1 px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-amber-200/60 dark:border-amber-700/40 text-amber-700 dark:text-amber-300 text-sm font-bold hover:bg-amber-50 dark:hover:bg-amber-900/15 active:scale-[0.99] transition-all">
                            💡 Indice — révéler la catégorie
                        </button>
                    )}
                    <button onClick={abandon}
                        className="px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/15 dark:hover:text-red-400 active:scale-[0.99] transition-all whitespace-nowrap">
                        Abandonner
                    </button>
                </div>
            )}

            {phase === 'idle' ? (
                <div className="mt-10 flex flex-col items-center gap-5">
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                        Devinez le mot mystère en {MAX_TRIES} essais. La première lettre et la longueur sont données.
                    </p>
                    <button onClick={start} disabled={loading}
                        className="px-10 py-4 bg-red-600 hover:bg-red-500 active:scale-95 disabled:opacity-60 text-white font-black text-lg rounded-2xl transition-all"
                        style={{ boxShadow: '0 4px 24px rgba(220,38,38,0.35)' }}>
                        {loading ? 'Chargement…' : 'JOUER'}
                    </button>
                </div>
            ) : (
                <div className="relative w-full max-w-[440px]"
                    onClick={() => inputRef.current?.focus()}>
                    {/* Invisible input — drives the native mobile keyboard. */}
                    <input
                        ref={inputRef}
                        value={current}
                        onChange={e => setCurrentInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        inputMode="text"
                        aria-label="Saisir le mot"
                        className="absolute opacity-0 pointer-events-none -z-10 h-1 w-1"
                    />
                    {/* Grid */}
                    <div className="flex flex-col gap-1.5 items-center">
                        {Array.from({ length: MAX_TRIES }).map((_, r) => {
                            const played = rows[r];
                            const isCurrent = !played && r === triesUsed && phase === 'playing';
                            return (
                                <div key={r} className="grid gap-1.5 w-full"
                                    style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}>
                                    {Array.from({ length }).map((_, c) => {
                                        let ch = '';
                                        let cls = 'bg-transparent border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white';
                                        if (played) {
                                            ch = played.guess[c] ?? '';
                                            cls = CELL_STATE[played.states[c]];
                                        } else if (isCurrent) {
                                            ch = current[c] ?? '';
                                            if (c === 0) cls = 'bg-red-600/15 border-red-500/60 text-red-700 dark:text-red-300';
                                        } else if (c === 0) {
                                            ch = current[0] ?? rows[0]?.guess[0] ?? '';
                                            cls = 'border-gray-200 dark:border-gray-800 text-gray-300 dark:text-gray-700';
                                        }
                                        return (
                                            <div key={c}
                                                className={`aspect-square flex items-center justify-center rounded-md border-2 font-black uppercase text-lg sm:text-xl ${cls}`}>
                                                {ch}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>

                    {message && phase === 'playing' && (
                        <p className="text-center text-sm font-semibold text-red-600 dark:text-red-400 mt-3 h-5">{message}</p>
                    )}

                    <SoloGameOverlay
                        phase={phase}
                        displayScore={displayScore}
                        isNewBest={isNewBest}
                        submitState={submitState}
                        session={session}
                        leaderboardHref="/leaderboard/sutom"
                        onReplay={start}
                        title={won ? '🎉 Gagné !' : 'Perdu'}
                        titleClassName={won ? 'text-red-500' : 'text-gray-400'}
                        bgClassName="bg-black/80 backdrop-blur-sm rounded-2xl"
                        replayClassName="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl transition-all"
                        leaderboardClassName="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-sm rounded-xl transition-all"
                    >
                        {!won && <div className="text-sm text-gray-300">Le mot était : <span className="font-black text-white tracking-wider">{answer}</span></div>}
                    </SoloGameOverlay>
                </div>
            )}

            {/* On-screen keyboard */}
            {phase === 'playing' && (
                <div className="mt-6 w-full max-w-[480px] flex flex-col gap-1.5 select-none">
                    {KEYBOARD.map((row, ri) => (
                        <div key={ri} className="flex justify-center gap-1 sm:gap-1.5">
                            {row.map(k => {
                                const wide = k === 'ENTER' || k === 'BACKSPACE';
                                const st = keyStates[k];
                                const base = st ? KEY_STATE[st] : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white';
                                return (
                                    <button key={k} onClick={() => onKey(k)}
                                        className={`${wide ? 'px-2.5 text-[11px]' : 'flex-1 max-w-[40px]'} h-12 rounded-md font-bold uppercase active:scale-95 transition-all ${base}`}>
                                        {k === 'BACKSPACE' ? '⌫' : k === 'ENTER' ? 'Entrée' : k}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
