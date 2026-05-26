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

    // Escape closes the palette when open. (Cmd/Ctrl+K shortcut intentionally removed.)
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [close, isOpen]);

    const value = useMemo(() => ({ isOpen, open, close, toggle }), [isOpen, open, close, toggle]);
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCommandPalette() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useCommandPalette must be inside CommandPaletteProvider');
    return ctx;
}
