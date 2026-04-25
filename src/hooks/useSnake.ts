'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { COLS, ROWS, CELL, TICK, OPP, DELTA, COLORS, KEY_DIR, STARTERS, type Pos, type Dir, type SnakeColor } from '@/lib/snake/constants';
import { drawGame } from '@/lib/snake/drawing';
import { randomApple, initialSnake } from '@/lib/snake/engine';

export type Phase = 'idle' | 'playing' | 'over';

export function useSnake(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
    const { data: session } = useSession();

    const snakeRef = useRef<Pos[]>([]);
    const dirRef = useRef<Dir>('R');
    const pendingRef = useRef<Dir>('R');
    const appleRef = useRef<Pos>({ x: 15, y: 10 });
    const scoreRef = useRef(0);
    const gameIdRef = useRef('');
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const colorRef = useRef<SnakeColor>(COLORS[0]);

    const phaseRef = useRef<Phase>('idle');
    const startGameRef = useRef<() => void>(() => {});

    const [phase, setPhase] = useState<Phase>('idle');
    const [displayScore, setDisplayScore] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [isNewBest, setIsNewBest] = useState(false);
    const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
    const [dark, setDark] = useState(false);
    const [colorIndex, setColorIndex] = useState(0);

    useEffect(() => {
        const savedBest = parseInt(localStorage.getItem('snakeBest') ?? '0');
        if (!isNaN(savedBest)) setBestScore(savedBest);

        const savedColor = parseInt(localStorage.getItem('snakeColor') ?? '0');
        if (!isNaN(savedColor) && savedColor >= 0 && savedColor < COLORS.length) {
            setColorIndex(savedColor);
            colorRef.current = COLORS[savedColor];
        }
    }, []);

    useEffect(() => {
        const update = () => setDark(document.documentElement.classList.contains('dark'));
        update();
        const obs = new MutationObserver(update);
        obs.observe(document.documentElement, { attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        snakeRef.current = initialSnake();
    }, []);

    const redraw = useCallback(() => {
        if (!canvasRef.current) return;
        const isDark = document.documentElement.classList.contains('dark');
        drawGame(canvasRef.current, snakeRef.current, appleRef.current, isDark, colorRef.current);
    }, [canvasRef]);

    useEffect(() => { redraw(); }, [dark, redraw]);

    useEffect(() => {
        colorRef.current = COLORS[colorIndex];
        localStorage.setItem('snakeColor', String(colorIndex));
        redraw();
    }, [colorIndex, redraw]);

    const stopTick = useCallback(() => {
        if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    }, []);

    const endGame = useCallback(async (finalScore: number) => {
        stopTick();
        setPhase('over');
        setDisplayScore(finalScore);

        let newBest = false;
        setBestScore(prev => {
            if (finalScore > prev) {
                newBest = true;
                localStorage.setItem('snakeBest', String(finalScore));
                return finalScore;
            }
            return prev;
        });
        setIsNewBest(newBest);

        if (session?.user && finalScore > 0) {
            setSubmitState('loading');
            try {
                const res = await fetch('/api/snake/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ score: finalScore, gameId: gameIdRef.current }),
                });
                setSubmitState(res.ok ? 'done' : 'error');
            } catch {
                setSubmitState('error');
            }
        }
    }, [session, stopTick]);

    const startGame = useCallback(() => {
        stopTick();
        snakeRef.current = initialSnake();
        dirRef.current = 'R';
        pendingRef.current = 'R';
        scoreRef.current = 0;
        appleRef.current = randomApple(snakeRef.current);
        gameIdRef.current = crypto.randomUUID();

        setPhase('playing');
        setDisplayScore(0);
        setSubmitState('idle');
        setIsNewBest(false);
        redraw();

        tickRef.current = setInterval(() => {
            const pending = pendingRef.current;
            if (OPP[dirRef.current] !== pending) dirRef.current = pending;

            const snake = snakeRef.current;
            const delta = DELTA[dirRef.current];
            const next = { x: snake[0].x + delta.x, y: snake[0].y + delta.y };

            if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
                endGame(scoreRef.current); return;
            }
            if (snake.slice(0, -1).some(s => s.x === next.x && s.y === next.y)) {
                endGame(scoreRef.current); return;
            }

            const ate = next.x === appleRef.current.x && next.y === appleRef.current.y;
            if (ate) {
                snakeRef.current = [next, ...snake];
                appleRef.current = randomApple(snakeRef.current);
                scoreRef.current += 10;
                setDisplayScore(scoreRef.current);
            } else {
                snakeRef.current = [next, ...snake.slice(0, -1)];
            }

            if (canvasRef.current) {
                const isDark = document.documentElement.classList.contains('dark');
                drawGame(canvasRef.current, snakeRef.current, appleRef.current, isDark, colorRef.current);
            }
        }, TICK);
    }, [stopTick, endGame, redraw, canvasRef]);

    const press = useCallback((dir: Dir) => {
        if (phase === 'playing') pendingRef.current = dir;
    }, [phase]);

    useEffect(() => {
        if (phase !== 'playing') return;
        const handle = (e: KeyboardEvent) => {
            const dir = KEY_DIR[e.key];
            if (dir) { e.preventDefault(); pendingRef.current = dir; }
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [phase]);

    useEffect(() => {
        if (phase !== 'idle' && phase !== 'over') return;
        const handle = (e: KeyboardEvent) => {
            if (STARTERS.has(e.key)) { e.preventDefault(); startGame(); }
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [phase, startGame]);

    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { startGameRef.current = startGame; }, [startGame]);

    // Swipe-to-play on canvas
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

            if (phaseRef.current === 'playing') {
                pendingRef.current = dir;
            } else {
                startGameRef.current();
            }
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
        bestScore,
        isNewBest,
        submitState,
        colorIndex,
        setColorIndex,
        startGame,
        press,
        canvasSize: { width: COLS * CELL, height: ROWS * CELL },
        session,
    };
}
