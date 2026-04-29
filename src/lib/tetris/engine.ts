import { COLS, ROWS, SHAPES, COLORS, PIECE_TYPES, SPAWN_X, SPAWN_Y, lineScore, type PieceType } from './constants';

export type Board = (string | null)[][];

export interface Piece {
    type: PieceType;
    rotation: number;
    x: number;
    y: number;
}

export interface GameState {
    board: Board;
    current: Piece;
    next: PieceType;
    score: number;
    level: number;
    lines: number;
    over: boolean;
}

function randomPiece(): PieceType {
    return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
}

function emptyBoard(): Board {
    return Array.from({ length: ROWS }, () => Array<string | null>(COLS).fill(null));
}

export function collides(board: Board, type: PieceType, x: number, y: number, rotation: number): boolean {
    for (const [dr, dc] of SHAPES[type][rotation % 4]) {
        const r = y + dr;
        const c = x + dc;
        if (c < 0 || c >= COLS || r >= ROWS) return true;
        if (r >= 0 && board[r][c] !== null) return true;
    }
    return false;
}

export function makeInitialState(): GameState {
    const first = randomPiece();
    const next = randomPiece();
    return {
        board: emptyBoard(),
        current: { type: first, rotation: 0, x: SPAWN_X[first], y: SPAWN_Y },
        next,
        score: 0,
        level: 1,
        lines: 0,
        over: false,
    };
}

function lockAndSpawn(state: GameState): { state: GameState; linesCleared: number } {
    const board = state.board.map(r => [...r]);
    const { type, rotation, x, y } = state.current;

    let lockedAboveTop = false;
    for (const [dr, dc] of SHAPES[type][rotation % 4]) {
        const r = y + dr;
        const c = x + dc;
        if (r < 0) { lockedAboveTop = true; }
        else { board[r][c] = COLORS[type]; }
    }

    if (lockedAboveTop) {
        return { state: { ...state, over: true }, linesCleared: 0 };
    }

    const kept = board.filter(row => row.some(c => c === null));
    const linesCleared = ROWS - kept.length;
    while (kept.length < ROWS) kept.unshift(Array<string | null>(COLS).fill(null));

    const newLines = state.lines + linesCleared;
    const newLevel = Math.floor(newLines / 10) + 1;
    const newScore = state.score + lineScore(linesCleared, state.level);

    const nextType = state.next;
    const sx = SPAWN_X[nextType];
    const newCurrent: Piece = { type: nextType, rotation: 0, x: sx, y: SPAWN_Y };
    const over = collides(kept, nextType, sx, SPAWN_Y, 0);

    return {
        state: {
            board: kept,
            current: newCurrent,
            next: randomPiece(),
            score: newScore,
            level: newLevel,
            lines: newLines,
            over,
        },
        linesCleared,
    };
}

export function tryMove(state: GameState, dx: number): GameState | null {
    const { current } = state;
    const nx = current.x + dx;
    if (collides(state.board, current.type, nx, current.y, current.rotation)) return null;
    return { ...state, current: { ...current, x: nx } };
}

export function tryRotate(state: GameState, cw: boolean): GameState | null {
    const { current } = state;
    const rotation = ((current.rotation + (cw ? 1 : -1)) + 4) % 4;
    for (const dx of [0, -1, 1, -2, 2]) {
        if (!collides(state.board, current.type, current.x + dx, current.y, rotation)) {
            return { ...state, current: { ...current, rotation, x: current.x + dx } };
        }
    }
    return null;
}

export function applyGravity(state: GameState): { state: GameState; linesCleared: number; locked: boolean } {
    if (state.over) return { state, linesCleared: 0, locked: false };
    const { current } = state;
    if (!collides(state.board, current.type, current.x, current.y + 1, current.rotation)) {
        return {
            state: { ...state, current: { ...current, y: current.y + 1 } },
            linesCleared: 0,
            locked: false,
        };
    }
    const { state: newState, linesCleared } = lockAndSpawn(state);
    return { state: newState, linesCleared, locked: true };
}

export function hardDrop(state: GameState): { state: GameState; linesCleared: number } {
    let s = state;
    while (!collides(s.board, s.current.type, s.current.x, s.current.y + 1, s.current.rotation)) {
        s = { ...s, current: { ...s.current, y: s.current.y + 1 } };
    }
    return lockAndSpawn(s);
}

export function ghostRow(state: GameState): number {
    let y = state.current.y;
    while (!collides(state.board, state.current.type, state.current.x, y + 1, state.current.rotation)) {
        y++;
    }
    return y;
}
