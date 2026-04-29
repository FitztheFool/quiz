import { COLS, ROWS, CELL, GHOST_COLORS, type Pos } from './constants';
import type { GameState } from './engine';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isWallLike(tile: number): boolean {
    return tile === 1 || tile === 2;
}

function neighbor(maze: number[][], x: number, y: number): number {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return 1;
    return maze[y][x];
}

// ── Neon wall drawing ─────────────────────────────────────────────────────────
// Draw glowing lines on type-1 wall-cell edges that face open corridors.

function drawNeonWalls(ctx: CanvasRenderingContext2D, maze: number[][]) {
    // 3 passes: wide outer glow → medium halo → bright core
    const passes: [number, number, string][] = [
        [20, 4, 'rgba(37,99,235,0.55)'],
        [8, 2.5, 'rgba(96,165,250,0.85)'],
        [2, 1.5, '#dbeafe'],
    ];

    for (const [blur, width, color] of passes) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.shadowColor = '#2563eb';
        ctx.shadowBlur = blur;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';   // rounded ends fill junction gaps cleanly

        ctx.beginPath();
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (maze[y][x] !== 1) continue;
                const px = x * CELL, py = y * CELL;

                if (!isWallLike(neighbor(maze, x, y - 1))) {
                    ctx.moveTo(px, py); ctx.lineTo(px + CELL, py);
                }
                if (!isWallLike(neighbor(maze, x, y + 1))) {
                    ctx.moveTo(px, py + CELL); ctx.lineTo(px + CELL, py + CELL);
                }
                if (!isWallLike(neighbor(maze, x - 1, y))) {
                    ctx.moveTo(px, py); ctx.lineTo(px, py + CELL);
                }
                if (!isWallLike(neighbor(maze, x + 1, y))) {
                    ctx.moveTo(px + CELL, py); ctx.lineTo(px + CELL, py + CELL);
                }
            }
        }
        ctx.stroke();
        ctx.restore();
    }
}

// ── Ghost house outline (pink neon) ───────────────────────────────────────────
// Solid box at cols 7–11, rows 9–11.
// Gate tubes only drawn when the maze actually has type-2 gate cells in row 7.

function drawGhostHouseOutline(ctx: CanvasRenderingContext2D, maze: number[][]) {
    const L = 7 * CELL, R = 12 * CELL;
    const T = 9 * CELL, B = 12 * CELL;
    const gateTop = 7 * CELL;

    // Detect gate type from maze row 7
    const hasCenterGate = maze[7]?.[9] === 2;
    const hasDoubleGate = maze[7]?.[8] === 2 || maze[7]?.[10] === 2;
    const hasGate = hasCenterGate || hasDoubleGate;
    const gateL = hasCenterGate ? 9 * CELL : 8 * CELL;
    const gateR = hasCenterGate ? 10 * CELL : 11 * CELL;

    const passes: [number, number][] = [[16, 2.5], [4, 2]];

    for (const [blur, width] of passes) {
        ctx.save();
        ctx.strokeStyle = '#e879f9';
        ctx.shadowColor = '#e879f9';
        ctx.shadowBlur = blur;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Left + bottom + right
        ctx.beginPath();
        ctx.moveTo(L, T); ctx.lineTo(L, B);
        ctx.lineTo(R, B); ctx.lineTo(R, T);
        ctx.stroke();

        if (hasGate) {
            // Top with gate gap + tubes rising to row 7
            ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(gateL, T); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(gateR, T); ctx.lineTo(R, T); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(gateL, T); ctx.lineTo(gateL, gateTop); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(gateR, T); ctx.lineTo(gateR, gateTop); ctx.stroke();
        } else {
            // Fully closed top
            ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(R, T); ctx.stroke();
        }

        ctx.restore();
    }
}

// ── Dot / pellet ──────────────────────────────────────────────────────────────

function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.beginPath();
    ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();
}

