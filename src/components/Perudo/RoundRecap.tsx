'use client';

import { colorForIndex, PerudoColor } from './colors';
import type { PerudoState } from '@/hooks/usePerudo';

const DOT_POSITIONS: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 22], [75, 22], [25, 50], [75, 50], [25, 78], [75, 78]],
};

function TintedDie({ value, color, faded, paco, size = 34 }: { value: number; color: PerudoColor; faded?: boolean; paco?: boolean; size?: number }) {
    const dots = DOT_POSITIONS[value] ?? [];
    return (
        <span
            className="inline-flex items-center justify-center rounded-md border-2"
            style={{
                width: size,
                height: size,
                background: color.dieBg,
                borderColor: color.dieBorder,
                opacity: faded ? 0.3 : 1,
                boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.25), inset 0 1px 2px rgba(255,255,255,0.45)',
            }}
        >
            {paco ? (
                <span className="font-black text-white text-sm" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.45)' }}>P</span>
            ) : (
                <svg viewBox="0 0 100 100" className="w-full h-full p-1">
                    {dots.map(([cx, cy], i) => (
                        <circle key={i} cx={cx} cy={cy} r={11} fill={color.dieDot} />
                    ))}
                </svg>
            )}
        </span>
    );
}

interface Props {
    state: PerudoState;
    onClose?: () => void;
}

export default function RoundRecap({ state, onClose }: Props) {
    const reveal = state.lastReveal;
    if (!reveal) return null;
    const { bid, actualCount, loserUserId, challengerUserId, revealedDice, pacosWild } = reveal;

    // Map userId → revealed dice
    const diceMap = new Map(revealedDice.map(r => [r.userId, r.dice]));

    return (
        <div className="wood-tile rounded-2xl px-4 py-4 w-full max-w-4xl shadow-2xl relative">
            {onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-white inline-flex items-center justify-center"
                    aria-label="Fermer"
                >
                    ×
                </button>
            )}
            <h2 className="font-extrabold text-xl text-gray-900 mb-3">Aperçu de la manche</h2>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-2 items-center text-sm">
                <div className="text-xs uppercase tracking-wider text-gray-600 font-bold border-b border-gray-700/30 pb-1">joueur</div>
                <div className="text-xs uppercase tracking-wider text-gray-600 font-bold border-b border-gray-700/30 pb-1">dés</div>
                <div className="text-xs uppercase tracking-wider text-gray-600 font-bold border-b border-gray-700/30 pb-1">dernière proposition</div>
                <div className="text-xs uppercase tracking-wider text-gray-600 font-bold border-b border-gray-700/30 pb-1">dé perdu</div>

                {state.players.map((p, idx) => {
                    const color = colorForIndex(idx);
                    const dice = diceMap.get(p.userId) ?? p.dice ?? [];
                    const isLoser = p.userId === loserUserId;
                    const isChallenger = p.userId === challengerUserId;
                    const isBidder = p.userId === bid.userId;
                    return (
                        <div key={p.userId} className="contents">
                            <div className={`font-extrabold ${color.text} border-b border-gray-700/15 py-1.5`}>
                                {p.username}
                            </div>
                            <div className="flex gap-1 border-b border-gray-700/15 py-1.5">
                                {dice.length > 0 ? dice.map((v, i) => {
                                    const isPaco = v === 1 && pacosWild;
                                    const matches = v === bid.face || isPaco;
                                    return (
                                        <TintedDie
                                            key={i}
                                            value={v}
                                            color={color}
                                            faded={!matches}
                                            paco={isPaco}
                                        />
                                    );
                                }) : (
                                    <span className="text-xs text-gray-500 italic">éliminé</span>
                                )}
                            </div>
                            <div className="border-b border-gray-700/15 py-1.5">
                                {isChallenger ? (
                                    <span className="font-bold text-gray-800">Dudo</span>
                                ) : isBidder ? (
                                    <span className="inline-flex items-center gap-1.5 font-mono font-bold text-gray-900">
                                        {bid.count}
                                        <TintedDie value={bid.face} color={color} size={28} />
                                    </span>
                                ) : (
                                    <span className="text-gray-400">—</span>
                                )}
                            </div>
                            <div className="border-b border-gray-700/15 py-1.5 text-center font-black text-lg">
                                {isLoser ? <span className="text-red-700">X</span> : <span className="text-gray-400">—</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-700/30 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-800">Total compté</span>
                <span className="font-mono text-xl font-black text-gray-900">{actualCount}</span>
            </div>
            <p className={`mt-1 text-xs font-bold ${actualCount >= bid.count ? 'text-green-700' : 'text-red-700'}`}>
                {actualCount >= bid.count ? 'Annonce tenue — défi perdu !' : 'Bluff démasqué !'}
            </p>
        </div>
    );
}
