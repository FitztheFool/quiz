import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

interface Props {
    value: number;
    onChange: (v: number) => void;
}

export default function AdminDebugControl({ value, onChange }: Props) {
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-mono">
            <span className="opacity-60"><WrenchScrewdriverIcon className="inline-block w-3.5 h-3.5 align-text-bottom mr-1" />Niveau</span>
            <button onClick={() => onChange(Math.max(1, value - 1))} className="w-5 h-5 rounded hover:bg-orange-500/20 font-bold">−</button>
            <span className="w-5 text-center font-bold">{value}</span>
            <button onClick={() => onChange(value + 1)} className="w-5 h-5 rounded hover:bg-orange-500/20 font-bold">+</button>
        </div>
    );
}
