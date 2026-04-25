// src/app/login/page.tsx
'use client';
import LoadingSpinner from '@/components/LoadingSpinner';
import { randomUsername } from '@/lib/randomUsername';
import { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DiscordButton from '@/components/DiscordButton';
import GoogleButton from '@/components/GoogleButton';
import GuestLoginButton from '@/components/GuestLoginButton';
import { EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';

function LoginForm() {
    const { status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();

    // ✅ lire directement le callbackUrl (pas de state)
    const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';

    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [guestModal, setGuestModal] = useState(false);
    const [guestUsername, setGuestUsername] = useState('');
    const [guestLoading, setGuestLoading] = useState(false);
    const [guestError, setGuestError] = useState('');
    const PROVIDER_LABELS: Record<string, string> = {
        discord: 'Discord',
        google: 'Google',
        credentials: 'email/mot de passe',
    };
    const [error, setError] = useState(() => {
        const e = searchParams.get('error');
        const provider = searchParams.get('provider');
        const providerLabel = provider ? (PROVIDER_LABELS[provider] ?? provider) : null;

        if (e === 'OAuthAccountConflict') return 'Un compte existe déjà avec cet email. Connectez-vous avec votre mot de passe ou utilisez la récupération de mot de passe.';
        if (e === 'OAuthEmailConflict') return `Cet email est déjà associé à un compte ${providerLabel ?? 'OAuth'}. Connectez-vous avec ${providerLabel ?? 'ce provider'}.`;
        if (e === 'AccountBanned') return 'Votre compte a été banni.';
        if (e === 'SessionExpired') return 'Session expirée, veuillez vous reconnecter.';
        if (e === 'TokenExpired') return 'Ce lien d\'activation a expiré. Connectez-vous pour en recevoir un nouveau.';
        if (e === 'InvalidToken') return 'Lien d\'activation invalide.';
        return '';
    });
    const [loading, setLoading] = useState(false);
    const [pendingEmail, setPendingEmail] = useState(() => searchParams.get('email') ?? '');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendRateLimited, setResendRateLimited] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const registered = searchParams.get('registered') === 'true';
    const verified = searchParams.get('verified') === '1';
    const passwordReset = searchParams.get('password_reset') === '1';

    const handleResend = async () => {
        if (!pendingEmail || resendCooldown > 0) return;
        setResendLoading(true);
        try {
            const res = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: pendingEmail }),
            });
            const rateLimited = res.status === 429;
            setResendRateLimited(rateLimited);
            const cooldown = rateLimited ? 180 : res.ok ? 180 : 0;
            if (cooldown > 0) {
                setResendCooldown(cooldown);
                const interval = setInterval(() => {
                    setResendCooldown(c => {
                        if (c <= 1) { clearInterval(interval); return 0; }
                        return c - 1;
                    });
                }, 1000);
            }
        } catch {
            // silencieux, le bouton reste disponible
        } finally {
            setResendLoading(false);
        }
    };

    // ✅ si déjà connecté -> va sur callbackUrl, pas /dashboard
    useEffect(() => {
        if (status === 'authenticated') {
            router.replace(callbackUrl);
        }
    }, [status, router, callbackUrl]);

    if (status === 'loading' || status === 'authenticated') return null;

    const handleGuest = async () => {
        setGuestLoading(true);
        setGuestError('');
        try {
            const res = await fetch('/api/auth/guest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: guestUsername.trim() || undefined }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setGuestError(data.error ?? 'Erreur lors de la création du compte invité');
                return;
            }
            const data = await res.json();
            localStorage.setItem('guestUsername', data.username);

            // signIn via le provider guest → NextAuth forge le JWT correctement
            const result = await signIn('guest', {
                userId: data.userId,
                redirect: false,
            });

            if (result?.error) {
                setGuestError('Erreur lors de la connexion');
                return;
            }

            window.location.href = callbackUrl;
        } catch {
            setGuestError('Une erreur est survenue');
        } finally {
            setGuestLoading(false);
        }
    };

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
                if (result.error === 'AccountPending') {
                    setPendingEmail(identifier);
                    setError('AccountPending');
                } else if (result.error === 'deactivated') setError('Votre compte a été banni.');
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4 py-12">
            <div className="max-w-md w-full">
                <div className="text-center mb-10">
                    <Link href="/" className="inline-flex flex-col items-center gap-2 text-gray-900 dark:text-white">
                        <LockClosedIcon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                        <span className="text-3xl font-bold">Kwizar</span>
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

                    {verified && (
                        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-sm text-green-700 dark:text-green-300">
                            <p className="font-semibold">Email confirmé ✓</p>
                            <p className="mt-1">Votre compte est activé. Vous pouvez vous connecter.</p>
                        </div>
                    )}

                    {passwordReset && (
                        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-sm text-green-700 dark:text-green-300">
                            <p className="font-semibold">Mot de passe modifié ✓</p>
                            <p className="mt-1">Vous pouvez vous connecter.</p>
                        </div>
                    )}

                    {registered && !error && (
                        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                            <p className="font-semibold flex items-center gap-1.5"><EnvelopeIcon className="w-4 h-4" />Vérifiez votre boîte mail</p>
                            <p className="mt-1">Un lien d'activation a été envoyé à votre adresse email. Cliquez dessus pour activer votre compte.</p>
                            {resendCooldown > 0 ? (
                                <p className="mt-2 text-xs">
                                    {resendRateLimited ? 'Trop de tentatives —' : 'Lien envoyé ✓ —'} Renvoi possible dans <span className="font-semibold">{Math.floor(resendCooldown / 60)}:{String(resendCooldown % 60).padStart(2, '0')}</span>
                                </p>
                            ) : (
                                <button onClick={handleResend} disabled={resendLoading} className="mt-2 text-xs font-semibold underline hover:no-underline disabled:opacity-50">
                                    {resendLoading ? 'Envoi…' : 'Renvoyer le lien'}
                                </button>
                            )}
                        </div>
                    )}

                    {error === 'AccountPending' ? (
                        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                            <p className="font-semibold">Compte non activé</p>
                            <p className="mt-1">Vérifiez votre boîte mail et cliquez sur le lien d'activation.</p>
                            {resendCooldown > 0 ? (
                                <p className="mt-2 text-xs">
                                    {resendRateLimited ? 'Trop de tentatives —' : 'Lien envoyé ✓ —'} Renvoi possible dans <span className="font-semibold">{Math.floor(resendCooldown / 60)}:{String(resendCooldown % 60).padStart(2, '0')}</span>
                                </p>
                            ) : (
                                <button
                                    onClick={handleResend}
                                    disabled={resendLoading}
                                    className="mt-2 text-xs font-semibold underline hover:no-underline disabled:opacity-50"
                                >
                                    {resendLoading ? 'Envoi…' : 'Renvoyer le lien'}
                                </button>
                            )}
                        </div>
                    ) : error ? (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg">
                            {error}
                        </div>
                    ) : null}

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
                            <div className="mt-1 text-right">
                                <Link href="/forgot-password" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                    Mot de passe oublié ?
                                </Link>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary w-full">
                            {loading ? 'Connexion...' : 'Se connecter'}
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
                            Pas encore de compte ?{' '}
                            <Link
                                href={`/register${callbackUrl !== '/dashboard' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
                                className="text-primary-600 hover:text-primary-700 font-semibold"
                            >
                                S&apos;inscrire
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

                {/* Modal invité */}
                {guestModal && (
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
                                value={guestUsername}
                                onChange={e => setGuestUsername(e.target.value)}
                                placeholder="BraveFox1234"
                                maxLength={30}
                                className="input-field mb-3"
                                onKeyDown={e => e.key === 'Enter' && handleGuest()}
                                autoFocus
                            />
                            {guestError && (
                                <p className="text-sm text-red-500 mb-3">{guestError}</p>
                            )}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setGuestModal(false)}
                                    className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="button"
                                    onClick={handleGuest}
                                    disabled={guestLoading}
                                    className="flex-1 btn-primary py-2 text-sm"
                                >
                                    {guestLoading ? 'Création...' : "C'est parti !"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
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
