'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useCommandPalette } from '@/context/CommandPaletteContext';
import { usePinnedQuizzes } from '@/hooks/usePinnedQuizzes';
import {
    MagnifyingGlassIcon,
    SignalIcon,
    PlusIcon,
    SparklesIcon,
    TrophyIcon,
    Squares2X2Icon,
    Cog6ToothIcon,
    ShieldCheckIcon,
    ArrowRightStartOnRectangleIcon,
    BookmarkIcon,
    ListBulletIcon,
} from '@heroicons/react/24/outline';

type IconComponent = React.ComponentType<{ className?: string }>;

interface CommandItem {
    id: string;
    label: string;
    hint?: string;
    Icon: IconComponent;
    keywords?: string;
    onSelect: () => void;
}

export default function CommandPalette() {
    const { isOpen, close } = useCommandPalette();
    const router = useRouter();
    const { data: session } = useSession();
    const { pinned } = usePinnedQuizzes();
    const [query, setQuery] = useState('');
    const [activeIdx, setActiveIdx] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const isAuth = !!session?.user;
    const isAdmin = session?.user?.role === 'ADMIN';
    const isGuest = session?.user?.role === 'GUEST' || session?.user?.isAnonymous === true;
    const canCreateQuiz = isAuth && !isGuest;

    const items: CommandItem[] = useMemo(() => {
        const goto = (href: string) => () => { close(); router.push(href); };
        const lobbyCode = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : Date.now().toString(36);

        const all: CommandItem[] = [];
        if (isAuth) {
            all.push({ id: 'lobby-create', label: 'Créer un lobby', hint: 'JOUER', Icon: PlusIcon, keywords: 'nouveau partie create', onSelect: goto(`/lobby/create/${lobbyCode}`) });
            all.push({ id: 'lobby-all', label: 'Voir les lobbies', hint: 'JOUER', Icon: SignalIcon, keywords: 'lobbies multijoueur', onSelect: goto('/lobby/all') });
        }
        all.push({ id: 'leaderboard', label: 'Classement', hint: 'JOUER', Icon: TrophyIcon, keywords: 'leaderboard scores', onSelect: goto('/leaderboard/uno') });
        all.push({ id: 'quiz-available', label: 'Quiz disponibles', hint: 'JOUER', Icon: ListBulletIcon, keywords: 'jouer quiz disponibles', onSelect: goto('/quiz/available') });
        if (canCreateQuiz) {
            all.push({ id: 'quiz-mine', label: 'Mes quiz', hint: 'CRÉER', Icon: BookmarkIcon, onSelect: goto('/quiz/my-quizzes') });
            all.push({ id: 'quiz-gen', label: 'Générer (IA)', hint: 'CRÉER', Icon: SparklesIcon, keywords: 'ai generation', onSelect: goto('/quiz/generate') });
            all.push({ id: 'quiz-create', label: 'Créer un quiz', hint: 'CRÉER', Icon: PlusIcon, onSelect: goto('/quiz/create') });
        }
        if (isAuth) {
            all.push({ id: 'dashboard', label: 'Dashboard', hint: 'COMPTE', Icon: Squares2X2Icon, onSelect: goto('/dashboard') });
        }
        all.push({ id: 'settings', label: 'Paramètres', hint: 'COMPTE', Icon: Cog6ToothIcon, keywords: 'settings preferences', onSelect: goto('/settings') });
        if (isAuth && isAdmin) {
            all.push({ id: 'admin', label: 'Admin', hint: 'COMPTE', Icon: ShieldCheckIcon, onSelect: goto('/admin') });
        }

        for (const p of pinned) {
            all.push({
                id: `pin-${p.id}`,
                label: p.title,
                hint: 'QUIZ ÉPINGLÉ',
                Icon: BookmarkIcon,
                onSelect: goto(`/quiz/${p.id}`),
            });
        }

        if (isAuth) {
            all.push({ id: 'signout', label: 'Déconnexion', hint: 'COMPTE', Icon: ArrowRightStartOnRectangleIcon, keywords: 'logout', onSelect: () => { close(); signOut({ callbackUrl: '/' }); } });
        }
        return all;
    }, [isAuth, isAdmin, canCreateQuiz, pinned, router, close]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter(it => {
            const hay = `${it.label} ${it.hint ?? ''} ${it.keywords ?? ''}`.toLowerCase();
            return q.split(/\s+/).every(part => hay.includes(part));
        });
    }, [query, items]);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setActiveIdx(0);
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    }, [isOpen]);

    useEffect(() => {
        setActiveIdx(0);
    }, [query]);

    useEffect(() => {
        if (!listRef.current) return;
        const active = listRef.current.querySelector<HTMLButtonElement>(`[data-idx="${activeIdx}"]`);
        active?.scrollIntoView({ block: 'nearest' });
    }, [activeIdx]);

    if (!isOpen) return null;

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx(i => Math.min(filtered.length - 1, i + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx(i => Math.max(0, i - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const target = filtered[activeIdx];
            target?.onSelect();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
            <div className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Rechercher pages, jeux, quiz…"
                        className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400"
                    />
                    <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">Esc</kbd>
                </div>
                <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-1">
                    {filtered.length === 0 && (
                        <div className="px-4 py-8 text-center text-sm text-gray-400">Aucun résultat</div>
                    )}
                    {filtered.map((it, idx) => (
                        <button
                            key={it.id}
                            data-idx={idx}
                            onMouseEnter={() => setActiveIdx(idx)}
                            onClick={() => it.onSelect()}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${idx === activeIdx ? 'bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        >
                            <it.Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="flex-1 truncate">{it.label}</span>
                            {it.hint && <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{it.hint}</span>}
                        </button>
                    ))}
                </div>
                <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400">
                    <div className="flex items-center gap-2">
                        <kbd className="font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">↑</kbd>
                        <kbd className="font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">↓</kbd>
                        <span>naviguer</span>
                        <kbd className="font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 ml-2">↵</kbd>
                        <span>aller</span>
                    </div>
                    <span>{filtered.length} résultats</span>
                </div>
            </div>
        </div>
    );
}
