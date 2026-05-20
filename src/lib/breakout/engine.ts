import {
    W, H, PADDLE_Y, PADDLE_H, PADDLE_W_DEFAULT, BALL_R, BASE_SPEED,
    BRICK_W, BRICK_H, BRICK_GAP, BRICK_COLS, BRICK_ROWS, BRICK_OFFSET_X, BRICK_OFFSET_Y,
    LEVELS,
    type BrickType, type PowerUpType,
} from './constants';

export type Brick = {
    col: number;
    row: number;
    hp: number;
    maxHp: number;
    type: BrickType;
    power?: PowerUpType;
};

export type Ball = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    stuck: boolean;
};

export type Laser = {
    x: number;
    y: number;
};

export type FallingPowerUp = {
    x: number;
    y: number;
    type: PowerUpType;
};

export type Particle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    color: string;
    life: number;
};

export type ActiveEffect = {
    type: PowerUpType;
    until: number; // frame counter
};

export type GameState = {
    bricks: Brick[];
    balls: Ball[];
    paddleX: number;
    paddleW: number;
    lasers: Laser[];
    fallingPowers: FallingPowerUp[];
    particles: Particle[];
    score: number;
    lives: number;
    level: number;
    tick: number;
    activeEffects: ActiveEffect[];
    laserMode: boolean;
    stickyMode: boolean;
    won: boolean;
    dead: boolean;
};

const POWERUP_TYPES: PowerUpType[] = ['WIDE', 'SLOW', 'MULTI', 'LIFE', 'STICKY', 'LASER', 'BOMB', 'NARROW', 'FAST'];

function brickX(col: number) {
    return BRICK_OFFSET_X + col * (BRICK_W + BRICK_GAP);
}

function brickY(row: number) {
    return BRICK_OFFSET_Y + row * (BRICK_H + BRICK_GAP);
}

function randomPower(isHard: boolean): PowerUpType | undefined {
    const chance = isHard ? 0.30 : 0.15;
    if (Math.random() > chance) return undefined;
    return POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
}

/**
 * Génère un masque booléen [row][col] définissant la forme du niveau.
 * 8 patterns géométriques distincts en rotation.
 */
function buildMask(pattern: number, rows: number): boolean[][] {
    const C = BRICK_COLS;
    const grid: boolean[][] = Array.from({ length: rows }, () => new Array(C).fill(false));

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < C; c++) {
            const d = Math.abs(c - (C - 1) / 2); // distance from center col (0 → 3.5)
            const nr = rows > 1 ? r / (rows - 1) : 0; // normalized row 0→1

            switch (pattern) {
                // 0 · Vagues sinusoïdales
                case 0: {
                    const shift = Math.sin(r * 1.1) * 2.2;
                    grid[r][c] = Math.abs(c - (C - 1) / 2 - shift) <= 2.8;
                    break;
                }
                // 1 · Entonnoir (large en haut, étroit en bas)
                case 1: {
                    const margin = Math.floor(nr * 3);
                    grid[r][c] = c >= margin && c < C - margin;
                    break;
                }
                // 2 · Chevrons (V pointant vers le haut)
                case 2: {
                    grid[r][c] = r <= rows - 1 - d * 0.7;
                    break;
                }
                // 3 · Rempart — rangées alternées pleines / crénelées
                case 3: {
                    grid[r][c] = r % 2 === 0 || c % 3 !== 1;
                    break;
                }
                // 4 · Brickwork — décalage rang/colonne (motif classique)
                case 4: {
                    grid[r][c] = true; // plein ; la densité crée les trous
                    break;
                }
                // 5 · Croix — colonnes centrales + rangées extrêmes
                case 5: {
                    grid[r][c] = (c >= 2 && c <= 5) || r === 0 || r === rows - 1;
                    break;
                }
                // 6 · Diagonales croisées
                case 6: {
                    grid[r][c] = (r + c) % 3 !== 2;
                    break;
                }
                // 7 · Anneaux concentriques
                case 7: {
                    const ring = Math.min(d, Math.min(r, rows - 1 - r));
                    grid[r][c] = ring % 2 === 0;
                    break;
                }
            }
        }
    }
    return grid;
}

