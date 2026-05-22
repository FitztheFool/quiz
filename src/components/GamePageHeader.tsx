import { ReactNode } from 'react';

export default function GamePageHeader({ left, center, right }: {
    left: ReactNode;
    center?: ReactNode;
    right?: ReactNode;
}) {
    return (
        <header className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-3 sm:px-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                {left}
            </div>
            <div className="flex justify-center items-center gap-2">
                {center}
            </div>
            <div className="flex justify-end items-center gap-2 min-w-0 overflow-hidden">
                {right}
            </div>
        </header>
    );
}
