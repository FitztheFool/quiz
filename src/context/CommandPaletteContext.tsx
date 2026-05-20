'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

interface CommandPaletteCtx {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
}

const Ctx = createContext<CommandPaletteCtx | null>(null);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen(v => !v), []);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                toggle();
            } else if (e.key === 'Escape' && isOpen) {
                close();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [toggle, close, isOpen]);

    const value = useMemo(() => ({ isOpen, open, close, toggle }), [isOpen, open, close, toggle]);
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCommandPalette() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useCommandPalette must be inside CommandPaletteProvider');
    return ctx;
}
