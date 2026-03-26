// src/components/StatChip.tsx

interface StatChipProps {
    value: string | number;
    label: string;
    className?: string;
}

export default function StatChip({ value, label, className = '' }: StatChipProps) {
    return (
        <div className={`bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3 ${className}`}>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{label}</div>
        </div>
    );
}
