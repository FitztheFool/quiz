// src/app/settings/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

type TabType = 'theme' | 'compte' | 'securite';
type DeleteType = 'soft' | 'hard';

export default function SettingsPage() {
    const router = useRouter();
    const { data: session, update: updateSession } = useSession();
    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<TabType>('theme');
    const [mounted, setMounted] = useState(false);
    const initialized = useRef(false);

    // Password
    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
    const [pwStatus, setPwStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [pwLoading, setPwLoading] = useState(false);

    // Avatar
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [avatarStatus, setAvatarStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    // Username
    const [usernameEdit, setUsernameEdit] = useState(false);
    const [usernameValue, setUsernameValue] = useState('');
    const [usernameLoading, setUsernameLoading] = useState(false);
    const [usernameStatus, setUsernameStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    // Email
    const [emailEdit, setEmailEdit] = useState(false);
    const [emailValue, setEmailValue] = useState('');
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailUpdated, setEmailUpdated] = useState(false);
    const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    // Delete account
    const [deleteEmail, setDeleteEmail] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteStatus, setDeleteStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [deleteMode, setDeleteMode] = useState<DeleteType | null>(null);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!session) return;

        if (!initialized.current) {
            // Premier chargement — initialisation complète
            initialized.current = true;
            setActiveTab('compte');
            setUsernameValue(session.user?.username ?? session.user?.name ?? '');
            setEmailValue(session.user?.email ?? '');
        } else {
            // Mise à jour de session (ex: updateSession) — ne pas toucher activeTab ni les statuts
            setUsernameValue(session.user?.username ?? session.user?.name ?? '');
            if (!emailUpdated) {
                setEmailValue(session.user?.email ?? '');
            }
        }
    }, [session]);

    const u = session?.user?.username ?? '';

    // --- Handlers ---

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarStatus(null);
        setAvatarPreview(URL.createObjectURL(file));
        setAvatarLoading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            const res = await fetch(`/api/user/${u}/upload-avatar`, { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) {
                setAvatarStatus({ type: 'error', msg: data.error ?? 'Erreur upload.' });
                setAvatarPreview(null);
            } else {
                setAvatarStatus({ type: 'success', msg: 'Avatar mis à jour !' });
                setAvatarPreview(data.imageUrl);
            }
        } catch {
            setAvatarStatus({ type: 'error', msg: 'Erreur réseau.' });
            setAvatarPreview(null);
        } finally {
            setAvatarLoading(false);
        }
    };

    const handleUsernameSubmit = async () => {
        setUsernameStatus(null);
        setUsernameLoading(true);
        try {
            const res = await fetch(`/api/user/${u}/update-username`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameValue }),
            });
            const data = await res.json();
            if (!res.ok) {
                setUsernameStatus({ type: 'error', msg: data.error ?? 'Erreur serveur.' });
            } else {
                setUsernameStatus({ type: 'success', msg: 'Username mis à jour !' });
                setUsernameEdit(false);
            }
        } catch {
            setUsernameStatus({ type: 'error', msg: 'Erreur réseau.' });
        } finally {
            setUsernameLoading(false);
        }
    };

    const handleEmailSubmit = async () => {
        setEmailStatus(null);
        setEmailLoading(true);
        try {
            const res = await fetch(`/api/user/${u}/update-email`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailValue }),
            });
            const data = await res.json();
            if (!res.ok) {
                setEmailStatus({ type: 'error', msg: data.error ?? 'Erreur serveur.' });
            } else {
                setEmailUpdated(true);
                setEmailEdit(false);
                setEmailStatus({ type: 'success', msg: 'Email mis à jour !' });
            }
        } catch {
            setEmailStatus({ type: 'error', msg: 'Erreur réseau.' });
        } finally {
            setEmailLoading(false);
        }
    };

    const handlePasswordChange = async () => {
        setPwStatus(null);
        if (pwForm.next !== pwForm.confirm) {
            setPwStatus({ type: 'error', msg: 'Les mots de passe ne correspondent pas.' });
            return;
        }
        if (pwForm.next.length < 6) {
            setPwStatus({ type: 'error', msg: 'Le mot de passe doit contenir au moins 6 caractères.' });
            return;
        }
        setPwLoading(true);
        try {
            const res = await fetch(`/api/user/${u}/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
            });
            const data = await res.json();
            if (!res.ok) setPwStatus({ type: 'error', msg: data.error ?? 'Erreur serveur.' });
            else {
                setPwStatus({ type: 'success', msg: 'Mot de passe mis à jour !' });
                setPwForm({ current: '', next: '', confirm: '' });
            }
        } catch {
            setPwStatus({ type: 'error', msg: 'Erreur réseau.' });
        } finally {
            setPwLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!deleteMode) return;
        setDeleteStatus(null);
        setDeleteLoading(true);
        try {
            const res = await fetch(`/api/user/${u}/delete-account`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: deleteEmail, type: deleteMode }),
            });
            const data = await res.json();
            if (!res.ok) {
                setDeleteStatus({ type: 'error', msg: data.error ?? 'Erreur serveur.' });
            } else {
                await signOut({ callbackUrl: '/' });
            }
        } catch {
            setDeleteStatus({ type: 'error', msg: 'Erreur réseau.' });
        } finally {
            setDeleteLoading(false);
        }
    };

    const resetDeleteZone = () => {
        setDeleteMode(null);
        setDeleteEmail('');
        setDeleteStatus(null);
    };

    const TABS: { id: TabType; label: string; icon: string; requireAuth: boolean }[] = [
        { id: 'compte', label: 'Compte', icon: '👤', requireAuth: true },
        { id: 'securite', label: 'Sécurité', icon: '🔒', requireAuth: true },
        { id: 'theme', label: 'Thème', icon: '🎨', requireAuth: false },
    ];

    const visibleTabs = TABS.filter(t => !t.requireAuth || !!session);

    const THEMES = [
        { id: 'light', label: 'Clair', icon: '☀️', desc: 'Interface lumineuse' },
        { id: 'dark', label: 'Sombre', icon: '🌙', desc: 'Interface sombre' },
        { id: 'system', label: 'Système', icon: '💻', desc: 'Suit les préférences de votre appareil' },
    ];

    const currentAvatar = avatarPreview ?? session?.user?.image ?? null;
    const displayName = session?.user?.username ?? session?.user?.name ?? 'Utilisateur';
    const emailMatch = deleteEmail.trim().toLowerCase() === (emailUpdated ? emailValue : session?.user?.email ?? '').toLowerCase();

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
            <div className="max-w-3xl mx-auto">

                {/* Header */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 md:p-8 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <button
                            onClick={() => router.back()}
                            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 inline-flex items-center gap-1 transition-colors"
                        >
                            ← Retour
                        </button>
                        <Link href="/dashboard" className="text-sm text-blue-500 hover:text-blue-700 inline-flex items-center gap-1 transition-colors">
                            📊 Dashboard
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl">⚙️</div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Personnalisez votre expérience</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b-2 border-gray-200 dark:border-gray-700">
                    <div className="flex gap-2">
                        {visibleTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab: Compte */}
                {activeTab === 'compte' && session && (
                    <div className="space-y-4 mt-6">

                        {/* Avatar */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 md:p-8">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Avatar</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">JPG, PNG, WEBP, TIFF — max 50 Mo</p>

                            {avatarStatus && (
                                <div className={`mb-4 p-3 rounded-lg text-sm border ${avatarStatus.type === 'success'
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300'
                                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'
                                    }`}>
                                    {avatarStatus.type === 'success' ? '✅' : '❌'} {avatarStatus.msg}
                                </div>
                            )}

                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-gray-200 dark:ring-gray-700">
                                        {currentAvatar ? (
                                            <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                                                {displayName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    {avatarLoading && (
                                        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={avatarLoading}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                                    >
                                        {avatarLoading ? 'Upload...' : "Changer l'avatar"}
                                    </button>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">Recadrage automatique 256×256</p>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif,image/tiff"
                                    className="hidden"
                                    onChange={handleAvatarChange}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 md:p-8">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Adresse email</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Email utilisé pour la connexion</p>

                            {emailStatus && (
                                <div className={`mb-4 p-3 rounded-lg text-sm border ${emailStatus.type === 'success'
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300'
                                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'
                                    }`}>
                                    {emailStatus.type === 'success' ? '✅' : '❌'} {emailStatus.msg}
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <input
                                    type="email"
                                    value={emailValue}
                                    onChange={e => setEmailValue(e.target.value)}
                                    disabled={!emailEdit}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {!emailEdit ? (
                                    <button
                                        onClick={() => { setEmailEdit(true); setEmailStatus(null); }}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        ✏️ Modifier
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleEmailSubmit}
                                            disabled={emailLoading || !emailValue.trim().includes('@')}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                                        >
                                            {emailLoading ? '...' : '✓'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEmailEdit(false);
                                                setEmailValue(session.user?.email ?? '');
                                                setEmailStatus(null);
                                            }}
                                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Username */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 md:p-8">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{"Nom d'utilisateur"}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">3–20 caractères, lettres/chiffres/_ et -</p>

                            {usernameStatus && (
                                <div className={`mb-4 p-3 rounded-lg text-sm border ${usernameStatus.type === 'success'
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300'
                                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'
                                    }`}>
                                    {usernameStatus.type === 'success' ? '✅' : '❌'} {usernameStatus.msg}
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={usernameValue}
                                    onChange={e => setUsernameValue(e.target.value)}
                                    disabled={!usernameEdit}
                                    maxLength={20}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {!usernameEdit ? (
                                    <button
                                        onClick={() => { setUsernameEdit(true); setUsernameStatus(null); }}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        ✏️ Modifier
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleUsernameSubmit}
                                            disabled={usernameLoading || usernameValue.trim().length < 3}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                                        >
                                            {usernameLoading ? '...' : '✓'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setUsernameEdit(false);
                                                setUsernameValue(session.user?.username ?? session.user?.name ?? '');
                                                setUsernameStatus(null);
                                            }}
                                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Danger zone */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 md:p-8 border border-red-200 dark:border-red-900">
                            <div className="flex items-center justify-between mb-1">
                                <h2 className="text-lg font-bold text-red-600 dark:text-red-400">Zone dangereuse</h2>
                                <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">Irréversible</span>
                            </div>

                            {!deleteMode && (
                                <div className="mt-4 space-y-3">
                                    <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800">
                                        <div>
                                            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">🔒 Désactiver le compte</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                Bloque l'accès sans supprimer vos données. Réactivable à la reconnexion.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setDeleteMode('soft')}
                                            className="flex-shrink-0 px-3 py-1.5 border border-orange-400 dark:border-orange-600 text-orange-600 dark:text-orange-400 text-xs font-semibold rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                                        >
                                            Désactiver
                                        </button>
                                    </div>

                                    <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
                                        <div>
                                            <p className="text-sm font-semibold text-red-700 dark:text-red-400">🗑️ Supprimer le compte</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                Suppression définitive et immédiate de toutes vos données.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setDeleteMode('hard')}
                                            className="flex-shrink-0 px-3 py-1.5 border border-red-400 dark:border-red-600 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                        >
                                            Supprimer
                                        </button>
                                    </div>
                                </div>
                            )}

                            {deleteMode && (
                                <div className="mt-4 space-y-4">
                                    <div className={`p-3 rounded-lg border text-sm ${deleteMode === 'soft'
                                        ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300'
                                        : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                                        }`}>
                                        {deleteMode === 'soft'
                                            ? '⚠️ Votre compte sera désactivé. Vous serez déconnecté immédiatement.'
                                            : '💀 Toutes vos données seront supprimées définitivement. Cette action est irréversible.'}
                                    </div>

                                    {deleteStatus && (
                                        <div className="p-3 rounded-lg text-sm border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300">
                                            ❌ {deleteStatus.msg}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Confirmez en saisissant votre email :{' '}
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {emailUpdated ? emailValue : session.user?.email}
                                            </span>
                                        </label>
                                        <input
                                            type="email"
                                            value={deleteEmail}
                                            onChange={e => setDeleteEmail(e.target.value)}
                                            placeholder={emailUpdated ? emailValue : session.user?.email ?? ''}
                                            className="w-full px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleDeleteAccount}
                                            disabled={deleteLoading || !emailMatch}
                                            className={`px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors ${deleteMode === 'soft'
                                                ? 'bg-orange-500 hover:bg-orange-600'
                                                : 'bg-red-600 hover:bg-red-700'
                                                }`}
                                        >
                                            {deleteLoading
                                                ? 'En cours...'
                                                : deleteMode === 'soft'
                                                    ? 'Confirmer la désactivation'
                                                    : 'Confirmer la suppression'}
                                        </button>
                                        <button
                                            onClick={resetDeleteZone}
                                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            Annuler
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tab: Sécurité */}
                {activeTab === 'securite' && session && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 md:p-8 mt-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Sécurité</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Modifier votre mot de passe</p>

                        {pwStatus && (
                            <div className={`mb-4 p-3 rounded-lg text-sm border ${pwStatus.type === 'success'
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'
                                }`}>
                                {pwStatus.type === 'success' ? '✅' : '❌'} {pwStatus.msg}
                            </div>
                        )}

                        <div className="space-y-4">
                            {[
                                { id: 'current', label: 'Mot de passe actuel', placeholder: '••••••••' },
                                { id: 'next', label: 'Nouveau mot de passe', placeholder: '••••••••' },
                                { id: 'confirm', label: 'Confirmer le nouveau mot de passe', placeholder: '••••••••' },
                            ].map(({ id, label, placeholder }) => (
                                <div key={id}>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                                    <input
                                        type="password"
                                        value={pwForm[id as keyof typeof pwForm]}
                                        onChange={e => setPwForm(prev => ({ ...prev, [id]: e.target.value }))}
                                        placeholder={placeholder}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            ))}

                            <button
                                onClick={handlePasswordChange}
                                disabled={pwLoading || !pwForm.current || !pwForm.next || !pwForm.confirm}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                            >
                                {pwLoading ? 'Mise à jour...' : 'Changer le mot de passe'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Tab: Thème */}
                {activeTab === 'theme' && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 md:p-8 mt-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Apparence</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{"Choisissez le thème de l'interface"}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {THEMES.map((t) => {
                                const isActive = theme === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t.id)}
                                        className={`relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:scale-[1.02] ${isActive
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                    >
                                        {isActive && (
                                            <div className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                        <span className="text-4xl">{t.icon}</span>
                                        <div className="text-center">
                                            <div className={`font-semibold text-sm ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {t.label}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.desc}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-8 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium uppercase tracking-wide">Aperçu</p>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-2.5 bg-gray-200 dark:bg-gray-600 rounded-full w-3/4" />
                                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full w-1/2" />
                                </div>
                                <div className="w-16 h-7 bg-blue-500 rounded-lg" />
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
