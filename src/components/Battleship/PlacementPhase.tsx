// src/components/Battleship/PlacementPhase.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PlacedShip } from '@/hooks/useBattleship';

// ── Constants ─────────────────────────────────────────────────────────────────

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

type ShipPart = 'proue' | 'middle' | 'poupe';

function shipImageSrc(part: ShipPart, color: 'grey' | 'orange'): string {
    return `/battleship/${part}-${color}.png`;
}

function getShipPart(index: number, size: number): ShipPart {
    if (index === 0) return 'proue';
    if (index === size - 1) return 'poupe';
    return 'middle';
}

// ── Auto-place ────────────────────────────────────────────────────────────────

function autoPlace(): PlacedShip[] {
    const occupied = new Set<string>();
    const result: PlacedShip[] = [];

    for (const config of SHIPS_CONFIG) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 500) {
            attempts++;
            const horizontal = Math.random() > 0.5;
            const maxRow = horizontal ? GRID_SIZE - 1 : GRID_SIZE - config.size;
            const maxCol = horizontal ? GRID_SIZE - config.size : GRID_SIZE - 1;
            const row = Math.floor(Math.random() * (maxRow + 1));
            const col = Math.floor(Math.random() * (maxCol + 1));

            const cells: [number, number][] = [];
            for (let i = 0; i < config.size; i++) {
                cells.push([horizontal ? row : row + i, horizontal ? col + i : col]);
            }

            let ok = true;
            for (const [r, c] of cells) {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && occupied.has(`${nr},${nc}`)) {
                            ok = false;
                        }
                    }
                }
            }

            if (ok) {
                cells.forEach(([r, c]) => occupied.add(`${r},${c}`));
                result.push({ name: config.name, size: config.size, row, col, horizontal, sunk: false });
                placed = true;
            }
        }
        if (!placed) return autoPlace();
    }
    return result;
}

function getShipCells(ship: PlacedShip): [number, number][] {
    return Array.from({ length: ship.size }, (_, i) => [
        ship.horizontal ? ship.row : ship.row + i,
        ship.horizontal ? ship.col + i : ship.col,
    ] as [number, number]);
}

function getPreviewCells(
    size: number,
    row: number,
    col: number,
    horizontal: boolean
): { cells: [number, number][]; valid: boolean } {
    const cells: [number, number][] = [];
    for (let i = 0; i < size; i++) {
        cells.push([horizontal ? row : row + i, horizontal ? col + i : col]);
    }
    const valid = cells.every(([r, c]) => r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE);
    return { cells, valid };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
    onConfirm: (ships: PlacedShip[]) => void;
    placementEndsAt: number | null;
    opponentReady: boolean;
    alreadyConfirmed: boolean;
}

