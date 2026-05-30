'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useSoloGame } from '@/hooks/useSoloGame';
import { WIDTH, HEIGHT, STARTERS } from '@/lib/plumber/constants';
import { createWorld, step, type Player, type PowerUp, type World } from '@/lib/plumber/engine';
import { drawScene } from '@/lib/plumber/render';

export type KeyName = 'left' | 'right' | 'jump' | 'fire';

export function usePlumber(canvasRef: React.RefObject<HTMLCanvasElement | null>, defaultLevel = 1) {
    const {
        session, phase, phaseRef, startGameRef,
        displayScore, setDisplayScore, bestScore, isNewBest, submitState,
        endGame: soloEndGame, resetForStart,
    } = useSoloGame({
        gameKey: 'plumber',
        gameType: 'PLUMBER',
        submitEndpoint: '/api/plumber/submit',
        localStorageKey: 'plumberBest',
        starters: STARTERS,
    });

    const worldRef = useRef<World | null>(null);
    const playerRef = useRef<Player | null>(null);
    const keys = useRef({ left: false, right: false, jump: false, fire: false });
    const rafRef = useRef<number | null>(null);
    const lastFrame = useRef(0);
    const scoreRef = useRef(0);

    const [powerUp, setPowerUp] = useState<PowerUp>('small');
    const [distanceM, setDistanceM] = useState(0);

    const stopLoop = useCallback(() => {
        if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    }, []);

    const endGame = useCallback((finalScore: number) => {
        stopLoop();
        soloEndGame(finalScore);
    }, [stopLoop, soloEndGame]);

    const setKey = useCallback((k: KeyName, v: boolean) => { keys.current[k] = v; }, []);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const world = worldRef.current;
        const player = playerRef.current;
        if (!world || !player) {
            ctx.fillStyle = '#a8defd';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            return;
        }
        drawScene(ctx, world, player);
    }, [canvasRef]);

    const update = useCallback((dt: number) => {
        const world = worldRef.current;
        const player = playerRef.current;
        if (!world || !player) return;

        const res = step(world, player, keys.current, dt);

        if (world.score !== scoreRef.current) {
            scoreRef.current = world.score;
            setDisplayScore(world.score);
        }
        if (player.powerUp !== powerUp) setPowerUp(player.powerUp);
        const m = Math.floor(world.distanceTiles);
        if (m !== distanceM) setDistanceM(m);

        if (res.dead) endGame(world.score);
    }, [setDisplayScore, powerUp, distanceM, endGame]);

    const loop = useCallback((now: number) => {
        const dt = Math.min(40, now - lastFrame.current);
        lastFrame.current = now;
        update(dt);
        draw();
        if (phaseRef.current === 'playing') rafRef.current = requestAnimationFrame(loop);
    }, [update, draw, phaseRef]);

    const startGame = useCallback((startLevel: number = defaultLevel) => {
        stopLoop();
        const lvl = Math.max(1, Math.min(3, Math.floor(startLevel)));
        const startPow: PowerUp = lvl === 3 ? 'fire' : lvl === 2 ? 'big' : 'small';
        const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
        const { world, player } = createWorld(seed, startPow);
        worldRef.current = world;
        playerRef.current = player;
        scoreRef.current = 0;
        setPowerUp(startPow);
        setDistanceM(0);
        keys.current = { left: false, right: false, jump: false, fire: false };

        resetForStart();
        lastFrame.current = performance.now();
        rafRef.current = requestAnimationFrame(loop);
    }, [defaultLevel, stopLoop, resetForStart, loop]);

    useEffect(() => { startGameRef.current = startGame; }, [startGame, startGameRef]);

    // Keyboard
    useEffect(() => {
        if (phase !== 'playing') return;
        const down = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            if (k === 'arrowleft' || k === 'q' || k === 'a') { keys.current.left = true; e.preventDefault(); }
            else if (k === 'arrowright' || k === 'd') { keys.current.right = true; e.preventDefault(); }
            else if (k === 'arrowup' || k === ' ' || k === 'w' || k === 'z') { keys.current.jump = true; e.preventDefault(); }
            else if (k === 'shift' || k === 'x') { keys.current.fire = true; e.preventDefault(); }
        };
        const up = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            if (k === 'arrowleft' || k === 'q' || k === 'a') keys.current.left = false;
            else if (k === 'arrowright' || k === 'd') keys.current.right = false;
            else if (k === 'arrowup' || k === ' ' || k === 'w' || k === 'z') keys.current.jump = false;
            else if (k === 'shift' || k === 'x') keys.current.fire = false;
        };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
    }, [phase]);

    useEffect(() => { if (phase !== 'playing') keys.current = { left: false, right: false, jump: false, fire: false }; }, [phase]);

    // Idle preview: draw the starting world
    useEffect(() => {
        if (phase === 'playing') return;
        const lvl = Math.max(1, Math.min(3, Math.floor(defaultLevel)));
        const startPow: PowerUp = lvl === 3 ? 'fire' : lvl === 2 ? 'big' : 'small';
        const { world, player } = createWorld(0xc0ffee, startPow);
        worldRef.current = world;
        playerRef.current = player;
        setPowerUp(startPow);
        setDistanceM(0);
        draw();
    }, [defaultLevel, phase, draw]);

    useEffect(() => () => stopLoop(), [stopLoop]);

    return {
        session, phase, displayScore, bestScore, isNewBest, submitState,
        powerUp, distanceM, startGame, setKey,
        canvasSize: { width: WIDTH, height: HEIGHT },
    };
}
