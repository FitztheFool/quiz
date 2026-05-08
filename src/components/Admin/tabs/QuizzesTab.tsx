'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Pagination from '@/components/Pagination';
import { useSession } from 'next-auth/react';
import type { AdminCategory, AdminQuiz } from '../types';

interface Props {
    quizzes: AdminQuiz[];
    quizPage: number;
    quizTotalPages: number;
    categories: AdminCategory[];
    initialCategoryId?: string;
    onFetch: (page: number, search: string, categoryId: string) => void;
    onDelete: (quizId: string, title: string) => void;
}

export default function QuizzesTab({ quizzes, quizPage, quizTotalPages, categories, initialCategoryId, onFetch, onDelete }: Props) {
    const { data: session } = useSession();
    const [search, setSearch] = useState('');
    const [categoryId, setCategoryId] = useState(initialCategoryId ?? '');
    const searchRef = useRef('');
    const categoryRef = useRef(initialCategoryId ?? '');
    const isFirstRender = useRef(true);

    useEffect(() => {
        searchRef.current = search;
        if (isFirstRender.current) return;
        const t = setTimeout(() => onFetch(1, search, categoryRef.current), 400);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            if (initialCategoryId) onFetch(1, '', initialCategoryId);
            return;
        }
        categoryRef.current = categoryId;
        onFetch(1, searchRef.current, categoryId);
    }, [categoryId]);

    return (
        <div id="quizzes" className="scroll-mt-24 space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3 flex gap-2">
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher par titre…"
                    className="flex-1 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                    <option value="">— Toutes les catégories —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                    <table className="w-full text-sm">
                        <thead className="bg-white dark:bg-gray-900">
                            <tr className="text-left">
                                {['Titre', 'Créateur', 'Catégorie', 'Questions', 'Parties', 'Visibilité', 'Actions'].map(h => (
                                    <th key={h} className="px-3 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {quizzes.length === 0 && (
                                <tr><td colSpan={7} className="px-3 py-6 text-xs text-center text-gray-400 dark:text-gray-500">Aucun quiz trouvé.</td></tr>
                            )}
                            {quizzes.map(quiz => (
                                <tr key={quiz.id} className="hover:bg-white dark:hover:bg-gray-900 transition-colors">
                                    <td className="px-3 py-2 font-medium max-w-[180px]">
                                        <Link href={`/quiz/${quiz.id}`} className="text-blue-600 dark:text-blue-400 hover:underline text-xs truncate block">{quiz.title}</Link>
                                    </td>
                                    <td className="px-3 py-2 text-xs">
                                        <Link href={session?.user?.username === quiz.creator.username ? '/dashboard' : `/user/${quiz.creator.username}`} className="text-blue-600 dark:text-blue-400 hover:underline">{quiz.creator.username}</Link>
                                    </td>
                                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{quiz.category?.name ?? '—'}</td>
                                    <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 font-semibold">{quiz._count.questions}</td>
                                    <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 font-semibold">{quiz._count.attempts}</td>
                                    <td className="px-3 py-2">
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${quiz.isPublic ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                                            {quiz.isPublic ? 'Public' : 'Privé'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex gap-1.5">
                                            <Link href={`/quiz/${quiz.id}/edit`} className="text-[10px] font-semibold text-blue-500 hover:text-blue-700 px-2 py-0.5 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">Modifier</Link>
                                            <button onClick={() => onDelete(quiz.id, quiz.title)} className="text-[10px] font-semibold text-red-500 hover:text-red-700 px-2 py-0.5 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Supprimer</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={quizPage} totalPages={quizTotalPages} onPageChange={p => onFetch(p, searchRef.current, categoryRef.current)} />
            </div>
        </div>
    );
}
