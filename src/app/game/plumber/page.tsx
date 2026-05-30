'use client';

import { useRef, useState } from 'react';
import { StarIcon, TrophyIcon, HeartIcon, FireIcon } from '@heroicons/react/24/solid';
import { usePlumber } from '@/hooks/usePlumber';
import SoloGameOverlay from '@/components/SoloGameOverlay';
import SoloGameHeader from '@/components/SoloGame/SoloGameHeader';
import StatCell from '@/components/SoloGame/StatCell';
import AdminDebugControl from '@/components/SoloGame/AdminDebugControl';

export default function PlumberPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [debugLevel, setDebugLevel] = useState(1);
    const {
        phase, displayScore, bestScore, isNewBest, submitState, session,
        powerUp, distanceM, startGame, setKey, canvasSize,
    } = usePlumber(canvasRef, debugLevel);

    const isAdmin = session?.user?.role === 'ADMIN';
    const lives = powerUp === 'fire' ? 3 : powerUp === 'big' ? 2 : 1;

    const press = (k: 'left' | 'right' | 'jump' | 'fire') => ({
        onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); setKey(k, true); },
        onPointerUp:   (e: React.PointerEvent) => { e.preventDefault(); setKey(k, false); },
        onPointerLeave:() => setKey(k, false),
        onPointerCancel:() => setKey(k, false),
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#07070f] flex flex-col items-center pt-4 pb-14 px-4">
            <SoloGameHeader leaderboardHref="/leaderboard/plumber">
                <span className="text-rose-500/40 text-xs tracking-widest">★★★</span>
                <span className="text-rose-500 dark:text-rose-400 font-black text-xl tracking-[0.15em] uppercase"
                    style={{ fontFamily: '"Press Start 2P", "Courier New", monospace', textShadow: '0 0 20px rgba(244,63,94,0.5)' }}>
                    PLUMBER
                </span>
                <span className="text-rose-500/40 text-xs tracking-widest">★★★</span>
            </SoloGameHeader>

            <div className="w-full max-w-[480px] mb-2 grid grid-cols-2 gap-px rounded-2xl overflow-hidden border border-gray-200 dark:border-white/[0.07] bg-gray-200 dark:bg-white/[0.04]">
                <StatCell icon={<StarIcon className="w-3 h-3 text-yellow-500" />} label="SCORE" value={displayScore} color="text-gray-900 dark:text-white" align="left" />
                <StatCell icon={<TrophyIcon className="w-3 h-3 text-yellow-500" />} label="MEILLEUR" value={Math.max(bestScore, displayScore)} color="text-yellow-500 dark:text-yellow-400" align="right" />
            </div>

            <div className="w-full max-w-[480px] mb-3 flex items-center justify-between text-xs text-gray-500 dark:text-white/40">
                <span className="flex items-center gap-1">
                    {Array.from({ length: Math.max(lives, 1) }).map((_, i) => (
                        <HeartIcon key={i} className="w-4 h-4 text-rose-500" />
                    ))}
                    {powerUp === 'fire' && <FireIcon className="w-4 h-4 text-orange-500 ml-1" />}
                </span>
                <span className="font-bold tracking-widest uppercase">{distanceM} m</span>
            </div>

            <div className="relative w-full max-w-[480px] rounded-2xl overflow-hidden"
                style={{ boxShadow: '0 0 0 1px rgba(244,63,94,0.2), 0 0 40px rgba(244,63,94,0.08)' }}>
                <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} className="block w-full bg-sky-300" style={{ touchAction: 'none' }} />

                <SoloGameOverlay
                    phase={phase}
                    displayScore={displayScore}
                    isNewBest={isNewBest}
                    submitState={submitState}
                    session={session}
                    leaderboardHref="/leaderboard/plumber"
                    onReplay={() => startGame(debugLevel)}
                    title="Game Over"
                    titleClassName="text-rose-400"
                    bgClassName="bg-black/80 backdrop-blur-sm"
                    replayClassName="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-black font-bold text-sm rounded-xl transition-all"
                    leaderboardClassName="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-sm rounded-xl transition-all"
                />
            </div>

            {phase === 'playing' && (
                <div className="md:hidden mt-4 w-full max-w-[480px] grid grid-cols-4 gap-2 select-none">
                    <button {...press('left')}  className="py-4 rounded-2xl bg-gray-800 text-white text-2xl font-bold active:bg-gray-600">←</button>
                    <button {...press('right')} className="py-4 rounded-2xl bg-gray-800 text-white text-2xl font-bold active:bg-gray-600">→</button>
                    <button {...press('jump')}  className="py-4 rounded-2xl bg-rose-600 text-white text-lg font-bold active:bg-rose-400">SAUT</button>
                    <button {...press('fire')}  className="py-4 rounded-2xl bg-orange-500 text-white text-lg font-bold active:bg-orange-300">FEU</button>
                </div>
            )}

            {phase === 'idle' && (
                <div className="mt-6 flex flex-col items-center gap-4">
                    {isAdmin && <AdminDebugControl value={debugLevel} onChange={setDebugLevel} />}
                    <button onClick={() => startGame(debugLevel)}
                        className="px-10 py-4 bg-rose-500 hover:bg-rose-400 active:scale-95 text-black font-black text-lg rounded-2xl transition-all"
                        style={{ boxShadow: '0 4px 24px rgba(244,63,94,0.35)' }}>
                        JOUER
                    </button>
                    <p className="text-gray-400 dark:text-white/25 text-xs tracking-wide text-center">
                        ← → / A-D : courir · Espace / ↑ / W : sauter · Maj / X : tirer
                    </p>
                </div>
            )}
        </div>
    );
}
