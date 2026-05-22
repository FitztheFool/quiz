import type { Feedback } from '@/hooks/useQuizPlayer';

interface Props {
    value: string;
    onChange: (v: string) => void;
    disabled: boolean;
    feedback: Feedback | null;
    showFeedback: boolean;
}

export default function TextInput({ value, onChange, disabled, feedback, showFeedback }: Props) {
    return (
        <div className="flex flex-col gap-2">
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                disabled={disabled}
                placeholder="Votre réponse..."
                className={`w-full px-4 py-3.5 rounded-xl border-2 text-amber-950 dark:text-amber-100 placeholder-amber-700/50 dark:placeholder-amber-200/40 focus:outline-none transition-colors disabled:opacity-60
                    ${showFeedback
                        ? feedback?.isCorrect
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-red-400 bg-red-50 dark:bg-red-900/20'
                        : 'border-amber-700/30 bg-amber-900/20 focus:border-amber-700/70 focus:bg-amber-900/30'
                    }`}
            />
            {showFeedback && !feedback?.isCorrect && feedback?.correctAnswerText && (
                <p className="text-sm text-green-600 dark:text-green-400 px-1">
                    Bonne réponse : <strong>{feedback.correctAnswerText}</strong>
                </p>
            )}
        </div>
    );
}
