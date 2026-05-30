import {
    AHEAD_TILES,
    CHUNK_TILES,
    DISTANCE_DIVISOR,
    FIRE_COOLDOWN_MS,
    FIREBALL_BOUNCE_VY,
    FIREBALL_VX,
    FIREBALL_VY0,
    GOOMBA_H,
    GOOMBA_SPEED,
    GOOMBA_W,
    GRAVITY,
    GROUND_ROW,
    HEIGHT,
    INVULN_MS,
    JUMP_HOLD_BOOST,
    JUMP_HOLD_MAX_MS,
    JUMP_VY,
    MAX_FALL_VY,
    MOVE_SPEED,
    PLAYER_H_BIG,
    PLAYER_H_SMALL,
    PLAYER_W,
    POWERUP_SIZE,
    COIN_SIZE,
    ROWS,
    SCORE_COIN,
    SCORE_POWERUP,
    SCORE_STOMP,
    TILE,
    WIDTH,
} from './constants';

export type Tile = 'empty' | 'ground' | 'brick' | 'question' | 'usedBlock';

export type QuestionContent = 'coin' | 'mushroom' | 'flower';

export type EntityKind = 'goomba' | 'coin' | 'mushroom' | 'flower';
export interface Entity {
    kind: EntityKind;
    x: number;
    y: number;
    vx: number;
    vy: number;
    alive: boolean;
    onGround: boolean;
}

export interface Fireball {
    x: number;
    y: number;
    vx: number;
    vy: number;
    alive: boolean;
}

export type PowerUp = 'small' | 'big' | 'fire';

export interface Input {
    left: boolean;
    right: boolean;
    jump: boolean;
    fire: boolean;
}

export interface Player {
    x: number;
    y: number;
    vx: number;
    vy: number;
    w: number;
    h: number;
    onGround: boolean;
    powerUp: PowerUp;
    facing: 1 | -1;
    invulnMs: number;
    jumpHoldMs: number;
    lastFireMs: number;
    fireRequested: boolean;
    jumpRequested: boolean;
    lastSafeX: number;
    lastSafeY: number;
}

export interface World {
    // Column-major sparse map: tilesByX[x][row] = Tile
    tilesByX: Map<number, Tile[]>;
    // What a '?' block contains, keyed by `${col},${row}`
    questionContents: Map<string, QuestionContent>;
    entities: Entity[];
    fireballs: Fireball[];
    nextChunkX: number;      // next tile X to generate
    cameraX: number;         // world x of viewport left edge
    distanceTiles: number;   // max tile-column reached by player
    score: number;
    timeMs: number;          // accumulated step time (for cooldowns / power-up spawn pacing)
    rng: () => number;
}

// ─── RNG (seedable) ────────────────────────────────────────────────────────

export function makeRng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0x100000000;
    };
}

// ─── World init ────────────────────────────────────────────────────────────

export function createWorld(seed: number, powerUp: PowerUp = 'small'): { world: World; player: Player } {
    const world: World = {
        tilesByX: new Map(),
        questionContents: new Map(),
        entities: [],
        fireballs: [],
        nextChunkX: 0,
        cameraX: 0,
        distanceTiles: 0,
        score: 0,
        timeMs: 0,
        rng: makeRng(seed),
    };
    // First chunk: flat ground, no enemies (safe start).
    generateFlatStart(world);
    while (world.nextChunkX < AHEAD_TILES) generateChunk(world);

    const ph = powerUp === 'small' ? PLAYER_H_SMALL : PLAYER_H_BIG;
    const startX = 3 * TILE;
    const startY = GROUND_ROW * TILE - ph;
    const player: Player = {
        x: startX,
        y: startY,
        vx: 0,
        vy: 0,
        w: PLAYER_W,
        h: ph,
        onGround: true,
        powerUp,
        facing: 1,
        invulnMs: 0,
        jumpHoldMs: 0,
        lastFireMs: -FIRE_COOLDOWN_MS,
        fireRequested: false,
        jumpRequested: false,
        lastSafeX: startX,
        lastSafeY: startY,
    };
    return { world, player };
}

function setTile(world: World, x: number, row: number, tile: Tile) {
    let col = world.tilesByX.get(x);
    if (!col) {
        col = new Array(ROWS).fill('empty') as Tile[];
        world.tilesByX.set(x, col);
    }
    col[row] = tile;
}

function getTile(world: World, x: number, row: number): Tile {
    if (row < 0 || row >= ROWS) return 'empty';
    const col = world.tilesByX.get(x);
    return col ? col[row] : 'empty';
}

function generateFlatStart(world: World) {
    for (let x = 0; x < CHUNK_TILES; x++) {
        for (let row = GROUND_ROW; row < ROWS; row++) setTile(world, x, row, 'ground');
    }
    world.nextChunkX = CHUNK_TILES;
}

