import {
    COIN_SIZE, GOOMBA_H, GOOMBA_W, GROUND_ROW, HEIGHT,
    POWERUP_SIZE, ROWS, TILE, WIDTH,
} from './constants';
import type { Player, World } from './engine';

export function drawScene(ctx: CanvasRenderingContext2D, world: World, player: Player) {
    drawSky(ctx, world);
    drawTiles(ctx, world);
    drawEntities(ctx, world);
    drawFireballs(ctx, world);
    drawPlayer(ctx, player, world);
    drawHud(ctx, world);
}

// ─── Sky / background ─────────────────────────────────────────────────────

function drawSky(ctx: CanvasRenderingContext2D, world: World) {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, '#5cb6ff');
    sky.addColorStop(0.65, '#a8defd');
    sky.addColorStop(1, '#dff4ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Sun glow (top-right)
    const sunGrad = ctx.createRadialGradient(WIDTH - 60, 50, 6, WIDTH - 60, 50, 50);
    sunGrad.addColorStop(0, 'rgba(255, 245, 200, 0.95)');
    sunGrad.addColorStop(0.4, 'rgba(255, 230, 150, 0.4)');
    sunGrad.addColorStop(1, 'rgba(255, 230, 150, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(WIDTH - 130, 0, 130, 120);

    const camX = world.cameraX;

    // Clouds — slow parallax
    const cloudSpace = 200;
    const cloudOff = ((camX * 0.18) % cloudSpace + cloudSpace) % cloudSpace;
    for (let i = -1; i <= 3; i++) {
        const cx = i * cloudSpace - cloudOff + 40;
        const cy = 28 + (i & 1 ? 22 : 0);
        drawCloud(ctx, cx, cy);
    }

    // Back hills (smaller, lower saturation)
    drawHills(ctx, camX * 0.35, HEIGHT - TILE * 4, 70, 36, '#4f9c4a');
    // Front hills (larger)
    drawHills(ctx, camX * 0.55, HEIGHT - TILE * 3 + 2, 100, 52, '#5fb24f');
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.arc(x + 10, y - 4, 13, 0, Math.PI * 2);
    ctx.arc(x + 22, y - 1, 11, 0, Math.PI * 2);
    ctx.arc(x + 32, y + 3, 9, 0, Math.PI * 2);
    ctx.arc(x + 15, y + 6, 11, 0, Math.PI * 2);
    ctx.fill();
    // underside shadow
    ctx.fillStyle = 'rgba(150, 180, 210, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 9, 18, 3, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawHills(ctx: CanvasRenderingContext2D, offset: number, baseY: number, radius: number, height: number, color: string) {
    const spacing = radius * 1.8;
    const off = ((offset % spacing) + spacing) % spacing;
    for (let i = -1; i <= Math.ceil(WIDTH / spacing) + 1; i++) {
        const cx = i * spacing - off + radius;
        // hill body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(cx, baseY, radius, height, 0, Math.PI, 0);
        ctx.fill();
        // highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.beginPath();
        ctx.ellipse(cx - radius * 0.3, baseY - height * 0.4, radius * 0.4, height * 0.3, -0.2, Math.PI, 0);
        ctx.fill();
    }
}

// ─── Tiles ─────────────────────────────────────────────────────────────────

function drawTiles(ctx: CanvasRenderingContext2D, world: World) {
    const camX = world.cameraX;
    const startCol = Math.floor(camX / TILE) - 1;
    const endCol = Math.ceil((camX + WIDTH) / TILE) + 1;
    for (let c = startCol; c <= endCol; c++) {
        const col = world.tilesByX.get(c);
        if (!col) continue;
        for (let r = 0; r < ROWS; r++) {
            const t = col[r];
            if (t === 'empty') continue;
            const px = c * TILE - camX;
            const py = r * TILE;
            if (t === 'ground') drawGroundTile(ctx, px, py, r === GROUND_ROW);
            else if (t === 'brick') drawBrick(ctx, px, py);
            else if (t === 'question') drawQuestion(ctx, px, py, world.timeMs);
            else if (t === 'usedBlock') drawUsedBlock(ctx, px, py);
        }
    }
}

function drawGroundTile(ctx: CanvasRenderingContext2D, x: number, y: number, isTop: boolean) {
    // dirt body
    const dirt = ctx.createLinearGradient(x, y, x, y + TILE);
    dirt.addColorStop(0, '#a06734');
    dirt.addColorStop(1, '#6e4520');
    ctx.fillStyle = dirt;
    ctx.fillRect(x, y, TILE, TILE);
    // tiny specks
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x + 3, y + 5, 1, 1);
    ctx.fillRect(x + 9, y + 9, 1, 1);
    ctx.fillRect(x + 12, y + 4, 1, 1);
    ctx.fillRect(x + 5, y + 13, 1, 1);
    ctx.fillStyle = 'rgba(255,220,180,0.18)';
    ctx.fillRect(x + 7, y + 6, 1, 1);
    ctx.fillRect(x + 2, y + 10, 1, 1);

    if (isTop) {
        // grass band
        const grass = ctx.createLinearGradient(x, y, x, y + 5);
        grass.addColorStop(0, '#7ed957');
        grass.addColorStop(1, '#3d8f3a');
        ctx.fillStyle = grass;
        ctx.fillRect(x, y, TILE, 5);
        // grass tufts (overhang)
        ctx.fillStyle = '#7ed957';
        ctx.fillRect(x + 2, y - 1, 2, 1);
        ctx.fillRect(x + 9, y - 1, 2, 1);
        ctx.fillRect(x + 13, y - 1, 1, 1);
        // darker speckles in grass
        ctx.fillStyle = '#2e6a2c';
        ctx.fillRect(x + 5, y + 3, 1, 1);
        ctx.fillRect(x + 11, y + 4, 1, 1);
    }
    // top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x, y, TILE, 1);
}

