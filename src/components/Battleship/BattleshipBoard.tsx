// src/components/Battleship/BattleshipBoard.tsx
'use client';

import React, { useCallback, useMemo } from 'react';
import { PlacedShip } from '@/hooks/useBattleship';

const GRID_SIZE = 10;
const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

const SHIPS_CONFIG = [
    { name: 'Porte-avions', size: 5 },
    { name: 'Croiseur', size: 4 },
    { name: 'Destroyer', size: 3 },
    { name: 'Destroyer 2', size: 3 },
    { name: 'Sous-marin', size: 2 },
];

// ── Ship image helpers ────────────────────────────────────────────────────────

type ShipColor = 'grey' | 'orange' | 'red';
type ShipPart = 'proue' | 'middle' | 'poupe';

function shipImageSrc(part: ShipPart, color: ShipColor): string {
    return `/battleship/${part}-${color}.png`;
}

function getShipPart(index: number, size: number): ShipPart {
    if (index === 0) return 'proue';
    if (index === size - 1) return 'poupe';
    return 'middle';
}

function getShipColor(ship: PlacedShip, cellKey: string, receivedShots: Set<string>): ShipColor {
    if (ship.sunk) return 'red';
    if (receivedShots.has(cellKey)) return 'orange';
    return 'grey';
}

// ── Shared util ───────────────────────────────────────────────────────────────

function getShipCells(ship: PlacedShip): [number, number][] {
    return Array.from({ length: ship.size }, (_, i) => [
        ship.horizontal ? ship.row : ship.row + i,
        ship.horizontal ? ship.col + i : ship.col,
    ] as [number, number]);
}

// ── Grid ──────────────────────────────────────────────────────────────────────

interface GridProps {
    ships: PlacedShip[];
    receivedShots: Set<string>;
    hitShots?: Set<string>;
    showShips: boolean;
    onShoot?: (row: number, col: number) => void;
    label: string;
    highlight?: string | null;
}

