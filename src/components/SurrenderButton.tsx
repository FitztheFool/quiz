'use client';
// src/components/SurrenderButton.tsx
import { useRouter } from 'next/navigation';
import { FlagIcon } from '@heroicons/react/24/outline';

export default function SurrenderButton({ onSurrender, disabled }: {
    onSurrender: () => void;
    disabled?: boolean;
}) {
    const router = useRouter();
    return (
        <button
            onClick={() => {
                if (!disabled && confirm('Abandonner la partie ?')) {
                    onSurrender();
                    router.push('/');
                }
            }}
            disabled={disabled}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all border ${
                disabled
                    ? 'text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                    : 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border-red-300 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600'
            }`}
        >
            <FlagIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">Abandonner</span>
        </button>
    );
}
