interface Props {
    value: number | string;
    onChange: (v: string) => void;
    options: { v: string | number; label: string }[];
    disabled?: boolean;
}

export default function OptionSelect({ value, onChange, options, disabled }: Props) {
    return (
        <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
            className="font-sans bg-gray-100 dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600/50 rounded-lg px-3 py-1.5 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/60 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            {options.map(o => <option key={o.v} value={o.v} className="bg-white dark:bg-gray-800">{o.label}</option>)}
        </select>
    );
}
