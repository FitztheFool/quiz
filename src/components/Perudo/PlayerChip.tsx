'use client';

import { PerudoColor } from './colors';

interface Props {
    color: PerudoColor;
    size?: number;
    dimmed?: boolean;
}

// Small colored die-like chip shown next to a player's remaining dice count.
export default function PlayerChip({ color, size = 22, dimmed = false }: Props) {
    return (
        <span
            className="inline-block rounded-md border-2 align-middle"
            style={{
                width: size,
                height: size,
                background: color.dieBg,
                borderColor: color.dieBorder,
                boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.25), inset 0 1px 2px rgba(255,255,255,0.45)',
                opacity: dimmed ? 0.35 : 1,
            }}
        />
    );
}
