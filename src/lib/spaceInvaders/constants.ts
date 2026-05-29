// Space Invaders — dimensions & tuning (logical canvas units).

export const WIDTH = 420;
export const HEIGHT = 520;

export const PLAYER_W = 34;
export const PLAYER_H = 14;
export const PLAYER_Y = HEIGHT - 30;
export const PLAYER_SPEED = 0.30;       // px/ms
export const PLAYER_COOLDOWN = 320;     // ms between shots
export const MAX_PLAYER_BULLETS = 2;

export const BULLET_W = 3;
export const BULLET_H = 12;
export const BULLET_SPEED = 0.55;       // px/ms (upward)
export const ALIEN_BULLET_SPEED = 0.26; // px/ms (downward)

export const ALIEN_ROWS = 5;
export const ALIEN_COLS = 10;
export const ALIEN_W = 26;
export const ALIEN_H = 18;
export const ALIEN_GAP_X = 10;
export const ALIEN_GAP_Y = 12;
export const ALIEN_TOP = 56;
export const ALIEN_STEP_X = 10;
export const ALIEN_STEP_Y = 18;
export const ALIEN_MARGIN = 16;         // swarm bounce margin from the walls

export const ROW_POINTS = [30, 20, 20, 10, 10];
export const ALIEN_ROW_COLORS = ['#f43f5e', '#fb923c', '#fbbf24', '#34d399', '#22d3ee'];
export const START_LIVES = 3;

export const STARTERS = new Set([' ', 'Enter']);

// Enemy formations — each row is a 10-char string ('#' = alien, '.' = empty).
// Levels cycle through these to keep things varied.
export const ALIEN_PATTERNS: string[][] = [
    [   // 0 — Block (classic)
        '##########',
        '##########',
        '##########',
        '##########',
        '##########',
    ],
    [   // 1 — Pyramid
        '....##....',
        '...####...',
        '..######..',
        '.########.',
        '##########',
    ],
    [   // 2 — Diamond
        '....##....',
        '..######..',
        '##########',
        '..######..',
        '....##....',
    ],
    [   // 3 — Three columns
        '##..##..##',
        '##..##..##',
        '##..##..##',
        '##..##..##',
        '##..##..##',
    ],
    [   // 4 — Inverted pyramid
        '##########',
        '.########.',
        '..######..',
        '...####...',
        '....##....',
    ],
];
