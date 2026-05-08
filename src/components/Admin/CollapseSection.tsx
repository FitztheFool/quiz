'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface Props {
    title: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

export default function CollapseSection({ title, defaultOpen = true, children }: Props) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div>
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center justify-between w-full text-left mb-3 group"
            >
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                    {title}
                </span>
                <ChevronDownIcon className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`} />
            </button>
            {open && children}
        </div>
    );
}
