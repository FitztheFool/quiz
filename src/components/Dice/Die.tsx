'use client';

import { useEffect, useRef, useState } from 'react';

const DOT_POSITIONS: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 22], [75, 22], [25, 50], [75, 50], [25, 78], [75, 78]],
};

export type DieVariant = 'default' | 'cup' | 'held' | 'highlight';

export interface DieProps {
    value: number | null;
    size?: number;
    rolling?: boolean;
    hidden?: boolean;
    held?: boolean;
    highlighted?: boolean;
    pulseHint?: boolean;
    onClick?: () => void;
    disabled?: boolean;
    title?: string;
    className?: string;
    animateOnChange?: boolean;
}

export default function Die({
    value,
    size = 56,
    rolling = false,
    hidden = false,
    held = false,
    highlighted = false,
    pulseHint = false,
    onClick,
    disabled = false,
    title,
    className = '',
    animateOnChange = true,
}: DieProps) {
    const [displayValue, setDisplayValue] = useState<number>(value && value >= 1 && value <= 6 ? value : 1);
    const [landing, setLanding] = useState(false);
    const prevValueRef = useRef<number | null>(value);
    const prevRollingRef = useRef<boolean>(rolling);

    useEffect(() => {
        if (rolling && !hidden) {
            const id = setInterval(() => {
                setDisplayValue(1 + Math.floor(Math.random() * 6));
            }, 70);
            return () => clearInterval(id);
        }
    }, [rolling, hidden]);

    useEffect(() => {
        const wasRolling = prevRollingRef.current;
        const prevValue = prevValueRef.current;
        prevRollingRef.current = rolling;
        prevValueRef.current = value;

        if (rolling) return;
        if (value && value >= 1 && value <= 6) {
            setDisplayValue(value);
            const changed = prevValue !== value || wasRolling;
            if (changed && animateOnChange) {
                setLanding(true);
                const t = setTimeout(() => setLanding(false), 360);
                return () => clearTimeout(t);
            }
        }
    }, [value, rolling, animateOnChange]);

    const showPips = !hidden && !rolling ? (value && value >= 1 && value <= 6 ? value : 0) : (rolling && !hidden ? displayValue : 0);
    const dots = showPips > 0 ? DOT_POSITIONS[showPips] : [];

    const isInteractive = !!onClick && !disabled;
    const Tag: 'button' | 'div' = onClick ? 'button' : 'div';

    const base = `relative inline-flex items-center justify-center rounded-xl border select-none dice-shadow transition-colors`;
    const palette = hidden
        ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
        : held
            ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-500 text-amber-600 dark:text-amber-200 ring-4 ring-amber-400 shadow-amber-200 scale-105'
            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-500 text-gray-800 dark:text-gray-100';
    const ring = highlighted ? 'ring-2 ring-yellow-400' : '';
    const hint = pulseHint && !rolling ? 'ring-2 ring-blue-400 animate-pulse' : '';
    const interactive = isInteractive
        ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform'
        : disabled ? 'cursor-default opacity-70' : 'cursor-default';
    const anim = rolling ? 'dice-rolling' : landing ? 'dice-landed' : '';

    return (
        <Tag
            {...(onClick ? { type: 'button' as const, onClick, disabled } : {})}
            title={title}
            className={`${base} ${palette} ${ring} ${hint} ${interactive} ${anim} ${className}`}
            style={{ width: size, height: size }}
        >
            {hidden ? (
                <span className="text-xs font-bold">?</span>
            ) : (
                <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" aria-hidden>
                    {dots.map(([cx, cy], i) => (
                        <circle key={i} cx={cx} cy={cy} r={9} fill="currentColor" />
                    ))}
                    {showPips === 0 && (
                        <text x="50" y="62" textAnchor="middle" fontSize="30" fill="#cbd5e1">?</text>
                    )}
                </svg>
            )}
            {held && (
                <span className="absolute -top-2 -right-2 bg-amber-400 text-white text-[9px] font-black px-1 rounded-full">GARDÉ</span>
            )}
        </Tag>
    );
}
