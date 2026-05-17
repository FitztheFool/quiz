// 15x15 Ludo board coordinates. (row, col) — row 0 top.
//
// 52 main track cells, indexed 0..51 (clockwise from red entry).
// Each player has 4 base slots, 6 home-column cells, and a starting position on the track.

export type Coord = readonly [number, number];

export const BOARD_SIZE = 15;

// Track: 52 cells in clockwise order starting at red's entry.
export const TRACK_COORDS: Coord[] = [
    // Red lane bottom-left going right (row 6, cols 1..5)
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
    // Up the left column of the cross (col 6, rows 5..0)
    [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
    // Top edge across (cols 7..8)
    [0, 7], [0, 8],
    // Green lane down (col 8, rows 1..5)
    [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
    // Right across top half (row 6, cols 9..14)
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
    // Right edge down (rows 7..8 on col 14)
    [7, 14], [8, 14],
    // Yellow lane going left (row 8, cols 13..9)
    [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
    // Down the right column of the cross (col 8, rows 9..14)
    [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
    // Bottom edge across (cols 7..6)
    [14, 7], [14, 6],
    // Blue lane up (col 6, rows 13..9)
    [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
    // Left across bottom half (row 8, cols 5..0)
    [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
    // Left edge up (rows 7..6 on col 0)
    [7, 0], [6, 0],
];

if (TRACK_COORDS.length !== 52) {
    throw new Error(`Track length must be 52, got ${TRACK_COORDS.length}`);
}

// Starting positions on track per color (red=0, green=1, yellow=2, blue=3).
export const START_POSITIONS = [0, 13, 26, 39] as const;

// Safe squares (no capture): same as server.
export const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Home columns: 6 cells per color, from track entry to center.
// Index 0 is the first home cell (just past the track), index 5 is the center finish square.
export const HOME_COLUMNS: Record<number, Coord[]> = {
    0: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
    1: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
    2: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
    3: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
};

// Base parking positions inside each home zone (4 slots per color, 6x6 zone).
export const BASE_SLOTS: Record<number, Coord[]> = {
    0: [[1, 1], [1, 4], [4, 1], [4, 4]],   // red — top-left
    1: [[1, 10], [1, 13], [4, 10], [4, 13]], // green — top-right
    2: [[10, 10], [10, 13], [13, 10], [13, 13]], // yellow — bottom-right
    3: [[10, 1], [10, 4], [13, 1], [13, 4]], // blue — bottom-left
};

// Home zone 6x6 outline.
export const HOME_ZONES: Record<number, { row: number; col: number }> = {
    0: { row: 0, col: 0 },
    1: { row: 0, col: 9 },
    2: { row: 9, col: 9 },
    3: { row: 9, col: 0 },
};

// Tailwind color classes per color index.
export const COLOR_CLASSES: Record<number, { bg: string; border: string; ring: string; text: string; soft: string; name: string }> = {
    0: { bg: 'bg-red-500',    border: 'border-red-500',    ring: 'ring-red-500',    text: 'text-red-500',    soft: 'bg-red-100 dark:bg-red-900/30',    name: 'Rouge' },
    1: { bg: 'bg-green-500',  border: 'border-green-500',  ring: 'ring-green-500',  text: 'text-green-500',  soft: 'bg-green-100 dark:bg-green-900/30',  name: 'Vert' },
    2: { bg: 'bg-yellow-400', border: 'border-yellow-500', ring: 'ring-yellow-400', text: 'text-yellow-500', soft: 'bg-yellow-100 dark:bg-yellow-900/30', name: 'Jaune' },
    3: { bg: 'bg-blue-500',   border: 'border-blue-500',   ring: 'ring-blue-500',   text: 'text-blue-500',   soft: 'bg-blue-100 dark:bg-blue-900/30',   name: 'Bleu' },
};

/** Returns (row, col) for a pawn given its color and progress (0..57). */
export function pawnCoord(colorIndex: number, pawnSlotIndex: number, progress: number): Coord {
    if (progress === 0) return BASE_SLOTS[colorIndex][pawnSlotIndex];
    if (progress >= 1 && progress <= 51) {
        const start = START_POSITIONS[colorIndex];
        return TRACK_COORDS[(start + progress - 1) % 52];
    }
    // 52..57 = home column entries 0..5
    return HOME_COLUMNS[colorIndex][progress - 52];
}

/** Center finish coord. */
export const CENTER: Coord = [7, 7];
