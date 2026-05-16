// src/app/register/page.tsx
'use client';
import LoadingSpinner from '@/components/LoadingSpinner';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DiscordButton from '@/components/DiscordButton';
import GoogleButton from '@/components/GoogleButton';
import GuestLoginButton from '@/components/GuestLoginButton';
import { UserPlusIcon } from '@heroicons/react/24/outline';

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [callbackUrl, setCallbackUrl] = useState<string>('/dashboard');

    useEffect(() => {
        // Récupérer l'URL de callback depuis les paramètres de recherche
        const callback = searchParams.get('callbackUrl');
        if (callback) {
            setCallbackUrl(callback);
        }
    }, [searchParams]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validations
        if (formData.password !== formData.confirmPassword) {
            setError('Les mots de passe ne correspondent pas');
            return;
        }

        if (formData.password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Une erreur est survenue');
            } else {
                // Rediriger vers la page de login avec le callback URL
                const params = new URLSearchParams({ registered: 'true', email: formData.email });
                if (callbackUrl !== '/dashboard') params.set('callbackUrl', callbackUrl);
                router.push(`/login?${params}`);
            }
        } catch (err) {
            setError('Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex items-center justify-center px-4 py-12">
            <div className="max-w-md w-full">
                <div className="text-center mb-10">
                    <Link href="/" className="inline-flex flex-col items-center gap-2 text-gray-900 dark:text-white">
                        <UserPlusIcon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                        <span className="text-3xl font-bold">Kwizar</span>
                    </Link>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">
                        Créez votre compte gratuitement
                    </p>
                </div>

                {/* Register Form */}
                <div className="card">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Inscription</h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Nom d'utilisateur
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                value={formData.username}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="johndoe"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="vous@exemple.com"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Mot de passe
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="••••••••"
                                required
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Minimum 6 caractères
                            </p>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Confirmer le mot de passe
                            </label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full"
                        >
                            {loading ? 'Création du compte...' : 'Créer mon compte'}
                        </button>
                    </form>

                    <div className="mt-6">
                        <div className="mt-4">
                            <DiscordButton callbackUrl={callbackUrl} />
                        </div>
                    </div>
                    <div className="mt-6">
                        <div className="mt-4">
                            <GoogleButton callbackUrl={callbackUrl} />
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

                    <div className="mt-6 text-center space-y-3">
                        <p className="text-gray-600 dark:text-gray-300">
                            Déjà un compte ?{' '}
                            <Link
                                href={`/login${callbackUrl !== '/dashboard' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
                                className="text-primary-600 hover:text-primary-700 font-semibold"
                            >
                                Se connecter
                            </Link>
                        </p>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">ou</span>
                            </div>
                        </div>
                        <GuestLoginButton callbackUrl={callbackUrl} />
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

export default function RegisterPage() {
    return (
        <Suspense fallback={<LoadingSpinner message="Chargement..." />}>
            <RegisterForm />
        </Suspense>
    );
}
