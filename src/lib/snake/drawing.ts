import { COLS, ROWS, CELL, type Pos, type Dir, type SnakeColor } from './constants';

function dirBetween(a: Pos, b: Pos): Dir {
    if (b.x > a.x) return 'R';
    if (b.x < a.x) return 'L';
    if (b.y > a.y) return 'D';
    return 'U';
}

function drawApple(ctx: CanvasRenderingContext2D, pos: Pos, isDark: boolean) {
    const cx = pos.x * CELL + CELL / 2;
    const cy = pos.y * CELL + CELL / 2 + 1;
    const r = CELL / 2 - 2;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? '#f87171' : '#ef4444';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx - 2, cy - 2, r * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx, cy - r + 1);
    ctx.lineTo(cx + 2, cy - r - 3);
    ctx.strokeStyle = isDark ? '#86efac' : '#15803d';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.stroke();
}

function drawEyes(ctx: CanvasRenderingContext2D, cx: number, cy: number, facing: Dir) {
    const off = 3;
    const positions: [Pos, Pos] =
        facing === 'R' ? [{ x: cx + 2, y: cy - off }, { x: cx + 2, y: cy + off }] :
        facing === 'L' ? [{ x: cx - 2, y: cy - off }, { x: cx - 2, y: cy + off }] :
        facing === 'U' ? [{ x: cx - off, y: cy - 2 }, { x: cx + off, y: cy - 2 }] :
                         [{ x: cx - off, y: cy + 2 }, { x: cx + off, y: cy + 2 }];

    for (const eye of positions) {
        ctx.beginPath();
        ctx.arc(eye.x, eye.y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eye.x, eye.y, 1.0, 0, Math.PI * 2);
        ctx.fillStyle = '#111';
        ctx.fill();
    }
}

export function drawGame(
    canvas: HTMLCanvasElement,
    snake: Pos[],
    apple: Pos,
    isDark: boolean,
    color: SnakeColor,
) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = isDark ? '#0f172a' : '#f1f5f9';
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, ROWS * CELL); ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(COLS * CELL, y * CELL); ctx.stroke();
    }

    drawApple(ctx, apple, isDark);

    if (snake.length === 0) return;

    ctx.save();
    ctx.shadowColor = color.glow;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(snake[0].x * CELL + CELL / 2, snake[0].y * CELL + CELL / 2);
    for (let i = 1; i < snake.length; i++) {
        ctx.lineTo(snake[i].x * CELL + CELL / 2, snake[i].y * CELL + CELL / 2);
    }
    ctx.strokeStyle = color.body;
    ctx.lineWidth = CELL - 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();

    const hx = snake[0].x * CELL + CELL / 2;
    const hy = snake[0].y * CELL + CELL / 2;
    ctx.beginPath();
    ctx.arc(hx, hy, (CELL - 4) / 2, 0, Math.PI * 2);
    ctx.fillStyle = color.head;
    ctx.fill();

    if (snake.length >= 2) drawEyes(ctx, hx, hy, dirBetween(snake[1], snake[0]));
}
