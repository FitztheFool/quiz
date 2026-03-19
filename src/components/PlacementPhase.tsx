// src/components/PlacementPhase.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
        if (!placed) return autoPlace(); // retry
    }
    return result;
}

function getShipCells(ship: PlacedShip): [number, number][] {
    return Array.from({ length: ship.size }, (_, i) => [
        ship.horizontal ? ship.row : ship.row + i,
        ship.horizontal ? ship.col + i : ship.col,
    ] as [number, number]);
}

function getPreviewCells(name: string, size: number, row: number, col: number, horizontal: boolean): { cells: [number, number][]; valid: boolean } {
    const cells: [number, number][] = [];
    for (let i = 0; i < size; i++) {
        const r = horizontal ? row : row + i;
        const c = horizontal ? col + i : col;
        cells.push([r, c]);
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

    // Build occupied map (excluding the selected ship)
    const occupiedByOthers = useMemo(() => {
        const map = new Set<string>();
        ships.forEach((ship) => {
            if (ship.name === selected) return;
            getShipCells(ship).forEach(([r, c]) => map.add(`${r},${c}`));
        });
        return map;
    }, [ships, selected]);

    // Cell style helper
    const getCellStyle = useCallback((row: number, col: number) => {
        const key = `${row},${col}`;
        const shipOnCell = ships.find((s) =>
            getShipCells(s).some(([r, c]) => r === row && c === col)
        );

        // Preview
        if (preview) {
            const inPreview = preview.cells.some(([r, c]) => r === row && c === col);
            if (inPreview) {
                return preview.valid ? 'bg-blue-500/60 border-blue-400' : 'bg-red-500/60 border-red-400';
            }
        }

        if (shipOnCell) {
            return shipOnCell.name === selected
                ? 'bg-blue-600 border-blue-400 cursor-grab'
                : 'bg-slate-500 border-slate-400 cursor-pointer';
        }

        return 'bg-slate-900 border-slate-700 hover:bg-slate-800';
    }, [ships, selected, preview]);

    const handleCellClick = useCallback((row: number, col: number) => {
        if (confirmed) return;

        const clickedShip = ships.find((s) =>
            getShipCells(s).some(([r, c]) => r === row && c === col)
        );

        if (selected) {
            // Place the selected ship here
            const ship = ships.find((s) => s.name === selected)!;
            const { cells, valid } = getPreviewCells(ship.name, ship.size, row, col, ship.horizontal);

            // Check no overlap with others
            const noOverlap = cells.every(([r, c]) => {
                // Also check adjacency
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                            const k = `${nr},${nc}`;
                            if (occupiedByOthers.has(k)) return false;
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

        if (clickedShip) {
            setSelected(clickedShip.name);
        }
    }, [confirmed, ships, selected, occupiedByOthers]);

    const handleCellHover = useCallback((row: number, col: number) => {
        if (!selected) return;
        const ship = ships.find((s) => s.name === selected);
        if (!ship) return;
        setPreview(getPreviewCells(ship.name, ship.size, row, col, ship.horizontal));
    }, [selected, ships]);

    const rotateSelected = useCallback(() => {
        if (!selected || confirmed) return;
        setShips((prev) => prev.map((s) => {
            if (s.name !== selected) return s;
            const newHorizontal = !s.horizontal;
            // Clamp position
            const maxRow = newHorizontal ? GRID_SIZE - 1 : GRID_SIZE - s.size;
            const maxCol = newHorizontal ? GRID_SIZE - s.size : GRID_SIZE - 1;
            return {
                ...s,
                horizontal: newHorizontal,
                row: Math.min(s.row, maxRow),
                col: Math.min(s.col, maxCol),
            };
        }));
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

    const timerColor = timeLeft !== null && timeLeft <= 10 ? 'text-red-400' : 'text-slate-400';

    return (
        <div className="flex flex-col items-center gap-6 p-4 select-none">

            {/* Header */}
            <div className="text-center">
                <h2 className="text-xl font-bold text-white">Placez votre flotte</h2>
                <p className="text-slate-400 text-sm mt-1">
                    {confirmed
                        ? opponentReady ? '✅ Les deux joueurs sont prêts !' : '✅ Prêt — en attente de l\'adversaire…'
                        : 'Cliquez sur un navire pour le sélectionner, puis sur la grille pour le placer.'}
                </p>
            </div>

            {/* Timer + status */}
            <div className="flex items-center gap-6 text-sm">
                {timeLeft !== null && (
                    <span className={`font-mono font-bold ${timerColor}`}>
                        ⏱ {timeLeft}s
                    </span>
                )}
                {opponentReady && !confirmed && (
                    <span className="text-green-400 text-xs">⚡ L'adversaire est prêt</span>
                )}
            </div>

            {/* Grid */}
            <div
                className="grid gap-0.5"
                style={{ gridTemplateColumns: `20px repeat(${GRID_SIZE}, 32px)` }}
                onMouseLeave={() => setPreview(null)}
            >
                {/* Column labels */}
                <div />
                {COL_LABELS.map((l) => (
                    <div key={l} className="text-center text-xs text-slate-500 font-mono" style={{ lineHeight: '32px' }}>{l}</div>
                ))}

                {Array.from({ length: GRID_SIZE }, (_, ri) => (
                    <React.Fragment key={ri}>
                        <div className="text-right text-xs text-slate-500 font-mono pr-1" style={{ lineHeight: '32px' }}>{ri + 1}</div>
                        {Array.from({ length: GRID_SIZE }, (_, ci) => (
                            <div
                                key={`${ri}-${ci}`}
                                className={`w-8 h-8 border rounded-sm transition-colors cursor-pointer ${getCellStyle(ri, ci)}`}
                                onClick={() => handleCellClick(ri, ci)}
                                onMouseEnter={() => handleCellHover(ri, ci)}
                            />
                        ))}
                    </React.Fragment>
                ))}
            </div>

            {/* Ship list */}
            <div className="flex flex-wrap gap-2 justify-center">
                {SHIPS_CONFIG.map((config) => {
                    const ship = ships.find((s) => s.name === config.name);
                    const isSelected = selected === config.name;
                    return (
                        <button
                            key={config.name}
                            onClick={() => !confirmed && setSelected(isSelected ? null : config.name)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all
                                ${isSelected
                                    ? 'border-blue-400 bg-blue-500/20 text-blue-300'
                                    : 'border-slate-600 bg-slate-800/60 text-slate-300 hover:border-slate-500'}
                                ${confirmed ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
                        >
                            <span
                                className={`inline-flex gap-0.5`}
                                style={{ direction: ship?.horizontal ? 'ltr' : 'ltr' }}
                            >
                                {Array.from({ length: config.size }, (_, i) => (
                                    <span key={i} className={`w-3 h-3 rounded-sm ${isSelected ? 'bg-blue-400' : 'bg-slate-500'}`} />
                                ))}
                            </span>
                            <span>{config.name}</span>
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
                            className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:border-slate-400 hover:text-white transition-all"
                        >
                            🔄 Pivoter
                        </button>
                    )}
                    <button
                        onClick={handleAutoPlace}
                        className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:border-slate-400 hover:text-white transition-all"
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
