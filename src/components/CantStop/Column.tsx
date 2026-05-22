'use client';

import { colorForIndex } from './colors';
import type { CantStopPlayerView } from '@/hooks/useCantStop';

interface Props {
    col: number;
    length: number;
    players: CantStopPlayerView[];
    activeMarker?: number; // position of current player's active marker on this column
    activeOwnerIndex?: number; // player index owning active marker
    locked: boolean;
    claimedByIndex: number | null;
}

export default function Column({ col, length, players, activeMarker, activeOwnerIndex, locked, claimedByIndex }: Props) {
    // Render cells from top (position = length) down to bottom (position = 1).
    const cells: { pos: number; markers: { idx: number; permanent: boolean; active: boolean }[] }[] = [];
    for (let pos = length; pos >= 1; pos--) {
        const markers: { idx: number; permanent: boolean; active: boolean }[] = [];
        players.forEach((p, idx) => {
            const perm = p.permanent?.[col];
            if (perm === pos) markers.push({ idx, permanent: true, active: false });
        });
        if (activeMarker === pos && activeOwnerIndex != null) {
            markers.push({ idx: activeOwnerIndex, permanent: false, active: true });
        }
        cells.push({ pos, markers });
    }

    const claimColor = claimedByIndex != null ? colorForIndex(claimedByIndex) : null;
    return (
        <div className="flex flex-col items-center gap-0.5">
            <div className={`w-7 h-7 flex items-center justify-center text-sm font-black rounded shadow-md ${claimColor ? '' : 'bg-amber-700 text-white border border-amber-900/70'}`}
                style={claimColor ? { background: claimColor.bg, color: 'white' } : undefined}>
                {col}
            </div>
            <div className={`flex flex-col-reverse items-center gap-0.5 ${locked ? 'opacity-50' : ''}`}>
                {cells.slice().reverse().map(cell => (
                    <div key={cell.pos} className="w-7 h-5 rounded bg-amber-100 border border-amber-800/60 shadow-sm flex items-center justify-center relative">
                        <span className="text-[10px] text-amber-900 font-bold">{col}</span>
                        {cell.markers.length > 0 && (
                            <span className="absolute inset-0 flex items-center justify-center gap-0.5">
                                {cell.markers.map((m, i) => {
                                    const c = colorForIndex(m.idx);
                                    return (
                                        <span key={i}
                                            className={`w-3.5 h-3.5 rounded-full border-2 shadow ${m.active ? 'animate-pulse' : ''}`}
                                            style={{ background: c.bg, borderColor: m.active ? '#fff' : c.border }}
                                        />
                                    );
                                })}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
