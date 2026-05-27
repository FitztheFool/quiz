import type React from 'react';

interface Props {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    color: string;
    align?: 'left' | 'center' | 'right';
}

export default function StatCell({ icon, label, value, color, align = 'center' }: Props) {
    const alignClass = align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center';
    const padClass = align === 'center' ? 'px-2' : 'px-5';
    return (
        <div className={`flex flex-col ${alignClass} ${padClass} py-3 bg-white dark:bg-[#07070f]`}>
            <div className="flex items-center gap-1 text-[9px] text-gray-400 dark:text-white/30 uppercase tracking-widest mb-1.5">
                <span>{icon}</span>
                <span>{label}</span>
            </div>
            <div className={`text-xl font-black tabular-nums ${color}`}>{value}</div>
        </div>
    );
}
