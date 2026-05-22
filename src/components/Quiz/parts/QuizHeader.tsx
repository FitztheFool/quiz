import { DocumentTextIcon } from '@heroicons/react/24/outline';

interface Props {
    title: string;
    progress: number;
    currentIndex: number;
    total: number;
    points: number;
}

export default function QuizHeader({ title, progress, currentIndex, total, points }: Props) {
    return (
        <header className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 sm:px-4 flex items-center gap-2 sm:gap-4">
            <div className="shrink-0 flex items-center gap-2 min-w-0">
                <DocumentTextIcon className="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
                <span className="hidden sm:block font-semibold truncate text-gray-900 dark:text-white text-sm max-w-[120px] lg:max-w-xs">{title}</span>
            </div>
            <div className="flex-1 flex flex-col justify-center items-center gap-1">
                <div className="w-full max-w-xs bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                    {currentIndex + 1} / {total}
                </span>
            </div>
            <div className="shrink-0 flex justify-end">
                <span className="text-xs font-bold bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 px-2 sm:px-3 py-1.5 rounded-full whitespace-nowrap">
                    {points} pt{points > 1 ? 's' : ''}
                </span>
            </div>
        </header>
    );
}
