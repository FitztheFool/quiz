'use client';

import { CARD_GRADIENT, VALUE_LABEL, type UnoCard } from './constants';

interface Props {
    card: UnoCard;
    playable?: boolean;
    selected?: boolean;
    onClick?: () => void;
}

export default function Card({ card, playable, selected, onClick }: Props) {
    const label = VALUE_LABEL[card.value] ?? card.value;
    const gradient = CARD_GRADIENT[card.color] ?? 'bg-gray-400';
    return (
        <div onClick={onClick} className={`
            relative w-16 h-24 ${gradient} rounded-xl border-[3px] border-white shadow-lg
            flex items-center justify-center font-black text-white
            select-none transition-all duration-200 overflow-hidden
            ${playable ? 'cursor-pointer hover:-translate-y-3 hover:shadow-2xl hover:scale-105 ring-2 ring-white/60' : 'opacity-60 cursor-default'}
            ${selected ? '-translate-y-4 ring-4 ring-yellow-300 shadow-yellow-300/40 shadow-2xl scale-105' : ''}
        `}>
            {/* Oval white center for classic UNO look */}
            <span className="absolute inset-2 rounded-full bg-white/10 -rotate-[20deg] pointer-events-none" />
            {/* Corner labels */}
            <span className="absolute top-1 left-1.5 text-[10px] font-black leading-none">{label}</span>
            <span className="absolute bottom-1 right-1.5 text-[10px] font-black leading-none rotate-180">{label}</span>
            {/* Center value */}
            <span className="relative z-10 text-2xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">{label}</span>
        </div>
    );
}
