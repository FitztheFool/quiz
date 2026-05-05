// src/components/GuestLoginButton.tsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { randomUsername } from '@/lib/randomUsername';
import { PlayIcon } from '@heroicons/react/24/outline';

interface GuestLoginButtonProps {
    callbackUrl?: string;
}

export default function GuestLoginButton({ callbackUrl = '/dashboard' }: GuestLoginButtonProps) {
    const [modal, setModal] = useState(false);
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const openModal = () => {
        setModal(true);
        setError('');
        const saved = localStorage.getItem('guestUsername');
        setUsername(saved ?? randomUsername());
    };

    const handleGuest = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/guest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim() || undefined }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error ?? 'Erreur lors de la création du compte invité');
                return;
            }
            const data = await res.json();
            localStorage.setItem('guestUsername', data.username);

            const result = await signIn('guest', { userId: data.userId, redirect: false }).catch(() => null);
            if (!result || result.error) {
                setError('Erreur lors de la connexion');
                return;
            }
            window.location.href = callbackUrl;
        } catch {
            setError('Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={openModal}
                className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-all text-sm"
            >
                <PlayIcon className="w-4 h-4 inline mr-1" />Jouer sans compte
            </button>

            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Jouer sans compte</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Vos scores seront sauvegardés. Vous pourrez finaliser votre inscription plus tard.
                        </p>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Pseudo
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="BraveFox1234"
                            maxLength={30}
                            className="input-field mb-3"
                            onKeyDown={e => e.key === 'Enter' && handleGuest()}
                            autoFocus
                        />
                        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setModal(false)}
                                className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleGuest}
                                disabled={loading}
                                className="flex-1 btn-primary py-2 text-sm"
                            >
                                {loading ? 'Création...' : "C'est parti !"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