function Grid({ ships, receivedShots, hitShots, showShips, onShoot, label, highlight }: GridProps) {
    const shipCellMap = useMemo(() => {
        const map = new Map<string, { ship: PlacedShip; indexInShip: number }>();
        ships.forEach((ship) => {
            getShipCells(ship).forEach(([r, c], idx) => {
                map.set(`${r},${c}`, { ship, indexInShip: idx });
            });
        });
        return map;
    }, [ships]);

    const renderCell = useCallback((row: number, col: number) => {
        const key = `${row},${col}`;
        const isShot = receivedShots.has(key);
        const isHit = hitShots?.has(key) ?? false;
        const entry = shipCellMap.get(key);
        const isHighlight = highlight === key;
        const isClickable = !!onShoot && !receivedShots.has(key);

        let borderBg = 'bg-sky-50 border-sky-300';
        if (isClickable) borderBg = 'bg-sky-50 border-sky-300 hover:bg-blue-100 hover:border-blue-400 cursor-crosshair transition-colors';
        if (isShot && !entry && !isHit) borderBg = 'bg-sky-300/60 border-sky-400'; // raté = eau bleue
        if (isShot && (!!entry || isHit) && !entry?.ship.sunk) borderBg = 'bg-orange-200/60 border-orange-400'; // touché = orange
        if (isHighlight) borderBg += ' ring-2 ring-slate-700';

        let shipImage: React.ReactNode = null;
        if (showShips && entry) {
            const { ship, indexInShip } = entry;
            const color = getShipColor(ship, key, receivedShots);
            const part = getShipPart(indexInShip, ship.size);
            shipImage = (
                <img
                    src={shipImageSrc(part, color)}
                    alt=""
                    draggable={false}
                    className={`absolute inset-0 w-full h-full object-cover pointer-events-none select-none
                        ${!ship.horizontal ? 'rotate-90' : ''}`}
                />
            );
            borderBg = `border-slate-400 ${isHighlight ? 'ring-2 ring-slate-700' : ''}`;
        }

        let shotOverlay: React.ReactNode = null;
        if (isShot) {
            const isActualHit = (showShips && !!entry) || isHit;
            shotOverlay = isActualHit
                ? <span className="relative z-10 text-slate-700 text-xs font-bold drop-shadow-md">✕</span>
                : <span className="relative z-10 text-sky-600 text-xs drop-shadow">●</span>;
        }

        return (
            <div
                key={key}
                className={`w-[30px] h-[30px] border rounded-sm relative flex items-center justify-center text-sm overflow-hidden ${borderBg}`}
                onClick={() => {
                    if (!onShoot || receivedShots.has(key)) return;
                    onShoot(row, col);
                }}
            >
                {shipImage}
                {shotOverlay}
            </div>
        );
    }, [receivedShots, shipCellMap, showShips, onShoot, highlight, hitShots]);

    return (
        <div className="flex flex-col gap-2 items-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">{label}</p>
            <div
                className="grid gap-0.5"
                style={{ gridTemplateColumns: `20px repeat(${GRID_SIZE}, 30px)` }}
            >
                <div />
                {COL_LABELS.map((l) => (
                    <div key={l} className="text-center text-xs text-slate-400 font-mono" style={{ lineHeight: '30px' }}>{l}</div>
                ))}
                {Array.from({ length: GRID_SIZE }, (_, ri) => (
                    <React.Fragment key={ri}>
                        <div className="text-right text-xs text-slate-400 font-mono pr-1" style={{ lineHeight: '30px' }}>{ri + 1}</div>
                        {Array.from({ length: GRID_SIZE }, (_, ci) => renderCell(ri, ci))}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

// ── Ship tracker ──────────────────────────────────────────────────────────────

function ShipTracker({ ships, label }: { ships: PlacedShip[]; label: string }) {
    return (
        <div className="space-y-1.5">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{label}</p>
            {SHIPS_CONFIG.map((config) => {
                const ship = ships.find((s) => s.name === config.name);
                const sunk = ship?.sunk ?? false;
                return (
                    <div key={config.name} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sunk ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <span className={`text-xs font-mono ${sunk ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                            {config.name}
                        </span>
                        <div className="flex gap-0 ml-auto">
                            {Array.from({ length: config.size }, (_, i) => (
                                <img
                                    key={i}
                                    src={shipImageSrc(getShipPart(i, config.size), sunk ? 'red' : 'grey')}
                                    alt=""
                                    className="w-4 h-4 object-cover"
                                    draggable={false}
                                />
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
    const myShipsWithSunk = useMemo(() => {
        return myShips.map((ship) => {
            const cells = getShipCells(ship);
            const sunk = cells.every(([r, c]) => myReceivedShots.has(`${r},${c}`));
            return { ...ship, sunk };
        });
    }, [myShips, myReceivedShots]);

    const enemyShipsForDisplay = useMemo(() => {
        if (gameOver) return enemySunkShips;
        return enemySunkShips.filter((s) => s.sunk);
    }, [enemySunkShips, gameOver]);

    return (
        <div className="flex flex-col gap-6 items-center w-full">
            <div className="flex gap-8 flex-wrap justify-center items-start w-full max-w-5xl mx-auto">
                <Grid
                    ships={enemyShipsForDisplay}
                    receivedShots={enemyReceivedShots}
                    hitShots={enemyHitShots}
                    showShips={true}
                    onShoot={!gameOver && isMyTurn ? onShoot : undefined}
                    label={isMyTurn ? '🎯 Zone ennemie — À vous de tirer !' : '🌊 Zone ennemie'}
                    highlight={isMyTurn ? undefined : lastShot}
                />
                <Grid
                    ships={myShipsWithSunk}
                    receivedShots={myReceivedShots}
                    showShips={true}
                    label="🛡️ Votre flotte"
                    highlight={!isMyTurn ? undefined : lastShot}
                />
            </div>

            <div className="flex gap-8 flex-wrap justify-center w-full max-w-2xl">
                <div className="flex-1 min-w-[160px] bg-white border border-slate-200 rounded-xl p-4">
                    <ShipTracker ships={enemySunkShips} label="Flotte ennemie" />
                </div>
                <div className="flex-1 min-w-[160px] bg-white border border-slate-200 rounded-xl p-4">
                    <ShipTracker ships={myShipsWithSunk} label="Votre flotte" />
                </div>
            </div>
        </div>
    );
}