function drawBrick(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const grad = ctx.createLinearGradient(x, y, x, y + TILE);
    grad.addColorStop(0, '#e07f3a');
    grad.addColorStop(0.6, '#b35420');
    grad.addColorStop(1, '#7a3712');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, TILE, TILE);
    // mortar lines (dark)
    ctx.fillStyle = '#3d1a06';
    ctx.fillRect(x, y, TILE, 1);
    ctx.fillRect(x, y + TILE / 2 - 1, TILE, 1);
    ctx.fillRect(x, y + TILE - 1, TILE, 1);
    ctx.fillRect(x + TILE / 2 - 1, y, 1, TILE / 2);
    ctx.fillRect(x + TILE / 4 - 1, y + TILE / 2, 1, TILE / 2);
    ctx.fillRect(x + (3 * TILE) / 4, y + TILE / 2, 1, TILE / 2);
    // top highlights on each brick
    ctx.fillStyle = 'rgba(255, 220, 180, 0.45)';
    ctx.fillRect(x + 1, y + 1, TILE / 2 - 2, 1);
    ctx.fillRect(x + TILE / 2, y + 1, TILE / 2 - 1, 1);
    ctx.fillRect(x + 1, y + TILE / 2, TILE / 4 - 2, 1);
    ctx.fillRect(x + TILE / 4, y + TILE / 2, TILE / 2 - 1, 1);
    ctx.fillRect(x + (3 * TILE) / 4 + 1, y + TILE / 2, TILE / 4 - 2, 1);
}

function drawQuestion(ctx: CanvasRenderingContext2D, x: number, y: number, timeMs: number) {
    const pulse = (Math.sin(timeMs / 220) + 1) / 2; // 0..1
    const grad = ctx.createLinearGradient(x, y, x, y + TILE);
    grad.addColorStop(0, `rgba(255, ${210 + Math.floor(pulse * 30)}, ${100 + Math.floor(pulse * 40)}, 1)`);
    grad.addColorStop(1, '#b87b00');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, TILE, TILE);
    // dark border
    ctx.fillStyle = '#6a4500';
    ctx.fillRect(x, y, TILE, 1);
    ctx.fillRect(x, y + TILE - 1, TILE, 1);
    ctx.fillRect(x, y, 1, TILE);
    ctx.fillRect(x + TILE - 1, y, 1, TILE);
    // rivets
    ctx.fillStyle = '#3e2700';
    ctx.fillRect(x + 1, y + 1, 1, 1);
    ctx.fillRect(x + TILE - 2, y + 1, 1, 1);
    ctx.fillRect(x + 1, y + TILE - 2, 1, 1);
    ctx.fillRect(x + TILE - 2, y + TILE - 2, 1, 1);
    // specular shine
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x + 2, y + 2, 3, 1);
    // ? glyph
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px "Press Start 2P", "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', x + TILE / 2, y + TILE / 2 + 1);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillText('?', x + TILE / 2 + 1, y + TILE / 2 + 2);
    ctx.fillStyle = '#fff';
    ctx.fillText('?', x + TILE / 2, y + TILE / 2 + 1);
}

