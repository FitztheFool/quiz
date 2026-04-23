'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GAME_CONFIG, type GameMode } from '@/lib/gameConfig';
import GameIcon from '@/components/GameIcon';
import { PlayIcon, PlusIcon } from '@heroicons/react/24/outline';

// ── Derived from GAME_CONFIG — single source of truth ────────────────────────

const GAMES_BY_MODE = {
    solo: Object.entries(GAME_CONFIG).filter(([, g]) => (g.mode as GameMode) === 'solo'),
    both: Object.entries(GAME_CONFIG).filter(([, g]) => (g.mode as GameMode) === 'both'),
    multi: Object.entries(GAME_CONFIG).filter(([, g]) => (g.mode as GameMode) === 'multi'),
} satisfies Record<GameMode, [string, typeof GAME_CONFIG[keyof typeof GAME_CONFIG]][]>;

// ── Sub-components ────────────────────────────────────────────────────────────

function PersonIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}

const MODE_STYLES = {
    solo: { pill: 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', accent: 'border-l-blue-400', label: 'Solo' },
    both: { pill: 'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', accent: 'border-l-purple-400', label: 'Mixte' },
    multi: { pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', accent: 'border-l-emerald-400', label: 'Multi' },
};

function Pill({ mode }: { mode: GameMode }) {
    const s = MODE_STYLES[mode];
    return (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${s.pill}`}>
            {s.label}
        </span>
    );
}

function SectionDivider({ label, badge, mode }: { label: string; badge: string; mode: GameMode }) {
    const colors = {
        solo: 'bg-blue-400',
        both: 'bg-purple-400',
        multi: 'bg-emerald-400',
    };
    return (
        <div className="flex items-center gap-3 mb-4">
            <div className={`w-2 h-2 rounded-full ${colors[mode]}`} />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{label}</span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">
                {badge}
            </span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
        </div>
    );
}

function GameCard({ gameKey, mode, wide = false }: { gameKey: string; mode: GameMode; wide?: boolean }) {
    const g = GAME_CONFIG[gameKey as keyof typeof GAME_CONFIG];
    const { accent } = MODE_STYLES[mode];
    return (
        <Link href={`/leaderboard/${gameKey}`}
            className={`
                group flex ${wide ? 'flex-row gap-3 items-start' : 'flex-col'}
                bg-white dark:bg-gray-900
                border border-gray-100 dark:border-gray-800 border-l-2 ${accent}
                rounded-xl p-4
                hover:border-gray-200 dark:hover:border-gray-700 hover:-translate-y-0.5
                transition-all duration-150
            `}>
            <span className={`text-gray-700 dark:text-gray-300 ${wide ? 'mt-0.5 shrink-0' : 'mb-2 block'} group-hover:scale-110 transition-transform`}>
                <GameIcon gameType={g.gameType} className="w-8 h-8" />
            </span>
            <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-1">{g.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{g.description}</div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                        <PersonIcon /> {g.players}
                    </span>
                    <Pill mode={mode} />
                </div>
            </div>
        </Link>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
    const [lobbyCode, setCode] = useState('');
    useEffect(() => { setCode(crypto.randomUUID()); }, []);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

            {/* ── Hero ───────────────────────────────────────────────────────── */}
            <section className="relative overflow-hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
                    style={{ backgroundImage: 'linear-gradient(#000 1px,transparent 1px),linear-gradient(90deg,#000 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
                <div className="relative max-w-5xl mx-auto px-6 py-8 md:py-12">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        {/* Left: title + CTAs */}
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white leading-tight tracking-tight mb-3">
                                Jouez. Rivalisez.{' '}
                                <span className="text-blue-600 dark:text-blue-400">Grimpez.</span>
                            </h1>
                            <div className="flex flex-wrap gap-3">
                                <Link href="/lobby/all"
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-px active:translate-y-0">
                                    <PlayIcon className="w-4 h-4 inline mr-1.5" />Rejoindre une partie
                                </Link>
                                <Link href={`/lobby/create/${lobbyCode}`}
                                    className="px-5 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-bold text-sm rounded-xl border border-gray-200 dark:border-gray-700 transition-all hover:-translate-y-px active:translate-y-0">
                                    <PlusIcon className="w-4 h-4 inline mr-1.5" />Créer un lobby
                                </Link>
                            </div>
                        </div>
                        {/* Right: live stat placeholders */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:shrink-0">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 min-w-[90px] text-center">
                                    <span className="text-xl font-black text-gray-300 dark:text-gray-600">—</span>
                                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-600">Bientôt</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Games by mode ──────────────────────────────────────────────── */}
            <section className="max-w-5xl mx-auto px-6 py-10">
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white leading-tight tracking-tight mb-8">Nos jeux</h2>

                {/* Solo */}
                <div className="mt-4">
                    <SectionDivider label="Solo uniquement" badge="1 joueur" mode="solo" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {GAMES_BY_MODE.solo.map(([key]) => (
                            <GameCard key={key} gameKey={key} mode="solo" />
                        ))}
                    </div>
                </div>

                {/* Solo + Multi */}
                <div className="mt-12">
                    <SectionDivider label="Solo ou multijoueur" badge="1 – 8 joueurs" mode="both" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {GAMES_BY_MODE.both.map(([key]) => (
                            <GameCard key={key} gameKey={key} mode="both" />
                        ))}
                    </div>
                </div>

                {/* Multi only */}
                <div className="mt-12">
                    <SectionDivider label="Multijoueur uniquement" badge="3+ joueurs" mode="multi" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {GAMES_BY_MODE.multi.map(([key]) => (
                            <GameCard key={key} gameKey={key} mode="multi" wide />
                        ))}
                    </div>
                </div>

            </section>

        </div>
    );
}
