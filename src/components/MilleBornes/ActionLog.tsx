'use client';

import { useEffect, useRef } from 'react';
import type { MBLogEntry, LogTone } from '@/hooks/useMilleBornes';

const TONE_STYLE: Record<LogTone, string> = {
    move: 'text-sky-200',
    attack: 'text-red-300 font-semibold',
    defend: 'text-emerald-200',
    safety: 'text-amber-200 font-semibold',
    coup: 'text-purple-200 font-bold',
    system: 'text-gray-400 italic',
};

export default function ActionLog({ entries }: { entries: MBLogEntry[] }) {
    const endRef = useRef<HTMLDivElement>(null);
    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [entries]);

    return (
        <div className="bg-black/30 backdrop-blur rounded-2xl px-4 py-3 w-full max-w-4xl">
            <p className="text-[10px] uppercase tracking-widest text-gray-300 font-bold mb-1.5">Journal</p>
            <div className="max-h-28 overflow-y-auto space-y-0.5 text-xs leading-snug pr-1">
                {entries.length === 0 && <p className="text-gray-500 italic">La partie commence…</p>}
                {entries.map(e => (
                    <p key={e.id} className={TONE_STYLE[e.tone]}>
                        {e.tone === 'coup' && '⚡ '}{e.text}
                    </p>
                ))}
                <div ref={endRef} />
            </div>
        </div>
    );
}
