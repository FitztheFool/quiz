import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Feedback } from '@/hooks/useQuizPlayer';

interface Props {
    feedback: Feedback;
}

export default function FeedbackBanner({ feedback }: Props) {
    return (
        <div className={`mx-4 mb-4 flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold text-sm border
            ${feedback.isCorrect
                ? 'bg-green-50 dark:bg-green-900/25 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/25 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
            }`}>
            <span className="shrink-0">{feedback.isCorrect ? <CheckIcon className="w-5 h-5" /> : <XMarkIcon className="w-5 h-5" />}</span>
            <span>{feedback.isCorrect ? 'Bonne réponse !' : 'Mauvaise réponse'}</span>
        </div>
    );
}
