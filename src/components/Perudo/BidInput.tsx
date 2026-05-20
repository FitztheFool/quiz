'use client';

import { useState, useEffect } from 'react';
import Die from './Die';
import { MinusIcon, PlusIcon, ChatBubbleBottomCenterTextIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Bid { count: number; face: number; userId?: string }

interface Props {
    lastBid: Bid | null;
    pacosWild: boolean;
    totalDice: number;
    disabled?: boolean;
    onBid: (count: number, face: number) => void;
    onDudo: () => void;
    canDudo: boolean;
}

function isBidValid(prev: Bid | null, next: Bid, pacosWild: boolean): boolean {
    if (next.count < 1) return false;
    if (next.face < 1 || next.face > 6) return false;
    if (!prev) return true;
    if (!pacosWild) {
        if (next.face === prev.face) return next.count > prev.count;
        if (next.face > prev.face) return next.count >= prev.count;
        return false;
    }
    if (prev.face !== 1 && next.face !== 1) {
        if (next.face === prev.face) return next.count > prev.count;
        if (next.face > prev.face) return next.count >= prev.count;
        return false;
    }
    if (prev.face !== 1 && next.face === 1) {
        return next.count >= Math.ceil(prev.count / 2);
    }
    if (prev.face === 1 && next.face === 1) {
        return next.count > prev.count;
    }
    return next.count >= 2 * prev.count + 1;
}

function minimalValidBid(prev: Bid | null, pacosWild: boolean): { count: number; face: number } {
    if (!prev) return { count: 1, face: 2 };
    // Same face, +1
    if (isBidValid(prev, { userId: '', count: prev.count + 1, face: prev.face }, pacosWild)) {
        return { count: prev.count + 1, face: prev.face };
    }
    // Otherwise pick the first valid combination.
    for (let f = 1; f <= 6; f++) {
        for (let c = 1; c <= 30; c++) {
            if (isBidValid(prev, { userId: '', count: c, face: f }, pacosWild)) {
                return { count: c, face: f };
            }
        }
    }
    return { count: prev.count + 1, face: prev.face };
}

export default function BidInput({ lastBid, pacosWild, totalDice, disabled, onBid, onDudo, canDudo }: Props) {
    const initial = minimalValidBid(lastBid, pacosWild);
    const [count, setCount] = useState<number>(initial.count);
    const [face, setFace] = useState<number>(initial.face);

    // Reset to minimal valid bid whenever lastBid changes.
    useEffect(() => {
        const m = minimalValidBid(lastBid, pacosWild);
        setCount(m.count);
        setFace(m.face);
    }, [lastBid, pacosWild]);

    const valid = isBidValid(lastBid, { userId: '', count, face }, pacosWild);
    const overTotal = count > totalDice;

    return (
        <div className="flex flex-col items-stretch gap-3 w-full max-w-md">
            <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 shadow-sm">
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setCount(c => Math.max(1, c - 1))}
                        disabled={disabled || count <= 1}
                        className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center"
                        aria-label="Diminuer le nombre"
                    >
                        <MinusIcon className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-mono text-xl font-bold text-gray-900 dark:text-white tabular-nums">{count}</span>
                    <button
                        type="button"
                        onClick={() => setCount(c => Math.min(99, c + 1))}
                        disabled={disabled}
                        className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center"
                        aria-label="Augmenter le nombre"
                    >
                        <PlusIcon className="w-4 h-4" />
                    </button>
                </div>
                <span className="text-gray-400 dark:text-gray-500 text-sm">×</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                    {[1, 2, 3, 4, 5, 6].map(f => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => setFace(f)}
                            disabled={disabled}
                            className={`rounded-lg transition-all
                                ${face === f
                                    ? 'ring-2 ring-blue-500 dark:ring-blue-400'
                                    : 'hover:opacity-80'}
                                ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                            aria-label={`Face ${f}`}
                        >
                            <Die value={f} size={36} highlighted={face === f && f === 1 && pacosWild} />
                        </button>
                    ))}
                </div>
            </div>

            {face === 1 && pacosWild && (
                <p className="text-xs text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                    <ExclamationTriangleIcon className="inline-block w-3.5 h-3.5" />
                    Bid sur les 1 : les Pacos ne seront plus wild pour le reste du round.
                </p>
            )}
            {overTotal && (
                <p className="text-xs text-red-500 dark:text-red-400">
                    Annonce supérieure au total de dés en jeu ({totalDice}).
                </p>
            )}
            {!valid && !overTotal && lastBid && (
                <p className="text-xs text-red-500 dark:text-red-400">
                    Doit dépasser l'annonce précédente.
                </p>
            )}

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => onBid(count, face)}
                    disabled={disabled || !valid}
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                >
                    <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
                    Annoncer
                </button>
                <button
                    type="button"
                    onClick={onDudo}
                    disabled={disabled || !canDudo}
                    className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all shadow-lg shadow-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                >
                    Mentir ! (Dudo)
                </button>
            </div>
        </div>
    );
}
