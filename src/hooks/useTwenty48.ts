'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSoloGame } from '@/hooks/useSoloGame';
import { newBoard, move, addRandomTile, canMove, type Board, type Direction } from '@/lib/twenty48/engine';

const STARTERS = new Set([' ', 'Enter']);

export function useTwenty48() {
    const solo = useSoloGame({
        gameKey: '2048',
        gameType: 'GAME_2048',
        submitEndpoint: '/api/2048/submit',
        localStorageKey: '2048Best',
        starters: STARTERS,
    });

    const [board, setBoard] = useState<Board>(() => Array.from({ length: 4 }, () => Array(4).fill(0)));
    const scoreRef = useRef(0);

    const startGame = useCallback(() => {
        setBoard(newBoard());
        scoreRef.current = 0;
        solo.resetForStart();
    }, [solo]);

    useEffect(() => { solo.startGameRef.current = startGame; }, [startGame, solo.startGameRef]);

    const press = useCallback((dir: Direction) => {
        if (solo.phase !== 'playing') return;
        setBoard(prev => {
            const { board: next, gained, moved } = move(prev, dir);
            if (!moved) return prev;
            addRandomTile(next);
            scoreRef.current += gained;
            solo.setDisplayScore(scoreRef.current);
            if (!canMove(next)) {
                // Defer endGame so React finishes this state update first.
                queueMicrotask(() => solo.endGame(scoreRef.current));
            }
            return next;
        });
    }, [solo]);

    // Keyboard arrows + ZQSD / WASD.
    useEffect(() => {
        if (solo.phase !== 'playing') return;
        const map: Record<string, Direction> = {
            ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
            q: 'left', Q: 'left', a: 'left', A: 'left',
            d: 'right', D: 'right',
            z: 'up', Z: 'up', w: 'up', W: 'up',
            s: 'down', S: 'down',
        };
        const handle = (e: KeyboardEvent) => {
            const dir = map[e.key];
            if (dir) { e.preventDefault(); press(dir); }
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [solo.phase, press]);

    return {
        ...solo,
        board,
        startGame,
        press,
    };
}
