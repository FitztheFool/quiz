'use client';

import Column from './Column';
import type { CantStopState } from '@/hooks/useCantStop';

interface Props {
    state: CantStopState;
}

const COLS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function Board({ state }: Props) {
    const currentPlayerIndex = state.currentPlayerIndex;

    // Map locked column → which player claimed it.
    const claimMap: Record<number, number> = {};
    state.players.forEach((p, idx) => {
        for (const col of p.claimed) claimMap[col] = idx;
    });

    return (
        <div className="flex items-end justify-center gap-1.5 overflow-x-auto px-2 py-3 wood-tile rounded-2xl">
            {COLS.map(col => {
                const activeMarker = state.activeMarkers?.[col];
                return (
                    <Column
                        key={col}
                        col={col}
                        length={state.columnLengths[col]}
                        players={state.players}
                        activeMarker={activeMarker}
                        activeOwnerIndex={activeMarker != null ? currentPlayerIndex : undefined}
                        locked={state.lockedColumns.includes(col)}
                        claimedByIndex={claimMap[col] ?? null}
                    />
                );
            })}
        </div>
    );
}
