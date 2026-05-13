'use client';

interface DiceProps {
    value: number | null;
    canRoll: boolean;
    isRolling?: boolean;
    onRoll: () => void;
    label?: string;
}

const PIPS: Record<number, [number, number][]> = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [0, 2], [2, 0], [2, 2]],
    5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
    6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

export default function Dice({ value, canRoll, isRolling, onRoll, label }: DiceProps) {
    const pips = value && value >= 1 && value <= 6 ? PIPS[value] : [];
    return (
        <div className="flex flex-col items-center gap-2">
            <button
                type="button"
                onClick={onRoll}
                disabled={!canRoll}
                className={`w-20 h-20 rounded-2xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 grid grid-cols-3 grid-rows-3 gap-1 p-2 shadow-lg transition-all
                    ${canRoll ? 'hover:scale-105 hover:shadow-xl cursor-pointer ring-2 ring-blue-400 animate-pulse' : 'cursor-default'}
                    ${isRolling ? 'animate-spin' : ''}`}
                title={canRoll ? 'Lancer le dé' : 'Dé'}
            >
                {Array.from({ length: 9 }, (_, i) => {
                    const r = Math.floor(i / 3);
                    const c = i % 3;
                    const filled = pips.some(([pr, pc]) => pr === r && pc === c);
                    return (
                        <div key={i} className={`rounded-full ${filled ? 'bg-gray-800 dark:bg-white' : ''}`} />
                    );
                })}
            </button>
            {label && <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>}
        </div>
    );
}
