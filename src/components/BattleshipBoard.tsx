// src/components/BattleshipBoard.tsx
'use client';

import React, { useCallback, useMemo } from 'react';
import { PlacedShip } from '@/hooks/useBattleship';

const GRID_SIZE = 10;
const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

interface GridProps {
    /** Ships placed on this grid (shown only for own grid) */
    ships: PlacedShip[];
    /** Shots received on this grid */
    receivedShots: Set<string>;
    /** Shots that hit (used on enemy grid where ships are hidden) */
    hitShots?: Set<string>;
    /** Show ships (own grid = true, enemy = false unless game over) */
    showShips: boolean;
    /** Whether cells are clickable (enemy grid when it's your turn) */
    onShoot?: (row: number, col: number) => void;
    label: string;
    highlight?: string | null; // "row,col" of last shot
}

function getShipCells(ship: PlacedShip): [number, number][] {
    return Array.from({ length: ship.size }, (_, i) => [
        ship.horizontal ? ship.row : ship.row + i,
        ship.horizontal ? ship.col + i : ship.col,
    ] as [number, number]);
}

function Grid({ ships, receivedShots, hitShots, showShips, onShoot, label, highlight }: GridProps) {
    const shipCellMap = useMemo(() => {
        const map = new Map<string, PlacedShip>();
        ships.forEach((ship) => {
            getShipCells(ship).forEach(([r, c]) => map.set(`${r},${c}`, ship));
        });
        return map;
    }, [ships]);

    const getCellClass = useCallback((row: number, col: number) => {
        const key = `${row},${col}`;
        const isShot = receivedShots.has(key);
        const ship = shipCellMap.get(key);
        const isHit = hitShots?.has(key) ?? false;
        const isHighlight = highlight === key;

        if (isShot && ship) {
            // Hit (ship known — own grid or game over)
            const base = ship.sunk
                ? 'bg-red-600 border-red-400'
                : 'bg-orange-500 border-orange-300';
            return `${base} ${isHighlight ? 'ring-2 ring-white' : ''}`;
        }
        if (isShot && isHit) {
            // Hit (enemy grid during play — ship not yet revealed)
            return `bg-orange-500 border-orange-300 ${isHighlight ? 'ring-2 ring-white' : ''}`;
        }
        if (isShot) {
            // Miss
            return `bg-slate-500 border-slate-400 ${isHighlight ? 'ring-2 ring-slate-200' : ''}`;
        }
        if (showShips && ship) {
            return ship.sunk
                ? 'bg-red-600 border-red-400'
                : 'bg-blue-700 border-blue-500';
        }
        if (onShoot) {
            return 'bg-slate-900 border-slate-700 hover:bg-slate-700 hover:border-slate-500 cursor-crosshair transition-colors';
        }
        return 'bg-slate-900 border-slate-700';
    }, [receivedShots, shipCellMap, showShips, onShoot, highlight]);

    const getCellContent = useCallback((row: number, col: number) => {
        const key = `${row},${col}`;
        const isShot = receivedShots.has(key);
        const ship = shipCellMap.get(key);
        const isHit = hitShots?.has(key) ?? false;

        if (isShot && (ship || isHit)) return <span className="text-white text-xs font-bold">✕</span>;
        if (isShot) return <span className="text-slate-200 text-xs">●</span>;
        return null;
    }, [receivedShots, shipCellMap, hitShots]);

    return (
        <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">{label}</p>
            <div
                className="grid gap-0.5"
                style={{ gridTemplateColumns: `18px repeat(${GRID_SIZE}, 30px)` }}
            >
                <div />
                {COL_LABELS.map((l) => (
                    <div key={l} className="text-center text-xs text-slate-600 font-mono" style={{ lineHeight: '30px' }}>{l}</div>
                ))}
                {Array.from({ length: GRID_SIZE }, (_, ri) => (
                    <React.Fragment key={ri}>
                        <div className="text-right text-xs text-slate-600 font-mono pr-1" style={{ lineHeight: '30px' }}>{ri + 1}</div>
                        {Array.from({ length: GRID_SIZE }, (_, ci) => (
                            <div
                                key={`${ri}-${ci}`}
                                className={`w-[30px] h-[30px] border rounded-sm flex items-center justify-center text-sm ${getCellClass(ri, ci)}`}
                                onClick={() => {
                                    if (!onShoot) return;
                                    const key = `${ri},${ci}`;
                                    if (!receivedShots.has(key)) onShoot(ri, ci);
                                }}
                            >
                                {getCellContent(ri, ci)}
                            </div>
                        ))}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

// ── Ship tracker ──────────────────────────────────────────────────────────────

const SHIPS_CONFIG = [
    { name: 'Porte-avions', size: 5 },
    { name: 'Croiseur', size: 4 },
    { name: 'Destroyer', size: 3 },
    { name: 'Destroyer 2', size: 3 },
    { name: 'Sous-marin', size: 2 },
];

function ShipTracker({ ships, label }: { ships: PlacedShip[]; label: string }) {
    return (
        <div className="space-y-1.5">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
            {SHIPS_CONFIG.map((config) => {
                const ship = ships.find((s) => s.name === config.name);
                const sunk = ship?.sunk ?? false;
                return (
                    <div key={config.name} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sunk ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <span className={`text-xs font-mono ${sunk ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                            {config.name}
                        </span>
                        <div className="flex gap-0.5 ml-auto">
                            {Array.from({ length: config.size }, (_, i) => (
                                <div key={i} className={`w-2.5 h-2.5 rounded-sm border ${sunk ? 'bg-red-700 border-red-600' : 'bg-blue-700 border-blue-600'}`} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface BattleshipBoardProps {
    myShips: PlacedShip[];
    myReceivedShots: Set<string>;
    enemyReceivedShots: Set<string>;
    enemyHitShots: Set<string>;
    enemySunkShips: PlacedShip[];
    isMyTurn: boolean;
    onShoot: (row: number, col: number) => void;
    lastShot?: string | null;
    gameOver?: boolean;
}

export default function BattleshipBoard({
    myShips,
    myReceivedShots,
    enemyReceivedShots,
    enemyHitShots,
    enemySunkShips,
    isMyTurn,
    onShoot,
    lastShot,
    gameOver = false,
}: BattleshipBoardProps) {
    // Sync sunk state onto myShips based on received shots
    const myShipsWithSunk = useMemo(() => {
        return myShips.map((ship) => {
            const cells = getShipCells(ship);
            const sunk = cells.every(([r, c]) => myReceivedShots.has(`${r},${c}`));
            return { ...ship, sunk };
        });
    }, [myShips, myReceivedShots]);

    // Reconstruct enemy ships for display (show all cells on game over, sunk cells otherwise)
    const enemyShipsForDisplay = useMemo(() => {
        if (gameOver) return enemySunkShips;
        // During play, only show sunk ships
        return enemySunkShips.filter((s) => s.sunk);
    }, [enemySunkShips, gameOver]);

    return (
        <div className="flex flex-col gap-6 items-center w-full">
            <div className="flex gap-8 flex-wrap justify-center">
                {/* Enemy grid (clickable when your turn) */}
                <Grid
                    ships={enemyShipsForDisplay}
                    receivedShots={enemyReceivedShots}
                    hitShots={enemyHitShots}
                    showShips={gameOver}
                    onShoot={!gameOver && isMyTurn ? onShoot : undefined}
                    label={isMyTurn ? '🎯 Zone ennemie — À vous de tirer !' : '🌊 Zone ennemie'}
                    highlight={isMyTurn ? undefined : lastShot}
                />

                {/* My grid (always show ships) */}
                <Grid
                    ships={myShipsWithSunk}
                    receivedShots={myReceivedShots}
                    showShips={true}
                    label="🛡️ Votre flotte"
                    highlight={!isMyTurn ? undefined : lastShot}
                />
            </div>

            {/* Ship trackers */}
            <div className="flex gap-8 flex-wrap justify-center w-full max-w-2xl">
                <div className="flex-1 min-w-[160px] bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                    <ShipTracker ships={enemySunkShips} label="Flotte ennemie" />
                </div>
                <div className="flex-1 min-w-[160px] bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                    <ShipTracker ships={myShipsWithSunk} label="Votre flotte" />
                </div>
            </div>
        </div>
    );
}
