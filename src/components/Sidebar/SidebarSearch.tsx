'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useCommandPalette } from '@/context/CommandPaletteContext';

interface Props {
    collapsed: boolean;
}

export default function SidebarSearch({ collapsed }: Props) {
    const { open } = useCommandPalette();

    if (collapsed) {
        return (
            <button
                type="button"
                onClick={open}
                title="Rechercher"
                aria-label="Rechercher"
                className="w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
                <MagnifyingGlassIcon className="w-5 h-5" />
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={open}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-primary-400 dark:hover:border-primary-500 text-left transition-colors"
        >
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="flex-1 text-sm text-gray-500 dark:text-gray-400">Rechercher…</span>
        </button>
    );
}
