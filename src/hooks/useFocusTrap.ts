'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap<T extends HTMLElement>(
    active: boolean,
    onEscape?: () => void,
) {
    const containerRef = useRef<T | null>(null);

    useEffect(() => {
        if (!active) return;

        const container = containerRef.current;
        const previouslyFocused = document.activeElement as HTMLElement | null;

        const focusFirst = () => {
            const focusables = container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
            focusables?.[0]?.focus();
        };
        focusFirst();

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && onEscape) {
                e.stopPropagation();
                onEscape();
                return;
            }
            if (e.key !== 'Tab' || !container) return;
            const focusables = Array.from(
                container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
            ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
            if (focusables.length === 0) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const activeEl = document.activeElement as HTMLElement | null;
            if (e.shiftKey && activeEl === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && activeEl === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            previouslyFocused?.focus?.();
        };
    }, [active, onEscape]);

    return containerRef;
}
