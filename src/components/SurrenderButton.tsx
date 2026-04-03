export default function SurrenderButton({ onSurrender, disabled }: {
    onSurrender: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={() => { if (!disabled && confirm('Abandonner la partie ?')) onSurrender(); }}
            disabled={disabled}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all border ${
                disabled
                    ? 'text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                    : 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border-red-300 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600'
            }`}
        >
            🏳️ Abandonner
        </button>
    );
}
