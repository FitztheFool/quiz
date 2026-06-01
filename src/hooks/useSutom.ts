'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSoloGame } from './useSoloGame';
import { normalizeWord } from '@/lib/sutom/words';
import { evaluateGuess, scoreFor, MAX_TRIES, type LetterState } from '@/lib/sutom/engine';

export interface SutomRow {
    guess: string;
    states: LetterState[];
}

export function useSutom() {
    const solo = useSoloGame({
        gameKey: 'sutom',
        gameType: 'SUTOM',
        submitEndpoint: '/api/sutom/submit',
        localStorageKey: 'sutomBest',
        starters: new Set(['Enter', ' ']),
    });

    const [answer, setAnswer] = useState('');
    const [category, setCategory] = useState('');
    const [hintRevealed, setHintRevealed] = useState(false);
    const [rows, setRows] = useState<SutomRow[]>([]);
    const [current, setCurrent] = useState('');   // always starts with the revealed first letter
    const [message, setMessage] = useState('');
    const [won, setWon] = useState(false);
    const [loading, setLoading] = useState(false);

    const start = useCallback(async () => {
        if (loading) return;
        setLoading(true);
        setMessage('');
        let w = '';
        let cat = '';
        try {
            const res = await fetch('/api/sutom/word');
            const data = await res.json();
            if (data?.word) w = normalizeWord(data.word);
            if (typeof data?.category === 'string') cat = data.category;
        } catch { /* handled below */ }
        setLoading(false);
        if (!w || w.length < 6) { setMessage('Impossible de charger un mot, réessayez.'); return; }
        setAnswer(w);
        setCategory(cat);
        setHintRevealed(false);
        setRows([]);
        setCurrent(w[0]);     // first letter is given
        setWon(false);
        solo.resetForStart();
    }, [solo, loading]);

    const revealHint = useCallback(() => {
        if (category) setHintRevealed(true);
    }, [category]);

    useEffect(() => { solo.startGameRef.current = start; }, [start, solo.startGameRef]);

    const submit = useCallback(() => {
        if (current.length !== answer.length) { setMessage(`Il faut ${answer.length} lettres`); return; }
        if (current[0] !== answer[0]) { setMessage(`Le mot commence par ${answer[0]}`); return; }

        const states = evaluateGuess(current, answer);
        const next = [...rows, { guess: current, states }];
        setRows(next);
        setMessage('');

        if (current === answer) {
            setWon(true);
            solo.endGame(scoreFor(next.length, answer.length));
        } else if (next.length >= MAX_TRIES) {
            setWon(false);
            solo.endGame(0);
        } else {
            setCurrent(answer[0]); // prefill next row with the given first letter
        }
    }, [current, answer, rows, solo]);

    // Give up: end the round with a 0 score (not submitted — useSoloGame skips
    // zero scores), revealing the answer in the game-over overlay.
    const abandon = useCallback(() => {
        if (solo.phase !== 'playing') return;
        setWon(false);
        solo.endGame(0);
    }, [solo]);

    const onKey = useCallback((rawKey: string) => {
        if (solo.phase !== 'playing') return;
        const key = rawKey.toUpperCase();
        if (key === 'ENTER') { submit(); return; }
        if (key === 'BACKSPACE') { setCurrent(c => (c.length > 1 ? c.slice(0, -1) : c)); return; }
        const letter = normalizeWord(rawKey);
        if (letter.length === 1) {
            setCurrent(c => (c.length < answer.length ? c + letter : c));
            setMessage('');
        }
    }, [solo.phase, answer.length, submit]);

    // Physical keyboard. Skip when an <input>/<textarea> is focused (the native
    // mobile keyboard feeds events to that input — we don't want to double-process).
    useEffect(() => {
        if (solo.phase !== 'playing') return;
        const handle = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement | null)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            if (e.key === 'Enter') { e.preventDefault(); onKey('ENTER'); }
            else if (e.key === 'Backspace') { e.preventDefault(); onKey('BACKSPACE'); }
            else if (e.key.length === 1) onKey(e.key);
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [solo.phase, onKey]);

    // Bulk-set current from a raw input value (native mobile keyboard via a hidden <input>).
    // Always keeps the revealed first letter and clamps to the word length.
    const setCurrentInput = useCallback((raw: string) => {
        let v = normalizeWord(raw);
        if (!answer) return;
        if (!v.startsWith(answer[0])) v = answer[0] + v;
        setCurrent(v.slice(0, answer.length) || answer[0]);
        setMessage('');
    }, [answer]);

    // Per-letter best state, for colouring the on-screen keyboard.
    const keyStates: Record<string, LetterState> = {};
    const rank: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 };
    for (const r of rows) {
        for (let i = 0; i < r.guess.length; i++) {
            const c = r.guess[i], s = r.states[i];
            if (!keyStates[c] || rank[s] > rank[keyStates[c]]) keyStates[c] = s;
        }
    }

    return {
        ...solo,
        answer,
        category,
        hintRevealed,
        revealHint,
        length: answer.length,
        rows,
        current,
        message,
        won,
        loading,
        keyStates,
        start,
        onKey,
        setCurrentInput,
        submit,
        abandon,
    };
}