export default function PlacementPhase({ onConfirm, placementEndsAt, opponentReady, alreadyConfirmed }: Props) {
    const [ships, setShips] = useState<PlacedShip[]>(() => autoPlace());
    const [selected, setSelected] = useState<string | null>(null);
    const [preview, setPreview] = useState<{ cells: [number, number][]; valid: boolean } | null>(null);
    const [confirmed, setConfirmed] = useState(alreadyConfirmed);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    // Timer
    useEffect(() => {
        if (!placementEndsAt) return;
        const tick = () => {
            const remaining = Math.max(0, Math.ceil((placementEndsAt - Date.now()) / 1000));
            setTimeLeft(remaining);
        };
        tick();
        const id = setInterval(tick, 500);
        return () => clearInterval(id);
    }, [placementEndsAt]);

    const occupiedByOthers = useMemo(() => {
        const map = new Set<string>();
        ships.forEach((ship) => {
            if (ship.name === selected) return;
            getShipCells(ship).forEach(([r, c]) => map.add(`${r},${c}`));
        });
        return map;
    }, [ships, selected]);

    const shipCellMap = useMemo(() => {
        const map = new Map<string, { ship: PlacedShip; indexInShip: number }>();
        ships.forEach((ship) => {
            getShipCells(ship).forEach(([r, c], idx) => {
                map.set(`${r},${c}`, { ship, indexInShip: idx });
            });
        });
        return map;
    }, [ships]);

    const previewSet = useMemo(() => {
        if (!preview) return new Set<string>();
        return new Set(preview.cells.map(([r, c]) => `${r},${c}`));
    }, [preview]);

    // ── Render a single cell ─────────────────────────────────────────────────

    const renderCell = useCallback((row: number, col: number) => {
        const key = `${row},${col}`;
        const entry = shipCellMap.get(key);
        const isSelected = entry?.ship.name === selected;
        const isInPreview = previewSet.has(key);

        // Preview overlay
        if (isInPreview && selected) {
            const selectedShip = ships.find((s) => s.name === selected)!;
            const idxInPreview = preview!.cells.findIndex(([r, c]) => r === row && c === col);
            const part = getShipPart(idxInPreview, selectedShip.size);
            const valid = preview!.valid;
            return (
                <div
                    key={key}
                    className={`w-8 h-8 border rounded-sm relative overflow-hidden cursor-pointer
                        ${valid ? 'border-blue-400 opacity-80' : 'border-red-400 opacity-60'}`}
                    onClick={() => handleCellClick(row, col)}
                    onMouseEnter={() => handleCellHover(row, col)}
                >
                    <img
                        src={shipImageSrc(part, valid ? 'grey' : 'orange')}
                        alt=""
                        draggable={false}
                        className={`absolute inset-0 w-full h-full object-cover pointer-events-none
                            ${!selectedShip.horizontal ? 'rotate-90' : ''}`}
                    />
                </div>
            );
        }

        // Ship cell
        if (entry) {
            const { ship, indexInShip } = entry;
            const part = getShipPart(indexInShip, ship.size);
            return (
                <div
                    key={key}
                    className={`w-8 h-8 border rounded-sm relative overflow-hidden transition-all
                        ${isSelected
                            ? 'border-blue-400 ring-1 ring-blue-400/60 cursor-grab'
                            : 'border-slate-400 hover:border-slate-500 cursor-pointer'}
                        ${confirmed ? 'cursor-default' : ''}`}
                    onClick={() => handleCellClick(row, col)}
                    onMouseEnter={() => handleCellHover(row, col)}
                >
                    <img
                        src={shipImageSrc(part, isSelected ? 'orange' : 'grey')}
                        alt=""
                        draggable={false}
                        className={`absolute inset-0 w-full h-full object-cover pointer-events-none
                            ${!ship.horizontal ? 'rotate-90' : ''}`}
                    />
                </div>
            );
        }

        // Empty cell
        return (
            <div
                key={key}
                className="w-8 h-8 border rounded-sm bg-sky-50 border-sky-300 hover:bg-sky-100 cursor-pointer transition-colors"
                onClick={() => handleCellClick(row, col)}
                onMouseEnter={() => handleCellHover(row, col)}
            />
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shipCellMap, selected, previewSet, preview, ships, confirmed]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleCellClick = useCallback((row: number, col: number) => {
        if (confirmed) return;
        const key = `${row},${col}`;
        const entry = shipCellMap.get(key);

        if (selected) {
            const ship = ships.find((s) => s.name === selected)!;
            const { cells, valid } = getPreviewCells(ship.size, row, col, ship.horizontal);

            const noOverlap = cells.every(([r, c]) => {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                            if (occupiedByOthers.has(`${nr},${nc}`)) return false;
                        }
                    }
                }
                return true;
            });

            if (valid && noOverlap) {
                setShips((prev) => prev.map((s) => s.name === selected ? { ...s, row, col } : s));
                setSelected(null);
                setPreview(null);
            }
            return;
        }

        if (entry) {
            setSelected(entry.ship.name);
        }
    }, [confirmed, ships, selected, occupiedByOthers, shipCellMap]);

    const handleCellHover = useCallback((row: number, col: number) => {
        if (!selected) return;
        const ship = ships.find((s) => s.name === selected);
        if (!ship) return;
        setPreview(getPreviewCells(ship.size, row, col, ship.horizontal));
    }, [selected, ships]);

    const rotateSelected = useCallback(() => {
        if (!selected || confirmed) return;
        setShips((prev) => prev.map((s) => {
            if (s.name !== selected) return s;
            const newH = !s.horizontal;
            return {
                ...s,
                horizontal: newH,
                row: Math.min(s.row, newH ? GRID_SIZE - 1 : GRID_SIZE - s.size),
                col: Math.min(s.col, newH ? GRID_SIZE - s.size : GRID_SIZE - 1),
            };
        }));
        setPreview(null);
    }, [selected, confirmed]);

    const handleAutoPlace = useCallback(() => {
        if (confirmed) return;
        setShips(autoPlace());
        setSelected(null);
        setPreview(null);
    }, [confirmed]);

    const handleConfirm = useCallback(() => {
        if (confirmed) return;
        setConfirmed(true);
        onConfirm(ships);
    }, [confirmed, ships, onConfirm]);

    const timerColor = timeLeft !== null && timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-slate-500';

    return (
        <div className="flex flex-col items-center gap-6 p-4 select-none">

            {/* Header */}
            <div className="text-center">
                <h2 className="text-xl font-bold text-slate-900">Placez votre flotte</h2>
                <p className="text-slate-500 text-sm mt-1">
                    {confirmed
                        ? opponentReady ? '✅ Les deux joueurs sont prêts !' : '✅ Prêt — en attente de l\'adversaire…'
                        : selected
                            ? `Cliquez sur la grille pour placer ${selected}`
                            : 'Cliquez sur un navire pour le sélectionner, puis sur la grille pour le placer.'}
                </p>
            </div>

            {/* Timer + status */}
            <div className="flex items-center gap-6 text-sm">
                {timeLeft !== null && (
                    <span className={`font-mono font-bold ${timerColor}`}>⏱ {timeLeft}s</span>
                )}
                {opponentReady && !confirmed && (
                    <span className="text-green-600 text-xs">⚡ L'adversaire est prêt</span>
                )}
            </div>

            {/* Grid */}
            <div
                className="grid gap-0.5"
                style={{ gridTemplateColumns: `20px repeat(${GRID_SIZE}, 32px)` }}
                onMouseLeave={() => setPreview(null)}
            >
                <div />
                {COL_LABELS.map((l) => (
                    <div key={l} className="text-center text-xs text-slate-400 font-mono" style={{ lineHeight: '32px' }}>{l}</div>
                ))}
                {Array.from({ length: GRID_SIZE }, (_, ri) => (
                    <React.Fragment key={ri}>
                        <div className="text-right text-xs text-slate-400 font-mono pr-1" style={{ lineHeight: '32px' }}>{ri + 1}</div>
                        {Array.from({ length: GRID_SIZE }, (_, ci) => renderCell(ri, ci))}
                    </React.Fragment>
                ))}
            </div>

            {/* Ship list */}
            <div className="flex flex-wrap gap-2 justify-center">
                {SHIPS_CONFIG.map((config) => {
                    const ship = ships.find((s) => s.name === config.name)!;
                    const isSelected = selected === config.name;
                    return (
                        <button
                            key={config.name}
                            onClick={() => !confirmed && setSelected(isSelected ? null : config.name)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all
                                ${isSelected
                                    ? 'border-blue-500 bg-blue-100 text-blue-700'
                                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'}
                                ${confirmed ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
                        >
                            {/* Mini ship strip (toujours horizontal dans la liste) */}
                            <div className="flex gap-0">
                                {Array.from({ length: config.size }, (_, i) => (
                                    <img
                                        key={i}
                                        src={shipImageSrc(getShipPart(i, config.size), isSelected ? 'orange' : 'grey')}
                                        alt=""
                                        draggable={false}
                                        className="w-4 h-4 object-cover"
                                    />
                                ))}
                            </div>
                            <span>{config.name}</span>
                            {ship && (
                                <span className="text-slate-400 text-[10px]">
                                    {ship.horizontal ? '↔' : '↕'}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Actions */}
            {!confirmed && (
                <div className="flex gap-3">
                    {selected && (
                        <button
                            onClick={rotateSelected}
                            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm hover:border-slate-400 hover:text-slate-900 transition-all"
                        >
                            🔄 Pivoter
                        </button>
                    )}
                    <button
                        onClick={handleAutoPlace}
                        className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm hover:border-slate-400 hover:text-slate-900 transition-all"
                    >
                        🎲 Placement auto
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-500/20"
                    >
                        ✅ Confirmer
                    </button>
                </div>
            )}
        </div>
    );
}