export function buildLevel(level: number): Brick[] {
    const bricks: Brick[] = [];

    if (level <= LEVELS.length) {
        const layout = LEVELS[level - 1];
        for (let row = 0; row < BRICK_ROWS; row++) {
            for (let col = 0; col < BRICK_COLS; col++) {
                const v = layout[row]?.[col] ?? 0;
                if (v === 0) continue;
                const type: BrickType =
                    v === 3 ? 'indestructible' :
                    v === 2 ? 'hard' :
                    v === 4 ? 'explosive' : 'normal';
                const hp = type === 'hard' ? 2 : type === 'indestructible' ? Infinity : 1;
                bricks.push({
                    col, row, hp, maxHp: hp,
                    type,
                    power: type === 'indestructible' ? undefined : randomPower(type === 'hard'),
                });
            }
        }
    } else {
        // Génération procédurale — 8 patterns géométriques en rotation
        const t = Math.min(1, (level - LEVELS.length) / 20); // 0 → 1 sur 20 niveaux
        const density    = 0.60 + t * 0.30;
        const hardFrac   = 0.08 + t * 0.37;
        const indFrac    = t * 0.12;
        const expFrac    = 0.03 + t * 0.12;
        const activeRows = Math.min(BRICK_ROWS - 1, 4 + Math.floor(t * 4));
        const pattern    = (level - LEVELS.length - 1) % 8;

        const mask = buildMask(pattern, activeRows);

        for (let row = 0; row < activeRows; row++) {
            for (let col = 0; col < BRICK_COLS; col++) {
                if (!mask[row][col]) continue;
                if (Math.random() > density) continue;
                const r = Math.random();
                const type: BrickType =
                    r < indFrac                          ? 'indestructible' :
                    r < indFrac + expFrac                ? 'explosive' :
                    r < indFrac + expFrac + hardFrac     ? 'hard' : 'normal';
                const hp = type === 'hard' ? 2 : type === 'indestructible' ? Infinity : 1;
                bricks.push({
                    col, row, hp, maxHp: hp, type,
                    power: type === 'indestructible' ? undefined : randomPower(type === 'hard'),
                });
            }
        }
    }

    return bricks;
}

function makeBall(paddleX: number, paddleW: number): Ball {
    const speed = BASE_SPEED;
    return {
        x: paddleX + paddleW / 2,
        y: PADDLE_Y - BALL_R - 2,
        vx: (Math.random() * 2 - 1) * speed * 0.6,
        vy: -speed,
        stuck: true,
    };
}

export function makeInitialState(level = 1): GameState {
    const paddleW = PADDLE_W_DEFAULT;
    const paddleX = (W - paddleW) / 2;
    return {
        bricks: buildLevel(level),
        balls: [makeBall(paddleX, paddleW)],
        paddleX,
        paddleW,
        lasers: [],
        fallingPowers: [],
        particles: [],
        score: 0,
        lives: 3,
        level,
        tick: 0,
        activeEffects: [],
        laserMode: false,
        stickyMode: false,
        won: false,
        dead: false,
    };
}

function spawnParticles(particles: Particle[], x: number, y: number, color: string): void {
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const speed = 1.5 + Math.random() * 2;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            r: 2 + Math.random() * 2,
            color,
            life: 20 + Math.floor(Math.random() * 10),
        });
    }
}

function getEffectiveSpeed(state: GameState): number {
    const speed = BASE_SPEED + (state.level - 1) * 0.15;
    const hasSlow = state.activeEffects.some(e => e.type === 'SLOW');
    const hasFast = state.activeEffects.some(e => e.type === 'FAST');
    if (hasSlow) return speed * 0.65;
    if (hasFast) return speed * 1.5;
    return speed;
}

