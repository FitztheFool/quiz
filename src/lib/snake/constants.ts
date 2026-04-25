export const COLS = 20;
export const ROWS = 20;
export const CELL = 20;
export const TICK = 130;

export type Pos = { x: number; y: number };
export type Dir = 'U' | 'D' | 'L' | 'R';

export const OPP: Record<Dir, Dir> = { U: 'D', D: 'U', L: 'R', R: 'L' };
export const DELTA: Record<Dir, Pos> = { U: { x: 0, y: -1 }, D: { x: 0, y: 1 }, L: { x: -1, y: 0 }, R: { x: 1, y: 0 } };

export const COLORS = [
    { body: '#22c55e', head: '#15803d', glow: 'rgba(34,197,94,0.28)' },
    { body: '#60a5fa', head: '#1d4ed8', glow: 'rgba(96,165,250,0.28)' },
    { body: '#c084fc', head: '#7e22ce', glow: 'rgba(192,132,252,0.28)' },
    { body: '#fb923c', head: '#c2410c', glow: 'rgba(251,146,60,0.28)' },
    { body: '#f472b6', head: '#be185d', glow: 'rgba(244,114,182,0.28)' },
    { body: '#22d3ee', head: '#0e7490', glow: 'rgba(34,211,238,0.28)' },
] as const;

export type SnakeColor = typeof COLORS[number];

export const KEY_DIR: Record<string, Dir> = {
    ArrowUp: 'U', z: 'U', Z: 'U',
    ArrowDown: 'D', s: 'D', S: 'D',
    ArrowLeft: 'L', q: 'L', Q: 'L',
    ArrowRight: 'R', d: 'R', D: 'R',
};

export const STARTERS = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'z', 'Z', 'q', 'Q', 's', 'S', 'd', 'D', ' ', 'Enter',
]);
