// src/app/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { GAME_CONFIG } from '@/lib/gameConfig';

const PAGE_SIZE = 6;

interface Category {
    id: string;
    name: string;
}

interface Quiz {
    id: string;
    title: string;
    description: string | null;
    isPublic: boolean;
    creatorId?: string;
    createdAt?: string;
    creator: { id: string; username: string };
    category?: { name: string } | null;
    _count: { questions: number };
    questions?: { points: number }[];
}

const computePoints = (list: Quiz[]) => {
    const map: Record<string, number> = {};
    list.forEach(q => {
        map[q.id] = q.questions?.reduce((sum, qq) => sum + (qq.points || 0), 0) || 0;
    });
    return map;
};

const GAMES = Object.entries(GAME_CONFIG).map(([key, g]) => ({
    key,
    label: g.label,
    icon: g.icon,
    href: `/leaderboard/${key}`,
}));

export default function HomePage() {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [quizPoints, setQuizPoints] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryId, setCategoryId] = useState('');
    const [page, setPage] = useState(1);
    const [lobbyCode, setCode] = useState('');
    useEffect(() => { setCode(crypto.randomUUID()); }, []);

    const fetchQuizzes = useCallback(async (p = 1, s = '', cat = '') => {
        const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
        if (s) params.set('search', s);
        if (cat) params.set('categoryId', cat);
        const res = await fetch(`/api/quiz?${params}`);
        if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data) ? data : data.quizzes ?? [];
            setQuizzes(list);
            setTotal(Array.isArray(data) ? list.length : data.total ?? 0);
            setTotalPages(Array.isArray(data) ? Math.ceil(list.length / PAGE_SIZE) : data.totalPages ?? 1);
            setQuizPoints(prev => ({ ...prev, ...computePoints(list) }));
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [catRes] = await Promise.all([
                    fetch('/api/categories'),
                    fetchQuizzes(1),
                ]);
                if (!cancelled && catRes.ok) setCategories(await catRes.json());
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [fetchQuizzes]);

    const handlePageChange = (p: number) => { setPage(p); fetchQuizzes(p, search, categoryId); };
    const handleSearchChange = (v: string) => { setSearch(v); setPage(1); fetchQuizzes(1, v, categoryId); };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

            {/* ── Hero ─────────────────────────────────────────────── */}
            <section className="relative overflow-hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                {/* subtle grid background */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
                    style={{ backgroundImage: 'linear-gradient(#000 1px,transparent 1px),linear-gradient(90deg,#000 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

                <div className="relative max-w-5xl mx-auto px-6 py-20 md:py-28">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-10">
                        <div className="max-w-xl">
                            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-blue-600 dark:text-blue-400 mb-5 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                Plateforme multijoueur
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white leading-tight tracking-tight mb-5">
                                Jouez. Rivalisez.<br />
                                <span className="text-blue-600 dark:text-blue-400">Grimpez.</span>
                            </h1>
                            <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
                                Quiz, UNO, Taboo, Yahtzee et plus — testez-vous en solo ou entre amis en temps réel.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <Link href="/lobby/all"
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-px active:translate-y-0">
                                    🎮 Rejoindre une partie
                                </Link>
                                <Link href={`/lobby/create/${lobbyCode}`}
                                    className="px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-bold text-sm rounded-xl border border-gray-200 dark:border-gray-700 transition-all hover:-translate-y-px active:translate-y-0">
                                    ✨ Créer un lobby
                                </Link>
                            </div>
                        </div>

                        {/* Stats pill */}
                        <div className="flex md:flex-col gap-4 flex-wrap">
                            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-6 py-5 text-center min-w-[120px]">
                                <div className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">{total}</div>
                                <div className="text-xs text-gray-400 mt-1 font-medium">Quiz disponibles</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-6 py-5 text-center min-w-[120px]">
                                <div className="text-3xl font-black text-gray-900 dark:text-white">{GAMES.length}</div>
                                <div className="text-xs text-gray-400 mt-1 font-medium">Jeux</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section >

            {/* ── Games strip ──────────────────────────────────────── */}
            < section className="max-w-5xl mx-auto px-6 py-10" >
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-5">Nos jeux</h2>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {GAMES.map(g => (
                        <Link key={g.key} href={g.href}
                            className="group flex flex-col items-center gap-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl py-4 px-2 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all">
                            <span className="text-2xl group-hover:scale-110 transition-transform">{g.icon}</span>
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 text-center leading-tight">{g.label}</span>
                        </Link>
                    ))}
                </div>
            </section >
        </div >
    );
}
