'use client';

import SharedDie from '@/components/Dice/Die';
import type { CantStopSplit } from '@/hooks/useCantStop';

interface Props {
    dice: number[];
    splits: CantStopSplit[];
    onPick: (index: number) => void;
    disabled?: boolean;
}

export default function SplitChoice({ dice, splits, onPick, disabled }: Props) {
    return (
        <div className="flex flex-col gap-2">
            {splits.map((s, i) => {
                const d0 = dice[s.pairs[0][0]];
                const d1 = dice[s.pairs[0][1]];
                const d2 = dice[s.pairs[1][0]];
                const d3 = dice[s.pairs[1][1]];
                return (
                    <button
                        key={i}
                        type="button"
                        onClick={() => s.legal && !disabled && onPick(i)}
                        disabled={!s.legal || disabled}
                        className={`flex items-center gap-3 p-2 rounded-xl border-2 transition-all ${
                            s.legal && !disabled
                                ? 'border-amber-500 bg-amber-200/70 hover:bg-amber-300/80 cursor-pointer shadow-md'
                                : 'border-gray-400 bg-gray-300/30 opacity-60 cursor-not-allowed'
                        }`}
                    >
                        <div className="flex items-center gap-1.5">
                            <SharedDie value={d0} size={28} />
                            <SharedDie value={d1} size={28} />
                        </div>
                        <span className="text-amber-900 font-black text-lg">+</span>
                        <div className="flex items-center gap-1.5">
                            <SharedDie value={d2} size={28} />
                            <SharedDie value={d3} size={28} />
                        </div>
                        <span className="ml-auto text-amber-950 font-extrabold text-sm">
                            Progresser sur {s.sums[0]} et {s.sums[1]}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
