import { COLS, ROWS, CELL, GHOST_COLORS, MAZE_TEMPLATE, type Pos } from './constants';
import type { GameState } from './engine';

const WALL_LIGHT = '#1e40af';
const WALL_DARK  = '#3b82f6';
const DOT_LIGHT  = '#fbbf24';
const DOT_DARK   = '#fcd34d';
const PELLET_LIGHT = '#f59e0b';
const PELLET_DARK  = '#fbbf24';
const BG_LIGHT   = '#0f0f23';
const BG_DARK    = '#0f0f23';

export function drawPacman(
    canvas: HTMLCanvasElement,
    state: GameState,
    mouthAngle: number,
    isDark: boolean,
) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bg = isDark ? BG_DARK : BG_LIGHT;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

    // Draw maze
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const tile = state.maze[y][x];
            const px = x * CELL;
            const py = y * CELL;

            if (tile === 1) {
                ctx.fillStyle = isDark ? WALL_DARK : WALL_LIGHT;
                ctx.beginPath();
                ctx.roundRect(px + 1, py + 1, CELL - 2, CELL - 2, 3);
                ctx.fill();
            } else if (tile === 0) {
                // dot
                ctx.beginPath();
                ctx.arc(px + CELL / 2, py + CELL / 2, 2, 0, Math.PI * 2);
                ctx.fillStyle = isDark ? DOT_DARK : DOT_LIGHT;
                ctx.fill();
            } else if (tile === 3) {
                // power pellet — pulsing handled by caller passing mouthAngle for phase
                const r = 4 + Math.sin(mouthAngle * 2) * 0.8;
                ctx.beginPath();
                ctx.arc(px + CELL / 2, py + CELL / 2, r, 0, Math.PI * 2);
                ctx.fillStyle = isDark ? PELLET_DARK : PELLET_LIGHT;
                ctx.shadowColor = isDark ? PELLET_DARK : PELLET_LIGHT;
                ctx.shadowBlur = 6;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    }

    // Ghosts
    for (let i = 0; i < state.ghosts.length; i++) {
        const g = state.ghosts[i];
        if (g.dead) continue;
        drawGhost(ctx, g.pos, i, g.frightened > 0, isDark);
    }

    // Pac-Man
    drawPacmanSprite(ctx, state.pacPos, state.pacDir, mouthAngle, isDark);

    // Lives
    for (let i = 0; i < state.lives; i++) {
        const lx = (i + 1) * (CELL + 2);
        const ly = ROWS * CELL - CELL / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(lx, ly, CELL / 2 - 3, 0.25 * Math.PI, 1.75 * Math.PI);
        ctx.lineTo(lx, ly);
        ctx.closePath();
        ctx.fillStyle = '#facc15';
        ctx.fill();
        ctx.restore();
    }
}

function drawPacmanSprite(
    ctx: CanvasRenderingContext2D,
    pos: Pos,
    dir: string,
    mouthAngle: number,
    isDark: boolean,
) {
    const cx = pos.x * CELL + CELL / 2;
    const cy = pos.y * CELL + CELL / 2;
    const r = CELL / 2 - 1;

    const angle = Math.abs(Math.sin(mouthAngle)) * 0.35;

    const rotations: Record<string, number> = { R: 0, L: Math.PI, U: -Math.PI / 2, D: Math.PI / 2, N: 0 };
    const rot = rotations[dir] ?? 0;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, angle, 2 * Math.PI - angle);
    ctx.closePath();
    ctx.fillStyle = '#facc15';
    ctx.shadowColor = 'rgba(250,204,21,0.5)';
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawGhost(
    ctx: CanvasRenderingContext2D,
    pos: Pos,
    index: number,
    frightened: boolean,
    isDark: boolean,
) {
    const cx = pos.x * CELL + CELL / 2;
    const cy = pos.y * CELL + CELL / 2;
    const r = CELL / 2 - 1;
    const color = frightened ? '#4444ff' : GHOST_COLORS[index]?.body ?? '#ff4444';

    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = frightened ? 'rgba(68,68,255,0.4)' : 'rgba(255,68,68,0.3)';
    ctx.shadowBlur = 6;

    // Ghost body: half circle top + wavy bottom
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 0);
    const bottom = cy + r;
    const w = r * 2;
    const segments = 3;
    const segW = w / segments;
    for (let s = segments; s >= 0; s--) {
        const bx = cx - r + s * segW;
        const by = s % 2 === 0 ? bottom : bottom - 4;
        ctx.lineTo(bx, by);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Eyes
    if (!frightened) {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(cx - 3, cy - 1, 3, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + 3, cy - 1, 3, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#00f';
        ctx.beginPath(); ctx.arc(cx - 2, cy - 1, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 4, cy - 1, 1.5, 0, Math.PI * 2); ctx.fill();
    } else {
        // frightened face
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy);
        ctx.lineTo(cx - 2, cy + 2);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + 2, cy + 2);
        ctx.lineTo(cx + 4, cy);
        ctx.stroke();
    }

    ctx.restore();
}

export function drawIdleScreen(canvas: HTMLCanvasElement, isDark: boolean) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = BG_LIGHT;
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

    // Draw maze walls only
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const tile = MAZE_TEMPLATE[y][x];
            if (tile === 1) {
                ctx.fillStyle = isDark ? WALL_DARK : WALL_LIGHT;
                ctx.beginPath();
                ctx.roundRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2, 3);
                ctx.fill();
            }
        }
    }

    // Centered text
    ctx.fillStyle = '#facc15';
    ctx.font = `bold ${CELL}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('PAC-MAN', (COLS * CELL) / 2, (ROWS * CELL) / 2 - CELL);
    ctx.fillStyle = '#fff';
    ctx.font = `${CELL - 4}px monospace`;
    ctx.fillText('Appuyez pour jouer', (COLS * CELL) / 2, (ROWS * CELL) / 2 + CELL);
    ctx.textAlign = 'left';
}
