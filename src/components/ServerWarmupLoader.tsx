'use client';

import { useEffect, useState } from 'react';
import GameIcon from '@/components/GameIcon';

const EST_DURATION_S = 75;

const CAROUSEL_GAMES: { type: string; label: string }[] = [
    { type: 'UNO',          label: 'UNO' },
    { type: 'PUISSANCE4',   label: 'Puissance 4' },
    { type: 'YAHTZEE',      label: 'Yahtzee' },
    { type: 'TABOO',        label: 'Taboo' },
    { type: 'LUDO',         label: 'Ludo' },
    { type: 'PERUDO',       label: 'Perudo' },
    { type: 'BATTLESHIP',   label: 'Bataille' },
    { type: 'JUST_ONE',     label: 'Just One' },
    { type: 'SKYJOW',       label: 'Skyjow' },
    { type: 'MILLE_BORNES', label: 'Mille Bornes' },
    { type: 'CANT_STOP',    label: "Can't Stop" },
    { type: 'DIAMANT',      label: 'Diamant' },
    { type: 'IMPOSTOR',     label: 'Imposteur' },
    { type: 'SPYFALL',      label: 'Spyfall' },
];

const TIPS = [
    'Astuce — Tu peux créer un salon privé puis partager son lien à tes amis.',
    'Le saviez-vous ? Plus de 20 jeux différents t\'attendent sur Kwizar.',
    'Astuce — Tes meilleurs scores solo apparaissent dans ton profil public.',
    'Astuce — Les invités peuvent rejoindre un salon sans se créer de compte.',
    'Le saviez-vous ? Le serveur s\'endort après quelques minutes d\'inactivité.',
    'Astuce — Espace ou Entrée lance la plupart des jeux solo.',
    'Astuce — Sur mobile, tourne en portrait pour profiter pleinement des jeux.',
];

export default function ServerWarmupLoader({ error }: { error?: boolean }) {
    const [elapsed, setElapsed] = useState(0);
    const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * TIPS.length));
    const [carouselIndex, setCarouselIndex] = useState(0);

    useEffect(() => {
        if (error) return;
        const t0 = Date.now();
        const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 250);
        return () => window.clearInterval(id);
    }, [error]);

    useEffect(() => {
        if (error) return;
        const id = window.setInterval(() => setTipIndex(i => (i + 1) % TIPS.length), 6_000);
        return () => window.clearInterval(id);
    }, [error]);

    useEffect(() => {
        if (error) return;
        const id = window.setInterval(() => setCarouselIndex(i => (i + 1) % CAROUSEL_GAMES.length), 850);
        return () => window.clearInterval(id);
    }, [error]);

    if (error) return (
        <div className="min-h-screen flex items-center justify-center px-4"
            style={{ background: 'radial-gradient(circle at 50% 30%, rgba(220,38,38,0.12), transparent 65%)' }}>
            <div className="text-center max-w-sm">
                <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-5 ring-4 ring-red-500/10">
                    <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white mb-2">Serveur indisponible</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-7">Le serveur n&apos;a pas pu démarrer. Réessaie dans quelques secondes.</p>
                <button onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-red-600 hover:bg-red-500 active:scale-95 text-white text-sm font-bold rounded-xl transition-all"
                    style={{ boxShadow: '0 6px 20px rgba(220,38,38,0.35)' }}>
                    Réessayer
                </button>
            </div>
        </div>
    );

    const pctRaw = Math.min(elapsed / EST_DURATION_S, 0.97);
    const pct = Math.max(0.04, pctRaw);
    const remaining = Math.max(0, EST_DURATION_S - elapsed);

    const visibleTiles = Array.from({ length: 5 }).map((_, i) => {
        const idx = (carouselIndex + i) % CAROUSEL_GAMES.length;
        return { ...CAROUSEL_GAMES[idx], slot: i };
    });

    return (
        <div className="min-h-screen flex items-center justify-center px-4"
            style={{
                background: `
                    radial-gradient(circle at 50% 20%, rgba(220,38,38,0.10), transparent 60%),
                    radial-gradient(circle at 50% 90%, rgba(245,158,11,0.08), transparent 60%)
                `,
            }}>
            <style>{`
                @keyframes warm-pulse { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }
                @keyframes warm-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
                @keyframes warm-tile-in { from { transform: scale(0.4) translateY(-6px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
                @keyframes warm-tile-out { to { transform: scale(0.4) translateY(6px); opacity: 0; } }
                @keyframes warm-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes warm-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>

            <div className="w-full max-w-md text-center">
                {/* Wordmark + pulsing dot */}
                <div className="flex items-center justify-center gap-2 mb-2" style={{ animation: 'warm-pulse 2.4s ease-in-out infinite' }}>
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <h1 className="text-[11px] font-black tracking-[0.32em] text-gray-700 dark:text-gray-300 uppercase">Kwizar</h1>
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                </div>

                {/* Carousel of game tiles */}
                <div className="relative h-28 flex items-center justify-center gap-2 mb-5 overflow-hidden">
                    {visibleTiles.map(({ type, label, slot }) => {
                        const center = 2;
                        const offset = slot - center;
                        const isCenter = offset === 0;
                        const scale = isCenter ? 1 : Math.abs(offset) === 1 ? 0.78 : 0.58;
                        const opacity = isCenter ? 1 : Math.abs(offset) === 1 ? 0.55 : 0.22;
                        const translate = offset * 56;
                        return (
                            <div
                                key={`${type}-${slot}-${carouselIndex}`}
                                className="absolute transition-all duration-500"
                                style={{
                                    transform: `translateX(${translate}px) scale(${scale})`,
                                    opacity,
                                }}
                            >
                                <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center gap-1.5
                                    ${isCenter
                                        ? 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-[0_8px_32px_rgba(220,38,38,0.45)] ring-2 ring-red-400/40'
                                        : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/[0.08]'}`}>
                                    <GameIcon gameType={type} className="w-7 h-7" />
                                    <span className="text-[9px] font-bold uppercase tracking-wider truncate max-w-[68px]">{label}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Main message */}
                <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">Préparation du jeu…</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
                    Le serveur démarre — encore <span className="font-semibold text-gray-700 dark:text-gray-300">{remaining}s</span> environ
                </p>

                {/* Progress bar with shimmer */}
                <div className="relative w-full h-2 bg-gray-200/70 dark:bg-white/[0.08] rounded-full overflow-hidden mb-2">
                    <div
                        className="h-full rounded-full transition-[width] duration-300 ease-out"
                        style={{
                            width: `${pct * 100}%`,
                            background: 'linear-gradient(90deg, #dc2626 0%, #f59e0b 100%)',
                            boxShadow: '0 0 10px rgba(220,38,38,0.45)',
                        }}
                    />
                    <div
                        className="absolute inset-y-0 w-1/3"
                        style={{
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
                            animation: 'warm-shimmer 1.6s linear infinite',
                        }}
                    />
                </div>
                <div className="flex justify-between text-[10px] font-bold tracking-wider uppercase text-gray-400 dark:text-gray-600 mb-7">
                    <span>{elapsed}s</span>
                    <span>~{EST_DURATION_S}s</span>
                </div>

                {/* Rotating tip */}
                <div className="min-h-[40px] flex items-start justify-center">
                    <p key={tipIndex}
                        className="text-xs text-gray-500 dark:text-gray-400 italic max-w-xs leading-relaxed"
                        style={{ animation: 'warm-fade 400ms ease-out' }}>
                        {TIPS[tipIndex]}
                    </p>
                </div>
            </div>
        </div>
    );
}
