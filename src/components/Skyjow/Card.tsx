'use client';

import type { CardState } from '@/hooks/useSkyjow';

export function cardColor(value: number | null, revealed: boolean, removed: boolean): string {
    if (removed) return 'bg-transparent border-transparent';
    if (!revealed) return 'bg-gradient-to-br from-slate-600 to-slate-800 border-slate-500 hover:from-slate-500 hover:to-slate-700 cursor-pointer text-slate-300';
    if (value === null) return 'bg-gradient-to-br from-slate-500 to-slate-700 border-slate-400';
    if (value === -2) return 'bg-gradient-to-br from-blue-500 to-blue-800 border-blue-400 text-white';
    if (value === -1) return 'bg-gradient-to-br from-blue-400 to-blue-600 border-blue-300 text-white';
    if (value === 0) return 'bg-gradient-to-br from-cyan-300 to-cyan-500 border-cyan-200 text-slate-900';
    if (value <= 3) return 'bg-gradient-to-br from-emerald-300 to-emerald-500 border-emerald-200 text-slate-900';
    if (value <= 6) return 'bg-gradient-to-br from-yellow-300 to-amber-400 border-yellow-200 text-slate-900';
    if (value <= 9) return 'bg-gradient-to-br from-orange-400 to-orange-600 border-orange-300 text-white';
    return 'bg-gradient-to-br from-red-500 to-red-700 border-red-400 text-white';
}

export function cardLabel(value: number | null, revealed: boolean, removed: boolean): string {
    if (removed) return '';
    if (!revealed) return '?';
    if (value === null) return '?';
    return String(value);
}

interface Props {
    card: CardState;
    onClick?: () => void;
    highlight?: boolean;
    selectable?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export default function Card({ card, onClick, highlight, selectable, size = 'md' }: Props) {
    const sizeClass = size === 'sm'
        ? 'w-8 h-11 text-xs rounded'
        : size === 'lg'
            ? 'w-14 h-20 text-xl rounded-lg'
            : 'w-11 h-16 text-sm rounded-md';

    if (card.removed) {
        return <div className={`${sizeClass} opacity-0 pointer-events-none`} />;
    }

    return (
        <div
            onClick={selectable ? onClick : undefined}
            className={[
                sizeClass,
                'border-2 flex items-center justify-center font-black transition-all duration-200 select-none shadow-md shadow-black/40',
                cardColor(card.value, card.revealed, card.removed),
                selectable && !card.revealed ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-emerald-900 scale-105' : '',
                highlight ? 'ring-2 ring-white ring-offset-1 ring-offset-emerald-900' : '',
                selectable && !card.removed ? 'cursor-pointer hover:scale-110 hover:-translate-y-0.5 active:scale-95' : '',
            ].join(' ')}
        >
            {card.revealed ? cardLabel(card.value, card.revealed, card.removed) : (
                <svg className="w-4 h-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )}
        </div>
    );
}
