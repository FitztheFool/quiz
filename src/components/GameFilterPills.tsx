'use client';

import { GAME_CONFIG } from '@/lib/gameConfig';

export type GameFilter = typeof GAME_CONFIG[keyof typeof GAME_CONFIG]['gameType'] | 'ALL';

interface Props {
    value: GameFilter;
    onChange: (value: GameFilter) => void;
    activeClassName?: string;
    inactiveClassName?: string;
    showAll?: boolean;
}

const GAMES = Object.values(GAME_CONFIG).map(g => ({
    gameType: g.gameType as GameFilter,
    label: g.label,
    icon: g.icon,
}));

export default function GameFilterPills({
    value,
    onChange,
    activeClassName = 'bg-red-600 text-white border-red-600',
    inactiveClassName = 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
    showAll = true,
}: Props) {
    const games = showAll ? GAMES : GAMES;
    return (
        <div className="flex flex-wrap gap-2">
            {showAll && (
                <button
                    onClick={() => onChange('ALL')}
                    className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors ${value === 'ALL' ? activeClassName : inactiveClassName}`}
                >
                    🎮 Tous
                </button>
            )}
            {games.map(g => (
                <button
                    key={g.gameType}
                    onClick={() => onChange(g.gameType)}
                    className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors ${value === g.gameType ? activeClassName : inactiveClassName}`}
                >
                    {g.icon} {g.label}
                </button>
            ))}
        </div>
    );
}
