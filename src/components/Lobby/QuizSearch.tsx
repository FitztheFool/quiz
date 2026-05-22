'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface Props {
    isHost: boolean;
    onSelect: (id: string, title: string, questionCount?: number) => void;
    selectedId?: string;
    selectedTitle?: string;
    selectedQuestionCount?: number;
    categories: { id: string; name: string; _count: { quizzes: number } }[];
    categoryId: string;
    onCategoryChange: (catId: string) => void;
}

export default function QuizSearch({ isHost, onSelect, selectedId, selectedTitle, selectedQuestionCount, categories, categoryId, onCategoryChange }: Props) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ id: string; title: string; _count: { questions: number } }[]>([]);
    const [open, setOpen] = useState(false);
    const [catOpen, setCatOpen] = useState(false);
    const searchTimer = useRef<NodeJS.Timeout | null>(null);
    const catContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedCategory = categories.find(c => c.id === categoryId) ?? null;

    useEffect(() => {
        if (!catOpen) return;
        const handler = (e: MouseEvent) => {
            if (catContainerRef.current && !catContainerRef.current.contains(e.target as Node)) {
                setCatOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [catOpen]);

    const search = (q: string, catId?: string) => {
        setQuery(q);
        setOpen(true);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        const activeCatId = catId !== undefined ? catId : categoryId;
        if (!q.trim() && !activeCatId) { setResults([]); return; }
        searchTimer.current = setTimeout(async () => {
            const params = new URLSearchParams({ page: '1', pageSize: '12' });
            if (q.trim()) params.set('search', q);
            if (activeCatId) params.set('categoryId', activeCatId);
            const res = await fetch(`/api/quiz?${params}`);
            if (!res.ok) return;
            const data = await res.json();
            setResults(Array.isArray(data) ? data : (data.quizzes ?? []));
        }, 300);
    };

    const handleCategoryChange = (catId: string) => {
        onCategoryChange(catId);
        setCatOpen(false);
        if (selectedId) onSelect('', '');
        search(query, catId);
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const displayValue = selectedId && selectedTitle ? selectedTitle : query;
    const isSelected = !!(selectedId && selectedTitle);

    return (
        <div className="w-full space-y-2">
            {categories.length > 0 && (
                <div className="relative" ref={catContainerRef}>
                    <button
                        type="button"
                        onClick={() => isHost && setCatOpen(v => !v)}
                        className="font-sans w-full flex items-center justify-between bg-gray-100 dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600/50 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60">
                        <span className={selectedCategory ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
                            {selectedCategory ? selectedCategory.name : 'Toutes les catégories'}
                        </span>
                        <span className="text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">
                            {selectedCategory ? `(${selectedCategory._count.quizzes})` : '▾'}
                        </span>
                    </button>
                    {catOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600/50 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto font-sans">
                            <button onMouseDown={() => handleCategoryChange('')}
                                className={`w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${!categoryId ? 'bg-blue-600/20 text-blue-600 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                <span>Toutes les catégories</span>
                            </button>
                            {categories.map(c => (
                                <button key={c.id} onMouseDown={() => handleCategoryChange(c.id)}
                                    className={`w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${categoryId === c.id ? 'bg-blue-600/20 text-blue-600 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                    <span className="truncate">{c.name}</span>
                                    <span className="text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">({c._count.quizzes})</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="relative">
                <input
                    type="text"
                    ref={inputRef}
                    value={displayValue}
                    onChange={e => { if (selectedId) onSelect('', ''); search(e.target.value); }}
                    onFocus={() => { if (query || categoryId) { search(query); setOpen(true); } }}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    placeholder="Rechercher un quiz…"
                    readOnly={!isHost}
                    className={`font-sans w-full bg-gray-100 dark:bg-gray-700/60 border rounded-lg px-3 py-2 text-gray-900 dark:text-white text-xs placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 ${isSelected ? 'border-green-500/60 pr-16' : 'border-gray-300 dark:border-gray-600/50'}`}
                />
                {isSelected && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none flex items-center gap-1">
                        {selectedQuestionCount !== undefined && <span className="text-gray-400 dark:text-gray-500">({selectedQuestionCount})</span>}
                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    </span>
                )}
                {open && results.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600/50 rounded-lg shadow-xl overflow-y-auto max-h-64 font-sans">
                        {results.map(q => (
                            <button key={q.id} onMouseDown={() => { onSelect(q.id, q.title, q._count.questions); setQuery(''); setOpen(false); }}
                                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${selectedId === q.id ? 'bg-blue-600/20 text-blue-600 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                <span className="font-medium truncate">{q.title}</span>
                                <span className="text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">{q._count.questions}q</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
