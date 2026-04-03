import { ReactNode } from 'react';

export default function GamePageHeader({ left, center, right }: {
    left: ReactNode;
    center?: ReactNode;
    right?: ReactNode;
}) {
    return (
        <header className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center gap-4">
            <div className="w-48 shrink-0 flex items-center gap-2">
                {left}
            </div>
            <div className="flex-1 flex justify-center items-center gap-2">
                {center}
            </div>
            <div className="w-48 shrink-0 flex justify-end items-center gap-2">
                {right}
            </div>
        </header>
    );
}