function drawUsedBlock(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const grad = ctx.createLinearGradient(x, y, x, y + TILE);
    grad.addColorStop(0, '#8a6534');
    grad.addColorStop(1, '#4a311a');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#2a1b08';
    ctx.fillRect(x, y, TILE, 1);
    ctx.fillRect(x, y + TILE - 1, TILE, 1);
    ctx.fillRect(x, y, 1, TILE);
    ctx.fillRect(x + TILE - 1, y, 1, TILE);
    ctx.fillStyle = '#2a1b08';
    ctx.fillRect(x + 2, y + 2, 1, 1);
    ctx.fillRect(x + TILE - 3, y + 2, 1, 1);
    ctx.fillRect(x + 2, y + TILE - 3, 1, 1);
    ctx.fillRect(x + TILE - 3, y + TILE - 3, 1, 1);
    // inner shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + 1, y + TILE - 2, TILE - 2, 1);
}

// ─── Entities ──────────────────────────────────────────────────────────────

function drawEntities(ctx: CanvasRenderingContext2D, world: World) {
    for (const e of world.entities) {
        if (!e.alive) continue;
        const ex = e.x - world.cameraX;
        const ey = e.y;
        if (e.kind === 'coin') drawCoin(ctx, ex, ey, world.timeMs);
        else if (e.kind === 'goomba') drawGoomba(ctx, ex, ey, world.timeMs);
        else if (e.kind === 'mushroom') drawMushroom(ctx, ex, ey);
        else if (e.kind === 'flower') drawFlower(ctx, ex, ey, world.timeMs);
    }
}

function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, timeMs: number) {
    const cx = x + COIN_SIZE / 2;
    const cy = y + COIN_SIZE / 2;
    const phase = (timeMs / 700) % 1;
    const spin = Math.abs(Math.cos(phase * Math.PI * 2));
    const w = Math.max(2, COIN_SIZE * (0.25 + 0.75 * spin));
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + COIN_SIZE / 2 + 1, COIN_SIZE / 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // outer ring
    ctx.fillStyle = '#a86b00';
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2 + 0.5, COIN_SIZE / 2 + 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // body gradient
    const grad = ctx.createLinearGradient(cx, cy - COIN_SIZE / 2, cx, cy + COIN_SIZE / 2);
    grad.addColorStop(0, '#fff176');
    grad.addColorStop(0.5, '#fbc02d');
    grad.addColorStop(1, '#c77a00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, COIN_SIZE / 2 - 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // central bar (back of coin during spin)
    if (w / COIN_SIZE < 0.5) {
        ctx.fillStyle = '#7a4d00';
        ctx.fillRect(cx - 0.5, cy - COIN_SIZE / 2 + 1, 1, COIN_SIZE - 2);
    } else {
        // dollar/star
        ctx.fillStyle = '#a86b00';
        ctx.fillRect(cx - 0.5, cy - 2, 1, 4);
        ctx.fillRect(cx - 1.5, cy - 3, 1, 1);
        ctx.fillRect(cx + 0.5, cy + 2, 1, 1);
    }
    // highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    if (w > 3) ctx.fillRect(cx - w / 3, cy - COIN_SIZE / 3, Math.max(1, w / 6), 2);
}

function drawGoomba(ctx: CanvasRenderingContext2D, x: number, y: number, timeMs: number) {
    const phase = Math.floor((timeMs / 200) % 2);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x + GOOMBA_W / 2, y + GOOMBA_H + 1, GOOMBA_W / 2 - 1, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // body (dome shape)
    const grad = ctx.createRadialGradient(x + GOOMBA_W / 2 - 2, y + 3, 2, x + GOOMBA_W / 2, y + GOOMBA_H / 2 + 2, GOOMBA_W);
    grad.addColorStop(0, '#b5773d');
    grad.addColorStop(0.6, '#7a4a20');
    grad.addColorStop(1, '#4a2c12');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x + GOOMBA_W / 2, y + GOOMBA_H * 0.55, GOOMBA_W / 2, GOOMBA_H * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // tan jaw band
    ctx.fillStyle = '#d0a464';
    ctx.beginPath();
    ctx.ellipse(x + GOOMBA_W / 2, y + GOOMBA_H * 0.72, GOOMBA_W / 2 - 1, 3, 0, 0, Math.PI);
    ctx.fill();
    // eyes (white) with black pupils
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 3, y + 5, 3, 4);
    ctx.fillRect(x + GOOMBA_W - 6, y + 5, 3, 4);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x + 4, y + 6, 2, 3);
    ctx.fillRect(x + GOOMBA_W - 5, y + 6, 2, 3);
    // angry eyebrows
    ctx.fillStyle = '#2a160a';
    ctx.fillRect(x + 2, y + 4, 4, 1);
    ctx.fillRect(x + 4, y + 3, 2, 1);
    ctx.fillRect(x + GOOMBA_W - 6, y + 4, 4, 1);
    ctx.fillRect(x + GOOMBA_W - 6, y + 3, 2, 1);
    // mouth
    ctx.fillStyle = '#2a160a';
    ctx.fillRect(x + GOOMBA_W / 2 - 2, y + GOOMBA_H - 4, 4, 1);
    // shuffling feet
    ctx.fillStyle = '#2a160a';
    if (phase === 0) {
        ctx.fillRect(x, y + GOOMBA_H - 2, 5, 2);
        ctx.fillRect(x + GOOMBA_W - 5, y + GOOMBA_H - 1, 5, 1);
    } else {
        ctx.fillRect(x, y + GOOMBA_H - 1, 5, 1);
        ctx.fillRect(x + GOOMBA_W - 5, y + GOOMBA_H - 2, 5, 2);
    }
}

