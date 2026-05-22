import type { ReactNode } from 'react';

interface Props {
    label: string;
    children: ReactNode;
}

export default function OptionRow({ label, children }: Props) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
            <div className="flex-shrink-0">{children}</div>
        </div>
    );
}
