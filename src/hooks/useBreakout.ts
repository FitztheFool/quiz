'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useGameTheme } from '@/hooks/useGameTheme';
import { useSoloGame } from '@/hooks/useSoloGame';
import { W, POWERUP_IMAGE_PATHS } from '@/lib/breakout/constants';
import { makeInitialState, stepGame, launchBall, buildLevel, type GameState } from '@/lib/breakout/engine';
import { drawBreakout, drawIdleScreen, preloadPowerUpImages } from '@/lib/breakout/drawing';

export function useBreakout(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
    const {
        session,
        phase,
        phaseRef,
        startGameRef,
        displayScore,
        setDisplayScore,
        bestScore,
        isNewBest,
        submitState,
        endGame: soloEndGame,
        resetForStart,
    } = useSoloGame({
        gameKey: 'breakout',
        submitEndpoint: '/api/breakout/submit',
        localStorageKey: 'breakoutBest',
        starters: new Set(['Enter', ' ']),
    });

    const stateRef = useRef<GameState>(makeInitialState(1));
    const rafRef = useRef<number | null>(null);

    // Input refs (updated every frame, no re-renders)
    const paddleTargetXRef = useRef<number | null>(null);
    const fireRef = useRef(false);

    const [displayLives, setDisplayLives] = useState(3);
    const [displayLevel, setDisplayLevel] = useState(1);
    const dark = useGameTheme();

    useEffect(() => { preloadPowerUpImages(POWERUP_IMAGE_PATHS); }, []);

    const redrawIdle = useCallback(() => {
        if (!canvasRef.current) return;
        const isDark = document.documentElement.classList.contains('dark');
        drawIdleScreen(canvasRef.current, isDark);
    }, [canvasRef]);

    useEffect(() => {
        if (phase === 'idle') redrawIdle();
    }, [dark, phase, redrawIdle]);

    const stopLoop = useCallback(() => {
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    }, []);

    const endGame = useCallback((finalScore: number, finalLevel: number) => {
        stopLoop();
        soloEndGame(finalScore, { level: finalLevel });
    }, [stopLoop, soloEndGame]);

    const startGame = useCallback(() => {
        stopLoop();
        const state = makeInitialState(1);
        stateRef.current = state;
        paddleTargetXRef.current = null;
        fireRef.current = false;

        resetForStart();
        setDisplayLives(3);
        setDisplayLevel(1);

        if (canvasRef.current) {
            const isDark = document.documentElement.classList.contains('dark');
            drawBreakout(canvasRef.current, state, isDark);
        }

        const loop = () => {
            if (phaseRef.current !== 'playing') return;

            const fire = fireRef.current;
            fireRef.current = false;

            const result = stepGame(stateRef.current, paddleTargetXRef.current, fire);
            stateRef.current = result.state;

            setDisplayScore(result.state.score);
            setDisplayLives(result.state.lives);

            if (canvasRef.current) {
                const isDark = document.documentElement.classList.contains('dark');
                drawBreakout(canvasRef.current, result.state, isDark);
            }

            if (result.state.dead) {
                endGame(result.state.score, result.state.level);
                return;
            }

            if (result.levelComplete) {
                const nextLevel = result.state.level + 1;
                const newBricks = buildLevel(nextLevel);
                stateRef.current = {
                    ...result.state,
                    bricks: newBricks,
                    level: nextLevel,
                    balls: [{
                        x: result.state.paddleX + result.state.paddleW / 2,
                        y: 490,
                        vx: 0,
                        vy: 0,
                        stuck: true,
                    }],
                    lasers: [],
                    fallingPowers: [],
                    activeEffects: [],
                    laserMode: false,
                    stickyMode: false,
                };
                setDisplayLevel(nextLevel);
            }

            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
    }, [stopLoop, endGame, resetForStart, setDisplayScore, phaseRef, canvasRef]);

    // Launch ball on click / space
    const handleLaunch = useCallback(() => {
        if (phaseRef.current !== 'playing') return;
        const state = stateRef.current;
        const hasStuck = state.balls.some(b => b.stuck);
        if (hasStuck) {
            stateRef.current = launchBall(state);
        } else if (state.laserMode) {
            fireRef.current = true;
        }
    }, [phaseRef]);

    // Mouse / pointer move on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onMouseMove = (e: MouseEvent) => {
            if (phaseRef.current !== 'playing') return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = W / rect.width;
            paddleTargetXRef.current = (e.clientX - rect.left) * scaleX;
        };

        const onClick = (e: MouseEvent) => {
            if (phaseRef.current === 'idle' || phaseRef.current === 'over') {
                startGameRef.current();
                return;
            }
            handleLaunch();
            e.preventDefault();
        };

        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('click', onClick);
        return () => {
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('click', onClick);
        };
    }, [canvasRef, handleLaunch, phaseRef, startGameRef]);

    // Keyboard during play
    useEffect(() => {
        if (phase !== 'playing') return;
        const STEP = 8;
        const keys = new Set<string>();

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === ' ') { e.preventDefault(); handleLaunch(); return; }
            keys.add(e.key);
        };
        const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key);

        const interval = setInterval(() => {
            if (phaseRef.current !== 'playing') return;
            const state = stateRef.current;
            let dx = 0;
            if (keys.has('ArrowLeft') || keys.has('q') || keys.has('Q')) dx = -STEP;
            if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) dx = STEP;
            if (dx !== 0) {
                paddleTargetXRef.current = state.paddleX + state.paddleW / 2 + dx;
            }
        }, 16);

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            clearInterval(interval);
        };
    }, [phase, handleLaunch, phaseRef]);

    useEffect(() => { startGameRef.current = startGame; }, [startGame, startGameRef]);

    // Touch controls — drag for paddle, tap for launch
    // Only intercept events whose touch STARTED on the canvas, so UI buttons remain tappable.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        let touchOnCanvas = false;

        const onTouchStart = (e: TouchEvent) => {
            const t = e.touches[0];
            touchStartX = t.clientX;
            touchStartY = t.clientY;
            touchStartTime = Date.now();
            const rect = canvas.getBoundingClientRect();
            touchOnCanvas = (
                t.clientX >= rect.left && t.clientX <= rect.right &&
                t.clientY >= rect.top  && t.clientY <= rect.bottom
            );
            if (touchOnCanvas && phaseRef.current === 'playing') e.preventDefault();
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!touchOnCanvas || phaseRef.current !== 'playing') return;
            e.preventDefault();
            const t = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const scaleX = W / rect.width;
            paddleTargetXRef.current = (t.clientX - rect.left) * scaleX;
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (!touchOnCanvas) return;

            const dx = Math.abs(e.changedTouches[0].clientX - touchStartX);
            const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
            const isTap = dx < 15 && dy < 15 && Date.now() - touchStartTime < 200;

            if (phaseRef.current === 'idle' || phaseRef.current === 'over') {
                startGameRef.current();
                return;
            }
            if (phaseRef.current === 'playing') {
                e.preventDefault();
                if (isTap) handleLaunch();
            }
        };

        window.addEventListener('touchstart', onTouchStart, { passive: false });
        window.addEventListener('touchmove',  onTouchMove,  { passive: false });
        window.addEventListener('touchend',   onTouchEnd,   { passive: false });
        return () => {
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove',  onTouchMove);
            window.removeEventListener('touchend',   onTouchEnd);
        };
    }, [canvasRef, handleLaunch, phaseRef, startGameRef]);

    useEffect(() => () => stopLoop(), [stopLoop]);

    return {
        phase,
        displayScore,
        displayLives,
        displayLevel,
        bestScore,
        isNewBest,
        submitState,
        startGame,
        session,
    };
}
