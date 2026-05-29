'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useSoloGame } from '@/hooks/useSoloGame';

// Logical canvas dimensions
const WIDTH = 360;
const HEIGHT = 520;

// Bird
const BIRD_X = 90;
const BIRD_R = 12;                  // radius (we draw a circle-ish bird)
const GRAVITY = 0.0015;             // px/ms²
const FLAP_VY = -0.55;              // px/ms (impulse)
const MAX_VY = 1.0;

// Pipes
const PIPE_W = 56;
const PIPE_GAP = 140;               // vertical gap between top/bottom pipe
const PIPE_SPACING = 220;           // horizontal distance between consecutive pipes
const PIPE_SPEED = 0.20;            // px/ms (leftward)
const PIPE_MARGIN_TOP = 60;         // min Y for gap top
const PIPE_MARGIN_BOTTOM = 60;      // min space from ground

const GROUND_H = 40;

const STARTERS = new Set([' ', 'Enter', 'ArrowUp']);

interface Pipe { x: number; gapY: number; scored: boolean }

export function useFlappyBird(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
    const {
        session, phase, phaseRef, startGameRef,
        displayScore, setDisplayScore, bestScore, isNewBest, submitState,
        endGame: soloEndGame, resetForStart,
    } = useSoloGame({
        gameKey: 'flappy_bird',
        gameType: 'FLAPPY_BIRD',
        submitEndpoint: '/api/flappy-bird/submit',
        localStorageKey: 'flappyBirdBest',
        starters: STARTERS,
    });

    const y = useRef(HEIGHT / 2);
    const vy = useRef(0);
    const pipes = useRef<Pipe[]>([]);
    const scoreRef = useRef(0);
    const rafRef = useRef<number | null>(null);
    const lastFrame = useRef(0);
    const dead = useRef(false);

    const stopLoop = useCallback(() => {
        if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    }, []);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Sky
        const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        sky.addColorStop(0, '#7ec8e3');
        sky.addColorStop(1, '#c2e3f7');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Pipes (green)
        for (const p of pipes.current) {
            ctx.fillStyle = '#3ea34a';
            // top
            ctx.fillRect(p.x, 0, PIPE_W, p.gapY - PIPE_GAP / 2);
            // bottom
            ctx.fillRect(p.x, p.gapY + PIPE_GAP / 2, PIPE_W, HEIGHT - GROUND_H - (p.gapY + PIPE_GAP / 2));
            // lip
            ctx.fillStyle = '#2e7a37';
            ctx.fillRect(p.x - 3, p.gapY - PIPE_GAP / 2 - 8, PIPE_W + 6, 8);
            ctx.fillRect(p.x - 3, p.gapY + PIPE_GAP / 2, PIPE_W + 6, 8);
        }

        // Ground
        ctx.fillStyle = '#ded895';
        ctx.fillRect(0, HEIGHT - GROUND_H, WIDTH, GROUND_H);
        ctx.fillStyle = '#83bd3e';
        ctx.fillRect(0, HEIGHT - GROUND_H, WIDTH, 6);

        // Bird
        const by = y.current;
        ctx.save();
        ctx.translate(BIRD_X, by);
        // Slight tilt based on vy
        const tilt = Math.max(-0.5, Math.min(0.9, vy.current * 1.2));
        ctx.rotate(tilt);
        // body
        ctx.fillStyle = '#f7c948';
        ctx.beginPath();
        ctx.ellipse(0, 0, BIRD_R + 2, BIRD_R, 0, 0, Math.PI * 2);
        ctx.fill();
        // wing
        ctx.fillStyle = '#e0a82e';
        ctx.beginPath();
        ctx.ellipse(-2, 3, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(5, -3, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(6, -3, 1.5, 0, Math.PI * 2);
        ctx.fill();
        // beak
        ctx.fillStyle = '#f08a3b';
        ctx.beginPath();
        ctx.moveTo(BIRD_R, -1);
        ctx.lineTo(BIRD_R + 7, 1);
        ctx.lineTo(BIRD_R, 4);
        ctx.fill();
        ctx.restore();
    }, [canvasRef]);

    const endGame = useCallback((finalScore: number) => {
        if (dead.current) return;
        dead.current = true;
        stopLoop();
        soloEndGame(finalScore);
    }, [stopLoop, soloEndGame]);

    const spawnInitialPipes = useCallback(() => {
        pipes.current = [];
        const startX = WIDTH + 80;
        for (let i = 0; i < 3; i++) {
            const gapY = Math.floor(PIPE_MARGIN_TOP + PIPE_GAP / 2 +
                Math.random() * (HEIGHT - GROUND_H - PIPE_MARGIN_TOP - PIPE_MARGIN_BOTTOM - PIPE_GAP));
            pipes.current.push({ x: startX + i * PIPE_SPACING, gapY, scored: false });
        }
    }, []);

    const update = useCallback((dt: number) => {
        // Physics
        vy.current = Math.min(MAX_VY, vy.current + GRAVITY * dt);
        y.current += vy.current * dt;

        // Pipes movement
        for (const p of pipes.current) p.x -= PIPE_SPEED * dt;

        // Remove off-screen pipes, spawn new ones
        if (pipes.current.length > 0 && pipes.current[0].x + PIPE_W < -10) pipes.current.shift();
        const last = pipes.current[pipes.current.length - 1];
        if (last && last.x < WIDTH - PIPE_SPACING) {
            const gapY = Math.floor(PIPE_MARGIN_TOP + PIPE_GAP / 2 +
                Math.random() * (HEIGHT - GROUND_H - PIPE_MARGIN_TOP - PIPE_MARGIN_BOTTOM - PIPE_GAP));
            pipes.current.push({ x: last.x + PIPE_SPACING, gapY, scored: false });
        }

        // Score: each pipe passed counts once
        for (const p of pipes.current) {
            if (!p.scored && p.x + PIPE_W < BIRD_X - BIRD_R) {
                p.scored = true;
                scoreRef.current += 1;
                setDisplayScore(scoreRef.current);
            }
        }

        // Collisions
        // ground / ceiling
        if (y.current + BIRD_R >= HEIGHT - GROUND_H || y.current - BIRD_R <= 0) {
            y.current = Math.max(BIRD_R, Math.min(HEIGHT - GROUND_H - BIRD_R, y.current));
            endGame(scoreRef.current);
            return;
        }
        // pipes: simple AABB vs circle approximation
        for (const p of pipes.current) {
            if (BIRD_X + BIRD_R < p.x || BIRD_X - BIRD_R > p.x + PIPE_W) continue;
            // We're horizontally inside the pipe column
            const topPipeBottom = p.gapY - PIPE_GAP / 2;
            const bottomPipeTop = p.gapY + PIPE_GAP / 2;
            if (y.current - BIRD_R < topPipeBottom || y.current + BIRD_R > bottomPipeTop) {
                endGame(scoreRef.current);
                return;
            }
        }
    }, [setDisplayScore, endGame]);

    const loop = useCallback((now: number) => {
        const dt = Math.min(40, now - lastFrame.current);
        lastFrame.current = now;
        update(dt);
        draw();
        if (phaseRef.current === 'playing' && !dead.current) rafRef.current = requestAnimationFrame(loop);
    }, [update, draw, phaseRef]);

    const flap = useCallback(() => {
        if (phaseRef.current !== 'playing') return;
        vy.current = FLAP_VY;
    }, [phaseRef]);

    const startGame = useCallback(() => {
        stopLoop();
        y.current = HEIGHT / 2;
        vy.current = 0;
        scoreRef.current = 0;
        dead.current = false;
        spawnInitialPipes();
        resetForStart();
        lastFrame.current = performance.now();
        rafRef.current = requestAnimationFrame(loop);
    }, [stopLoop, spawnInitialPipes, resetForStart, loop]);

    useEffect(() => { startGameRef.current = startGame; }, [startGame, startGameRef]);

    // Keyboard
    useEffect(() => {
        if (phase !== 'playing') return;
        const handle = (e: KeyboardEvent) => {
            if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'z' || e.key === 'W' || e.key === 'Z') {
                e.preventDefault();
                flap();
            }
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [phase, flap]);

    // Touch / click on canvas — flap, or start the game when idle/over.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const onTouch = (e: TouchEvent | PointerEvent) => {
            e.preventDefault();
            if (phaseRef.current !== 'playing') { startGameRef.current(); return; }
            flap();
        };
        canvas.addEventListener('touchstart', onTouch as EventListener, { passive: false });
        canvas.addEventListener('pointerdown', onTouch as EventListener);
        return () => {
            canvas.removeEventListener('touchstart', onTouch as EventListener);
            canvas.removeEventListener('pointerdown', onTouch as EventListener);
        };
    }, [canvasRef, phaseRef, startGameRef, flap]);

    // Draw idle/over states once.
    useEffect(() => { if (phase !== 'playing') draw(); }, [phase, draw]);
    useEffect(() => () => stopLoop(), [stopLoop]);

    return {
        session, phase, displayScore, bestScore, isNewBest, submitState,
        startGame, flap,
        canvasSize: { width: WIDTH, height: HEIGHT },
    };
}
