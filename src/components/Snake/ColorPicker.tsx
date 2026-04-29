'use client';

import { useTheme } from 'next-themes';
import { COLORS } from '@/lib/snake/constants';

export function ColorPicker({ value, onChange }: { value: number; onChange: (i: number) => void }) {
    const { resolvedTheme } = useTheme();
    const ringBg = resolvedTheme === 'dark' ? '#07070f' : '#f9fafb';

    return (
        <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-400 dark:text-white/30 uppercase tracking-widest">Serpent</span>
            <div className="flex items-center gap-2">
                {COLORS.map((c, i) => (
                    <button
                        key={i}
                        onClick={() => onChange(i)}
                        style={{
                            background: c.body,
                            boxShadow: i === value
                                ? `0 0 0 2px ${ringBg}, 0 0 0 4px ${c.body}, 0 0 12px ${c.glow}`
                                : 'none',
                        }}
                        className={`w-5 h-5 rounded-full transition-all duration-150 ${
                            i === value ? 'scale-125' : 'opacity-35 hover:opacity-75 hover:scale-110'
                        }`}
                    />
                ))}
            </div>
        </div>
    );
}
