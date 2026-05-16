'use client';

import { useState } from 'react';
import Link from 'next/link';
import { EnvelopeIcon } from '@heroicons/react/24/outline';

export default function ForgotPasswordPage() {
    const [login, setLogin] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: login.trim() }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? 'Erreur'); return; }
            setDone(true);
        } catch {
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
                        <EnvelopeIcon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                        <span className="text-3xl font-bold">Kwizar</span>
                    </Link>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">Récupération de mot de passe</p>
                </div>

                <div className="card">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Mot de passe oublié</h2>

                    {done ? (
                        <div className="py-4 text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                                <EnvelopeIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 font-medium">Email envoyé !</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Si un compte existe pour <strong>{login}</strong>, vous recevrez un lien valable 1 heure.
                            </p>
                            <Link href="/login" className="inline-block mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                                Retour à la connexion
                            </Link>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                Entrez votre adresse email ou votre pseudo et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                            </p>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="login" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Email ou pseudo
                                    </label>
                                    <input
                                        id="login"
                                        type="text"
                                        value={login}
                                        onChange={e => setLogin(e.target.value)}
                                        className="input-field"
                                        placeholder="vous@exemple.com ou votre pseudo"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <button type="submit" disabled={loading} className="btn-primary w-full">
                                    {loading ? 'Envoi…' : 'Envoyer le lien'}
                                </button>
                            </form>

                            <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
                                    Retour à la connexion
                                </Link>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
