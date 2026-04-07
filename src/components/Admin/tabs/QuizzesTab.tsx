'use client';

import Link from 'next/link';
import Pagination from '@/components/Pagination';
import { useSession } from 'next-auth/react';
import type { AdminQuiz } from '../types';

interface Props {
    quizzes: AdminQuiz[];
    quizPage: number;
    quizTotalPages: number;
    onPageChange: (p: number) => void;
    onDelete: (quizId: string, title: string) => void;
}

export default function QuizzesTab({ quizzes, quizPage, quizTotalPages, onPageChange, onDelete }: Props) {
    const { data: session } = useSession();

    return (
        <div id="admin-quizzes" className="scroll-mt-24">
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
                            {quizzes.map(quiz => (
                                <tr key={quiz.id} className="hover:bg-white dark:hover:bg-gray-900 transition-colors">
                                    <td className="px-3 py-2 font-medium max-w-[180px]">
                                        <Link href={`/quiz/${quiz.id}`} className="text-blue-600 dark:text-blue-400 hover:underline text-xs truncate block">{quiz.title}</Link>
                                    </td>
                                    <td className="px-3 py-2 text-xs">
                                        <Link href={session?.user?.username === quiz.creator.username ? '/dashboard' : `/user/${quiz.creator.username}`} className="text-blue-600 dark:text-blue-400 hover:underline">{quiz.creator.username}</Link>
                                    </td>
                                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{quiz.category?.name ?? '—'}</td>
                                    <td className="px-3 py-2 text-xs text-center text-gray-700 dark:text-gray-300 font-semibold">{quiz._count.questions}</td>
                                    <td className="px-3 py-2 text-xs text-center text-gray-700 dark:text-gray-300 font-semibold">{quiz._count.attempts}</td>
                                    <td className="px-3 py-2 text-center">
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
                <Pagination currentPage={quizPage} totalPages={quizTotalPages} onPageChange={onPageChange} />
            </div>
        </div>
    );
}
