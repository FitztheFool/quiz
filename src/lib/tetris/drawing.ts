import { COLS, ROWS, CELL, PANEL_W, W, H, SHAPES, COLORS } from './constants';
import { ghostRow, type GameState } from './engine';

function drawBlock(ctx: CanvasRenderingContext2D, c: number, r: number, color: string) {
    const x = c * CELL + 1.5;
    const y = r * CELL + 1.5;
    const s = CELL - 3;

    ctx.fillStyle = color;
    ctx.fillRect(x, y, s, s);

    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(x, y, s, 3);
    ctx.fillRect(x, y, 3, s);

    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(x, y + s - 3, s, 3);
    ctx.fillRect(x + s - 3, y, 3, s);
}

function drawPreviewBlock(ctx: CanvasRenderingContext2D, px: number, py: number, size: number, color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(px + 1, py + 1, size - 2, 2);
    ctx.fillRect(px + 1, py + 1, 2, size - 2);
}

export function drawTetris(canvas: HTMLCanvasElement, state: GameState) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const boardW = COLS * CELL;

    // ── Background ────────────────────────────────────────────────────────────
    ctx.fillStyle = '#06060f';
    ctx.fillRect(0, 0, W, H);

    // ── Grid ──────────────────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
        ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(boardW, r * CELL); ctx.stroke();
    }

    // ── Locked board cells ────────────────────────────────────────────────────
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const color = state.board[r][c];
            if (color) drawBlock(ctx, c, r, color);
        }
    }

    if (!state.over) {
        // ── Ghost piece ───────────────────────────────────────────────────────
        const gy = ghostRow(state);
        const { type, rotation, x } = state.current;
        if (gy !== state.current.y) {
            const ghostColor = COLORS[type];
            for (const [dr, dc] of SHAPES[type][rotation % 4]) {
                const r = gy + dr;
                const c = x + dc;
                if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
                    ctx.save();
                    ctx.globalAlpha = 0.18;
                    ctx.strokeStyle = ghostColor;
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(c * CELL + 2, r * CELL + 2, CELL - 4, CELL - 4);
                    ctx.restore();
                }
            }
        }

        // ── Current piece (with glow) ─────────────────────────────────────────
        const color = COLORS[type];
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        for (const [dr, dc] of SHAPES[type][rotation % 4]) {
            const r = state.current.y + dr;
            const c = x + dc;
            if (r >= 0 && r < ROWS) drawBlock(ctx, c, r, color);
        }
        ctx.restore();
    }

    // ── Board border ──────────────────────────────────────────────────────────
    ctx.save();
    ctx.strokeStyle = 'rgba(99,102,241,0.35)';
    ctx.shadowColor = 'rgba(99,102,241,0.3)';
    ctx.shadowBlur = 6;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, boardW - 1, H - 1);
    ctx.restore();

    // ── Panel background ──────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.015)';
    ctx.fillRect(boardW, 0, PANEL_W, H);

    ctx.save();
    ctx.strokeStyle = 'rgba(99,102,241,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(boardW + 0.5, 0); ctx.lineTo(boardW + 0.5, H);
    ctx.stroke();
    ctx.restore();

    // ── NEXT label ────────────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.textAlign = 'center';
    ctx.fillText('NEXT', boardW + PANEL_W / 2, 26);
    ctx.letterSpacing = '0px';

    // ── Next piece preview ────────────────────────────────────────────────────
    const previewSize = 22;
    const cells = SHAPES[state.next][0];
    const nextColor = COLORS[state.next];

    // Find bounding box of the piece to center it in the panel
    const maxDc = Math.max(...cells.map(([, dc]) => dc));
    const maxDr = Math.max(...cells.map(([dr]) => dr));
    const pieceW = (maxDc + 1) * previewSize;
    const pieceH = (maxDr + 1) * previewSize;
    const previewX = boardW + (PANEL_W - pieceW) / 2;
    const previewY = 38 + (4 * previewSize - pieceH) / 2;

    ctx.save();
    ctx.shadowColor = nextColor;
    ctx.shadowBlur = 8;
    for (const [dr, dc] of cells) {
        drawPreviewBlock(ctx, previewX + dc * previewSize, previewY + dr * previewSize, previewSize, nextColor);
    }
    ctx.restore();
}