function drawMushroom(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const w = POWERUP_SIZE;
    const cx = x + w / 2;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(cx, y + w + 1, w / 2 - 1, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // stem
    const stemGrad = ctx.createLinearGradient(x, y + w / 2, x, y + w);
    stemGrad.addColorStop(0, '#fff5d6');
    stemGrad.addColorStop(1, '#dcb37a');
    ctx.fillStyle = stemGrad;
    ctx.fillRect(x + 3, y + w / 2 + 1, w - 6, w / 2 - 1);
    // stem eyes
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 5, y + w / 2 + 3, 1, 2);
    ctx.fillRect(x + w - 6, y + w / 2 + 3, 1, 2);
    // dome
    const domeGrad = ctx.createRadialGradient(cx - 3, y + 2, 1, cx, y + w / 2, w);
    domeGrad.addColorStop(0, '#ff7575');
    domeGrad.addColorStop(0.7, '#d6322a');
    domeGrad.addColorStop(1, '#962018');
    ctx.fillStyle = domeGrad;
    ctx.beginPath();
    ctx.arc(cx, y + w / 2 + 1, w / 2, Math.PI, 0);
    ctx.fill();
    // dome rim (dark)
    ctx.fillStyle = '#7a1812';
    ctx.fillRect(x + 1, y + w / 2, w - 2, 1);
    // dome white spots
    ctx.fillStyle = '#fffefa';
    ctx.beginPath();
    ctx.ellipse(cx - 3, y + 4, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 3, y + 5, 2.4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // dome highlight
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(cx - 4, y + 2, 1, 1);
    ctx.fillRect(cx - 3, y + 1, 1, 1);
}

function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, timeMs: number) {
    const w = POWERUP_SIZE;
    const cx = x + w / 2;
    const cy = y + w / 2;
    const bob = Math.sin(timeMs / 280) * 0.4;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, y + w + 1, w / 2 - 1, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // stem + leaf
    ctx.fillStyle = '#2f8c3a';
    ctx.fillRect(cx - 1, cy + 1, 2, w / 2 - 1);
    ctx.fillStyle = '#4cbf5a';
    ctx.beginPath();
    ctx.ellipse(cx - 3, cy + 4, 3, 1.5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // petals
    const petals = ['#ff9248', '#ffae5a', '#ff7a26', '#ffb169', '#ffa050'];
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2 + bob;
        const px = cx + Math.cos(angle) * 3.5;
        const py = cy - 1 + Math.sin(angle) * 3.5;
        ctx.fillStyle = petals[i];
        ctx.beginPath();
        ctx.ellipse(px, py, 3, 2.4, angle, 0, Math.PI * 2);
        ctx.fill();
    }
    // center
    const centerGrad = ctx.createRadialGradient(cx - 1, cy - 2, 0, cx, cy - 1, 3);
    centerGrad.addColorStop(0, '#fff9b8');
    centerGrad.addColorStop(1, '#f4b400');
    ctx.fillStyle = centerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy - 1, 2.6, 0, Math.PI * 2);
    ctx.fill();
    // tiny eyes
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(cx - 2, cy - 2, 1, 1);
    ctx.fillRect(cx + 1, cy - 2, 1, 1);
}

// ─── Fireballs ─────────────────────────────────────────────────────────────

