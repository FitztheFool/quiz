export const COLS = 10;
export const ROWS = 20;
export const CELL = 28;
export const PANEL_W = 120;
export const W = COLS * CELL + PANEL_W; // 400
export const H = ROWS * CELL;           // 560

export const SPAWN_Y = 0;

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export const PIECE_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// [row, col] offsets from (x, y) for each of 4 rotations
export const SHAPES: Record<PieceType, [number, number][][]> = {
    I: [
        [[0,0],[0,1],[0,2],[0,3]],
        [[0,0],[1,0],[2,0],[3,0]],
        [[0,0],[0,1],[0,2],[0,3]],
        [[0,0],[1,0],[2,0],[3,0]],
    ],
    O: [
        [[0,0],[0,1],[1,0],[1,1]],
        [[0,0],[0,1],[1,0],[1,1]],
        [[0,0],[0,1],[1,0],[1,1]],
        [[0,0],[0,1],[1,0],[1,1]],
    ],
    T: [
        [[0,1],[1,0],[1,1],[1,2]],
        [[0,0],[1,0],[1,1],[2,0]],
        [[0,0],[0,1],[0,2],[1,1]],
        [[0,1],[1,0],[1,1],[2,1]],
    ],
    S: [
        [[0,1],[0,2],[1,0],[1,1]],
        [[0,0],[1,0],[1,1],[2,1]],
        [[0,1],[0,2],[1,0],[1,1]],
        [[0,0],[1,0],[1,1],[2,1]],
    ],
    Z: [
        [[0,0],[0,1],[1,1],[1,2]],
        [[0,1],[1,0],[1,1],[2,0]],
        [[0,0],[0,1],[1,1],[1,2]],
        [[0,1],[1,0],[1,1],[2,0]],
    ],
    J: [
        [[0,0],[1,0],[1,1],[1,2]],
        [[0,0],[0,1],[1,0],[2,0]],
        [[0,0],[0,1],[0,2],[1,2]],
        [[0,1],[1,1],[2,0],[2,1]],
    ],
    L: [
        [[0,2],[1,0],[1,1],[1,2]],
        [[0,0],[1,0],[2,0],[2,1]],
        [[0,0],[0,1],[0,2],[1,0]],
        [[0,0],[0,1],[1,1],[2,1]],
    ],
};

export const SPAWN_X: Record<PieceType, number> = {
    I: 3, O: 4, T: 3, S: 3, Z: 3, J: 3, L: 3,
};

export const COLORS: Record<PieceType, string> = {
    I: '#22d3ee',
    O: '#facc15',
    T: '#c084fc',
    S: '#4ade80',
    Z: '#f87171',
    J: '#60a5fa',
    L: '#fb923c',
};

// ms between gravity ticks per level
const SPEEDS = [800, 650, 533, 430, 367, 300, 233, 167, 133, 100];
export function getSpeed(level: number): number {
    return SPEEDS[Math.min(level - 1, SPEEDS.length - 1)];
}

export function lineScore(lines: number, level: number): number {
    const base = [0, 100, 300, 500, 800];
    return (base[Math.min(lines, 4)] ?? 0) * level;
}

export const STARTERS = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    ' ', 'Enter', 'z', 'Z',
]);
