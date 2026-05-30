// Plumber — endless procedural platformer (Mario-like).
// All dimensions in logical canvas units.

export const WIDTH = 480;
export const HEIGHT = 320;
export const TILE = 16;

export const COLS_VIEW = Math.ceil(WIDTH / TILE);      // 30
export const ROWS = Math.ceil(HEIGHT / TILE);          // 20
export const GROUND_ROW = ROWS - 3;                    // floor top row (y = 17)

export const GRAVITY = 0.0016;             // px / ms²
export const MAX_FALL_VY = 0.55;           // px / ms
export const MOVE_SPEED = 0.18;            // horizontal run speed (px/ms)
export const JUMP_VY = -0.62;              // initial impulse (negative = up)
export const JUMP_HOLD_BOOST = 0.0006;     // extra upward accel while jump held
export const JUMP_HOLD_MAX_MS = 180;       // max duration of hold boost

export const FIRE_COOLDOWN_MS = 320;
export const FIREBALL_VX = 0.30;
export const FIREBALL_VY0 = -0.18;
export const FIREBALL_BOUNCE_VY = -0.30;

export const PLAYER_W = 14;
export const PLAYER_H_SMALL = 14;
export const PLAYER_H_BIG = 26;
export const INVULN_MS = 1200;

export const GOOMBA_W = 14;
export const GOOMBA_H = 14;
export const GOOMBA_SPEED = 0.05;

export const COIN_SIZE = 10;
export const POWERUP_SIZE = 14;

export const CHUNK_TILES = 16;             // width (in tiles) of a procedurally generated chunk
export const AHEAD_TILES = COLS_VIEW * 2;  // how far past camera we keep world generated

export const SCORE_COIN = 1;
export const SCORE_STOMP = 5;
export const SCORE_POWERUP = 20;
export const DISTANCE_DIVISOR = 10;        // score += floor(distanceTiles / divisor)

export const STARTERS = new Set([' ', 'Enter', 'ArrowUp', 'w', 'W', 'z', 'Z']);
