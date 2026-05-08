'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Pagination from '@/components/Pagination';
import { useSession } from 'next-auth/react';
import { MagnifyingGlassIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { AdminQuiz, AdminCategory } from '../types';

interface Props {
    quizzes: AdminQuiz[];
    quizPage: number;
    quizTotalPages: number;
    categories: AdminCategory[];
    onFetch: (page: number, search: string, categoryId: string) => void;
    onDelete: (quizId: string, title: string) => void;
}

export default function QuizzesTab({ quizzes, quizPage, quizTotalPages, categories, onFetch, onDelete }: Props) {
    const { data: session } = useSession();
    const [search, setSearch] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const searchRef = useRef('');
    const categoryRef = useRef('');

    useEffect(() => {
        searchRef.current = search;
        const t = setTimeout(() => onFetch(1, search, categoryRef.current), 400);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        categoryRef.current = categoryId;
        onFetch(1, searchRef.current, categoryId);
    }, [categoryId]);

    return (
        <div id="admin-quizzes" className="scroll-mt-24 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[200px]">
                    <MagnifyingGlassIcon className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Rechercher par titre…"
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                </div>
                <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                    <option value="">— Toutes les catégories —</option>
                    <option value="none">Sans catégorie</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                            {['Titre', 'Créateur', 'Catégorie', 'Questions', 'Parties', 'Visibilité', 'Actions'].map(h => (
                                <th key={h} className="px-4 py-2.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50 bg-white dark:bg-gray-900">
                        {quizzes.length === 0 && (
                            <tr><td colSpan={7} className="px-4 py-10 text-sm text-center text-gray-400 dark:text-gray-500">Aucun quiz trouvé.</td></tr>
                        )}
                        {quizzes.map(quiz => (
                            <tr key={quiz.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="px-4 py-2.5 max-w-[200px]">
                                    <Link href={`/quiz/${quiz.id}`} className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium truncate block">{quiz.title}</Link>
                                </td>
                                <td className="px-4 py-2.5 text-xs">
                                    <Link href={session?.user?.username === quiz.creator.username ? '/dashboard' : `/user/${quiz.creator.username}`} className="text-blue-600 dark:text-blue-400 hover:underline">{quiz.creator.username}</Link>
                                </td>
                                <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">{quiz.category?.name ?? '—'}</td>
                                <td className="px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 tabular-nums">{quiz._count.questions}</td>
                                <td className="px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 tabular-nums">{quiz._count.attempts}</td>
                                <td className="px-4 py-2.5">
                                    <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${quiz.isPublic ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                                        {quiz.isPublic ? 'Public' : 'Privé'}
                                    </span>
                                </td>
                                <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-1">
                                        <Link href={`/quiz/${quiz.id}/edit`} className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border border-blue-200 dark:border-blue-800">
                                            <PencilSquareIcon className="w-3 h-3" />
                                            Modifier
                                        </Link>
                                        <button onClick={() => onDelete(quiz.id, quiz.title)} className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-red-200 dark:border-red-800">
                                            <TrashIcon className="w-3 h-3" />
                                            Supprimer
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination currentPage={quizPage} totalPages={quizTotalPages} onPageChange={p => onFetch(p, searchRef.current, categoryRef.current)} />
        </div>
    );
}