function drawPellet(ctx: CanvasRenderingContext2D, x: number, y: number, phase: number) {
    const cx = x * CELL + CELL / 2;
    const cy = y * CELL + CELL / 2;
    const r = 4.5 + Math.sin(phase * 2) * 0.8;

    ctx.save();
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#facc15';
    ctx.fill();
    ctx.restore();
}

// ── Pac-Man sprite ────────────────────────────────────────────────────────────

function drawPacmanSprite(
    ctx: CanvasRenderingContext2D,
    pos: Pos,
    dir: string,
    mouthAngle: number
) {
    const cx = pos.x * CELL + CELL / 2;
    const cy = pos.y * CELL + CELL / 2;
    const r = CELL / 2 - 1;

    const angle = 0.12 + Math.abs(Math.sin(mouthAngle)) * 0.28;

    const rotations: Record<string, number> = {
        R: 0, L: Math.PI, U: -Math.PI / 2, D: Math.PI / 2, N: 0,
    };
    const rot = rotations[dir] ?? 0;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.35, 1, 0, 0, r);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.6, '#facc15');
    grad.addColorStop(1, '#ca8a04');

    ctx.shadowColor = 'rgba(250,204,21,0.6)';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, angle, Math.PI * 2 - angle);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(r * 0.15, -r * 0.45, Math.max(1.5, r * 0.12), 0, Math.PI * 2);
    ctx.fillStyle = '#111827';
    ctx.fill();

    ctx.restore();
}

// ── Ghost sprite ──────────────────────────────────────────────────────────────

