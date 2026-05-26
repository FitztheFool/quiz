'use client';

import type { MBCard, HazardType, RemedyType, SafetyType } from '@/hooks/useMilleBornes';
import { cardTitle } from './labels';
import {
    HandRaisedIcon, GaugeIcon, ExclamationTriangleIcon, FireIcon, WrenchScrewdriverIcon,
    PlayIcon, ArrowTrendingUpIcon, BeakerIcon, LifebuoyIcon,
    ShieldCheckIcon, StarIcon, BoltIcon,
} from './icons';

interface KindStyle {
    grad: string;     // card background gradient
    border: string;   // outer border
    text: string;     // primary text
    accent: string;   // solid accent (icon badge, corner)
    tag: string;      // family label
}

const KIND_STYLE: Record<MBCard['kind'], KindStyle> = {
    distance: { grad: 'from-sky-100 via-sky-50 to-white dark:from-sky-900/60 dark:via-sky-950/40 dark:to-gray-900', border: 'border-sky-300/80 dark:border-sky-700', text: 'text-sky-900 dark:text-sky-100', accent: 'bg-sky-500', tag: 'Distance' },
    hazard:   { grad: 'from-red-100 via-red-50 to-white dark:from-red-900/60 dark:via-red-950/40 dark:to-gray-900', border: 'border-red-300/80 dark:border-red-700', text: 'text-red-800 dark:text-red-200', accent: 'bg-red-500', tag: 'Attaque' },
    remedy:   { grad: 'from-emerald-100 via-emerald-50 to-white dark:from-emerald-900/60 dark:via-emerald-950/40 dark:to-gray-900', border: 'border-emerald-300/80 dark:border-emerald-700', text: 'text-emerald-800 dark:text-emerald-200', accent: 'bg-emerald-500', tag: 'Parade' },
    safety:   { grad: 'from-amber-100 via-amber-50 to-white dark:from-amber-900/60 dark:via-amber-950/40 dark:to-gray-900', border: 'border-amber-400 dark:border-amber-600', text: 'text-amber-800 dark:text-amber-200', accent: 'bg-amber-500', tag: 'Botte' },
};

type IconCmp = React.ComponentType<{ className?: string }>;

const HAZARD_ICON: Record<HazardType, IconCmp> = {
    stop: HandRaisedIcon, speedLimit: GaugeIcon, accident: ExclamationTriangleIcon, outOfGas: FireIcon, flatTire: LifebuoyIcon,
};
const REMEDY_ICON: Record<RemedyType, IconCmp> = {
    go: PlayIcon, endLimit: ArrowTrendingUpIcon, repairs: WrenchScrewdriverIcon, gas: BeakerIcon, spareTire: LifebuoyIcon,
};
const SAFETY_ICON: Record<SafetyType, IconCmp> = {
    rightOfWay: StarIcon, drivingAce: ShieldCheckIcon, fuelTank: BeakerIcon, punctureProof: LifebuoyIcon,
};

function iconFor(card: MBCard) {
    if (card.kind === 'hazard') return HAZARD_ICON[card.hazard!];
    if (card.kind === 'remedy') return REMEDY_ICON[card.remedy!];
    if (card.kind === 'safety') return SAFETY_ICON[card.safety!];
    return null;
}

interface Props {
    card: MBCard;
    selected?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    size?: 'sm' | 'md';
}

export default function Card({ card, selected, disabled, onClick, size = 'md' }: Props) {
    const s = KIND_STYLE[card.kind];
    const dims = size === 'sm' ? 'w-16 h-24' : 'w-[5.5rem] h-32';
    const interactive = !!onClick && !disabled;
    const Icon = iconFor(card);
    const isSafety = card.kind === 'safety';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={selected}
            aria-label={cardTitle(card)}
            className={`group relative flex flex-col items-center justify-between rounded-2xl border bg-gradient-to-br ${s.grad} ${s.border} ${dims}
                px-1.5 py-2 overflow-hidden transition-all duration-200
                shadow-[0_2px_6px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.55)]
                ${isSafety ? 'ring-1 ring-amber-300/70' : ''}
                ${selected ? 'ring-4 ring-yellow-300 -translate-y-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.32)]' : ''}
                ${interactive ? 'hover:-translate-y-1.5 hover:shadow-[0_8px_18px_rgba(0,0,0,0.28)] cursor-pointer' : ''}
                ${disabled ? 'opacity-45 cursor-not-allowed grayscale' : ''}`}
        >
            {/* Glossy sheen */}
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/45 to-transparent" aria-hidden />
            {/* Accent top bar */}
            <span className={`pointer-events-none absolute inset-x-0 top-0 h-1 ${s.accent} opacity-80`} aria-hidden />

            {/* Family tag */}
            <span className={`relative z-10 text-[8px] font-extrabold uppercase tracking-[0.12em] opacity-75 ${s.text}`}>{s.tag}</span>

            {card.kind === 'distance' ? (
                <span className={`relative z-10 flex flex-col items-center leading-none ${s.text}`}>
                    <span className="text-[2rem] font-black tabular-nums drop-shadow-sm">{card.km}</span>
                    <span className="text-[10px] font-bold opacity-60 tracking-widest mt-0.5">KM</span>
                </span>
            ) : (
                <span className={`relative z-10 flex flex-col items-center gap-1.5 text-center ${s.text}`}>
                    {Icon && (
                        <span className={`flex items-center justify-center w-9 h-9 rounded-full ${s.accent} text-white shadow-inner ring-2 ring-white/50`}>
                            <Icon className="w-5 h-5" />
                        </span>
                    )}
                    <span className="text-[10px] font-bold leading-tight px-0.5">{cardTitle(card)}</span>
                </span>
            )}

            {/* Footer accent: bottes get a star, others a thin rule */}
            {isSafety
                ? <span className="relative z-10 flex items-center gap-0.5 text-[8px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300"><BoltIcon className="w-3 h-3" />Botte</span>
                : <span className={`relative z-10 h-0.5 w-6 rounded-full ${s.accent} opacity-40`} aria-hidden />}
        </button>
    );
}
