// src/app/login/page.tsx
'use client';
import LoadingSpinner from '@/components/LoadingSpinner';

import { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DiscordButton from '@/components/DiscordButton';

function LoginForm() {
    const { status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();

    // ✅ lire directement le callbackUrl (pas de state)
    const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';

    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(() => {
        const e = searchParams.get('error');
        if (e === 'OAuthAccountConflict') return 'Un compte existe déjà avec cet email ou ce pseudo. Connectez-vous avec votre mot de passe.';
        if (e === 'AccountBanned') return 'Votre compte a été banni.';
        if (e === 'SessionExpired') return 'Session expirée, veuillez vous reconnecter avec Discord.';
        return '';
    });
    const [loading, setLoading] = useState(false);

    // ✅ si déjà connecté -> va sur callbackUrl, pas /dashboard
    useEffect(() => {
        if (status === 'authenticated') {
            router.replace(callbackUrl);
        }
    }, [status, router, callbackUrl]);

    if (status === 'loading' || status === 'authenticated') return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await signIn('credentials', {
                identifier,
                password,
                redirect: false,
                callbackUrl, // ✅ important
            });

            if (result?.error) {
                if (result.error === 'deactivated') setError('Votre compte a été banni.');
                else setError('Email ou mot de passe incorrect');
            } else {
                router.push(callbackUrl);  // ← supprimer result?.url
                router.refresh();
            }
        } catch {
            setError('Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <Link href="/" className="text-4xl font-bold text-gray-900 dark:text-white">
                        🎯 Quiz App
                    </Link>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">Connectez-vous pour continuer</p>
                </div>

                <div className="card">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Connexion</h2>

                    {callbackUrl !== '/dashboard' && (
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-lg">
                            <p className="text-sm">🔒 Vous devez être connecté pour accéder à cette page</p>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Email ou pseudo
                            </label>
                            <input
                                id="identifier"
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className="input-field"
                                placeholder="vous@exemple.com ou votre pseudo"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Mot de passe
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary w-full">
                            {loading ? 'Connexion...' : 'Se connecter'}
                        </button>
                    </form>
                    <div className="mt-6">
                        <div className="mt-4">
                            <DiscordButton callbackUrl={callbackUrl} />
                        </div>
                        <div className="relative mt-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">ou</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600 dark:text-gray-300">
                            Pas encore de compte ?{' '}
                            <Link
                                href={`/register${callbackUrl !== '/dashboard' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''
                                    }`}
                                className="text-primary-600 hover:text-primary-700 font-semibold"
                            >
                                S&apos;inscrire
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <Link href="/" className="text-gray-600 hover:text-gray-900 dark:text-white">
                        ← Retour à l'accueil
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <LoginForm />
        </Suspense>
    );
}
