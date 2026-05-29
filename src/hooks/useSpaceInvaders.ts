'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useSoloGame } from '@/hooks/useSoloGame';
import {
    WIDTH, HEIGHT, PLAYER_W, PLAYER_H, PLAYER_Y, PLAYER_SPEED, PLAYER_COOLDOWN, MAX_PLAYER_BULLETS,
    BULLET_W, BULLET_H, BULLET_SPEED, ALIEN_BULLET_SPEED,
    ALIEN_ROWS, ALIEN_COLS, ALIEN_W, ALIEN_H, ALIEN_GAP_X, ALIEN_GAP_Y, ALIEN_TOP,
    ALIEN_STEP_X, ALIEN_STEP_Y, ALIEN_MARGIN, ROW_POINTS, ALIEN_ROW_COLORS, START_LIVES, STARTERS,
    ALIEN_PATTERNS,
} from '@/lib/spaceInvaders/constants';

interface Alien { x: number; y: number; row: number; alive: boolean }
interface Bullet { x: number; y: number }

function buildAliens(level: number): Alien[] {
    const blockW = ALIEN_COLS * (ALIEN_W + ALIEN_GAP_X) - ALIEN_GAP_X;
    const left = (WIDTH - blockW) / 2;
    // Higher levels start the swarm lower (closer to the player) — harder configuration.
    const yShift = Math.min(80, (level - 1) * 8);
    // Cycle through preset formations so it's not always the same block.
    const pattern = ALIEN_PATTERNS[(level - 1) % ALIEN_PATTERNS.length];
    const arr: Alien[] = [];
    for (let r = 0; r < ALIEN_ROWS; r++) {
        const row = pattern[r] ?? '';
        for (let c = 0; c < ALIEN_COLS; c++) {
            if (row[c] !== '#') continue;
            arr.push({ x: left + c * (ALIEN_W + ALIEN_GAP_X), y: ALIEN_TOP + yShift + r * (ALIEN_H + ALIEN_GAP_Y), row: r, alive: true });
        }
    }
    return arr;
}

