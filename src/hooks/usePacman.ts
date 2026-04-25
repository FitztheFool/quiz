'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { COLS, ROWS, CELL, KEY_DIR, STARTERS, PACMAN_START, type Dir } from '@/lib/pacman/constants';
import { cloneMaze, countDots, initialGhosts, stepGame, type GameState } from '@/lib/pacman/engine';
import { drawPacman, drawIdleScreen } from '@/lib/pacman/drawing';

export type Phase = 'idle' | 'playing' | 'over' | 'win';

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
    };
}

export function usePacman(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
    const { data: session } = useSession();

    const stateRef = useRef<GameState>(makeInitialState());
    const pendingDirRef = useRef<Dir>('N');
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const mouthAngleRef = useRef(0);
    const gameIdRef = useRef('');

    const phaseRef = useRef<Phase>('idle');
    const startGameRef = useRef<() => void>(() => {});

    const [phase, setPhase] = useState<Phase>('idle');
    const [displayScore, setDisplayScore] = useState(0);
    const [displayLives, setDisplayLives] = useState(3);
    const [bestScore, setBestScore] = useState(0);
    const [isNewBest, setIsNewBest] = useState(false);
    const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
    const [dark, setDark] = useState(false);

    useEffect(() => {
        const savedBest = parseInt(localStorage.getItem('pacmanBest') ?? '0');
        if (!isNaN(savedBest)) setBestScore(savedBest);
    }, []);

    useEffect(() => {
        const update = () => setDark(document.documentElement.classList.contains('dark'));
        update();
        const obs = new MutationObserver(update);
        obs.observe(document.documentElement, { attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    const redrawIdle = useCallback(() => {
        if (!canvasRef.current) return;
        const isDark = document.documentElement.classList.contains('dark');
        drawIdleScreen(canvasRef.current, isDark);
    }, [canvasRef]);

    useEffect(() => {
        if (phase === 'idle') redrawIdle();
    }, [dark, phase, redrawIdle]);

    const stopTick = useCallback(() => {
        if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    }, []);

    const submitScore = useCallback(async (finalScore: number) => {
        if (!session?.user || finalScore <= 0) return;
        setSubmitState('loading');
        try {
            const res = await fetch('/api/pacman/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score: finalScore, gameId: gameIdRef.current }),
            });
            setSubmitState(res.ok ? 'done' : 'error');
        } catch {
            setSubmitState('error');
        }
    }, [session]);

    const endGame = useCallback((finalScore: number, won: boolean) => {
        stopTick();
        setPhase(won ? 'win' : 'over');
        setDisplayScore(finalScore);
        let newBest = false;
        setBestScore(prev => {
            if (finalScore > prev) {
                newBest = true;
                localStorage.setItem('pacmanBest', String(finalScore));
                return finalScore;
            }
            return prev;
        });
        setIsNewBest(newBest);
        submitScore(finalScore);
    }, [stopTick, submitScore]);

    const startGame = useCallback(() => {
        stopTick();
        stateRef.current = makeInitialState();
        pendingDirRef.current = 'N';
        mouthAngleRef.current = 0;
        gameIdRef.current = crypto.randomUUID();

        setPhase('playing');
        setDisplayScore(0);
        setDisplayLives(3);
        setSubmitState('idle');
        setIsNewBest(false);

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

            if (canvasRef.current) {
                const isDark = document.documentElement.classList.contains('dark');
                drawPacman(canvasRef.current, result.state, mouthAngleRef.current, isDark);
            }

            if (result.won) { endGame(result.state.score, true); return; }
            if (result.died) {
                if (result.state.lives <= 0) {
                    endGame(result.state.score, false);
                } else {
                    // Brief pause then reset positions
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
    }, [stopTick, endGame, canvasRef]);

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

    // Keyboard start
    useEffect(() => {
        if (phase !== 'idle' && phase !== 'over' && phase !== 'win') return;
        const handle = (e: KeyboardEvent) => {
            if (STARTERS.has(e.key)) { e.preventDefault(); startGame(); }
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [phase, startGame]);

    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { startGameRef.current = startGame; }, [startGame]);

    // Touch swipe
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        let startX = 0, startY = 0;

        const onTouchStart = (e: TouchEvent) => {
            e.preventDefault();
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        };
        const onTouchEnd = (e: TouchEvent) => {
            e.preventDefault();
            const dx = e.changedTouches[0].clientX - startX;
            const dy = e.changedTouches[0].clientY - startY;

            if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
                if (phaseRef.current !== 'playing') startGameRef.current();
                return;
            }
            const dir: Dir = Math.abs(dx) > Math.abs(dy)
                ? (dx > 0 ? 'R' : 'L')
                : (dy > 0 ? 'D' : 'U');

            if (phaseRef.current === 'playing') pendingDirRef.current = dir;
            else startGameRef.current();
        };

        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd, { passive: false });
        return () => {
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchend', onTouchEnd);
        };
    }, [canvasRef]);

    useEffect(() => () => stopTick(), [stopTick]);

    return {
        phase,
        displayScore,
        displayLives,
        bestScore,
        isNewBest,
        submitState,
        startGame,
        session,
        canvasSize: { width: COLS * CELL, height: ROWS * CELL },
    };
}
