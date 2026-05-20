'use client';

import { useMemo } from 'react';
import {
    BOARD_SIZE,
    BASE_SLOTS,
    CENTER,
    COLOR_CLASSES,
    HOME_COLUMNS,
    HOME_ZONES,
    SAFE_SQUARES,
    TRACK_COORDS,
    pawnCoord,
} from './boardLayout';
import type { LudoPlayer } from '@/hooks/useLudo';
import { StarIcon } from '@heroicons/react/24/solid';

interface BoardProps {
    players: LudoPlayer[];
    movablePawns: number[];           // pawn indices for the current player
    currentTurn: number;
    canMove: boolean;
    onPawnClick: (pawnIdx: number) => void;
    highlightedPlayer?: number;       // player index whose movable pawns to highlight
}

// Cell size is a CSS var so the board scales with viewport on small screens.
// Max 36px, min 18px, otherwise (viewport - paddings) / 15.
const CELL_CSS = 'min(36px, max(18px, calc((100vw - 2rem) / 15)))';

export default function LudoBoard({ players, movablePawns, currentTurn, canMove, onPawnClick, highlightedPlayer }: BoardProps) {
    // Build cell type map: 'base' | 'track' | 'home' | 'center' | 'safe' | 'empty', keyed by `${r},${c}`.
    const cellMeta = useMemo(() => {
        const meta: Record<string, { kind: string; color?: number; isSafe?: boolean }> = {};

        // Home zones (6x6 corners)
        for (let p = 0; p < 4; p++) {
            const zone = HOME_ZONES[p];
            for (let r = zone.row; r < zone.row + 6; r++) {
                for (let c = zone.col; c < zone.col + 6; c++) {
                    meta[`${r},${c}`] = { kind: 'home_zone', color: p };
                }
            }
        }
        // Track
        TRACK_COORDS.forEach(([r, c], i) => {
            const isSafe = SAFE_SQUARES.has(i);
            // Colorize starting squares
            const startColor = [0, 13, 26, 39].indexOf(i);
            meta[`${r},${c}`] = { kind: 'track', color: startColor >= 0 ? startColor : undefined, isSafe };
        });
        // Home columns
        for (let p = 0; p < 4; p++) {
            HOME_COLUMNS[p].forEach(([r, c]) => {
                meta[`${r},${c}`] = { kind: 'home_column', color: p };
            });
        }
        // Center
        meta[`${CENTER[0]},${CENTER[1]}`] = { kind: 'center' };

        return meta;
    }, []);

    // Group pawns by (row, col) so we can stack them in same cell.
    const pawnsByCell = useMemo(() => {
        const map = new Map<string, { player: LudoPlayer; pawnIdx: number; playerIdx: number }[]>();
        players.forEach((player, playerIdx) => {
            player.pawns.forEach((pawn, pawnIdx) => {
                const [r, c] = pawnCoord(player.colorIndex, pawnIdx, pawn.progress);
                const key = `${r},${c}`;
                if (!map.has(key)) map.set(key, []);
                map.get(key)!.push({ player, pawnIdx, playerIdx });
            });
        });
        return map;
    }, [players]);

    return (
        <div
            className="relative inline-block rounded-2xl p-3 wood-tile shadow-2xl"
            style={{ ['--ludo-cell' as string]: CELL_CSS }}
        >
            <div
                className="grid bg-white dark:bg-gray-900 rounded-lg overflow-hidden"
                style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, var(--ludo-cell))`, gridTemplateRows: `repeat(${BOARD_SIZE}, var(--ludo-cell))` }}
            >
                {Array.from({ length: BOARD_SIZE }, (_, r) =>
                    Array.from({ length: BOARD_SIZE }, (_, c) => {
                        const m = cellMeta[`${r},${c}`];
                        return <CellTile key={`${r}-${c}`} row={r} col={c} meta={m} />;
                    })
                )}

                {/* Center finish — larger overlay covering 3x3 around (7,7) for visual */}
                <div
                    className="absolute pointer-events-none"
                    style={{
                        left: `calc(0.5rem + 6 * var(--ludo-cell))`,
                        top: `calc(0.5rem + 6 * var(--ludo-cell))`,
                        width: `calc(3 * var(--ludo-cell))`,
                        height: `calc(3 * var(--ludo-cell))`,
                    }}
                >
                    <div className="w-full h-full grid grid-cols-2 grid-rows-2 rotate-45 origin-center" style={{ transform: 'rotate(45deg) scale(0.7)' }}>
                        <div className="bg-red-500/80" />
                        <div className="bg-green-500/80" />
                        <div className="bg-blue-500/80" />
                        <div className="bg-yellow-400/80" />
                    </div>
                </div>

                {/* Pawns layered on top */}
                {Array.from(pawnsByCell.entries()).map(([key, group]) => {
                    const [r, c] = key.split(',').map(Number);
                    return (
                        <div
                            key={key}
                            className="absolute flex items-center justify-center gap-0.5 pointer-events-none"
                            style={{
                                left: `calc(0.5rem + ${c} * var(--ludo-cell))`,
                                top: `calc(0.5rem + ${r} * var(--ludo-cell))`,
                                width: `var(--ludo-cell)`,
                                height: `var(--ludo-cell)`,
                            }}
                        >
                            {group.map(({ player, pawnIdx, playerIdx }) => {
                                const color = COLOR_CLASSES[player.colorIndex];
                                const isCurrent = playerIdx === currentTurn;
                                const isMovable = canMove && playerIdx === currentTurn && movablePawns.includes(pawnIdx);
                                const isHighlight = highlightedPlayer === playerIdx;
                                const ratio = group.length > 2 ? 0.4 : group.length > 1 ? 0.5 : 0.62;
                                return (
                                    <button
                                        key={`${player.userId}-${pawnIdx}`}
                                        type="button"
                                        disabled={!isMovable}
                                        onClick={() => isMovable && onPawnClick(pawnIdx)}
                                        className={`rounded-full ${color.bg} border-2 border-white shadow-md transition-all
                                            ${isMovable ? 'cursor-pointer hover:scale-125 ring-2 ring-offset-1 ring-white animate-pulse pointer-events-auto' : ''}
                                            ${isHighlight && !isMovable ? 'ring-2 ring-yellow-300' : ''}
                                            ${isCurrent ? 'shadow-lg' : ''}`}
                                        style={{ width: `calc(var(--ludo-cell) * ${ratio})`, height: `calc(var(--ludo-cell) * ${ratio})` }}
                                        title={`${player.username} — pion ${pawnIdx + 1}`}
                                    />
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function CellTile({ row, col, meta }: { row: number; col: number; meta?: { kind: string; color?: number; isSafe?: boolean } }) {
    if (!meta) return <div className="border border-gray-100 dark:border-gray-800" />;

    if (meta.kind === 'home_zone' && meta.color !== undefined) {
        // Check if this is a base parking slot
        const slots = BASE_SLOTS[meta.color];
        const isSlot = slots.some(([sr, sc]) => sr === row && sc === col);
        const color = COLOR_CLASSES[meta.color];
        // Outer ring of home zone is colored; inner is white
        const zone = HOME_ZONES[meta.color];
        const isOuter = row === zone.row || row === zone.row + 5 || col === zone.col || col === zone.col + 5;
        return (
            <div className={`flex items-center justify-center border border-gray-200/40 dark:border-gray-700/40 ${isOuter ? color.bg : 'bg-white dark:bg-gray-900'}`}>
                {isSlot && <div className={`rounded-full border-2 ${color.border} bg-white dark:bg-gray-800`} style={{ width: 'calc(var(--ludo-cell) * 0.78)', height: 'calc(var(--ludo-cell) * 0.78)' }} />}
            </div>
        );
    }

    if (meta.kind === 'track') {
        const color = meta.color !== undefined ? COLOR_CLASSES[meta.color] : null;
        return (
            <div className={`flex items-center justify-center border border-gray-200 dark:border-gray-700 ${color ? color.soft : 'bg-white dark:bg-gray-900'}`}>
                {meta.isSafe && <StarIcon className="w-3 h-3 text-gray-400 dark:text-gray-500 select-none" />}
            </div>
        );
    }

    if (meta.kind === 'home_column' && meta.color !== undefined) {
        const color = COLOR_CLASSES[meta.color];
        return <div className={`${color.bg} opacity-70 border border-white/30`} />;
    }

    if (meta.kind === 'center') {
        return <div className="bg-transparent" />;
    }

    return <div />;
}