export function useSpaceInvaders(canvasRef: React.RefObject<HTMLCanvasElement | null>, defaultLevel = 1) {
    const {
        session, phase, phaseRef, startGameRef,
        displayScore, setDisplayScore, bestScore, isNewBest, submitState,
        endGame: soloEndGame, resetForStart,
    } = useSoloGame({
        gameKey: 'space_invaders',
        gameType: 'SPACE_INVADERS',
        submitEndpoint: '/api/space-invaders/submit',
        localStorageKey: 'spaceInvadersBest',
        starters: STARTERS,
    });

    const playerX = useRef(WIDTH / 2);
    const keys = useRef({ left: false, right: false });
    const bullets = useRef<Bullet[]>([]);
    const alienBullets = useRef<Bullet[]>([]);
    const aliens = useRef<Alien[]>([]);
    const alienDir = useRef(1);
    const stepAccum = useRef(0);
    const lastShot = useRef(0);
    const scoreRef = useRef(0);
    const livesRef = useRef(START_LIVES);
    const waveRef = useRef(1);
    const rafRef = useRef<number | null>(null);
    const lastFrame = useRef(0);

    const [lives, setLives] = useState(START_LIVES);
    const [wave, setWave] = useState(1);

    const stopLoop = useCallback(() => {
        if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    }, []);

    const endGame = useCallback((finalScore: number) => {
        stopLoop();
        soloEndGame(finalScore);
    }, [stopLoop, soloEndGame]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Aliens
        for (const a of aliens.current) {
            if (!a.alive) continue;
            ctx.fillStyle = ALIEN_ROW_COLORS[a.row] ?? '#22d3ee';
            ctx.fillRect(a.x, a.y, ALIEN_W, ALIEN_H);
            ctx.fillStyle = '#0a0a14';
            ctx.fillRect(a.x + 5, a.y + 6, 4, 4);
            ctx.fillRect(a.x + ALIEN_W - 9, a.y + 6, 4, 4);
        }

        // Player bullets
        ctx.fillStyle = '#e2e8f0';
        for (const b of bullets.current) ctx.fillRect(b.x - BULLET_W / 2, b.y, BULLET_W, BULLET_H);
        // Alien bullets
        ctx.fillStyle = '#f87171';
        for (const b of alienBullets.current) ctx.fillRect(b.x - BULLET_W / 2, b.y, BULLET_W, BULLET_H);

        // Player ship
        ctx.fillStyle = '#34d399';
        const px = playerX.current;
        ctx.fillRect(px - PLAYER_W / 2, PLAYER_Y, PLAYER_W, PLAYER_H);
        ctx.fillRect(px - 3, PLAYER_Y - 6, 6, 6);

        // Ground line
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, PLAYER_Y + PLAYER_H + 6, WIDTH, 2);
    }, [canvasRef]);

    const aliveCount = () => aliens.current.reduce((n, a) => n + (a.alive ? 1 : 0), 0);

    const stepInterval = useCallback(() => {
        const ratio = aliveCount() / (ALIEN_ROWS * ALIEN_COLS);
        return Math.max(70, (90 + 520 * ratio) * Math.pow(0.82, waveRef.current - 1));
    }, []);

    const fireAlien = useCallback(() => {
        // Bottom-most alien of a random occupied column fires.
        const alive = aliens.current.filter(a => a.alive);
        if (alive.length === 0) return;
        const cols = new Map<number, Alien>();
        for (const a of alive) {
            const key = Math.round(a.x);
            const cur = cols.get(key);
            if (!cur || a.y > cur.y) cols.set(key, a);
        }
        const shooters = [...cols.values()];
        const shooter = shooters[Math.floor(Math.random() * shooters.length)];
        if (alienBullets.current.length < 6) {
            alienBullets.current.push({ x: shooter.x + ALIEN_W / 2, y: shooter.y + ALIEN_H });
        }
    }, []);

    const swarmStep = useCallback(() => {
        const alive = aliens.current.filter(a => a.alive);
        if (alive.length === 0) return;
        const minX = Math.min(...alive.map(a => a.x));
        const maxX = Math.max(...alive.map(a => a.x + ALIEN_W));
        const dir = alienDir.current;

        const hitsRight = dir > 0 && maxX + ALIEN_STEP_X > WIDTH - ALIEN_MARGIN;
        const hitsLeft = dir < 0 && minX - ALIEN_STEP_X < ALIEN_MARGIN;

        if (hitsRight || hitsLeft) {
            for (const a of aliens.current) if (a.alive) a.y += ALIEN_STEP_Y;
            alienDir.current = -dir;
            if (aliens.current.some(a => a.alive && a.y + ALIEN_H >= PLAYER_Y)) {
                endGame(scoreRef.current);
                return;
            }
        } else {
            for (const a of aliens.current) if (a.alive) a.x += dir * ALIEN_STEP_X;
        }
        // Chance to fire scales down a bit as the swarm thins.
        if (Math.random() < 0.55) fireAlien();
    }, [endGame, fireAlien]);

    const update = useCallback((dt: number) => {
        // Player movement
        const dir = (keys.current.right ? 1 : 0) - (keys.current.left ? 1 : 0);
        playerX.current = Math.max(PLAYER_W / 2 + 4, Math.min(WIDTH - PLAYER_W / 2 - 4, playerX.current + dir * PLAYER_SPEED * dt));

        // Auto-fire on cooldown — no manual trigger needed.
        const now = performance.now();
        if (now - lastShot.current >= PLAYER_COOLDOWN && bullets.current.length < MAX_PLAYER_BULLETS) {
            bullets.current.push({ x: playerX.current, y: PLAYER_Y - 8 });
            lastShot.current = now;
        }

        // Player bullets move + hit aliens
        for (const b of bullets.current) b.y -= BULLET_SPEED * dt;
        bullets.current = bullets.current.filter(b => {
            if (b.y + BULLET_H < 0) return false;
            for (const a of aliens.current) {
                if (!a.alive) continue;
                if (b.x >= a.x && b.x <= a.x + ALIEN_W && b.y <= a.y + ALIEN_H && b.y + BULLET_H >= a.y) {
                    a.alive = false;
                    scoreRef.current += ROW_POINTS[a.row] ?? 10;
                    setDisplayScore(scoreRef.current);
                    return false;
                }
            }
            return true;
        });

        // Wave cleared
        if (aliveCount() === 0) {
            waveRef.current += 1;
            setWave(waveRef.current);
            aliens.current = buildAliens(waveRef.current);
            alienBullets.current = [];
            alienDir.current = 1;
            stepAccum.current = 0;
        }

        // Swarm stepping
        stepAccum.current += dt;
        let guard = 0;
        while (stepAccum.current >= stepInterval() && guard++ < 6) {
            stepAccum.current -= stepInterval();
            swarmStep();
            if (phaseRef.current !== 'playing') return;
        }

        // Alien bullets move + hit player
        for (const b of alienBullets.current) b.y += ALIEN_BULLET_SPEED * dt;
        const pLeft = playerX.current - PLAYER_W / 2, pRight = playerX.current + PLAYER_W / 2;
        alienBullets.current = alienBullets.current.filter(b => {
            if (b.y > HEIGHT) return false;
            if (b.y + BULLET_H >= PLAYER_Y && b.x >= pLeft && b.x <= pRight) {
                livesRef.current -= 1;
                setLives(livesRef.current);
                if (livesRef.current <= 0) { endGame(scoreRef.current); }
                return false;
            }
            return true;
        });
    }, [setDisplayScore, stepInterval, swarmStep, endGame, phaseRef]);

    const loop = useCallback((now: number) => {
        const dt = Math.min(50, now - lastFrame.current);
        lastFrame.current = now;
        update(dt);
        draw();
        if (phaseRef.current === 'playing') rafRef.current = requestAnimationFrame(loop);
    }, [update, draw, phaseRef]);

    const startGame = useCallback((startLevel: number = defaultLevel) => {
        stopLoop();
        const lvl = Math.max(1, Math.floor(startLevel));
        playerX.current = WIDTH / 2;
        bullets.current = [];
        alienBullets.current = [];
        aliens.current = buildAliens(lvl);
        alienDir.current = 1;
        stepAccum.current = 0;
        lastShot.current = 0;
        scoreRef.current = 0;
        livesRef.current = START_LIVES;
        waveRef.current = lvl;
        setLives(START_LIVES);
        setWave(lvl);

        resetForStart();
        lastFrame.current = performance.now();
        rafRef.current = requestAnimationFrame(loop);
    }, [stopLoop, resetForStart, loop]);

    useEffect(() => { startGameRef.current = startGame; }, [startGame, startGameRef]);

    // Keyboard
    useEffect(() => {
        if (phase !== 'playing') return;
        const down = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            if (k === 'arrowleft' || k === 'q' || k === 'a') { keys.current.left = true; e.preventDefault(); }
            else if (k === 'arrowright' || k === 'd') { keys.current.right = true; e.preventDefault(); }
        };
        const up = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            if (k === 'arrowleft' || k === 'q' || k === 'a') keys.current.left = false;
            else if (k === 'arrowright' || k === 'd') keys.current.right = false;
        };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
    }, [phase]);

    // Reset keys when leaving play
    useEffect(() => { if (phase !== 'playing') keys.current = { left: false, right: false }; }, [phase]);

    useEffect(() => { draw(); }, [draw]);
    useEffect(() => () => stopLoop(), [stopLoop]);

    // Preview the formation for the chosen level when not playing — lets the admin
    // see what the level looks like before launching.
    useEffect(() => {
        if (phase === 'playing') return;
        aliens.current = buildAliens(Math.max(1, Math.floor(defaultLevel)));
        bullets.current = [];
        alienBullets.current = [];
        playerX.current = WIDTH / 2;
        draw();
    }, [defaultLevel, phase, draw]);

    // Mouse drag on canvas (desktop)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const onMouseMove = (e: MouseEvent) => {
            if (phaseRef.current !== 'playing') return;
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (WIDTH / Math.max(1, rect.width));
            playerX.current = Math.max(PLAYER_W / 2 + 4, Math.min(WIDTH - PLAYER_W / 2 - 4, x));
        };
        const onClick = () => {
            if (phaseRef.current === 'idle' || phaseRef.current === 'over') startGameRef.current();
        };
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('click', onClick);
        return () => {
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('click', onClick);
        };
    }, [canvasRef, phaseRef, startGameRef]);

    // Touch drag on canvas (mobile) — drag the finger, the ship follows. Tap on idle/over to start.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        let touchOnCanvas = false;

        const onTouchStart = (e: TouchEvent) => {
            const t = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            touchOnCanvas = (
                t.clientX >= rect.left && t.clientX <= rect.right &&
                t.clientY >= rect.top  && t.clientY <= rect.bottom
            );
            if (!touchOnCanvas) return;
            if (phaseRef.current !== 'playing') { startGameRef.current(); return; }
            e.preventDefault();
            const x = (t.clientX - rect.left) * (WIDTH / Math.max(1, rect.width));
            playerX.current = Math.max(PLAYER_W / 2 + 4, Math.min(WIDTH - PLAYER_W / 2 - 4, x));
        };
        const onTouchMove = (e: TouchEvent) => {
            if (!touchOnCanvas || phaseRef.current !== 'playing') return;
            e.preventDefault();
            const t = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const x = (t.clientX - rect.left) * (WIDTH / Math.max(1, rect.width));
            playerX.current = Math.max(PLAYER_W / 2 + 4, Math.min(WIDTH - PLAYER_W / 2 - 4, x));
        };
        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        return () => {
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchmove', onTouchMove);
        };
    }, [canvasRef, phaseRef, startGameRef]);

    return {
        session, phase, displayScore, bestScore, isNewBest, submitState,
        lives, wave, startGame,
        canvasSize: { width: WIDTH, height: HEIGHT },
    };
}
