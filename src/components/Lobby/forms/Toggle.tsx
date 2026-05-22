interface Props {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    disabled?: boolean;
}

export default function Toggle({ checked, onChange, label, disabled }: Props) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
            <button type="button" onClick={() => !disabled && onChange(!checked)} disabled={disabled}
                className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
            </button>
        </div>
    );
}
