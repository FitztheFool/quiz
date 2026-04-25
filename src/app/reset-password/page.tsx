'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '@/components/LoadingSpinner';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token') ?? '';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!token) {
        return (
            <div className="text-center py-4 space-y-3">
                <p className="text-red-600 dark:text-red-400 font-medium">Lien invalide.</p>
                <Link href="/forgot-password" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    Demander un nouveau lien
                </Link>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? 'Erreur'); return; }
            router.push('/login?password_reset=1');
        } catch {
            setError('Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Choisissez un nouveau mot de passe pour votre compte.
            </p>

            {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nouveau mot de passe
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="input-field"
                        placeholder="••••••••"
                        minLength={6}
                        required
                        autoFocus
                    />
                </div>
                <div>
                    <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Confirmer le mot de passe
                    </label>
                    <input
                        id="confirm"
                        type="password"
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        className="input-field"
                        placeholder="••••••••"
                        minLength={6}
                        required
                    />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
                </button>
            </form>
        </>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4 py-12">
            <div className="max-w-md w-full">
                <div className="text-center mb-10">
                    <Link href="/" className="inline-flex flex-col items-center gap-2 text-gray-900 dark:text-white">
                        <LockClosedIcon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                        <span className="text-3xl font-bold">Kwizar</span>
                    </Link>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">Réinitialisation du mot de passe</p>
                </div>

                <div className="card">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Nouveau mot de passe</h2>
                    <Suspense fallback={<LoadingSpinner fullScreen={false} />}>
                        <ResetPasswordForm />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
