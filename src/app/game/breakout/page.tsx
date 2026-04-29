'use client';

import { useRef } from 'react';
import type React from 'react';
import Image from 'next/image';
import { StarIcon, TrophyIcon, HeartIcon, CubeIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useBreakout } from '@/hooks/useBreakout';
import SoloGameOverlay from '@/components/SoloGameOverlay';
import { W, H } from '@/lib/breakout/constants';

const POWER_LEGEND = [
    { bonus: true,  src: '/breakout/bonus/WI.png', label: 'Palette large',   desc: '+50% largeur' },
    { bonus: true,  src: '/breakout/bonus/SL.png', label: 'Ralenti',         desc: 'Balle ×0.65' },
    { bonus: true,  src: '/breakout/bonus/ST.png', label: 'Colle',           desc: 'Balle adhère' },
    { bonus: true,  src: '/breakout/bonus/LZ.png', label: 'Laser',           desc: 'Tir sur clic' },
    { bonus: true,  src: '/breakout/bonus/MB.png', label: 'Multi-balle',     desc: '+2 balles' },
    { bonus: true,  src: '/breakout/bonus/UP.png', label: 'Vie',             desc: '+1 vie' },
    { bonus: true,  src: '/breakout/bonus/BM.png', label: 'Bombe',           desc: 'Détruit 9 briques' },
    { bonus: false, src: '/breakout/malus/NR.png', label: 'Palette étroite', desc: '−30% largeur' },
    { bonus: false, src: '/breakout/malus/FS.png', label: 'Accélération',    desc: 'Balle ×1.5' },
];

function PowerLegend() {
    return (
        <div className="w-full max-w-[400px] md:max-w-none md:w-44 shrink-0">
            <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-white/25 mb-3">
                Pilules
            </div>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-1.5">
                {POWER_LEGEND.map(({ bonus, src, label, desc }) => (
                    <div key={label} className="flex items-center gap-2">
                        <span className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-lg border ${
                            bonus
                                ? 'bg-cyan-500/10 border-cyan-500/20'
                                : 'bg-red-500/10 border-red-500/20'
                        }`}>
                            <Image src={src} alt={label} width={24} height={24} className="object-contain" />
                        </span>
                        <div className="min-w-0">
                            <div className={`text-[11px] font-semibold leading-tight truncate ${
                                bonus ? 'text-gray-600 dark:text-white/70' : 'text-red-500 dark:text-red-400/80'
                            }`}>
                                {label}
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-white/25 leading-tight">{desc}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function BreakoutPage() {
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
    } = useBreakout(canvasRef);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#07070f] flex flex-col items-center pt-4 pb-14 px-4">

            {/* ── Header ── */}
            <div className="w-full max-w-[440px] md:max-w-[620px] flex items-center justify-between mb-5">
                <Link
                    href="/"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-all"
                >
                    ← Accueil
                </Link>

                <div className="flex items-center gap-2 select-none">
                    <span className="text-cyan-600/40 text-xs">▸▸</span>
                    <span
                        className="text-cyan-600 dark:text-cyan-400 font-black text-xl tracking-[0.12em] uppercase"
                        style={{
                            fontFamily: '"Press Start 2P", "Courier New", monospace',
                            textShadow: '0 0 20px rgba(34,211,238,0.5), 0 0 40px rgba(34,211,238,0.2)',
                        }}
                    >
                        BREAKOUT
                    </span>
                    <span className="text-cyan-600/40 text-xs">◂◂</span>
                </div>

                <Link
                    href="/leaderboard/breakout"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-all"
                >
                    <TrophyIcon className="w-4 h-4" /><span className="hidden sm:inline">Classement</span>
                </Link>
            </div>

            {/* ── Stats bar ── */}
            <div className="w-full max-w-[440px] md:max-w-[620px] mb-4 grid grid-cols-4 gap-px rounded-2xl overflow-hidden border border-gray-200 dark:border-white/[0.07] bg-gray-200 dark:bg-white/[0.04]">
                <StatCell icon={<StarIcon className="w-3 h-3 text-yellow-500" />} label="SCORE"    value={displayScore}                       color="text-gray-900 dark:text-white" />
                <StatCell icon={<CubeIcon className="w-3 h-3 text-cyan-500" />}  label="NIVEAU"   value={displayLevel}                       color="text-cyan-500 dark:text-cyan-400" />
                <StatCell icon={<HeartIcon className="w-3 h-3 text-rose-500" />} label="VIES"     value={displayLives}                       color="text-rose-500 dark:text-rose-400" />
                <StatCell icon={<TrophyIcon className="w-3 h-3 text-yellow-500" />} label="MEILLEUR" value={Math.max(bestScore, displayScore)} color="text-yellow-500 dark:text-yellow-400" />
            </div>

            {/* ── Canvas centré, légende en absolu à droite sur desktop ── */}
            <div className="relative w-full max-w-[400px] flex flex-col items-center gap-4">

                <div
                    className="relative w-full rounded-2xl overflow-hidden"
                    style={{ boxShadow: '0 0 0 1px rgba(34,211,238,0.2), 0 0 40px rgba(34,211,238,0.08)' }}
                >
                    <canvas
                        ref={canvasRef}
                        width={W}
                        height={H}
                        className="block w-full"
                        style={{ touchAction: 'none', background: '#0a0a1a' }}
                    />

                    <SoloGameOverlay
                        phase={phase}
                        displayScore={displayScore}
                        displayLevel={displayLevel}
                        isNewBest={isNewBest}
                        submitState={submitState}
                        session={session}
                        leaderboardHref="/leaderboard/breakout"
                        onReplay={startGame}
                        bgClassName="bg-black/80 backdrop-blur-sm"
                        scoreClassName="text-white"
                        newBestClassName="text-cyan-400"
                        replayClassName="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm rounded-xl transition-all"
                        leaderboardClassName="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-sm rounded-xl transition-all"
                    />
                </div>

                {/* Légende desktop — positionnée en absolu à droite du canvas */}
                <div className="hidden md:block absolute left-[calc(100%+24px)] top-0 w-44">
                    <PowerLegend />
                </div>

                {/* Bouton JOUER */}
                {phase === 'idle' && (
                    <div className="flex flex-col items-center gap-3">
                        <button
                            onClick={startGame}
                            className="flex items-center gap-3 px-10 py-4 bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black font-black text-lg rounded-2xl transition-all duration-150"
                            style={{ boxShadow: '0 4px 24px rgba(250,204,21,0.35)' }}
                        >
                            <BallIcon />
                            JOUER
                        </button>
                        <p className="flex items-center gap-2 text-gray-400 dark:text-white/25 text-xs tracking-wide">
                            <ArrowIcon />
                            Souris / glisser · Flèches Q/D sur clavier
                        </p>
                    </div>
                )}

                {/* Mobile swipe zone */}
                {phase === 'playing' && (
                    <div className="md:hidden w-full h-20 rounded-2xl border border-gray-200 dark:border-white/[0.06] flex flex-col items-center justify-center gap-1 select-none touch-none">
                        <span className="text-xl text-gray-300 dark:text-white/15">← →</span>
                        <span className="text-[11px] text-gray-400 dark:text-white/15">Glissez pour déplacer · Tap pour lancer</span>
                    </div>
                )}

                {/* Légende mobile */}
                <div className="md:hidden w-full mt-1">
                    <PowerLegend />
                </div>
            </div>
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

function BallIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="15" width="16" height="3" rx="1.5" fill="black" />
            <circle cx="10" cy="8" r="4" fill="black" />
        </svg>
    );
}

function ArrowIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="opacity-60">
            <path d="M1 7h12M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}
