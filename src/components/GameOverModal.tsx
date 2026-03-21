// src/components/GameOverModal.tsx
'use client';

import React from 'react';

interface GameOverModalProps {
    emoji?: string;
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
    onLobby: () => void;
    onLeave: () => void;
    /** true = fixed overlay on top of the board; false (default) = full page */
    asModal?: boolean;
}

export default function GameOverModal({
    emoji = '🏆',
    title,
    subtitle,
    children,
    onLobby,
    onLeave,
    asModal = false,
}: GameOverModalProps) {
    const card = (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl space-y-4">
            <div className="text-6xl">{emoji}</div>
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
                {subtitle && <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">{subtitle}</p>}
            </div>
            {children && <div className="text-left w-full">{children}</div>}
            <div className="flex gap-3 pt-2">
                <button
                    onClick={onLobby}
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all"
                >
                    Retour au lobby
                </button>
                <button
                    onClick={onLeave}
                    className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-sm font-semibold hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-all"
                >
                    Quitter
                </button>
            </div>
        </div>
    );

    if (asModal) {
        return (
            <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                {card}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
            {card}
        </div>
    );
}
