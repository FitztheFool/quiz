'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import LoadingSpinner from '@/components/LoadingSpinner';

function ChooseUsernameForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { update: updateSession } = useSession();
    const token = searchParams.get('token') ?? '';

    const [baseName, setBaseName] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [custom, setCustom] = useState('');
    const [selected, setSelected] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (!token) { router.replace('/login'); return; }
        fetch(`/api/auth/pending-username?token=${token}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) { router.replace('/login'); return; }
                setBaseName(data.baseName);
                setSuggestions(data.suggestions);
                setSelected(data.suggestions[0] ?? '');
            })
            .catch(() => router.replace('/login'))
            .finally(() => setFetching(false));
    }, [token, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const username = custom.trim() || selected;
        if (!username) { setError('Choisissez ou entrez un pseudo'); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/pick-username', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, username }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.error === 'session_expired') {
                    router.replace('/login?error=SessionExpired');
                    return;
                }
                setError(data.error ?? 'Erreur');
                setLoading(false);
                return;
            }

            await updateSession();
            router.replace('/dashboard');
        } catch {
            setError('Une erreur est survenue');
            setLoading(false);
        }
    };

    if (fetching) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="card">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Choisissez un pseudo</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Le pseudo <strong>{baseName}</strong> est déjà utilisé. Choisissez une alternative ou entrez le vôtre.
                    </p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => { setSelected(s); setCustom(''); }}
                                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                        selected === s && !custom
                                            ? 'bg-primary-600 text-white border-primary-600'
                                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary-400'
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Ou entrez un pseudo personnalisé
                            </label>
                            <input
                                type="text"
                                value={custom}
                                onChange={e => { setCustom(e.target.value); setSelected(''); }}
                                className="input-field"
                                placeholder="Mon pseudo"
                                maxLength={32}
                            />
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary w-full">
                            {loading ? 'Enregistrement...' : 'Confirmer'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function ChooseUsernamePage() {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <ChooseUsernameForm />
        </Suspense>
    );
}
