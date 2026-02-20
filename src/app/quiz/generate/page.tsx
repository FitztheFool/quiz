'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Category {
    id: string;
    name: string;
}

export default function GenerateQuizPage() {
    const router = useRouter();
    const { status } = useSession();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [categoryId, setCategoryId] = useState(``);
    const [questionCount, setQuestionCount] = useState(5);
    const [difficulty, setDifficulty] = useState(`medium`);
    const [provider, setProvider] = useState(`groq`);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(``);

    useEffect(() => {
        fetch(`/api/categories`)
            .then((r) => r.json())
            .then((data) => {
                setCategories(data);
                setLoadingCategories(false);
            })
            .catch(() => setLoadingCategories(false));
    }, []);

    if (status === `loading`) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="animate-pulse text-gray-500 text-lg">Chargement...</div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(``);

        try {
            const res = await fetch(`/api/quiz/generate`, {
                method: `POST`,
                headers: { 'Content-Type': `application/json` },
                body: JSON.stringify({ categoryId, questionCount, difficulty, provider }),
            });

            const data = await res.json();

            if (res.status === 429) {
                const providerName = provider === `groq` ? `Groq` : `Gemini`;
                setError(`⚠️ Quota atteint pour ${providerName}. Essayez un autre modèle IA ou réessayez plus tard.`);
                return;
            }

            if (!res.ok) {
                setError(data.error || `Erreur lors de la génération`);
                return;
            }

            router.push(`/quiz/${data.quiz.id}`);
        } catch {
            setError(`Une erreur est survenue`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">🤖 Générer un quiz</h1>
                    <p className="mt-2 text-gray-600">L'IA crée un quiz personnalisé pour vous</p>
                </div>

                <div className="card">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Catégorie
                            </label>
                            {loadingCategories ? (
                                <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                            ) : (
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="input-field"
                                    required
                                >
                                    <option value="">Choisir une catégorie...</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre de questions
                            </label>
                            <select
                                value={questionCount}
                                onChange={(e) => setQuestionCount(Number(e.target.value))}
                                className="input-field"
                            >
                                <option value={5}>5 questions</option>
                                <option value={10}>10 questions</option>
                                <option value={15}>15 questions</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Difficulté
                            </label>
                            <select
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value)}
                                className="input-field"
                            >
                                <option value="easy">Facile</option>
                                <option value="medium">Moyen</option>
                                <option value="hard">Difficile</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Modèle IA
                            </label>
                            <select
                                value={provider}
                                onChange={(e) => setProvider(e.target.value)}
                                className="input-field"
                            >
                                <option value="groq">⚡ Groq (Llama 3.3)</option>
                                <option value="gemini">🧠 Gemini 2.0 Flash</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || loadingCategories}
                            className="btn-primary w-full"
                        >
                            {loading ? `⏳ Génération en cours...` : `✨ Générer le quiz`}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
