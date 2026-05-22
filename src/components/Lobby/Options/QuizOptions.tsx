'use client';

import type { Socket } from 'socket.io-client';
import QuizSearch from '@/components/Lobby/QuizSearch';
import { formatTime } from '@/components/Lobby/forms/formatTime';

interface Props {
    isHost: boolean;
    socket: Socket | null;
    selectedQuizId?: string;
    selectedQuizTitle: string;
    selectedQuizQuestionCount?: number;
    setSelectedQuizId: (id: string | undefined) => void;
    setSelectedQuizTitle: (s: string) => void;
    setSelectedQuizQuestionCount: (n: number | undefined) => void;
    categories: { id: string; name: string; _count: { quizzes: number } }[];
    selectedQuizCategoryId: string;
    setSelectedQuizCategoryId: (catId: string) => void;
    quizTimeMode: 'per_question' | 'total' | 'none';
    setQuizTimeMode: (m: 'per_question' | 'total' | 'none') => void;
    quizTimePerQuestion: number;
    setQuizTimePerQuestion: (n: number) => void;
}

export default function QuizOptions({
    isHost, socket,
    selectedQuizId, selectedQuizTitle, selectedQuizQuestionCount,
    setSelectedQuizId, setSelectedQuizTitle, setSelectedQuizQuestionCount,
    categories, selectedQuizCategoryId, setSelectedQuizCategoryId,
    quizTimeMode, setQuizTimeMode, quizTimePerQuestion, setQuizTimePerQuestion,
}: Props) {
    return (
        <div className={`bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5 space-y-3 ${!isHost ? 'opacity-60 pointer-events-none' : ''}`}>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Options Quiz</p>
            <div className="space-y-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">Quiz</p>
                <QuizSearch isHost={isHost} selectedId={selectedQuizId} selectedTitle={selectedQuizTitle} selectedQuestionCount={selectedQuizQuestionCount}
                    categories={categories} categoryId={selectedQuizCategoryId}
                    onCategoryChange={catId => setSelectedQuizCategoryId(catId)}
                    onSelect={(id, title, questionCount) => { setSelectedQuizId(id || undefined); setSelectedQuizTitle(title); setSelectedQuizQuestionCount(questionCount); if (id) socket?.emit('lobby:setQuiz', { quizId: id }); }} />
            </div>
            <div className="space-y-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">Mode de temps</p>
                <select value={quizTimeMode}
                    onChange={e => {
                        const newMode = e.target.value as typeof quizTimeMode;
                        const defaultTpq = newMode === 'total' ? 60 : 15;
                        const newTpq = newMode === 'total'
                            ? ([60, 120, 180, 300, 600, 900, 1200, 1800, 3600].includes(quizTimePerQuestion) ? quizTimePerQuestion : defaultTpq)
                            : ([5, 10, 15, 20, 30, 45, 60, 90, 120].includes(quizTimePerQuestion) ? quizTimePerQuestion : defaultTpq);
                        setQuizTimeMode(newMode);
                        setQuizTimePerQuestion(newTpq);
                        socket?.emit('lobby:setQuizOptions', { timeMode: newMode, timePerQuestion: newTpq });
                    }}
                    className="font-sans w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 rounded-xl px-3 py-2 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                    <option value="per_question">Par question</option>
                    <option value="total">Temps total</option>
                    <option value="none">Sans limite</option>
                </select>
            </div>
            {quizTimeMode !== 'none' && (
                <div className="space-y-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{quizTimeMode === 'total' ? 'Temps total' : 'Temps / question'}</p>
                    <select value={quizTimePerQuestion}
                        onChange={e => { setQuizTimePerQuestion(Number(e.target.value)); socket?.emit('lobby:setQuizOptions', { timeMode: quizTimeMode, timePerQuestion: Number(e.target.value) }); }}
                        className="font-sans w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 rounded-xl px-3 py-2 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                        {(quizTimeMode === 'total' ? [60, 120, 180, 300, 600, 900, 1200, 1800, 3600] : [5, 10, 15, 20, 30, 45, 60, 90, 120]).map(t => (
                            <option key={t} value={t}>{formatTime(t)}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
}