function generateChunk(world: World) {
    const startX = world.nextChunkX;
    const endX = startX + CHUNK_TILES;
    const distance = startX; // for difficulty scaling
    const gapsProb = Math.min(0.22, 0.06 + distance / 9000);
    const enemyProb = Math.min(0.35, 0.10 + distance / 5000);
    const platformProb = 0.18;
    const coinProb = 0.30;

    let x = startX;
    while (x < endX) {
        // Try to insert a gap (no ground for 2-3 tiles).
        if (x > startX + 1 && world.rng() < gapsProb) {
            const gapW = 2 + Math.floor(world.rng() * 2); // 2 or 3
            x += gapW;
            continue;
        }

        // Ground tile.
        for (let row = GROUND_ROW; row < ROWS; row++) setTile(world, x, row, 'ground');

        // Maybe a low brick/question over the ground (jumpable obstacle / bonus).
        if (world.rng() < platformProb) {
            const blockRow = GROUND_ROW - 4 - Math.floor(world.rng() * 2);
            const isQuestion = world.rng() < 0.4;
            setTile(world, x, blockRow, isQuestion ? 'question' : 'brick');
            if (isQuestion) {
                const roll = world.rng();
                const content: QuestionContent = roll < 0.78 ? 'coin' : roll < 0.93 ? 'mushroom' : 'flower';
                world.questionContents.set(`${x},${blockRow}`, content);
            }
            // small chance of an adjacent brick to form a "platform"
            if (world.rng() < 0.4 && x + 1 < endX) {
                setTile(world, x + 1, blockRow, 'brick');
            }
            // Coin floating just above ground when there's a block to hint at it
            if (world.rng() < coinProb) {
                pushEntity(world, 'coin', (x + 0.2) * TILE, (blockRow + 1.4) * TILE, 0);
            }
        } else if (world.rng() < coinProb) {
            // Free coin floating in the air
            const cy = (GROUND_ROW - 2 - Math.floor(world.rng() * 2)) * TILE;
            pushEntity(world, 'coin', (x + 0.2) * TILE, cy, 0);
        }

        // Maybe spawn a goomba on the ground
        if (world.rng() < enemyProb) {
            pushEntity(world, 'goomba', (x + 0.1) * TILE, (GROUND_ROW - 1) * TILE, -GOOMBA_SPEED);
        }

        // Rare powerup
        if (world.rng() < 0.012) {
            const kind: EntityKind = world.rng() < 0.6 ? 'mushroom' : 'flower';
            pushEntity(world, kind, (x + 0.2) * TILE, (GROUND_ROW - 4) * TILE, 0);
        }

        x++;
    }

    world.nextChunkX = endX;
}

function pushEntity(world: World, kind: EntityKind, x: number, y: number, vx: number) {
    world.entities.push({ kind, x, y, vx, vy: 0, alive: true, onGround: false });
}

// ─── Collision helpers ─────────────────────────────────────────────────────

function isSolid(t: Tile): boolean {
    return t === 'ground' || t === 'brick' || t === 'question' || t === 'usedBlock';
}

function tilesOverlapping(x: number, y: number, w: number, h: number): { c0: number; c1: number; r0: number; r1: number } {
    const c0 = Math.floor(x / TILE);
    const c1 = Math.floor((x + w - 1) / TILE);
    const r0 = Math.floor(y / TILE);
    const r1 = Math.floor((y + h - 1) / TILE);
    return { c0, c1, r0, r1 };
}

function collideAxis(world: World, ent: { x: number; y: number; vx: number; vy: number; w: number; h: number; onGround?: boolean }, axis: 'x' | 'y'): boolean {
    let hit = false;
    const { c0, c1, r0, r1 } = tilesOverlapping(ent.x, ent.y, ent.w, ent.h);
    for (let c = c0; c <= c1; c++) {
        for (let r = r0; r <= r1; r++) {
            if (isSolid(getTile(world, c, r))) {
                hit = true;
                if (axis === 'x') {
                    if (ent.vx > 0) ent.x = c * TILE - ent.w;
                    else if (ent.vx < 0) ent.x = (c + 1) * TILE;
                    ent.vx = 0;
                } else {
                    if (ent.vy > 0) {
                        ent.y = r * TILE - ent.h;
                        if (ent.onGround !== undefined) ent.onGround = true;
                    } else if (ent.vy < 0) {
                        ent.y = (r + 1) * TILE;
                    }
                    ent.vy = 0;
                }
                return hit;
            }
        }
    }
    return hit;
}

function rectsOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ─── Step ──────────────────────────────────────────────────────────────────

export type StepResult = { dead: boolean; reason?: 'fall' | 'enemy' };