// Minimum vertical share of velocity. Below this the ball bounces
// near-horizontally and appears to "crawl" toward bricks.
const MIN_VY_RATIO = 0.25;
// Minimum horizontal share so the ball doesn't fall in a perfectly vertical line.
const MIN_VX_RATIO = 0.10;

function normalizeBallSpeed(ball: Ball, targetSpeed: number): Ball {
    let { vx, vy } = ball;
    const mag = Math.sqrt(vx * vx + vy * vy);
    if (mag === 0) return { ...ball, vx: 0, vy: -targetSpeed };

    // Enforce minimum |vy| share so trajectory never goes flat-horizontal.
    const minVy = targetSpeed * MIN_VY_RATIO;
    if (Math.abs(vy) < minVy) {
        const signVy = vy === 0 ? -1 : Math.sign(vy);
        vy = signVy * minVy;
        const remaining = Math.max(0, targetSpeed * targetSpeed - vy * vy);
        const signVx = vx === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(vx);
        vx = signVx * Math.sqrt(remaining);
    }
    // Enforce minimum |vx| so trajectory never goes pure-vertical (infinite wall ping-pong avoided).
    const minVx = targetSpeed * MIN_VX_RATIO;
    if (Math.abs(vx) < minVx) {
        const signVx = vx === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(vx);
        vx = signVx * minVx;
        const remaining = Math.max(0, targetSpeed * targetSpeed - vx * vx);
        const signVy = vy === 0 ? -1 : Math.sign(vy);
        vy = signVy * Math.sqrt(remaining);
    }

    // Final scale to exactly targetSpeed.
    const newMag = Math.sqrt(vx * vx + vy * vy);
    const scale = targetSpeed / (newMag || 1);
    return { ...ball, vx: vx * scale, vy: vy * scale };
}

function brickRect(b: Brick) {
    return { x: brickX(b.col), y: brickY(b.row), w: BRICK_W, h: BRICK_H };
}

// Returns overlap depth on x and y axes for ball vs rect collision
function ballRectCollide(
    bx: number, by: number, br: number,
    rx: number, ry: number, rw: number, rh: number
): { overlapX: number; overlapY: number; dx: number; dy: number } | null {
    const closestX = Math.max(rx, Math.min(bx, rx + rw));
    const closestY = Math.max(ry, Math.min(by, ry + rh));
    const dx = bx - closestX;
    const dy = by - closestY;
    if (dx * dx + dy * dy > br * br) return null;

    // overlap for bounce direction resolution
    const overlapX = br - Math.abs(dx);
    const overlapY = br - Math.abs(dy);
    return { overlapX, overlapY, dx, dy };
}

export type StepResult = {
    state: GameState;
    levelComplete: boolean;
    ballLost: boolean;
};

