import { getMaze, COLS, ROWS, DELTA, OPP, FRIGHTEN_TICKS, GHOST_SCORE, GHOST_STARTS, TUNNEL_ROW, type Pos, type Dir, type Tile } from './constants';

export type Ghost = {
    pos: Pos;
    dir: Dir;
    frightened: number;
    dead: boolean;
};

export type GameState = {
    maze: Tile[][];
    pacPos: Pos;
    pacDir: Dir;
    pacNextDir: Dir;
    ghosts: Ghost[];
    score: number;
    lives: number;
    dotsLeft: number;
    tick: number;
    frightenedTicks: number;
    level: number;
};

export function cloneMaze(level = 1): Tile[][] {
    return getMaze(level);
}

export function countDots(maze: Tile[][]): number {
    let n = 0;
    for (const row of maze) for (const t of row) if (t === 0 || t === 3) n++;
    return n;
}

function wrapX(x: number, y: number): number {
    if (y !== TUNNEL_ROW) return x;
    if (x < 0) return COLS - 1;
    if (x >= COLS) return 0;
    return x;
}

function canMove(maze: Tile[][], pos: Pos, dir: Dir, isGhost: boolean): boolean {
    const d = DELTA[dir];
    const ny = pos.y + d.y;
    if (ny < 0 || ny >= ROWS) return false;
    const nx = wrapX(pos.x + d.x, ny);
    const tile = maze[ny][nx];
    if (tile === 1) return false;
    return true;
}

function movePos(pos: Pos, dir: Dir): Pos {
    const d = DELTA[dir];
    const ny = pos.y + d.y;
    const nx = wrapX(pos.x + d.x, ny);
    return { x: nx, y: ny };
}

function dist(a: Pos, b: Pos): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function ghostDirs(maze: Tile[][], ghost: Ghost): Dir[] {
    const dirs: Dir[] = ['U', 'D', 'L', 'R'];
    const forward = dirs.filter(d => {
        if (d === OPP[ghost.dir] && ghost.dir !== 'N') return false;
        return canMove(maze, ghost.pos, d, true);
    });
    if (forward.length > 0) return forward;
    return dirs.filter(d => canMove(maze, ghost.pos, d, true));
}

// ── Ghost chase targets ───────────────────────────────────────────────────────
//
// Ghost 0 (Rouge – Blinky) : chasseur pur — cible toujours la case exacte de Pac-Man.
// Ghost 1 (Rose – Pinky)   : embusqueur — cible 4 cases DEVANT la direction de Pac-Man.
// Ghost 2 (Cyan – Inky)    : tenaille   — cible le reflet de Blinky par rapport à
//                             2 cases devant Pac-Man, créant un effet de ciseau.

function chaseTarget(index: number, pacPos: Pos, pacDir: Dir, allGhosts: Ghost[]): Pos {
    if (index === 0) {
        return pacPos;
    }
    if (index === 1) {
        const d = DELTA[pacDir !== 'N' ? pacDir : 'R'];
        return {
            x: clamp(pacPos.x + d.x * 4, 0, COLS - 1),
            y: clamp(pacPos.y + d.y * 4, 0, ROWS - 1),
        };
    }
    // Inky: pivot = 2 cases devant Pac-Man, cible = symétrique de Blinky par rapport au pivot
    const blinky = allGhosts[0]?.pos ?? pacPos;
    const d = DELTA[pacDir !== 'N' ? pacDir : 'R'];
    const pivot = { x: pacPos.x + d.x * 2, y: pacPos.y + d.y * 2 };
    return {
        x: clamp(pivot.x * 2 - blinky.x, 0, COLS - 1),
        y: clamp(pivot.y * 2 - blinky.y, 0, ROWS - 1),
    };
}

// Taux de mouvement aléatoire par indice (réduit à chaque niveau)
function randomRate(index: number, level: number): number {
    const base = index === 0 ? 0 : index === 1 ? 0.28 : 0.18;
    return Math.max(0, base - (level - 1) * 0.05);
}

