'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useGameTheme } from '@/hooks/useGameTheme';
import { useSoloGame } from '@/hooks/useSoloGame';
import { STARTERS, getSpeed } from '@/lib/tetris/constants';
import { makeInitialState, tryMove, tryRotate, applyGravity, hardDrop, type GameState } from '@/lib/tetris/engine';
import { drawTetris } from '@/lib/tetris/drawing';

export function useTetris(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
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
        gameKey: 'tetris',
        submitEndpoint: '/api/tetris/submit',
        localStorageKey: 'tetrisBest',
        starters: STARTERS,
    });

    const stateRef = useRef<GameState>(makeInitialState());
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastGravityRef = useRef(0);
    const [displayLevel, setDisplayLevel] = useState(1);
    const [displayLines, setDisplayLines] = useState(0);

    const dark = useGameTheme();

    const redraw = useCallback(() => {
        if (!canvasRef.current) return;
        drawTetris(canvasRef.current, stateRef.current);
    }, [canvasRef]);

    useEffect(() => {
        if (phase === 'idle') redraw();
    }, [dark, phase, redraw]);

    const stopTick = useCallback(() => {
        if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    }, []);

    const endGame = useCallback((s: GameState) => {
        stopTick();
        soloEndGame(s.score, { level: s.level, lines: s.lines });
    }, [stopTick, soloEndGame]);

    const handleGravityResult = useCallback((result: ReturnType<typeof applyGravity>) => {
        stateRef.current = result.state;
        if (result.linesCleared > 0 || result.locked) {
            setDisplayScore(result.state.score);
            setDisplayLines(result.state.lines);
            setDisplayLevel(result.state.level);
        }
        if (result.state.over) { endGame(result.state); return; }
        redraw();
    }, [endGame, redraw, setDisplayScore]);

    const startGame = useCallback(() => {
        stopTick();
        stateRef.current = makeInitialState();
        resetForStart();
        setDisplayLevel(1);
        setDisplayLines(0);
        lastGravityRef.current = Date.now();
        redraw();

        tickRef.current = setInterval(() => {
            if (phaseRef.current !== 'playing') return;
            const now = Date.now();
            if (now - lastGravityRef.current >= getSpeed(stateRef.current.level)) {
                lastGravityRef.current = now;
                handleGravityResult(applyGravity(stateRef.current));
            } else {
                redraw();
            }
        }, 50);
    }, [stopTick, resetForStart, redraw, phaseRef, handleGravityResult]);

    // Keyboard input
    useEffect(() => {
        if (phase !== 'playing') return;

        const onKeyDown = (e: KeyboardEvent) => {
            const s = stateRef.current;
            let handled = true;

            switch (e.key) {
                case 'ArrowLeft': case 'q': case 'Q': {
                    const m = tryMove(s, -1); if (m) { stateRef.current = m; redraw(); } break;
                }
                case 'ArrowRight': case 'd': case 'D': {
                    const m = tryMove(s, 1); if (m) { stateRef.current = m; redraw(); } break;
                }
                case 'ArrowDown': case 's': case 'S': {
                    lastGravityRef.current = Date.now();
                    handleGravityResult(applyGravity(s));
                    break;
                }
                case 'ArrowUp': case 'z': case 'Z': {
                    const r = tryRotate(s, true); if (r) { stateRef.current = r; redraw(); } break;
                }
                case 'x': case 'X': {
                    const r = tryRotate(s, false); if (r) { stateRef.current = r; redraw(); } break;
                }
                case ' ': {
                    const { state: newS, linesCleared } = hardDrop(s);
                    stateRef.current = newS;
                    lastGravityRef.current = Date.now();
                    setDisplayScore(newS.score);
                    setDisplayLines(newS.lines);
                    setDisplayLevel(newS.level);
                    if (newS.over) endGame(newS);
                    else if (linesCleared > 0 || true) redraw();
                    break;
                }
                default: handled = false;
            }

            if (handled) e.preventDefault();
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [phase, redraw, endGame, handleGravityResult, setDisplayScore]);

    // Touch input
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
                if (phaseRef.current !== 'playing') { startGameRef.current(); return; }
                const r = tryRotate(stateRef.current, true);
                if (r) { stateRef.current = r; redraw(); }
                return;
            }

            if (phaseRef.current !== 'playing') { startGameRef.current(); return; }

            if (Math.abs(dx) > Math.abs(dy)) {
                const m = tryMove(stateRef.current, dx > 0 ? 1 : -1);
                if (m) { stateRef.current = m; redraw(); }
            } else if (dy > 0) {
                const { state: newS, linesCleared } = hardDrop(stateRef.current);
                stateRef.current = newS;
                lastGravityRef.current = Date.now();
                setDisplayScore(newS.score);
                setDisplayLines(newS.lines);
                setDisplayLevel(newS.level);
                if (newS.over) endGame(newS);
                else if (linesCleared >= 0) redraw();
            }
        };

        window.addEventListener('touchstart', onTouchStart, { passive: false });
        window.addEventListener('touchend', onTouchEnd, { passive: false });
        return () => {
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchend', onTouchEnd);
        };
    }, [phaseRef, startGameRef, redraw, endGame, setDisplayScore]);

    useEffect(() => { startGameRef.current = startGame; }, [startGame, startGameRef]);
    useEffect(() => () => stopTick(), [stopTick]);

    return {
        phase,
        displayScore,
        displayLevel,
        displayLines,
        bestScore,
        isNewBest,
        submitState,
        startGame,
        session,
    };
}
