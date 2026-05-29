'use client';

import { useRef, useState } from 'react';
import { StarIcon, TrophyIcon, HeartIcon } from '@heroicons/react/24/solid';
import { useSpaceInvaders } from '@/hooks/useSpaceInvaders';
import SoloGameOverlay from '@/components/SoloGameOverlay';
import SoloGameHeader from '@/components/SoloGame/SoloGameHeader';
import StatCell from '@/components/SoloGame/StatCell';
import AdminDebugControl from '@/components/SoloGame/AdminDebugControl';

export default function SpaceInvadersPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [debugLevel, setDebugLevel] = useState(1);
    const {
        phase, displayScore, bestScore, isNewBest, submitState, session,
        lives, wave, startGame, canvasSize,
    } = useSpaceInvaders(canvasRef, debugLevel);

    const isAdmin = session?.user?.role === 'ADMIN';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#07070f] flex flex-col items-center pt-4 pb-14 px-4">
            <SoloGameHeader leaderboardHref="/leaderboard/space_invaders">
                <span className="text-emerald-500/40 text-xs tracking-widest">▾▾▾</span>
                <span className="text-emerald-500 dark:text-emerald-400 font-black text-xl tracking-[0.15em] uppercase"
                    style={{ fontFamily: '"Press Start 2P", "Courier New", monospace', textShadow: '0 0 20px rgba(16,185,129,0.5)' }}>
                    INVADERS
                </span>
                <span className="text-emerald-500/40 text-xs tracking-widest">▾▾▾</span>
            </SoloGameHeader>

            <div className="w-full max-w-[420px] mb-2 grid grid-cols-2 gap-px rounded-2xl overflow-hidden border border-gray-200 dark:border-white/[0.07] bg-gray-200 dark:bg-white/[0.04]">
                <StatCell icon={<StarIcon className="w-3 h-3 text-yellow-500" />} label="SCORE" value={displayScore} color="text-gray-900 dark:text-white" align="left" />
                <StatCell icon={<TrophyIcon className="w-3 h-3 text-yellow-500" />} label="MEILLEUR" value={Math.max(bestScore, displayScore)} color="text-yellow-500 dark:text-yellow-400" align="right" />
            </div>

            <div className="w-full max-w-[420px] mb-3 flex items-center justify-between text-xs text-gray-500 dark:text-white/40">
                <span className="flex items-center gap-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <HeartIcon key={i} className={`w-4 h-4 ${i < lives ? 'text-rose-500' : 'text-gray-300 dark:text-white/10'}`} />
                    ))}
                </span>
                <span className="font-bold tracking-widest uppercase">Vague {wave}</span>
            </div>

            <div className="relative w-full max-w-[420px] rounded-2xl overflow-hidden"
                style={{ boxShadow: '0 0 0 1px rgba(16,185,129,0.2), 0 0 40px rgba(16,185,129,0.08)' }}>
                <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} className="block w-full bg-[#0a0a14]" style={{ touchAction: 'none' }} />

                <SoloGameOverlay
                    phase={phase}
                    displayScore={displayScore}
                    isNewBest={isNewBest}
                    submitState={submitState}
                    session={session}
                    leaderboardHref="/leaderboard/space_invaders"
                    onReplay={() => startGame(debugLevel)}
                    title="Game Over"
                    titleClassName="text-emerald-400"
                    bgClassName="bg-black/80 backdrop-blur-sm"
                    replayClassName="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm rounded-xl transition-all"
                    leaderboardClassName="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-sm rounded-xl transition-all"
                />
            </div>

            {phase === 'idle' && (
                <div className="mt-6 flex flex-col items-center gap-4">
                    {isAdmin && <AdminDebugControl value={debugLevel} onChange={setDebugLevel} />}
                    <button onClick={() => startGame(debugLevel)}
                        className="px-10 py-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-black text-lg rounded-2xl transition-all"
                        style={{ boxShadow: '0 4px 24px rgba(16,185,129,0.35)' }}>
                        JOUER
                    </button>
                    <p className="text-gray-400 dark:text-white/25 text-xs tracking-wide text-center">
                        ← → / A-D ou glissez le doigt · tir automatique
                    </p>
                </div>
            )}

        </div>
    );
}
