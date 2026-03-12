'use client';
import LoadingSpinner from '@/components/LoadingSpinner';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import QuizForm from '@/components/QuizForm';

interface Category {
    id: string;
    name: string;
}

const DIFFICULTIES = [
    { value: 'facile', label: '🟢 Facile', desc: 'Questions simples, accessibles à tous' },
    { value: 'normal', label: '🟡 Normal', desc: 'Questions de niveau intermédiaire' },
    { value: 'difficile', label: '🔴 Difficile', desc: 'Questions pointues pour experts' },
];

export default function GenerateQuizPage() {
    const { status } = useSession();
    const router = useRouter();
    const [subject, setSubject] = useState('');
    const [questionCount, setQuestionCount] = useState(5);
    const [categoryId, setCategoryId] = useState('');
    const [difficulty, setDifficulty] = useState('normal');
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingMode, setLoadingMode] = useState<'play' | 'edit' | null>(null);
    const loading = loadingMode !== null;
    const [error, setError] = useState<string | null>(null);
    const [generatedData, setGeneratedData] = useState<any | null>(null);

    const isLoadingRef = useRef(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push(`/login?callbackUrl=${encodeURIComponent('/quiz/generate')}`);
        }
    }, [status, router]);

    useEffect(() => {
        fetch('/api/categories')
            .then((r) => r.json())
            .then(setCategories)
            .catch(() => { });
    }, []);

    if (status === 'loading' || status === 'unauthenticated') {
        return (
            <LoadingSpinner fullScreen={false} />
        );
    }

    const setLoadingState = (value: 'play' | 'edit' | null) => {
        isLoadingRef.current = value !== null;
        setLoadingMode(value);
    };

    async function handleGenerate(mode: 'play' | 'edit') {
        if (isLoadingRef.current || !subject.trim()) return;

        setLoadingState(mode);
        setError(null);

        try {
            const res = await fetch('/api/quiz/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, questionCount, difficulty }),
            });
            if (!res.ok) throw new Error((await res.json()).error ?? 'Erreur de génération');
            const data = await res.json();

            if (mode === 'edit') {
                const normalized = {
                    ...data,
                    categoryId: categoryId || '',
                    questions: data.questions.map((q: any, qi: number) => ({
                        ...q,
                        tempId: `gen_q_${qi}`,
                        answers: q.answers.map((a: any, ai: number) => ({
                            ...a,
                            tempId: `gen_q_${qi}_a_${ai}`,
                        })),
                    })),
                };
                setGeneratedData(normalized);
                return;
            }

            const saveRes = await fetch('/api/quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: data.title,
                    description: data.description || '',
                    isPublic: true,
                    randomizeQuestions: true,
                    categoryId: categoryId || null,
                    creatorRole: 'RANDOM',
                    questions: data.questions.map((q: any) => ({
                        text: q.text,
                        type: q.type,
                        points: q.points,
                        strictOrder: q.strictOrder ?? false,
                        answers: q.answers.map((a: any) => ({
                            content: a.text,
                            isCorrect: a.isCorrect,
                        })),
                    })),
                }),
            });
            if (!saveRes.ok) throw new Error('Erreur lors de la sauvegarde');
            const saved = await saveRes.json();
            router.push(`/quiz/${saved.id}`);

        } catch (e: any) {
            setError(e.message);
            setLoadingState(null);
        }
    }

    if (generatedData) {
        return (
            <div>
                <div className="max-w-4xl mx-auto px-4 pt-6">
                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-4 py-2 text-sm">
                        🤖 Quiz généré par <span className="font-semibold ml-1">Groq — Llama 3.3</span> — vérifiez et modifiez avant de publier.
                    </div>
                </div>
                <QuizForm mode="create" initialData={generatedData} />
            </div>
        );
    }

    const isDisabled = loading || !subject.trim();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 w-full max-w-md">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">✨ Générer un quiz</h1>
                <p className="text-gray-500 text-sm mb-1">L'IA crée un quiz que vous pourrez modifier avant de publier.</p>
                <p className="text-xs text-gray-400 mb-6">
                    Modèle : <span className="font-medium">Groq — Llama 3.3 70B</span>
                </p>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sujet du quiz</label>
                        <input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerate('play')}
                            placeholder="Ex: La Révolution française, JavaScript, Anatomie..."
                            className="w-full border rounded-lg p-3 focus:outline-none focus:border-blue-600"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Difficulté</label>
                        <div className="grid grid-cols-3 gap-2">
                            {DIFFICULTIES.map((d) => (
                                <button
                                    key={d.value}
                                    type="button"
                                    onClick={() => !loading && setDifficulty(d.value)}
                                    title={d.desc}
                                    disabled={loading}
                                    className={`py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-colors ${difficulty === d.value
                                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre de questions : <span className="font-bold text-blue-600">{questionCount}</span>
                        </label>
                        <input
                            type="range"
                            min={3}
                            max={15}
                            value={questionCount}
                            onChange={(e) => setQuestionCount(Number(e.target.value))}
                            className="w-full disabled:opacity-50"
                            disabled={loading}
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>3</span><span>15</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Catégorie <span className="text-gray-400 font-normal">(facultatif)</span>
                        </label>
                        <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            disabled={loading}
                            className="w-full border rounded-lg p-3 focus:outline-none focus:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
                            <option value="">Aucune catégorie</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-3 pt-1">
                        <button
                            onClick={() => handleGenerate('play')}
                            disabled={isDisabled}
                            className={`w-full py-3 rounded-lg font-semibold transition-colors ${isDisabled
                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                                }`}
                        >
                            {loadingMode === 'play' ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                    Génération en cours...
                                </span>
                            ) : '🎮 Générer et jouer'}
                        </button>
                        <p className="text-xs text-gray-400 text-center -mt-1">
                            ⚠️ Le quiz ne vous appartiendra pas. Utilisez <span className="font-medium">Générer et modifier</span> pour en être propriétaire.
                        </p>
                        <button
                            onClick={() => handleGenerate('edit')}
                            disabled={isDisabled}
                            className={`w-full py-3 rounded-lg font-semibold transition-colors ${isDisabled
                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                                }`}
                        >
                            {loadingMode === 'edit' ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent" />
                                    Génération en cours...
                                </span>
                            ) : '✏️ Générer et modifier'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
