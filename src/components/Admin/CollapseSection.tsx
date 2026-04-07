'use client';

import { useState } from 'react';

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
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {title}
                </h2>
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 transition-transform duration-200 text-[10px] group-hover:bg-gray-300 dark:group-hover:bg-gray-600 ${open ? 'rotate-0' : '-rotate-90'}`}>
                    ▾
                </span>
            </button>
            {open && children}
        </div>
    );
}
