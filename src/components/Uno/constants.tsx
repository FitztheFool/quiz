import type { ReactNode } from 'react';
import { NoSymbolIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export type CardColor = 'red' | 'green' | 'blue' | 'yellow' | 'wild';
export type UnoCard = { id: string; color: CardColor; value: string };

export const COLOR_MAP: Record<string, string> = {
    red: 'bg-red-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-400',
    wild: 'bg-gray-700 dark:bg-gray-800',
};

export const CARD_GRADIENT: Record<string, string> = {
    red:    'bg-gradient-to-br from-red-500 to-red-700',
    green:  'bg-gradient-to-br from-green-500 to-green-700',
    blue:   'bg-gradient-to-br from-blue-500 to-blue-700',
    yellow: 'bg-gradient-to-br from-yellow-400 to-amber-600',
    wild:   'bg-black',
};

export const COLOR_DOT_CLASS: Record<string, string> = {
    red: 'bg-red-500', green: 'bg-green-500', blue: 'bg-blue-500', yellow: 'bg-yellow-400',
};

export const VALUE_LABEL: Record<string, ReactNode> = {
    skip: <NoSymbolIcon className="w-5 h-5" />,
    reverse: <ArrowPathIcon className="w-5 h-5" />,
    draw2: '+2',
    wild: '🌈',
    wild4: '+4',
};
