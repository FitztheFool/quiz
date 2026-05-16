'use client';
// src/components/SurrenderButton.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FlagIcon } from '@heroicons/react/24/outline';

export default function SurrenderButton({ onSurrender, disabled }: {
    onSurrender: () => void;
    disabled?: boolean;
}) {
    const router = useRouter();
    const [abandoned, setAbandoned] = useState(false);

    if (abandoned) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 mb-4 mx-auto">
                        <FlagIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Tu as abandonné</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">La partie continue sans toi.</p>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-sm hover:bg-gray-700 dark:hover:bg-gray-100 transition"
                    >
                        Retour à l'accueil
                    </button>
                </div>
            </div>
        );
    }

    return (
        <button
            onClick={() => {
                if (!disabled && confirm('Abandonner la partie ?')) {
                    onSurrender();
                    setAbandoned(true);
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
