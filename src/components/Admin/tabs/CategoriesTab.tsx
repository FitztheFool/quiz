'use client';

import { useState } from 'react';
import { plural } from '@/lib/utils';
import type { AdminCategory } from '../types';

interface Props {
    categories: AdminCategory[];
    onCreate: (name: string) => void;
    onRename: (id: string, name: string) => void;
    onDelete: (id: string, name: string) => void;
}

export default function CategoriesTab({ categories, onCreate, onRename, onDelete }: Props) {
    const [newName, setNewName] = useState('');
    const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

    return (
        <div id="admin-categories" className="scroll-mt-24 space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3 flex gap-2">
                <input
                    type="text"
                    placeholder="Nouvelle catégorie…"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { onCreate(newName); setNewName(''); } }}
                    className="flex-1 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg px-3 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <button
                    onClick={() => { if (newName.trim()) { onCreate(newName); setNewName(''); } }}
                    className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                >
                    + Ajouter
                </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-2">
                {categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-2.5">
                        {editing?.id === cat.id ? (
                            <input
                                type="text"
                                value={editing.name}
                                onChange={e => setEditing({ ...editing, name: e.target.value })}
                                onKeyDown={e => { if (e.key === 'Enter') { onRename(editing.id, editing.name); setEditing(null); } }}
                                className="flex-1 mr-4 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                autoFocus
                            />
                        ) : (
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{cat.name}</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                    {cat._count.quizzes} {plural(cat._count.quizzes, 'Quiz', 'Quizzes')}
                                </span>
                            </div>
                        )}
                        <div className="flex gap-1.5 shrink-0">
                            {editing?.id === cat.id ? (
                                <>
                                    <button onClick={() => { onRename(editing.id, editing.name); setEditing(null); }} className="text-[10px] px-2 py-0.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors">Sauvegarder</button>
                                    <button onClick={() => setEditing(null)} className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Annuler</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setEditing({ id: cat.id, name: cat.name })} className="text-[10px] font-semibold text-blue-500 hover:text-blue-700 px-2 py-0.5 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">Renommer</button>
                                    <button onClick={() => onDelete(cat.id, cat.name)} className="text-[10px] font-semibold text-red-500 hover:text-red-700 px-2 py-0.5 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Supprimer</button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