export function stepGhost(
    maze: Tile[][],
    ghost: Ghost,
    pacPos: Pos,
    pacDir: Dir,
    index: number,
    allGhosts: Ghost[],
    level: number,
): Ghost {
    if (ghost.dead) {
        const target = GHOST_STARTS[index];
        const options = ghostDirs(maze, ghost);
        if (options.length === 0) return ghost;
        const chosen = options.reduce((best, d) => {
            const np = movePos(ghost.pos, d);
            return dist(np, target) < dist(movePos(ghost.pos, best), target) ? d : best;
        }, options[0]);
        const newPos = movePos(ghost.pos, chosen);
        const isDead = newPos.x === target.x && newPos.y === target.y;
        return { ...ghost, pos: newPos, dir: chosen, dead: isDead, frightened: 0 };
    }

    if (ghost.frightened > 0) {
        const options = ghostDirs(maze, ghost);
        if (options.length === 0) return ghost;
        const chosen = options[Math.floor(Math.random() * options.length)];
        return { ...ghost, pos: movePos(ghost.pos, chosen), dir: chosen, frightened: ghost.frightened - 1 };
    }

    const target = chaseTarget(index, pacPos, pacDir, allGhosts);
    const options = ghostDirs(maze, ghost);
    if (options.length === 0) return ghost;

    let chosen: Dir;
    if (Math.random() < randomRate(index, level)) {
        chosen = options[Math.floor(Math.random() * options.length)];
    } else {
        chosen = options.reduce((best, d) => {
            const np = movePos(ghost.pos, d);
            return dist(np, target) < dist(movePos(ghost.pos, best), target) ? d : best;
        }, options[0]);
    }

    return { ...ghost, pos: movePos(ghost.pos, chosen), dir: chosen };
}

export function initialGhosts(): Ghost[] {
    return GHOST_STARTS.map(pos => ({
        pos: { ...pos },
        dir: 'N' as Dir,
        frightened: 0,
        dead: false,
    }));
}

export function stepGame(state: GameState, pendingDir: Dir): { state: GameState; ate: boolean; died: boolean; won: boolean } {
    const maze = state.maze.map(r => [...r] as Tile[]);
    let { pacPos, pacDir, pacNextDir, ghosts, score, lives, dotsLeft, tick, frightenedTicks, level } = state;

    pacNextDir = pendingDir !== 'N' ? pendingDir : pacNextDir;

    let newDir: Dir = 'N';
    if (pacNextDir !== 'N' && canMove(maze, pacPos, pacNextDir, false)) {
        newDir = pacNextDir;
    } else if (pacDir !== 'N' && canMove(maze, pacPos, pacDir, false)) {
        newDir = pacDir;
    }

    let newPos = pacPos;
    if (newDir !== 'N') newPos = movePos(pacPos, newDir);
    const effectiveDir = newDir !== 'N' ? newDir : pacDir;

    // Frayeur réduite à chaque niveau (minimum 8 ticks)
    const frightenDuration = Math.max(8, FRIGHTEN_TICKS - (level - 1) * 5);

    let newScore = score;
    let newDotsLeft = dotsLeft;
    let newFrighten = frightenedTicks > 0 ? frightenedTicks - 1 : 0;
    let ateGhost = false;

    const tile = maze[newPos.y]?.[newPos.x];
    if (tile === 0) {
        maze[newPos.y][newPos.x] = 4;
        newScore += 10;
        newDotsLeft--;
    } else if (tile === 3) {
        maze[newPos.y][newPos.x] = 4;
        newScore += 50;
        newDotsLeft--;
        newFrighten = frightenDuration;
    }

    // Les fantômes bougent tous les ticks à partir du niveau 3, sinon 1 tick sur 2
    const ghostMoveEvery = level >= 3 ? 1 : 2;
    const anyDead = ghosts.some(g => g.dead);
    let newGhosts = ghosts;
    if (tick % ghostMoveEvery === 0) {
        newGhosts = ghosts.map((g, i) => {
            const g2 = { ...g, frightened: newFrighten > 0 ? (g.frightened > 0 ? g.frightened - 1 : newFrighten) : 0 };
            if (newFrighten > 0 && g.frightened === 0) return { ...g2, frightened: newFrighten };
            // Gèle les fantômes vivants pendant qu'un fantôme mangé retourne à la maison
            if (anyDead && !g.dead) return g2;
            return stepGhost(maze, g2, newPos, effectiveDir, i, ghosts, level);
        });
    }

    if (tile === 3) {
        newGhosts = newGhosts.map(g => ({ ...g, frightened: frightenDuration }));
    }

    let died = false;
    for (let i = 0; i < newGhosts.length; i++) {
        const g = newGhosts[i];
        if (g.pos.x === newPos.x && g.pos.y === newPos.y) {
            if (g.frightened > 0 && !g.dead) {
                newScore += GHOST_SCORE;
                newGhosts = newGhosts.map((gg, idx) => idx === i ? { ...gg, dead: true, frightened: 0 } : gg);
                ateGhost = true;
            } else if (!g.dead) {
                died = true;
            }
        }
    }

    const won = newDotsLeft <= 0;

    return {
        state: {
            maze,
            pacPos: newPos,
            pacDir: newDir !== 'N' ? newDir : pacDir,
            pacNextDir,
            ghosts: newGhosts,
            score: newScore,
            lives: died ? lives - 1 : lives,
            dotsLeft: newDotsLeft,
            tick: tick + 1,
            frightenedTicks: newFrighten,
            level,
        },
        ate: ateGhost,
        died,
        won,
    };
}
