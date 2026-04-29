'use client';

import { useRef } from 'react';
import type React from 'react';
import Link from 'next/link';
import { usePacman } from '@/hooks/usePacman';
import SoloGameOverlay from '@/components/SoloGameOverlay';
import { COLS, ROWS, CELL } from '@/lib/pacman/constants';
import { StarIcon, TrophyIcon, HeartIcon, SparklesIcon } from '@heroicons/react/24/solid';

export default function PacmanPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const {
        phase,
        displayScore,
        displayLives,
        displayLevel,
        bestScore,
        isNewBest,
        submitState,
        startGame,
        session,
    } = usePacman(canvasRef);

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
                    <span className="text-blue-500/40 text-xs tracking-widest">•••</span>
                    <span
                        className="text-yellow-500 dark:text-yellow-400 font-black text-2xl tracking-[0.15em] uppercase"
                        style={{
                            fontFamily: '"Press Start 2P", "Courier New", monospace',
                            textShadow: '0 0 20px rgba(250,204,21,0.5), 0 0 40px rgba(250,204,21,0.2)',
                        }}
                    >
                        PAC-MAN
                    </span>
                    <span className="text-blue-500/40 text-xs tracking-widest">•••</span>
                </div>

                <Link
                    href="/leaderboard/pacman"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-all"
                >
                    <TrophyIcon className="w-4 h-4" /><span className="hidden sm:inline">Classement</span>
                </Link>
            </div>

            {/* ── Stats bar ── */}
            <div className="w-full max-w-[440px] mb-4 grid grid-cols-4 gap-px rounded-2xl overflow-hidden border border-gray-200 dark:border-white/[0.07] bg-gray-200 dark:bg-white/[0.04]">
                <StatCell icon={<StarIcon className="w-3 h-3 text-yellow-500" />} label="SCORE" value={displayScore} color="text-gray-900 dark:text-white" />
                <StatCell icon={<SparklesIcon className="w-3 h-3 text-blue-500" />} label="NIVEAU" value={displayLevel} color="text-blue-500 dark:text-blue-400" />
                <StatCell icon={<HeartIcon className="w-3 h-3 text-rose-500" />} label="VIES" value={displayLives} color="text-rose-500 dark:text-rose-400" />
                <StatCell icon={<TrophyIcon className="w-3 h-3 text-yellow-500" />} label="MEILLEUR" value={Math.max(bestScore, displayScore)} color="text-yellow-500 dark:text-yellow-400" />
            </div>

            {/* ── Canvas ── */}
            <div
                className="relative w-full max-w-[440px] rounded-2xl overflow-hidden"
                style={{
                    boxShadow: '0 0 0 1px rgba(59,130,246,0.25), 0 0 40px rgba(59,130,246,0.12)',
                }}
            >
                <canvas
                    ref={canvasRef}
                    width={COLS * CELL}
                    height={ROWS * CELL}
                    className="block w-full"
                    style={{ touchAction: 'none', background: '#000' }}
                />

                <SoloGameOverlay
                    phase={phase}
                    displayScore={displayScore}
                    displayLevel={displayLevel}
                    isNewBest={isNewBest}
                    submitState={submitState}
                    session={session}
                    leaderboardHref="/leaderboard/pacman"
                    onReplay={startGame}
                    title="Game Over"
                    titleClassName="text-yellow-400"
                    replayClassName="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm rounded-xl transition-all"
                />
            </div>

            {/* ── Play button ── */}
            {phase === 'idle' && (
                <div className="mt-6 flex flex-col items-center gap-3">
                    <button
                        onClick={startGame}
                        className="group relative flex items-center gap-3 px-10 py-4 bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black font-black text-lg rounded-2xl transition-all duration-150"
                        style={{ boxShadow: '0 4px 24px rgba(250,204,21,0.35), 0 0 0 0 rgba(250,204,21,0)' }}
                    >
                        <PacmanIcon />
                        JOUER
                    </button>
                    <p className="flex items-center gap-2 text-gray-400 dark:text-white/25 text-xs tracking-wide">
                        <ArrowIcon />
                        Flèches ou Z, Q, S, D pour jouer
                    </p>
                </div>
            )}

            {/* ── Mobile swipe zone ── */}
            {phase === 'playing' && (
                <div className="md:hidden mt-4 w-full max-w-[440px] h-20 rounded-2xl border border-gray-200 dark:border-white/[0.06] flex flex-col items-center justify-center gap-1 select-none touch-none">
                    <span className="text-xl text-gray-300 dark:text-white/15">↑ ↓ ← →</span>
                    <span className="text-[11px] text-gray-400 dark:text-white/15">Glissez ici ou n'importe où</span>
                </div>
            )}
        </div>
    );
}

function StatCell({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
    return (
        <div className="flex flex-col items-center px-2 py-3 bg-white dark:bg-[#07070f]">
            <div className="flex items-center gap-1 text-[9px] text-gray-400 dark:text-white/30 uppercase tracking-widest mb-1.5">
                {icon}
                <span>{label}</span>
            </div>
            <div className={`text-xl font-black tabular-nums ${color}`}>{value}</div>
        </div>
    );
}

function PacmanIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
                d="M10 10 L18.5 5.8 A9 9 0 1 0 18.5 14.2 Z"
                fill="black"
            />
        </svg>
    );
}

function ArrowIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="opacity-60">
            <path d="M7 1v12M1 7h12M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
    );
}