export function stepGame(state: GameState, paddleTargetX: number | null, fireLaser: boolean): StepResult {
    let {
        bricks, balls, paddleX, paddleW, lasers, fallingPowers, particles,
        score, lives, level, tick, activeEffects, laserMode, stickyMode,
    } = state;

    tick++;

    // Expire effects
    activeEffects = activeEffects.filter(e => e.until > tick);
    laserMode = activeEffects.some(e => e.type === 'LASER');
    stickyMode = activeEffects.some(e => e.type === 'STICKY');

    // Effective paddle width
    const hasWide = activeEffects.some(e => e.type === 'WIDE');
    const hasNarrow = activeEffects.some(e => e.type === 'NARROW');
    paddleW = hasWide ? PADDLE_W_DEFAULT * 1.5 : hasNarrow ? PADDLE_W_DEFAULT * 0.7 : PADDLE_W_DEFAULT;

    // Move paddle
    if (paddleTargetX !== null) {
        const targetX = Math.max(0, Math.min(W - paddleW, paddleTargetX - paddleW / 2));
        paddleX = targetX;
    }

    const targetSpeed = getEffectiveSpeed({ ...state, activeEffects, level });
    const scoreMulti = balls.length > 1 ? 1.5 : 1.0;

    // Fire lasers
    const newLasers: Laser[] = [...lasers];
    if (fireLaser && laserMode) {
        newLasers.push({ x: paddleX + 4, y: PADDLE_Y });
        newLasers.push({ x: paddleX + paddleW - 4, y: PADDLE_Y });
    }

    // Move lasers upward
    const movedLasers: Laser[] = newLasers
        .map(l => ({ ...l, y: l.y - 6 }))
        .filter(l => l.y > 0);

    // Laser-brick collisions
    const destroyedByLaser = new Set<number>();
    for (const laser of movedLasers) {
        for (let i = 0; i < bricks.length; i++) {
            const b = bricks[i];
            if (b.type === 'indestructible') continue;
            const r = brickRect(b);
            if (laser.x >= r.x && laser.x <= r.x + r.w && laser.y >= r.y && laser.y <= r.y + r.h) {
                destroyedByLaser.add(i);
            }
        }
    }

    // Move falling power-ups
    const newFallingPowers: FallingPowerUp[] = fallingPowers
        .map(p => ({ ...p, y: p.y + 1 }))
        .filter(p => p.y < H + 20);

    // Collect power-ups
    const collectedPowers: PowerUpType[] = [];
    const remainingFalling = newFallingPowers.filter(p => {
        const hitPaddle =
            p.y + 8 >= PADDLE_Y && p.y - 8 <= PADDLE_Y + PADDLE_H &&
            p.x >= paddleX - 10 && p.x <= paddleX + paddleW + 10;
        if (hitPaddle) { collectedPowers.push(p.type); return false; }
        return true;
    });

    // Apply collected power-ups
    let newLives = lives;
    const newEffects: ActiveEffect[] = [...activeEffects];
    for (const ptype of collectedPowers) {
        if (ptype === 'LIFE') {
            newLives = Math.min(newLives + 1, 9);
        } else if (ptype === 'MULTI') {
            // spawn 2 extra balls from paddle center
            const cx = paddleX + paddleW / 2;
            for (let i = 0; i < 2; i++) {
                const angle = -Math.PI / 2 + (i - 0.5) * 0.6;
                balls = [...balls, {
                    x: cx, y: PADDLE_Y - BALL_R - 2,
                    vx: Math.cos(angle) * targetSpeed,
                    vy: Math.sin(angle) * targetSpeed,
                    stuck: false,
                }];
            }
        } else if (ptype === 'BOMB') {
            // destroy 9 random destructible bricks
            const destructible = bricks
                .map((b, i) => ({ b, i }))
                .filter(({ b }) => b.type !== 'indestructible');
            const picks = destructible.sort(() => Math.random() - 0.5).slice(0, 9);
            for (const { i } of picks) destroyedByLaser.add(i);
        } else {
            const durations: Record<PowerUpType, number> = {
                WIDE: 20 * 60, NARROW: 10 * 60, SLOW: 15 * 60, FAST: 10 * 60,
                STICKY: 20 * 60, LASER: 20 * 60,
                MULTI: 0, LIFE: 0, BOMB: 0,
            };
            const dur = durations[ptype];
            if (dur > 0) {
                // remove existing same-type effect, add new
                const filtered = newEffects.filter(e => e.type !== ptype);
                filtered.push({ type: ptype, until: tick + dur });
                newEffects.splice(0, newEffects.length, ...filtered);
            }
        }
    }

    // Process brick destruction (laser hits + explosions)
    const newBricks = [...bricks];
    let addScore = 0;
    const toExplode: number[] = [];

    for (const idx of destroyedByLaser) {
        const b = newBricks[idx];
        if (!b || b.type === 'indestructible') continue;
        addScore += Math.round((b.type === 'hard' ? 20 : 10) * scoreMulti);
        const cx = brickX(b.col) + BRICK_W / 2;
        const cy = brickY(b.row) + BRICK_H / 2;
        spawnParticles(particles, cx, cy, '#f97316');
        if (b.type === 'explosive') toExplode.push(idx);
        if (b.power) {
            remainingFalling.push({ x: cx, y: cy, type: b.power });
        }
        newBricks[idx] = null as unknown as Brick;
    }

    // Chain explosions
    const exploded = new Set(toExplode);
    const explodeQueue = [...toExplode];
    while (explodeQueue.length) {
        const eIdx = explodeQueue.pop()!;
        const eb = bricks[eIdx];
        if (!eb) continue;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = eb.row + dr;
                const nc = eb.col + dc;
                const ni = newBricks.findIndex(b => b && b.row === nr && b.col === nc);
                if (ni === -1 || exploded.has(ni)) continue;
                const nb = newBricks[ni];
                if (nb.type === 'indestructible') continue;
                addScore += Math.round(5 * scoreMulti);
                const cx = brickX(nb.col) + BRICK_W / 2;
                const cy = brickY(nb.row) + BRICK_H / 2;
                spawnParticles(particles, cx, cy, '#fbbf24');
                if (nb.power) remainingFalling.push({ x: cx, y: cy, type: nb.power });
                if (nb.type === 'explosive' && !exploded.has(ni)) {
                    exploded.add(ni);
                    explodeQueue.push(ni);
                }
                newBricks[ni] = null as unknown as Brick;
            }
        }
    }

    // Move balls
    let newBalls: Ball[] = [];
    let ballLost = false;

    for (const ball of balls) {
        if (ball.stuck) {
            // Keep ball glued to paddle center
            newBalls.push({
                ...ball,
                x: paddleX + paddleW / 2,
                y: PADDLE_Y - BALL_R - 2,
            });
            continue;
        }

        let { x, y, vx, vy } = normalizeBallSpeed(ball, targetSpeed);
        x += vx;
        y += vy;

        // Wall bounces
        if (x - BALL_R < 0) { x = BALL_R; vx = Math.abs(vx); }
        if (x + BALL_R > W) { x = W - BALL_R; vx = -Math.abs(vx); }
        if (y - BALL_R < 0) { y = BALL_R; vy = Math.abs(vy); }

        // Paddle collision
        if (
            vy > 0 &&
            y + BALL_R >= PADDLE_Y &&
            y - BALL_R <= PADDLE_Y + PADDLE_H &&
            x >= paddleX - BALL_R &&
            x <= paddleX + paddleW + BALL_R
        ) {
            y = PADDLE_Y - BALL_R;
            // Angle based on hit position (−1 to +1)
            const rel = (x - (paddleX + paddleW / 2)) / (paddleW / 2);
            const angle = rel * (Math.PI / 3); // max 60°
            const speed = targetSpeed;
            vx = Math.sin(angle) * speed;
            vy = -Math.cos(angle) * speed;

            if (stickyMode) {
                newBalls.push({ x, y, vx, vy, stuck: true });
                continue;
            }
        }

        // Ball lost
        if (y - BALL_R > H) {
            ballLost = true;
            continue;
        }

        // Brick collisions
        for (let i = 0; i < newBricks.length; i++) {
            const b = newBricks[i];
            if (!b) continue;
            const r = brickRect(b);
            const col = ballRectCollide(x, y, BALL_R, r.x, r.y, r.w, r.h);
            if (!col) continue;

            const { overlapX, overlapY, dx, dy } = col;
            // Velocity gate: only bounce if ball is actually moving toward the hit face.
            // Prevents the ball from getting stuck when simultaneously touching a wall
            // and an indestructible brick (e.g. top wall + row-0 bricks in level 4).
            if (overlapX < overlapY) {
                if (dx === 0 || dx * vx < 0) {
                    vx = -vx;
                    x += vx > 0 ? overlapX : -overlapX;
                }
            } else {
                if (dy === 0 || dy * vy < 0) {
                    vy = -vy;
                    y += vy > 0 ? overlapY : -overlapY;
                }
            }

            if (b.type === 'indestructible') continue;

            newBricks[i] = { ...b, hp: b.hp - 1 };
            if (newBricks[i].hp <= 0) {
                const pts = b.type === 'hard' ? 20 : 10;
                addScore += Math.round(pts * scoreMulti);
                const cx = r.x + r.w / 2;
                const cy = r.y + r.h / 2;
                spawnParticles(particles, cx, cy, '#a855f7');
                if (b.power) remainingFalling.push({ x: cx, y: cy, type: b.power });
                if (b.type === 'explosive') {
                    // explosion handled below via queue
                    const eIdx = i;
                    if (!exploded.has(eIdx)) {
                        exploded.add(eIdx);
                        const explodeQueueLocal = [eIdx];
                        while (explodeQueueLocal.length) {
                            const eidx = explodeQueueLocal.pop()!;
                            const eb2 = newBricks[eidx];
                            if (!eb2) continue;
                            for (let dr = -1; dr <= 1; dr++) {
                                for (let dc = -1; dc <= 1; dc++) {
                                    if (dr === 0 && dc === 0) continue;
                                    const ni = newBricks.findIndex(
                                        nb => nb && nb.row === eb2.row + dr && nb.col === eb2.col + dc
                                    );
                                    if (ni === -1 || exploded.has(ni)) continue;
                                    const nb2 = newBricks[ni];
                                    if (nb2.type === 'indestructible') continue;
                                    addScore += Math.round(5 * scoreMulti);
                                    spawnParticles(particles, brickX(nb2.col) + BRICK_W / 2, brickY(nb2.row) + BRICK_H / 2, '#fbbf24');
                                    if (nb2.power) remainingFalling.push({ x: brickX(nb2.col) + BRICK_W / 2, y: brickY(nb2.row) + BRICK_H / 2, type: nb2.power });
                                    if (nb2.type === 'explosive') { exploded.add(ni); explodeQueueLocal.push(ni); }
                                    newBricks[ni] = null as unknown as Brick;
                                }
                            }
                        }
                    }
                    newBricks[eIdx] = null as unknown as Brick;
                } else {
                    newBricks[i] = null as unknown as Brick;
                }
            }
            break; // one brick per frame per ball
        }

        newBalls.push({ x, y, vx, vy, stuck: false });
    }

    // Update particles
    particles = particles
        .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 1, r: p.r * 0.95 }))
        .filter(p => p.life > 0);

    const finalBricks = newBricks.filter(Boolean) as Brick[];
    const destructible = finalBricks.filter(b => b.type !== 'indestructible');
    const levelComplete = destructible.length === 0;

    // If all balls lost
    let newLives2 = newLives;
    if (newBalls.length === 0 && ballLost) {
        newLives2--;
        if (newLives2 > 0) {
            // Respawn single ball stuck to paddle
            newBalls = [makeBall(paddleX, paddleW)];
        }
    }

    return {
        state: {
            bricks: finalBricks,
            balls: newBalls,
            paddleX,
            paddleW,
            lasers: movedLasers.filter(l => {
                // remove lasers that hit bricks
                return !finalBricks.some(b => {
                    const r = brickRect(b);
                    return l.x >= r.x && l.x <= r.x + r.w && l.y >= r.y && l.y <= r.y + r.h;
                });
            }),
            fallingPowers: remainingFalling,
            particles,
            score: score + addScore,
            lives: newLives2,
            level,
            tick,
            activeEffects: newEffects,
            laserMode: newEffects.some(e => e.type === 'LASER'),
            stickyMode: newEffects.some(e => e.type === 'STICKY'),
            won: false,
            dead: newLives2 <= 0 && newBalls.length === 0,
        },
        levelComplete,
        ballLost: newBalls.length === 0 || (ballLost && newLives2 < newLives),
    };
}

export function launchBall(state: GameState): GameState {
    const speed = BASE_SPEED + (state.level - 1) * 0.15;
    return {
        ...state,
        balls: state.balls.map(b => {
            if (!b.stuck) return b;
            const angle = -Math.PI / 2 + (Math.random() * 0.4 - 0.2);
            return {
                ...b,
                stuck: false,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
            };
        }),
    };
}
