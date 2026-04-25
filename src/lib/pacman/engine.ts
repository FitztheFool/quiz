import { MAZE_TEMPLATE, COLS, ROWS, DELTA, OPP, FRIGHTEN_TICKS, GHOST_SCORE, GHOST_STARTS, TUNNEL_ROW, type Pos, type Dir, type Tile } from './constants';

export type Ghost = {
    pos: Pos;
    dir: Dir;
    frightened: number; // ticks remaining
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
};

export function cloneMaze(): Tile[][] {
    return MAZE_TEMPLATE.map(row => [...row] as Tile[]);
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
    if (!isGhost && tile === 2) return false;
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

function ghostDirs(maze: Tile[][], ghost: Ghost): Dir[] {
    const dirs: Dir[] = ['U', 'D', 'L', 'R'];
    const forward = dirs.filter(d => {
        if (d === OPP[ghost.dir] && ghost.dir !== 'N') return false;
        return canMove(maze, ghost.pos, d, true);
    });
    // Dead-end: allow reversal rather than staying stuck
    if (forward.length > 0) return forward;
    return dirs.filter(d => canMove(maze, ghost.pos, d, true));
}

export function stepGhost(maze: Tile[][], ghost: Ghost, pacPos: Pos, index: number): Ghost {
    if (ghost.dead) {
        // Return to ghost house
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

    // Chase (index 0) or scatter to far corner (index 1)
    const target = index === 0
        ? pacPos
        : (ghost.pos.x < COLS / 2 ? { x: 1, y: 1 } : { x: COLS - 2, y: 1 });

    const options = ghostDirs(maze, ghost);
    if (options.length === 0) return ghost;

    let chosen: Dir;
    if (index === 1 && Math.random() < 0.35) {
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
    let { pacPos, pacDir, pacNextDir, ghosts, score, lives, dotsLeft, tick, frightenedTicks } = state;

    pacNextDir = pendingDir !== 'N' ? pendingDir : pacNextDir;

    // Try buffered direction first, then fall back to current direction.
    // pacDir is never reset to 'N' so the wall-following memory is preserved.
    let newDir: Dir = 'N';
    if (pacNextDir !== 'N' && canMove(maze, pacPos, pacNextDir, false)) {
        newDir = pacNextDir;
    } else if (pacDir !== 'N' && canMove(maze, pacPos, pacDir, false)) {
        newDir = pacDir;
    }

    let newPos = pacPos;
    if (newDir !== 'N') newPos = movePos(pacPos, newDir);

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
        newFrighten = FRIGHTEN_TICKS;
    }

    // Update ghosts (every other tick for speed balance)
    let newGhosts = ghosts;
    if (tick % 2 === 0) {
        newGhosts = ghosts.map((g, i) => {
            const g2 = { ...g, frightened: newFrighten > 0 ? (g.frightened > 0 ? g.frightened - 1 : newFrighten) : 0 };
            if (newFrighten > 0 && g.frightened === 0) return { ...g2, frightened: newFrighten };
            return stepGhost(maze, g2, newPos, i);
        });
    }

    // Frighten on pellet eaten
    if (tile === 3) {
        newGhosts = newGhosts.map(g => ({ ...g, frightened: FRIGHTEN_TICKS }));
    }

    let died = false;
    // Collision check
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
        },
        ate: ateGhost,
        died,
        won,
    };
}
