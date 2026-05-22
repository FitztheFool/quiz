import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { normalizeAnswer } from '@/lib/utils';
import type { Feedback } from '@/hooks/useQuizPlayer';

interface Props {
    values: string[];
    count: number;
    onChange: (index: number, value: string) => void;
    disabled: boolean;
    feedback: Feedback | null;
    showFeedback: boolean;
}

export default function MultiTextInput({ values, count, onChange, disabled, feedback, showFeedback }: Props) {
    const correctParts = feedback?.correctAnswerText?.split(', ') ?? [];

    return (
        <div className="flex flex-col gap-2">
            {Array.from({ length: count }).map((_, i) => {
                const userVal = values[i] ?? '';
                const matchIndex = showFeedback
                    ? correctParts.findIndex(c => normalizeAnswer(c) === normalizeAnswer(userVal))
                    : -1;
                const isFieldCorrect = showFeedback && matchIndex >= 0;
                const isFieldWrong = showFeedback && matchIndex < 0 && userVal.length > 0;

                return (
                    <div key={i} className="flex items-center gap-2">
                        <span className={`shrink-0 w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center
                            ${isFieldCorrect ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                : isFieldWrong ? 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                            {isFieldCorrect ? <CheckIcon className="w-4 h-4" /> : isFieldWrong ? <XMarkIcon className="w-4 h-4" /> : i + 1}
                        </span>
                        <input
                            type="text"
                            value={userVal}
                            onChange={e => onChange(i, e.target.value)}
                            disabled={disabled}
                            placeholder={`Réponse ${i + 1}…`}
                            className={`flex-1 px-4 py-3 rounded-xl border-2 text-amber-950 dark:text-amber-100 placeholder-amber-700/50 dark:placeholder-amber-200/40 focus:outline-none transition-colors disabled:opacity-60
                                ${isFieldCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                    : isFieldWrong ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                                        : 'border-amber-700/30 bg-amber-900/20 focus:border-amber-700/70 focus:bg-amber-900/30'}`}
                        />
                    </div>
                );
            })}
            {showFeedback && !feedback?.isCorrect && feedback?.correctAnswerText && (
                <p className="text-sm text-green-600 dark:text-green-400 px-1">
                    Bonne(s) réponse(s) : <strong>{feedback.correctAnswerText}</strong>
                </p>
            )}
        </div>
    );
}
