'use client';
import { useEffect, useRef, useState } from 'react';

type Props = { endsAt: number; duration: number; label?: string; };

export default function TurnTimer({ endsAt, duration }: Props) {
    const [secs, setSecs] = useState(() => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    const barRef = useRef<HTMLDivElement>(null);
    const prevSecsRef = useRef(secs);

    useEffect(() => {
        let raf: number;

        const tick = () => {
            const msLeft = Math.max(0, endsAt - Date.now());
            const pct = duration > 0 ? Math.min((msLeft / (duration * 1000)) * 100, 100) : 0;

            if (barRef.current) {
                barRef.current.style.width = `${pct}%`;
            }

            const newSecs = Math.ceil(msLeft / 1000);
            if (newSecs !== prevSecsRef.current) {
                prevSecsRef.current = newSecs;
                setSecs(newSecs);
            }

            if (msLeft > 0) raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [endsAt, duration]);

    const pct = duration > 0 ? Math.min((secs / duration) * 100, 100) : 0;
    const urgent = pct <= 20 || secs <= 10;
    const color = pct > 50 ? 'from-green-500 to-emerald-500'
        : pct > 25 ? 'from-yellow-500 to-orange-500'
        : 'from-red-500 to-rose-500';

    const display = secs >= 60
        ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
        : `${secs}s`;

    return (
        <div className="flex items-center gap-3 w-full">
            <span className={`text-sm font-bold tabular-nums w-12 shrink-0 text-right ${urgent ? 'text-red-500 dark:text-red-400 animate-pulse' : 'text-gray-600 dark:text-gray-400'}`}>
                {display}
            </span>
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    ref={barRef}
                    className={`h-full bg-gradient-to-r ${color} rounded-full`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}
