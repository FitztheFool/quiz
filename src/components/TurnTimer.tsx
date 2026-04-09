// src/components/TurnTimer.tsx
'use client';
import { useEffect, useState } from 'react';

type Props = { endsAt: number; duration: number; label?: string; };

/**
 * Barre de timer horizontale réutilisable (mode timestamp).
 * <TurnTimer endsAt={state.turnEndsAt} duration={30} />
 */
export default function TurnTimer({ endsAt, duration }: Props) {
    const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));

    useEffect(() => {
        const tick = () => setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
        tick();
        const id = setInterval(tick, 200);
        return () => clearInterval(id);
    }, [endsAt]);

    const pct = duration > 0 ? Math.min((remaining / duration) * 100, 100) : 0;
    const urgent = pct <= 20 || remaining <= 10;
    const color = pct > 50 ? 'from-green-500 to-emerald-500'
        : pct > 25 ? 'from-yellow-500 to-orange-500'
        : 'from-red-500 to-rose-500';

    const display = remaining >= 60
        ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
        : `${remaining}s`;

    return (
        <div className="flex items-center gap-3 w-full">
            <span className={`text-sm font-bold tabular-nums w-12 shrink-0 text-right ${urgent ? 'text-red-500 dark:text-red-400 animate-pulse' : 'text-gray-600 dark:text-gray-400'}`}>
                {display}
            </span>
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-200`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}
