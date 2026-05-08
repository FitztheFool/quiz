'use client';

import { useEffect, useRef, useState } from 'react';
import { plural } from '@/lib/utils';
import Pagination from '@/components/Pagination';
import { MagnifyingGlassIcon, PlusIcon, PencilSquareIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { AdminCategory } from '../types';

interface Props {
    categories: AdminCategory[];
    page: number;
    totalPages: number;
    onFetch: (page: number, search: string) => void;
    onCreate: (name: string) => void;
    onRename: (id: string, name: string) => void;
    onDelete: (id: string, name: string) => void;
    onViewQuizzes: (categoryId: string) => void;
}

export default function CategoriesTab({ categories = [], page, totalPages, onFetch, onCreate, onRename, onDelete, onViewQuizzes }: Props) {

    const [newName, setNewName] = useState('');
    const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
    const [search, setSearch] = useState('');
    const searchRef = useRef('');

    useEffect(() => {
        searchRef.current = search;
        const t = setTimeout(() => onFetch(1, search), 400);
        return () => clearTimeout(t);
    }, [search]);

    return (
        <div id="admin-categories" className="scroll-mt-24 space-y-4">
            {/* Add + Search row */}
            <div className="flex gap-2">
                <div className="flex flex-1 gap-2">
                    <input
                        type="text"
                        placeholder="Nouvelle catégorie…"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { onCreate(newName.trim()); setNewName(''); } }}
                        className="flex-1 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                    <button
                        onClick={() => { if (newName.trim()) { onCreate(newName.trim()); setNewName(''); } }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors shrink-0"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Ajouter
                    </button>
                </div>
                <div className="relative w-56">
                    <MagnifyingGlassIcon className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Rechercher…"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                </div>
            </div>

            {/* List */}
            <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                {categories.length === 0 && (
                    <p className="px-4 py-10 text-sm text-center text-gray-400 dark:text-gray-500">Aucune catégorie.</p>
                )}
                <ul className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {categories.map(cat => (
                        <li key={cat.id} className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors gap-3">
                            {editing?.id === cat.id ? (
                                <input
                                    type="text"
                                    value={editing.name}
                                    onChange={e => setEditing({ ...editing, name: e.target.value })}
                                    onKeyDown={e => { if (e.key === 'Enter') { onRename(editing.id, editing.name); setEditing(null); } if (e.key === 'Escape') setEditing(null); }}
                                    className="flex-1 text-sm border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    autoFocus
                                />
                            ) : (
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {cat.name}
                                    <button
                                        onClick={() => onViewQuizzes(cat.id)}
                                        className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full shrink-0 tabular-nums hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                        title="Voir les quiz de cette catégorie"
                                    >
                                        {cat._count.quizzes} {plural(cat._count.quizzes, 'quiz', 'quizzes')}
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center gap-1 shrink-0">
                                {editing?.id === cat.id ? (
                                    <>
                                        <button onClick={() => { onRename(editing.id, editing.name); setEditing(null); }} className="inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded-lg transition-colors">
                                            <CheckIcon className="w-3 h-3" />
                                            Sauvegarder
                                        </button>
                                        <button onClick={() => setEditing(null)} className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-2 py-1 rounded-lg transition-colors">
                                            <XMarkIcon className="w-3 h-3" />
                                            Annuler
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => setEditing({ id: cat.id, name: cat.name })} className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border border-blue-200 dark:border-blue-800">
                                            <PencilSquareIcon className="w-3 h-3" />
                                            Renommer
                                        </button>
                                        <button onClick={() => onDelete(cat.id, cat.name)} className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-red-200 dark:border-red-800">
                                            <TrashIcon className="w-3 h-3" />
                                            Supprimer
                                        </button>
                                    </>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={p => onFetch(p, searchRef.current)} />
        </div>
    );
}
