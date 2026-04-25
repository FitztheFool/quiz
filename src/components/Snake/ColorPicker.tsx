import { COLORS } from '@/lib/snake/constants';

export function ColorPicker({ value, onChange }: { value: number; onChange: (i: number) => void }) {
    return (
        <div className="flex items-center gap-2.5">
            <span className="text-xs text-gray-400 dark:text-gray-500">Ver :</span>
            {COLORS.map((c, i) => (
                <button
                    key={i}
                    onClick={() => onChange(i)}
                    style={{ background: c.body }}
                    className={`w-5 h-5 rounded-full transition-all ${i === value
                        ? 'scale-125 ring-2 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-950 ring-gray-400 dark:ring-gray-500'
                        : 'opacity-50 hover:opacity-90 hover:scale-110'}`}
                />
            ))}
        </div>
    );
}
