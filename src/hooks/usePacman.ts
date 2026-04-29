'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useGameTheme } from '@/hooks/useGameTheme';
import { useSoloGame } from '@/hooks/useSoloGame';
import { COLS, ROWS, CELL, KEY_DIR, STARTERS, PACMAN_START, type Dir } from '@/lib/pacman/constants';
import { cloneMaze, countDots, initialGhosts, stepGame, type GameState } from '@/lib/pacman/engine';
import { drawPacman, drawIdleScreen } from '@/lib/pacman/drawing';

function makeInitialState(): GameState {
    const maze = cloneMaze();
    return {
        maze,
        pacPos: { ...PACMAN_START },
        pacDir: 'N',
        pacNextDir: 'N',
        ghosts: initialGhosts(),
        score: 0,
        lives: 3,
        dotsLeft: countDots(maze),
        tick: 0,
        frightenedTicks: 0,
        level: 1,
    };
}

export function usePacman(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
    const {
        session,
        phase,
        phaseRef,
        startGameRef,
        gameIdRef,
        displayScore,
        setDisplayScore,
        bestScore,
        isNewBest,
        submitState,
        endGame: soloEndGame,
        resetForStart,
    } = useSoloGame({
        gameKey: 'pacman',
        submitEndpoint: '/api/pacman/submit',
        localStorageKey: 'pacmanBest',
        starters: STARTERS,
    });

    const stateRef = useRef<GameState>(makeInitialState());
    const pendingDirRef = useRef<Dir>('N');
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const mouthAngleRef = useRef(0);

    const [displayLives, setDisplayLives] = useState(3);
    const [displayLevel, setDisplayLevel] = useState(1);
    const dark = useGameTheme();

    const redrawIdle = useCallback(() => {
        if (!canvasRef.current) return;
        const isDark = document.documentElement.classList.contains('dark');
        drawPacman(canvasRef.current, makeInitialState(), 0.5, isDark);
    }, [canvasRef]);

    useEffect(() => {
        if (phase === 'idle') redrawIdle();
    }, [dark, phase, redrawIdle]);

    const stopTick = useCallback(() => {
        if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    }, []);

    const endGame = useCallback((finalScore: number, finalLevel: number) => {
        stopTick();
        soloEndGame(finalScore, { level: finalLevel });
    }, [stopTick, soloEndGame]);

    const startGame = useCallback(() => {
        stopTick();
        stateRef.current = makeInitialState();
        pendingDirRef.current = 'N';
        mouthAngleRef.current = 0;

        resetForStart();
        setDisplayLives(3);
        setDisplayLevel(1);

        if (canvasRef.current) {
            const isDark = document.documentElement.classList.contains('dark');
            drawPacman(canvasRef.current, stateRef.current, 0, isDark);
        }

        tickRef.current = setInterval(() => {
            mouthAngleRef.current += 0.3;

            const result = stepGame(stateRef.current, pendingDirRef.current);
            pendingDirRef.current = 'N';
            stateRef.current = result.state;

            setDisplayScore(result.state.score);
            setDisplayLives(result.state.lives);
            setDisplayLevel(result.state.level);

            if (canvasRef.current) {
                const isDark = document.documentElement.classList.contains('dark');
                drawPacman(canvasRef.current, result.state, mouthAngleRef.current, isDark);
            }

            if (result.won) {
                // Niveau suivant : on repart avec le même score/vies mais un nouveau labyrinthe
                const nextLevel = result.state.level + 1;
                const freshMaze = cloneMaze(nextLevel);
                stateRef.current = {
                    ...result.state,
                    maze: freshMaze,
                    dotsLeft: countDots(freshMaze),
                    pacPos: { ...PACMAN_START },
                    pacDir: 'N',
                    pacNextDir: 'N',
                    ghosts: initialGhosts(),
                    level: nextLevel,
                };
                pendingDirRef.current = 'N';
                setDisplayLevel(nextLevel);
                return;
            }

            if (result.died) {
                if (result.state.lives <= 0) {
                    endGame(result.state.score, result.state.level);
                } else {
                    stateRef.current = {
                        ...result.state,
                        pacPos: { ...PACMAN_START },
                        pacDir: 'N',
                        pacNextDir: 'N',
                        ghosts: initialGhosts(),
                    };
                }
            }
        }, 150);
    }, [stopTick, endGame, resetForStart, setDisplayScore, canvasRef]);

    // Keyboard direction
    useEffect(() => {
        if (phase !== 'playing') return;
        const handle = (e: KeyboardEvent) => {
            const dir = KEY_DIR[e.key];
            if (dir) { e.preventDefault(); pendingDirRef.current = dir; }
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [phase]);

    useEffect(() => { startGameRef.current = startGame; }, [startGame, startGameRef]);

    // Touch swipe — captured on the whole window so any swipe works
    useEffect(() => {
        let startX = 0, startY = 0;

        const onTouchStart = (e: TouchEvent) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            if (phaseRef.current === 'playing') e.preventDefault();
        };
        const onTouchEnd = (e: TouchEvent) => {
            const dx = e.changedTouches[0].clientX - startX;
            const dy = e.changedTouches[0].clientY - startY;

            if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
                if (phaseRef.current !== 'playing') startGameRef.current();
                return;
            }
            if (phaseRef.current === 'playing') e.preventDefault();

            const dir: Dir = Math.abs(dx) > Math.abs(dy)
                ? (dx > 0 ? 'R' : 'L')
                : (dy > 0 ? 'D' : 'U');

            if (phaseRef.current === 'playing') pendingDirRef.current = dir;
            else startGameRef.current();
        };

        window.addEventListener('touchstart', onTouchStart, { passive: false });
        window.addEventListener('touchend', onTouchEnd, { passive: false });
        return () => {
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchend', onTouchEnd);
        };
    }, [phaseRef, startGameRef]);

    useEffect(() => () => stopTick(), [stopTick]);

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
        canvasSize: { width: COLS * CELL, height: ROWS * CELL },
    };
}