export function step(world: World, player: Player, input: Input, dtMs: number): StepResult {
    world.timeMs += dtMs;
    if (player.invulnMs > 0) player.invulnMs = Math.max(0, player.invulnMs - dtMs);

    // ── Horizontal input ──
    const targetVx = (input.left ? -MOVE_SPEED : 0) + (input.right ? MOVE_SPEED : 0);
    player.vx = targetVx;
    if (player.vx > 0) player.facing = 1;
    else if (player.vx < 0) player.facing = -1;

    // ── Jump ──
    if (input.jump && player.onGround && !player.jumpRequested) {
        player.vy = JUMP_VY;
        player.onGround = false;
        player.jumpHoldMs = 0;
        player.jumpRequested = true;
    } else if (input.jump && !player.onGround && player.jumpHoldMs < JUMP_HOLD_MAX_MS) {
        player.vy -= JUMP_HOLD_BOOST * dtMs;
        player.jumpHoldMs += dtMs;
    }
    if (!input.jump) {
        player.jumpRequested = false;
        if (player.vy < 0) player.vy *= 0.6;
        player.jumpHoldMs = JUMP_HOLD_MAX_MS;
    }

    // ── Fire ──
    if (input.fire && !player.fireRequested && player.powerUp === 'fire' && world.timeMs - player.lastFireMs >= FIRE_COOLDOWN_MS) {
        player.lastFireMs = world.timeMs;
        world.fireballs.push({
            x: player.x + (player.facing === 1 ? player.w : -6),
            y: player.y + player.h * 0.4,
            vx: FIREBALL_VX * player.facing,
            vy: FIREBALL_VY0,
            alive: true,
        });
        player.fireRequested = true;
    }
    if (!input.fire) player.fireRequested = false;

    // ── Gravity ──
    player.vy = Math.min(MAX_FALL_VY, player.vy + GRAVITY * dtMs);

    // ── Integrate + collide ──
    player.x += player.vx * dtMs;
    collideAxis(world, player, 'x');
    player.onGround = false;
    const prevVy = player.vy;
    player.y += player.vy * dtMs;
    collideAxis(world, player, 'y');

    // ── ? block bump (head-hit) ──
    if (prevVy < 0 && player.vy === 0) {
        const hitRow = Math.floor(player.y / TILE) - 1;
        const cLeft = Math.floor(player.x / TILE);
        const cRight = Math.floor((player.x + player.w - 1) / TILE);
        for (let c = cLeft; c <= cRight; c++) {
            if (getTile(world, c, hitRow) !== 'question') continue;
            const key = `${c},${hitRow}`;
            const content = world.questionContents.get(key) ?? 'coin';
            world.questionContents.delete(key);
            setTile(world, c, hitRow, 'usedBlock');
            if (content === 'coin') {
                world.score += SCORE_COIN;
            } else {
                // Pop the item out on top of the block
                pushEntity(world, content, c * TILE + 1, (hitRow - 1) * TILE, 0);
            }
        }
    }

    // ── Track last safe ground (for fall recovery) ──
    if (player.onGround) {
        player.lastSafeX = player.x;
        player.lastSafeY = player.y;
    }

    // ── Camera follows player (player kept near 1/3 width) ──
    const targetCam = player.x - WIDTH * 0.35;
    if (targetCam > world.cameraX) world.cameraX = targetCam;

    // ── Distance / score ──
    const tileX = Math.floor(player.x / TILE);
    if (tileX > world.distanceTiles) {
        world.distanceTiles = tileX;
        if (tileX % DISTANCE_DIVISOR === 0) world.score += 1;
    }

    // ── Generate more chunks ahead ──
    while (world.nextChunkX * TILE < world.cameraX + WIDTH + AHEAD_TILES * TILE / 2) {
        generateChunk(world);
    }
    pruneFarChunks(world);

    // ── Entities ──
    for (const e of world.entities) {
        if (!e.alive) continue;
        if (e.kind === 'goomba') {
            // gravity + horizontal walk + tile collisions
            e.vy = Math.min(MAX_FALL_VY, e.vy + GRAVITY * dtMs);
            e.x += e.vx * dtMs;
            const ent = { x: e.x, y: e.y, vx: e.vx, vy: e.vy, w: GOOMBA_W, h: GOOMBA_H };
            if (collideAxis(world, ent, 'x')) {
                e.vx = -e.vx;
                e.x = ent.x;
            }
            e.y += e.vy * dtMs;
            const ent2 = { x: e.x, y: e.y, vx: e.vx, vy: e.vy, w: GOOMBA_W, h: GOOMBA_H, onGround: false };
            collideAxis(world, ent2, 'y');
            e.y = ent2.y;
            e.vy = ent2.vy;
            e.onGround = ent2.onGround;
            // Despawn if fallen out
            if (e.y > HEIGHT + TILE * 2) e.alive = false;
        }
    }

    // ── Fireballs ──
    for (const f of world.fireballs) {
        if (!f.alive) continue;
        f.vy = Math.min(MAX_FALL_VY, f.vy + GRAVITY * dtMs);
        f.x += f.vx * dtMs;
        f.y += f.vy * dtMs;
        const c = Math.floor(f.x / TILE);
        const r = Math.floor(f.y / TILE);
        if (isSolid(getTile(world, c, r))) {
            // ground bounce or wall stop
            if (f.vy > 0) {
                f.vy = FIREBALL_BOUNCE_VY;
                f.y = r * TILE - 4;
            } else {
                f.alive = false;
            }
        }
        if (f.x < world.cameraX - 32 || f.x > world.cameraX + WIDTH + 32) f.alive = false;
        if (f.y > HEIGHT + 32) f.alive = false;

        // Hit goombas
        for (const e of world.entities) {
            if (!e.alive || e.kind !== 'goomba') continue;
            if (rectsOverlap({ x: f.x - 4, y: f.y - 4, w: 8, h: 8 }, { x: e.x, y: e.y, w: GOOMBA_W, h: GOOMBA_H })) {
                e.alive = false;
                f.alive = false;
                world.score += SCORE_STOMP;
            }
        }
    }

    // ── Player vs entities ──
    const playerRect = { x: player.x, y: player.y, w: player.w, h: player.h };
    for (const e of world.entities) {
        if (!e.alive) continue;
        const eRect = entityRect(e);
        if (!rectsOverlap(playerRect, eRect)) continue;

        if (e.kind === 'coin') {
            e.alive = false;
            world.score += SCORE_COIN;
        } else if (e.kind === 'mushroom') {
            e.alive = false;
            world.score += SCORE_POWERUP;
            if (player.powerUp === 'small') growPlayer(player, 'big');
        } else if (e.kind === 'flower') {
            e.alive = false;
            world.score += SCORE_POWERUP;
            growPlayer(player, 'fire');
        } else if (e.kind === 'goomba') {
            // Stomp if falling onto its top half
            const stomp = player.vy > 0 && player.y + player.h - e.y < 10;
            if (stomp) {
                e.alive = false;
                world.score += SCORE_STOMP;
                player.vy = JUMP_VY * 0.6;
            } else if (player.invulnMs <= 0) {
                if (player.powerUp === 'fire') {
                    shrinkPlayer(player, 'big');
                } else if (player.powerUp === 'big') {
                    shrinkPlayer(player, 'small');
                } else {
                    return { dead: true, reason: 'enemy' };
                }
            }
        }
    }

    // Cull dead entities (rare; keeps list small)
    if (world.entities.length > 200) {
        world.entities = world.entities.filter(e => e.alive && e.x > world.cameraX - TILE * 2);
    }
    if (world.fireballs.length > 8) {
        world.fireballs = world.fireballs.filter(f => f.alive);
    }

    // ── Fall out of world ──
    if (player.y > HEIGHT + 32) {
        if (player.powerUp === 'small') return { dead: true, reason: 'fall' };
        // Big/fire: lose a level and respawn at last safe ground
        shrinkPlayer(player, player.powerUp === 'fire' ? 'big' : 'small');
        player.x = player.lastSafeX;
        player.y = player.lastSafeY - 4;
        player.vx = 0;
        player.vy = 0;
        player.onGround = false;
    }

    return { dead: false };
}

