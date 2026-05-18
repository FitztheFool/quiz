'use client';

const DOT_POSITIONS: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 22], [75, 22], [25, 50], [75, 50], [25, 78], [75, 78]],
};

interface Props {
    value: number;
    size?: number;
    hidden?: boolean;
    highlighted?: boolean;
    className?: string;
}

export default function Die({ value, size = 56, hidden = false, highlighted = false, className = '' }: Props) {
    const dots = !hidden && value > 0 ? DOT_POSITIONS[value] ?? [] : [];
    const isCup = hidden;
    return (
        <div
            className={`relative inline-flex items-center justify-center rounded-xl border transition-colors select-none
                ${isCup
                    ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-500 text-gray-800 dark:text-gray-100'}
                ${highlighted ? 'ring-2 ring-yellow-400 shadow-md' : 'shadow-sm'}
                ${className}`}
            style={{ width: size, height: size }}
        >
            {isCup ? (
                <span className="text-xs font-bold">?</span>
            ) : (
                <svg viewBox="0 0 100 100" className="w-full h-full p-1.5">
                    {dots.map(([cx, cy], i) => (
                        <circle key={i} cx={cx} cy={cy} r={9} fill="currentColor" />
                    ))}
                </svg>
            )}
        </div>
    );
}
