'use client';

import { useRef } from 'react';
import type React from 'react';
import { StarIcon, TrophyIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useTetris } from '@/hooks/useTetris';
import SoloGameOverlay from '@/components/SoloGameOverlay';
import { W, H } from '@/lib/tetris/constants';

export default function TetrisPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const {
        phase,
        displayScore,
        displayLevel,
        displayLines,
        bestScore,
        isNewBest,
        submitState,
        startGame,
        session,
    } = useTetris(canvasRef);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#07070f] flex flex-col items-center pt-4 pb-14 px-4">

            {/* ── Header ── */}
            <div className="w-full max-w-[440px] flex items-center justify-between mb-5">
                <Link
                    href="/"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-all"
                >
                    ← Accueil
                </Link>

                <div className="flex items-center gap-2 select-none">
                    <span className="text-purple-600/40 text-xs">▼▼</span>
                    <span
                        className="text-purple-600 dark:text-purple-400 font-black text-xl tracking-[0.12em] uppercase"
                        style={{
                            fontFamily: '"Press Start 2P", "Courier New", monospace',
                            textShadow: '0 0 20px rgba(192,132,252,0.5), 0 0 40px rgba(192,132,252,0.2)',
                        }}
                    >
                        TETRIS
                    </span>
                    <span className="text-purple-600/40 text-xs">▼▼</span>
                </div>

                <Link
                    href="/leaderboard/tetris"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-all"
                >
                    <TrophyIcon className="w-4 h-4" /><span className="hidden sm:inline">Classement</span>
                </Link>
            </div>

            {/* ── Stats bar ── */}
            <div className="w-full max-w-[440px] mb-4 grid grid-cols-4 gap-px rounded-2xl overflow-hidden border border-gray-200 dark:border-white/[0.07] bg-gray-200 dark:bg-white/[0.04]">
                <StatCell icon={<StarIcon className="w-3 h-3 text-yellow-500" />}   label="SCORE"    value={displayScore}                       color="text-gray-900 dark:text-white" />
                <StatCell icon={<TetrominoIcon />}                                  label="NIVEAU"   value={displayLevel}                       color="text-purple-600 dark:text-purple-400" />
                <StatCell icon={<LinesIcon />}                                      label="LIGNES"   value={displayLines}                       color="text-cyan-600 dark:text-cyan-400" />
                <StatCell icon={<TrophyIcon className="w-3 h-3 text-yellow-500" />} label="MEILLEUR" value={Math.max(bestScore, displayScore)}  color="text-yellow-500 dark:text-yellow-400" />
            </div>

            {/* ── Canvas ── */}
            <div
                className="relative rounded-2xl overflow-hidden"
                style={{ boxShadow: '0 0 0 1px rgba(192,132,252,0.2), 0 0 40px rgba(192,132,252,0.08)' }}
            >
                <canvas
                    ref={canvasRef}
                    width={W}
                    height={H}
                    className="block"
                    style={{ touchAction: 'none', maxHeight: 'calc(100dvh - 220px)', width: 'auto' }}
                />

                <SoloGameOverlay
                    phase={phase}
                    displayScore={displayScore}
                    displayLevel={displayLevel}
                    isNewBest={isNewBest}
                    submitState={submitState}
                    session={session}
                    leaderboardHref="/leaderboard/tetris"
                    onReplay={startGame}
                    bgClassName="bg-black/80 backdrop-blur-sm"
                    scoreClassName="text-white"
                    newBestClassName="text-purple-400"
                    replayClassName="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm rounded-xl transition-all"
                    leaderboardClassName="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-sm rounded-xl transition-all"
                />
            </div>

            {/* ── Idle play button ── */}
            {phase === 'idle' && (
                <div className="mt-6 flex flex-col items-center gap-3">
                    <button
                        onClick={startGame}
                        className="flex items-center gap-3 px-10 py-4 bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black font-black text-lg rounded-2xl transition-all duration-150"
                        style={{ boxShadow: '0 4px 24px rgba(250,204,21,0.35)' }}
                    >
                        <TetrisBlockIcon />
                        JOUER
                    </button>
                    <p className="text-gray-400 dark:text-white/25 text-xs tracking-wide text-center">
                        ← → déplacer · ↑ / Z tourner · ↓ descendre · Espace chute rapide
                    </p>
                </div>
            )}

            {/* ── Mobile controls hint ── */}
            {phase === 'playing' && (
                <div className="md:hidden mt-4 w-full max-w-[440px] h-16 rounded-2xl border border-gray-200 dark:border-white/[0.06] flex flex-col items-center justify-center gap-1 select-none touch-none">
                    <span className="text-xl text-gray-300 dark:text-white/15">← Tap → · ↓ chute</span>
                    <span className="text-[11px] text-gray-400 dark:text-white/15">Tap = rotation · Glisser = déplacer</span>
                </div>
            )}
        </div>
    );
}

function StatCell({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
    return (
        <div className="flex flex-col items-center px-2 py-3 bg-white dark:bg-[#07070f]">
            <div className="flex items-center gap-1 text-[9px] text-gray-400 dark:text-white/30 uppercase tracking-widest mb-1.5">
                <span>{icon}</span>
                <span>{label}</span>
            </div>
            <div className={`text-xl font-black tabular-nums ${color}`}>{value}</div>
        </div>
    );
}

function TetrominoIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="0" y="4" width="4" height="4" rx="1" fill="#c084fc" />
            <rect x="4" y="4" width="4" height="4" rx="1" fill="#c084fc" />
            <rect x="4" y="0" width="4" height="4" rx="1" fill="#c084fc" />
            <rect x="8" y="4" width="4" height="4" rx="1" fill="#c084fc" />
        </svg>
    );
}

function LinesIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="0" y="0" width="12" height="2.5" rx="1" fill="#22d3ee" />
            <rect x="0" y="4.5" width="12" height="2.5" rx="1" fill="#22d3ee" />
            <rect x="0" y="9" width="12" height="2.5" rx="1" fill="#22d3ee" />
        </svg>
    );
}

function TetrisBlockIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="10" width="7" height="7" rx="1.5" fill="black" />
            <rect x="9" y="10" width="7" height="7" rx="1.5" fill="black" />
            <rect x="9" y="3" width="7" height="7" rx="1.5" fill="black" />
            <rect x="2" y="3" width="7" height="7" rx="1.5" fill="black" />
        </svg>
    );
}
