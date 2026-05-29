// 2048 — pure game engine (board ops, no React).

export const SIZE = 4;
export type Board = number[][];      // 0 = empty cell, otherwise a power-of-two tile.
export type Direction = 'left' | 'right' | 'up' | 'down';

/** A new empty board, then two starting tiles dropped in. */
export function newBoard(): Board {
    const b: Board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    addRandomTile(b);
    addRandomTile(b);
    return b;
}

/** Slide a single row to the left, merging same-value tiles. Returns row + gained score. */
function slideRowLeft(row: number[]): { row: number[]; gained: number } {
    const filtered = row.filter(v => v !== 0);
    const out: number[] = [];
    let gained = 0;
    let i = 0;
    while (i < filtered.length) {
        if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
            const merged = filtered[i] * 2;
            out.push(merged);
            gained += merged;
            i += 2;
        } else {
            out.push(filtered[i]);
            i += 1;
        }
    }
    while (out.length < SIZE) out.push(0);
    return { row: out, gained };
}

function rowsEqual(a: number[], b: number[]): boolean {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

/** Apply a move; returns the new board, gained score, and whether anything moved. */
export function move(board: Board, dir: Direction): { board: Board; gained: number; moved: boolean } {
    const next: Board = board.map(row => row.slice());
    let gained = 0;
    let moved = false;

    if (dir === 'left' || dir === 'right') {
        for (let r = 0; r < SIZE; r++) {
            const input = dir === 'left' ? next[r] : next[r].slice().reverse();
            const { row, gained: g } = slideRowLeft(input);
            const result = dir === 'left' ? row : row.slice().reverse();
            if (!rowsEqual(next[r], result)) moved = true;
            next[r] = result;
            gained += g;
        }
    } else {
        for (let c = 0; c < SIZE; c++) {
            const col = next.map(r => r[c]);
            const input = dir === 'up' ? col : col.slice().reverse();
            const { row, gained: g } = slideRowLeft(input);
            const result = dir === 'up' ? row : row.slice().reverse();
            for (let r = 0; r < SIZE; r++) {
                if (next[r][c] !== result[r]) moved = true;
                next[r][c] = result[r];
            }
            gained += g;
        }
    }

    return { board: next, gained, moved };
}

/** Drop a 2 (90%) or 4 (10%) into a random empty cell. Mutates the board. */
export function addRandomTile(board: Board): void {
    const empties: { r: number; c: number }[] = [];
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (board[r][c] === 0) empties.push({ r, c });
    if (empties.length === 0) return;
    const { r, c } = empties[Math.floor(Math.random() * empties.length)];
    board[r][c] = Math.random() < 0.9 ? 2 : 4;
}

/** Can the player still play? */
export function canMove(board: Board): boolean {
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) return true;
        if (c + 1 < SIZE && board[r][c] === board[r][c + 1]) return true;
        if (r + 1 < SIZE && board[r][c] === board[r + 1][c]) return true;
    }
    return false;
}