function drawFireballs(ctx: CanvasRenderingContext2D, world: World) {
    const camX = world.cameraX;
    for (const f of world.fireballs) {
        if (!f.alive) continue;
        const fx = f.x - camX;
        const fy = f.y;
        const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, 9);
        glow.addColorStop(0, 'rgba(255, 180, 70, 0.75)');
        glow.addColorStop(0.5, 'rgba(255, 120, 30, 0.35)');
        glow.addColorStop(1, 'rgba(255, 100, 30, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(fx, fy, 9, 0, Math.PI * 2);
        ctx.fill();
        // outer
        ctx.fillStyle = '#ff9d2a';
        ctx.beginPath();
        ctx.arc(fx, fy, 3.5, 0, Math.PI * 2);
        ctx.fill();
        // core
        ctx.fillStyle = '#fff7c0';
        ctx.beginPath();
        ctx.arc(fx - 0.5, fy - 0.5, 1.6, 0, Math.PI * 2);
        ctx.fill();
        // bright center
        ctx.fillStyle = '#fff';
        ctx.fillRect(Math.round(fx) - 1, Math.round(fy) - 1, 1, 1);
    }
}

// ─── Player ────────────────────────────────────────────────────────────────

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, world: World) {
    const px = p.x - world.cameraX;
    const py = p.y;
    const flicker = p.invulnMs > 0 && Math.floor(p.invulnMs / 80) % 2 === 0;
    if (flicker) return;

    const isFire = p.powerUp === 'fire';
    const isBig = p.powerUp !== 'small';
    const overall = isFire ? '#eeeeee' : '#1565c0';
    const overallShadow = isFire ? '#bdbdbd' : '#0d3a7c';
    const shirt = isFire ? '#e53935' : '#e53935';
    const cap = isFire ? '#e53935' : '#e53935';
    const capDark = '#8c1b16';
    const skin = '#fcc89b';
    const skinShadow = '#d99876';
    const mustache = '#3a1f0d';
    const shoes = '#311b09';
    const shoesShine = '#5b3a1b';
    const button = '#ffe44a';

    const w = p.w;
    const h = p.h;
    const facing = p.facing;
    const state = !p.onGround ? 'jump' : Math.abs(p.vx) > 0.01 ? 'walk' : 'idle';
    const walkPhase = state === 'walk' ? Math.floor((world.timeMs / 110) % 2) : 0;
    const headH = isBig ? 11 : 7;
    const bodyY = py + headH;
    const bodyH = h - headH;

    // ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(px + w / 2, py + h + 1.5, w / 2, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // ─ Cap ─
    ctx.fillStyle = cap;
    ctx.fillRect(px - 1, py + 1, w + 2, 3);
    ctx.fillRect(px, py, w, 2);
    // brim
    ctx.fillStyle = capDark;
    ctx.fillRect(px - 1, py + 3, w + 2, 1);
    // cap front emblem
    ctx.fillStyle = '#fff';
    const emblemX = facing === 1 ? px + w - 5 : px + 2;
    ctx.fillRect(emblemX, py + 1, 3, 2);
    ctx.fillStyle = '#e53935';
    ctx.fillRect(emblemX + 1, py + 1, 1, 1);
    // cap highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(px + 1, py + 1, w - 2, 1);

    // ─ Face ─
    const faceTop = py + 4;
    const faceH = headH - 4;
    ctx.fillStyle = skin;
    ctx.fillRect(px + 1, faceTop, w - 2, faceH);
    // ear (opposite to facing)
    ctx.fillStyle = skinShadow;
    const earX = facing === 1 ? px : px + w - 1;
    ctx.fillRect(earX, faceTop + 1, 1, 2);
    // hair sideburn (same side as ear)
    ctx.fillStyle = mustache;
    ctx.fillRect(earX, faceTop, 1, 1);
    // eye
    ctx.fillStyle = '#fff';
    const eyeX = facing === 1 ? px + w - 5 : px + 2;
    ctx.fillRect(eyeX, faceTop + 1, 2, 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(eyeX + (facing === 1 ? 0 : 1), faceTop + 1, 1, 2);
    // mustache (last face row)
    ctx.fillStyle = mustache;
    ctx.fillRect(px + 2, faceTop + faceH - 1, w - 4, 1);
    if (isBig) {
        // bigger mustache for big/fire
        ctx.fillRect(px + 1, faceTop + faceH - 2, 2, 1);
        ctx.fillRect(px + w - 3, faceTop + faceH - 2, 2, 1);
    }
    // nose hint
    ctx.fillStyle = skinShadow;
    const noseX = facing === 1 ? px + w - 4 : px + 3;
    ctx.fillRect(noseX, faceTop + faceH - 2, 1, 1);

    // ─ Body / overalls ─
    const shoeH = 2;
    const bodyDrawH = bodyH - shoeH;
    // shirt under straps
    ctx.fillStyle = shirt;
    ctx.fillRect(px, bodyY, w, bodyDrawH);
    // overalls (cover most, leaving a V at top)
    ctx.fillStyle = overall;
    ctx.fillRect(px, bodyY + 1, 2, bodyDrawH - 1);
    ctx.fillRect(px + w - 2, bodyY + 1, 2, bodyDrawH - 1);
    ctx.fillRect(px + 2, bodyY + 2, w - 4, bodyDrawH - 2);
    // straps
    ctx.fillRect(px + 3, bodyY, 2, 2);
    ctx.fillRect(px + w - 5, bodyY, 2, 2);
    // shirt V (between straps)
    ctx.fillStyle = shirt;
    ctx.fillRect(px + 5, bodyY, w - 10, 2);
    // buttons
    ctx.fillStyle = button;
    ctx.fillRect(px + 2, bodyY + 3, 1, 1);
    ctx.fillRect(px + w - 3, bodyY + 3, 1, 1);
    // overall shadow band
    ctx.fillStyle = overallShadow;
    ctx.fillRect(px, bodyY + bodyDrawH - 1, w, 1);
    // arms (skin) sticking out
    ctx.fillStyle = skin;
    ctx.fillRect(px - 1, bodyY + 2, 1, 3);
    ctx.fillRect(px + w, bodyY + 2, 1, 3);
    // hands
    ctx.fillStyle = '#fff';
    ctx.fillRect(px - 1, bodyY + 5, 1, 2);
    ctx.fillRect(px + w, bodyY + 5, 1, 2);

    // ─ Legs / shoes ─
    ctx.fillStyle = shoes;
    if (state === 'jump') {
        // both feet pointing slightly down/forward
        if (facing === 1) {
            ctx.fillRect(px + 2, py + h - shoeH, 5, shoeH);
            ctx.fillRect(px + w - 5, py + h - shoeH - 1, 5, shoeH + 1);
        } else {
            ctx.fillRect(px, py + h - shoeH - 1, 5, shoeH + 1);
            ctx.fillRect(px + w - 7, py + h - shoeH, 5, shoeH);
        }
    } else if (state === 'walk') {
        if (walkPhase === 0) {
            ctx.fillRect(px, py + h - shoeH, 6, shoeH);
            ctx.fillRect(px + w - 5, py + h - shoeH - 1, 5, shoeH + 1);
        } else {
            ctx.fillRect(px + 1, py + h - shoeH - 1, 5, shoeH + 1);
            ctx.fillRect(px + w - 6, py + h - shoeH, 6, shoeH);
        }
    } else {
        ctx.fillRect(px, py + h - shoeH, 6, shoeH);
        ctx.fillRect(px + w - 6, py + h - shoeH, 6, shoeH);
    }
    // shoe shines (front tip)
    ctx.fillStyle = shoesShine;
    if (state === 'jump') {
        ctx.fillRect(px + (facing === 1 ? w - 2 : 0), py + h - shoeH, 1, 1);
    } else if (state === 'walk' && walkPhase === 0) {
        ctx.fillRect(px + (facing === 1 ? w - 2 : 0), py + h - shoeH, 1, 1);
    } else if (state === 'walk' && walkPhase === 1) {
        ctx.fillRect(px + (facing === 1 ? 5 : w - 6), py + h - shoeH - 1, 1, 1);
    }

    // Fire aura while powered up
    if (isFire) {
        const glow = ctx.createRadialGradient(px + w / 2, py + h / 2, 2, px + w / 2, py + h / 2, w);
        glow.addColorStop(0, 'rgba(255, 160, 60, 0)');
        glow.addColorStop(1, 'rgba(255, 160, 60, 0.18)');
        ctx.fillStyle = glow;
        ctx.fillRect(px - 4, py - 4, w + 8, h + 8);
    }
}

// ─── HUD ───────────────────────────────────────────────────────────────────

function drawHud(ctx: CanvasRenderingContext2D, world: World) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(8, 8, 78, 18);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.strokeRect(8.5, 8.5, 77, 17);
    ctx.fillStyle = '#a8defd';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('DIST', 14, 17);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`${Math.floor(world.distanceTiles)} m`, 40, 17);
}
