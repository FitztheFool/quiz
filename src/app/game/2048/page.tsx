'use client';

import { useRef } from 'react';
import { StarIcon, TrophyIcon } from '@heroicons/react/24/solid';
import { useTwenty48 } from '@/hooks/useTwenty48';
import SoloGameOverlay from '@/components/SoloGameOverlay';
import SoloGameHeader from '@/components/SoloGame/SoloGameHeader';
import StatCell from '@/components/SoloGame/StatCell';
import type { Direction } from '@/lib/twenty48/engine';

const TILE_STYLE: Record<number, { bg: string; text: string }> = {
    0:    { bg: 'bg-stone-200/60 dark:bg-white/[0.04]', text: '' },
    2:    { bg: 'bg-[#eee4da]', text: 'text-stone-700' },
    4:    { bg: 'bg-[#ede0c8]', text: 'text-stone-700' },
    8:    { bg: 'bg-[#f2b179]', text: 'text-white' },
    16:   { bg: 'bg-[#f59563]', text: 'text-white' },
    32:   { bg: 'bg-[#f67c5f]', text: 'text-white' },
    64:   { bg: 'bg-[#f65e3b]', text: 'text-white' },
    128:  { bg: 'bg-[#edcf72]', text: 'text-white' },
    256:  { bg: 'bg-[#edcc61]', text: 'text-white' },
    512:  { bg: 'bg-[#edc850]', text: 'text-white' },
    1024: { bg: 'bg-[#edc53f]', text: 'text-white' },
    2048: { bg: 'bg-[#edc22e]', text: 'text-white' },
};
const BIG = { bg: 'bg-[#3c3a32]', text: 'text-white' };

function tileFontSize(v: number) {
    if (v < 100) return 'text-3xl';
    if (v < 1000) return 'text-2xl';
    if (v < 10000) return 'text-xl';
    return 'text-base';
}

export default function Twenty48Page() {
    const { board, phase, displayScore, bestScore, isNewBest, submitState, session, startGame, press } = useTwenty48();
    const touch = useRef<{ x: number; y: number } | null>(null);

    const onTouchStart = (e: React.TouchEvent) => {
        const t = e.touches[0];
        touch.current = { x: t.clientX, y: t.clientY };
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        if (!touch.current) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - touch.current.x;
        const dy = t.clientY - touch.current.y;
        touch.current = null;
        const THRESH = 25;
        if (Math.abs(dx) < THRESH && Math.abs(dy) < THRESH) {
            if (phase !== 'playing') startGame();
            return;
        }
        const dir: Direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        if (phase === 'playing') press(dir); else startGame();
    };

    return (
        <div className="min-h-screen bg-transparent flex flex-col items-center pt-4 pb-14 px-4">
            <SoloGameHeader leaderboardHref="/leaderboard/2048">
                <span className="text-amber-500/40 text-xs tracking-widest">▮▮</span>
                <span className="text-amber-600 dark:text-amber-400 font-black text-3xl tracking-[0.05em]">2048</span>
                <span className="text-amber-500/40 text-xs tracking-widest">▮▮</span>
            </SoloGameHeader>

            <div className="w-full max-w-[420px] mb-4 grid grid-cols-2 gap-px rounded-2xl overflow-hidden border border-gray-200 dark:border-white/[0.07] bg-gray-200 dark:bg-white/[0.04]">
                <StatCell icon={<StarIcon className="w-3 h-3 text-yellow-500" />} label="SCORE" value={displayScore} color="text-gray-900 dark:text-white" align="left" />
                <StatCell icon={<TrophyIcon className="w-3 h-3 text-yellow-500" />} label="MEILLEUR" value={Math.max(bestScore, displayScore)} color="text-yellow-500 dark:text-yellow-400" align="right" />
            </div>

            <div className="relative w-full max-w-[420px]" style={{ touchAction: 'none' }}
                onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                <div className="grid grid-cols-4 gap-2 p-2 rounded-2xl bg-[#bbada0] dark:bg-[#3a342f] aspect-square select-none">
                    {board.flat().map((v, i) => {
                        const style = v === 0 ? TILE_STYLE[0] : (TILE_STYLE[v] ?? BIG);
                        return (
                            <div key={i}
                                className={`rounded-md flex items-center justify-center font-black transition-colors ${style.bg} ${style.text} ${v ? tileFontSize(v) : ''}`}>
                                {v !== 0 && v}
                            </div>
                        );
                    })}
                </div>

                <SoloGameOverlay
                    phase={phase}
                    displayScore={displayScore}
                    isNewBest={isNewBest}
                    submitState={submitState}
                    session={session}
                    leaderboardHref="/leaderboard/2048"
                    onReplay={startGame}
                    title="Game Over"
                    titleClassName="text-amber-400"
                    bgClassName="bg-black/80 backdrop-blur-sm rounded-2xl"
                    replayClassName="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-all"
                    leaderboardClassName="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-sm rounded-xl transition-all"
                />
            </div>

            {phase === 'idle' && (
                <div className="mt-6 flex flex-col items-center gap-4">
                    <button onClick={startGame}
                        className="px-10 py-4 bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-lg rounded-2xl transition-all"
                        style={{ boxShadow: '0 4px 24px rgba(245,158,11,0.35)' }}>
                        JOUER
                    </button>
                    <p className="text-gray-500 dark:text-white/30 text-xs tracking-wide text-center">
                        ← → ↑ ↓ / ZQSD · ou glissez sur la grille
                    </p>
                </div>
            )}
        </div>
    );
}
