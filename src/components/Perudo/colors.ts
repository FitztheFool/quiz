export interface PerudoColor {
    text: string;
    dieBg: string;
    dieBorder: string;
    dieDot: string;
}

// Colors inspired by reference image. Index by stable player slot.
export const PERUDO_COLORS: PerudoColor[] = [
    { text: 'text-red-600 dark:text-red-400',       dieBg: '#ef4444', dieBorder: '#b91c1c', dieDot: '#7f1d1d' },
    { text: 'text-green-600 dark:text-green-400',   dieBg: '#22c55e', dieBorder: '#15803d', dieDot: '#14532d' },
    { text: 'text-blue-600 dark:text-blue-400',     dieBg: '#3b82f6', dieBorder: '#1d4ed8', dieDot: '#172554' },
    { text: 'text-yellow-500 dark:text-yellow-300', dieBg: '#facc15', dieBorder: '#ca8a04', dieDot: '#713f12' },
    { text: 'text-orange-500 dark:text-orange-400', dieBg: '#f97316', dieBorder: '#c2410c', dieDot: '#7c2d12' },
    { text: 'text-purple-600 dark:text-purple-400', dieBg: '#a855f7', dieBorder: '#7e22ce', dieDot: '#3b0764' },
    { text: 'text-pink-600 dark:text-pink-400',     dieBg: '#ec4899', dieBorder: '#be185d', dieDot: '#500724' },
    { text: 'text-cyan-600 dark:text-cyan-400',     dieBg: '#06b6d4', dieBorder: '#0e7490', dieDot: '#164e63' },
];

export function colorForIndex(idx: number): PerudoColor {
    return PERUDO_COLORS[idx % PERUDO_COLORS.length];
}
