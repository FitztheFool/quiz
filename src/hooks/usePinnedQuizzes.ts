'use client';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'pinnedQuizzes';
const MAX = 5;

export interface PinnedQuiz {
    id: string;
    title: string;
}

function read(): PinnedQuiz[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return [];
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data.filter(d => typeof d?.id === 'string' && typeof d?.title === 'string').slice(0, MAX) : [];
    } catch {
        return [];
    }
}

function write(list: PinnedQuiz[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    window.dispatchEvent(new CustomEvent('pinnedQuizzes:changed'));
}

export function usePinnedQuizzes() {
    const [pinned, setPinned] = useState<PinnedQuiz[]>([]);

    useEffect(() => {
        setPinned(read());
        const onChange = () => setPinned(read());
        window.addEventListener('pinnedQuizzes:changed', onChange);
        window.addEventListener('storage', onChange);
        return () => {
            window.removeEventListener('pinnedQuizzes:changed', onChange);
            window.removeEventListener('storage', onChange);
        };
    }, []);

    const pin = useCallback((q: PinnedQuiz) => {
        const current = read();
        if (current.some(p => p.id === q.id)) return;
        write([q, ...current]);
    }, []);

    const unpin = useCallback((id: string) => {
        write(read().filter(p => p.id !== id));
    }, []);

    const isPinned = useCallback((id: string) => pinned.some(p => p.id === id), [pinned]);

    return { pinned, pin, unpin, isPinned };
}
