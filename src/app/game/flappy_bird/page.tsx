'use client';

import { useRef } from 'react';
import { StarIcon, TrophyIcon } from '@heroicons/react/24/solid';
import { useFlappyBird } from '@/hooks/useFlappyBird';
import SoloGameOverlay from '@/components/SoloGameOverlay';
import SoloGameHeader from '@/components/SoloGame/SoloGameHeader';
import StatCell from '@/components/SoloGame/StatCell';

export default function FlappyBirdPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { phase, displayScore, bestScore, isNewBest, submitState, session, startGame, canvasSize } = useFlappyBird(canvasRef);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#07070f] flex flex-col items-center pt-4 pb-14 px-4">
            <SoloGameHeader leaderboardHref="/leaderboard/flappy_bird">
                <span className="text-yellow-500/40 text-xs tracking-widest">~~</span>
                <span className="text-yellow-500 dark:text-yellow-400 font-black text-2xl tracking-[0.1em] uppercase"
                    style={{ fontFamily: '"Press Start 2P", "Courier New", monospace', textShadow: '0 0 18px rgba(234,179,8,0.45)' }}>
                    FLAPPY
                </span>
                <span className="text-yellow-500/40 text-xs tracking-widest">~~</span>
            </SoloGameHeader>

            <div className="w-full max-w-[360px] mb-4 grid grid-cols-2 gap-px rounded-2xl overflow-hidden border border-gray-200 dark:border-white/[0.07] bg-gray-200 dark:bg-white/[0.04]">
                <StatCell icon={<StarIcon className="w-3 h-3 text-yellow-500" />} label="SCORE" value={displayScore} color="text-gray-900 dark:text-white" align="left" />
                <StatCell icon={<TrophyIcon className="w-3 h-3 text-yellow-500" />} label="MEILLEUR" value={Math.max(bestScore, displayScore)} color="text-yellow-500 dark:text-yellow-400" align="right" />
            </div>

            <div className="relative w-full max-w-[360px] rounded-2xl overflow-hidden"
                style={{ boxShadow: '0 0 0 1px rgba(234,179,8,0.2), 0 0 40px rgba(234,179,8,0.08)' }}>
                <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} className="block w-full" style={{ touchAction: 'none' }} />

                <SoloGameOverlay
                    phase={phase}
                    displayScore={displayScore}
                    isNewBest={isNewBest}
                    submitState={submitState}
                    session={session}
                    leaderboardHref="/leaderboard/flappy_bird"
                    onReplay={startGame}
                    title="Game Over"
                    titleClassName="text-yellow-400"
                    bgClassName="bg-black/80 backdrop-blur-sm"
                    replayClassName="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm rounded-xl transition-all"
                    leaderboardClassName="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-sm rounded-xl transition-all"
                />
            </div>

            {phase === 'idle' && (
                <div className="mt-6 flex flex-col items-center gap-4">
                    <button onClick={startGame}
                        className="px-10 py-4 bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black font-black text-lg rounded-2xl transition-all"
                        style={{ boxShadow: '0 4px 24px rgba(250,204,21,0.35)' }}>
                        JOUER
                    </button>
                    <p className="text-gray-400 dark:text-white/25 text-xs tracking-wide text-center">
                        Espace · ↑ · ou tapez sur la zone de jeu pour battre des ailes
                    </p>
                </div>
            )}
        </div>
    );
}