function drawGhost(
    ctx: CanvasRenderingContext2D,
    pos: Pos,
    index: number,
    frightened: boolean,
    ghostDir: string,
    dead = false,
) {
    const cx = pos.x * CELL + CELL / 2;
    const cy = pos.y * CELL + CELL / 2;

    if (dead) {
        const eyeOffX = 3.5;
        const eyeY = cy - 2;
        const pupilDirs: Record<string, [number, number]> = {
            L: [-1.2, 0], R: [1.2, 0], U: [0, -1.2], D: [0, 1.2], N: [0, 0],
        };
        const [pdx, pdy] = pupilDirs[ghostDir] ?? [0, 0];
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(cx - eyeOffX, eyeY, 2.8, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + eyeOffX, eyeY, 2.8, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1d4ed8';
        ctx.beginPath(); ctx.arc(cx - eyeOffX + pdx, eyeY + pdy, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + eyeOffX + pdx, eyeY + pdy, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        return;
    }

    const r = CELL / 2 - 1;
    const bodyColor = frightened ? '#3730a3' : (GHOST_COLORS[index]?.body ?? '#ff4444');

    ctx.save();

    const grad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.3, 1, cx, cy, r * 1.4);
    if (frightened) {
        grad.addColorStop(0, '#6366f1');
        grad.addColorStop(1, '#1e1b4b');
    } else {
        const base = GHOST_COLORS[index]?.body ?? '#ff4444';
        grad.addColorStop(0, lighten(base, 0.4));
        grad.addColorStop(1, darken(base, 0.2));
    }

    ctx.shadowColor = frightened ? 'rgba(99,102,241,0.5)' : `${bodyColor}88`;
    ctx.shadowBlur = 8;
    ctx.fillStyle = grad;

    const bot = cy + r;
    const left = cx - r;
    const right = cx + r;
    const bumpH = 5;
    const numBumps = 3;
    const bumpW = (r * 2) / numBumps;

    ctx.beginPath();
    ctx.arc(cx, cy - 1, r, Math.PI, 0);
    for (let b = 0; b < numBumps; b++) {
        const bx0 = right - b * bumpW;
        const bx1 = right - (b + 0.5) * bumpW;
        const bx2 = right - (b + 1) * bumpW;
        const by = b % 2 === 0 ? bot : bot - bumpH;
        const mid = b % 2 === 0 ? bot + bumpH : bot;
        ctx.quadraticCurveTo(bx0, by, bx1, mid);
        ctx.quadraticCurveTo(bx2, by, bx2, bot - (b % 2 === 0 ? 0 : bumpH));
    }
    ctx.lineTo(left, bot);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    if (!frightened) {
        const eyeOffX = 3.5;
        const eyeY = cy - r * 0.25;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(cx - eyeOffX, eyeY, 3, 3.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + eyeOffX, eyeY, 3, 3.8, 0, 0, Math.PI * 2); ctx.fill();

        const pupilDirs: Record<string, [number, number]> = {
            L: [-1.2, 0], R: [1.2, 0], U: [0, -1.2], D: [0, 1.2], N: [0, 0],
        };
        const [pdx, pdy] = pupilDirs[ghostDir] ?? [0, 0];
        ctx.fillStyle = '#1d4ed8';
        ctx.beginPath(); ctx.arc(cx - eyeOffX + pdx, eyeY + pdy, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + eyeOffX + pdx, eyeY + pdy, 1.8, 0, Math.PI * 2); ctx.fill();
    } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - 1);
        ctx.lineTo(cx - 2.5, cy + 2);
        ctx.lineTo(cx, cy - 1);
        ctx.lineTo(cx + 2.5, cy + 2);
        ctx.lineTo(cx + 5, cy - 1);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath(); ctx.arc(cx - 3.5, cy - 4, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 3.5, cy - 4, 1.5, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
}

// ── Lives indicator ───────────────────────────────────────────────────────────

function drawLives(ctx: CanvasRenderingContext2D, lives: number) {
    for (let i = 0; i < lives; i++) {
        const lx = (i + 1) * (CELL + 3);
        const ly = ROWS * CELL - CELL / 2;
        const r = CELL / 2 - 3;

        const grad = ctx.createRadialGradient(lx - r * 0.2, ly - r * 0.3, 1, lx, ly, r);
        grad.addColorStop(0, '#fef08a');
        grad.addColorStop(1, '#ca8a04');

        ctx.save();
        ctx.shadowColor = 'rgba(250,204,21,0.5)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(lx, ly, r, 0.3 * Math.PI, 1.7 * Math.PI);
        ctx.lineTo(lx, ly);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
    }
}

// ── Main draw ─────────────────────────────────────────────────────────────────

export function drawPacman(
    canvas: HTMLCanvasElement,
    state: GameState,
    mouthAngle: number,
    _isDark: boolean,
) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const tile = state.maze[y][x];
            if (tile === 0) drawDot(ctx, x, y);
            else if (tile === 3) drawPellet(ctx, x, y, mouthAngle);
        }
    }

    drawNeonWalls(ctx, state.maze);
    drawGhostHouseOutline(ctx, state.maze);

    for (let i = 0; i < state.ghosts.length; i++) {
        const g = state.ghosts[i];
        drawGhost(ctx, g.pos, i, g.frightened > 0, g.dir ?? 'N', g.dead);
    }

    drawPacmanSprite(ctx, state.pacPos, state.pacDir, mouthAngle);
    drawLives(ctx, state.lives);
}

// ── Idle screen ───────────────────────────────────────────────────────────────
// Kept for API compatibility; the hook renders idle via drawPacman(makeInitialState()).

export function drawIdleScreen(_canvas: HTMLCanvasElement, _isDark: boolean) {
    // no-op
}

// ── Color helpers ─────────────────────────────────────────────────────────────

function lighten(hex: string, amount: number): string {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 0xff) + Math.round(255 * amount));
    const g = Math.min(255, ((n >> 8) & 0xff) + Math.round(255 * amount));
    const b = Math.min(255, (n & 0xff) + Math.round(255 * amount));
    return `rgb(${r},${g},${b})`;
}

function darken(hex: string, amount: number): string {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, ((n >> 16) & 0xff) - Math.round(255 * amount));
    const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(255 * amount));
    const b = Math.max(0, (n & 0xff) - Math.round(255 * amount));
    return `rgb(${r},${g},${b})`;
}
