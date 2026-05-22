import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Props {
    label: string;
    text: string;
    isSelected: boolean;
    showCorrect: boolean;
    showWrong: boolean;
    disabled: boolean;
    onClick: () => void;
}

export default function AnswerOption({ label, text, isSelected, showCorrect, showWrong, disabled, onClick }: Props) {
    const rowCls = showCorrect
        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
        : showWrong
            ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            : isSelected
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                : 'border-amber-700/30 bg-amber-900/20 text-amber-900 dark:text-amber-100 hover:border-amber-700/60 hover:bg-amber-900/30 cursor-pointer';

    const badgeCls = showCorrect
        ? 'bg-green-500 text-white'
        : showWrong
            ? 'bg-red-400 text-white'
            : isSelected
                ? 'bg-blue-500 text-white'
                : 'bg-amber-900/30 text-amber-900 dark:text-amber-100';

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 font-medium transition-all duration-150 select-none ${rowCls}`}
        >
            <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${badgeCls}`}>
                {showCorrect ? <CheckIcon className="w-4 h-4" /> : showWrong ? <XMarkIcon className="w-4 h-4" /> : label}
            </span>
            <span>{text}</span>
        </button>
    );
}
