import { COLS, ROWS, type Pos } from './constants';

export function randomApple(snake: Pos[]): Pos {
    const occupied = new Set(snake.map(p => `${p.x},${p.y}`));
    let pos: Pos;
    do {
        pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    } while (occupied.has(`${pos.x},${pos.y}`));
    return pos;
}

export function initialSnake(): Pos[] {
    const cx = Math.floor(COLS / 2);
    const cy = Math.floor(ROWS / 2);
    return [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
}
