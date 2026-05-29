'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export type Phase = 'idle' | 'playing' | 'over';
export type SubmitState = 'idle' | 'loading' | 'done' | 'error';

export function useSoloGame({
    gameKey,
    gameType,
    submitEndpoint,
    localStorageKey,
    starters,
    allowZeroScore = false,
}: {
    gameKey: string;
    gameType: string;
    submitEndpoint: string;
    localStorageKey: string;
    starters: Set<string>;
    /** Submit attempts even when the final score is 0 (default: skip). */
    allowZeroScore?: boolean;
}) {
    const { data: session } = useSession();

    const phaseRef    = useRef<Phase>('idle');
    const startGameRef = useRef<() => void>(() => {});
    const gameIdRef   = useRef('');
    // Resolves to the signed server token once /api/solo/start responds
    const tokenRef    = useRef<Promise<string> | null>(null);

    const [phase, setPhase]             = useState<Phase>('idle');
    const [displayScore, setDisplayScore] = useState(0);
    const [bestScore, setBestScore]     = useState(0);
    const [isNewBest, setIsNewBest]     = useState(false);
    const [submitState, setSubmitState] = useState<SubmitState>('idle');

    // Best score: localStorage first, then server
    useEffect(() => {
        const local = parseInt(localStorage.getItem(localStorageKey) ?? '0');
        if (!isNaN(local)) setBestScore(local);
    }, [localStorageKey]);

    useEffect(() => {
        if (!session?.user) return;
        fetch(`/api/solo/${gameKey}/best`)
            .then(r => r.json())
            .then(({ best }: { best: number }) => {
                if (typeof best === 'number' && best > 0) setBestScore(prev => Math.max(prev, best));
            })
            .catch(() => {});
    }, [session, gameKey]);

    useEffect(() => { phaseRef.current = phase; }, [phase]);

    // Keyboard: start game on idle/over
    useEffect(() => {
        if (phase !== 'idle' && phase !== 'over') return;
        const handle = (e: KeyboardEvent) => {
            if (starters.has(e.key)) { e.preventDefault(); startGameRef.current(); }
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [phase, starters]);

    const submitScore = useCallback(async (finalScore: number, extraPayload?: Record<string, unknown>) => {
        if (!session?.user || finalScore < 0) return;
        if (finalScore === 0 && !allowZeroScore) return;
        setSubmitState('loading');
        try {
            const token = await (tokenRef.current ?? Promise.resolve(''));
            if (!token) { setSubmitState('error'); return; }
            const res = await fetch(submitEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score: finalScore, token, ...extraPayload }),
            });
            setSubmitState(res.ok ? 'done' : 'error');
        } catch {
            setSubmitState('error');
        }
    }, [session, submitEndpoint, allowZeroScore]);

    const endGame = useCallback((finalScore: number, extraPayload?: Record<string, unknown>) => {
        setPhase('over');
        phaseRef.current = 'over';
        setDisplayScore(finalScore);
        let newBest = false;
        setBestScore(prev => {
            if (finalScore > prev) {
                newBest = true;
                localStorage.setItem(localStorageKey, String(finalScore));
                return finalScore;
            }
            return prev;
        });
        setIsNewBest(newBest);
        submitScore(finalScore, extraPayload);
    }, [submitScore, localStorageKey]);

    const resetForStart = useCallback(() => {
        gameIdRef.current = crypto.randomUUID();

        // Fetch a signed token from the server immediately — runs in parallel with gameplay.
        // By the time the game ends (≥10 s), the token will be resolved.
        if (session?.user) {
            tokenRef.current = fetch('/api/solo/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameType }),
            })
                .then(r => r.json())
                .then(({ token }: { token: string }) => token ?? '')
                .catch(() => '');
        } else {
            tokenRef.current = null;
        }

        setPhase('playing');
        phaseRef.current = 'playing';
        setDisplayScore(0);
        setSubmitState('idle');
        setIsNewBest(false);
    }, [session, gameType]);

    return {
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
        endGame,
        resetForStart,
    };
}