function entityRect(e: Entity): { x: number; y: number; w: number; h: number } {
    if (e.kind === 'goomba') return { x: e.x, y: e.y, w: GOOMBA_W, h: GOOMBA_H };
    if (e.kind === 'coin') return { x: e.x, y: e.y, w: COIN_SIZE, h: COIN_SIZE };
    return { x: e.x, y: e.y, w: POWERUP_SIZE, h: POWERUP_SIZE };
}

function growPlayer(player: Player, to: PowerUp) {
    const oldH = player.h;
    player.powerUp = to;
    player.h = to === 'small' ? PLAYER_H_SMALL : PLAYER_H_BIG;
    player.y -= player.h - oldH;
    player.invulnMs = 600;
}

function shrinkPlayer(player: Player, to: PowerUp) {
    const oldH = player.h;
    player.powerUp = to;
    player.h = to === 'small' ? PLAYER_H_SMALL : PLAYER_H_BIG;
    player.y += oldH - player.h;
    player.invulnMs = INVULN_MS;
}

function pruneFarChunks(world: World) {
    const cutoff = Math.floor(world.cameraX / TILE) - 4;
    for (const x of world.tilesByX.keys()) {
        if (x < cutoff) world.tilesByX.delete(x);
    }
    world.entities = world.entities.filter(e => e.alive && e.x > cutoff * TILE - TILE);
}
