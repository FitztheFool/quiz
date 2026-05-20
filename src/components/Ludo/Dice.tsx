'use client';

import { useEffect, useRef, useState } from 'react';
import Die from '@/components/Dice/Die';

interface DiceProps {
    value: number | null;
    canRoll: boolean;
    isRolling?: boolean;
    onRoll: () => void;
    label?: string;
}

export default function Dice({ value, canRoll, isRolling, onRoll, label }: DiceProps) {
    const [localRolling, setLocalRolling] = useState(false);
    const prevRef = useRef<number | null>(value);

    useEffect(() => {
        if (prevRef.current !== value && value != null) {
            setLocalRolling(true);
            const t = setTimeout(() => setLocalRolling(false), 450);
            prevRef.current = value;
            return () => clearTimeout(t);
        }
        prevRef.current = value;
    }, [value]);

    const handleRoll = () => {
        setLocalRolling(true);
        setTimeout(() => setLocalRolling(false), 700);
        onRoll();
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <Die
                value={value}
                size={80}
                rolling={!!isRolling || localRolling}
                pulseHint={canRoll && !localRolling}
                onClick={canRoll ? handleRoll : undefined}
                disabled={!canRoll}
                title={canRoll ? 'Lancer le dé' : 'Dé'}
            />
            {label && <span className="text-xs text-amber-100 font-semibold drop-shadow">{label}</span>}
        </div>
    );
}
