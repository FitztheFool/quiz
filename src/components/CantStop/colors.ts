export interface PlayerColor {
    text: string;
    bg: string;
    border: string;
    ring: string;
}

export const PLAYER_COLORS: PlayerColor[] = [
    { text: 'text-red-200',    bg: '#dc2626', border: '#7f1d1d', ring: 'ring-red-400' },
    { text: 'text-blue-200',   bg: '#2563eb', border: '#1e3a8a', ring: 'ring-blue-400' },
    { text: 'text-green-200',  bg: '#16a34a', border: '#14532d', ring: 'ring-green-400' },
    { text: 'text-yellow-200', bg: '#eab308', border: '#713f12', ring: 'ring-yellow-400' },
];

export function colorForIndex(idx: number): PlayerColor {
    return PLAYER_COLORS[idx % PLAYER_COLORS.length];
}
