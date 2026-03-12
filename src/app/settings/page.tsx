'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';

type TabType = 'theme' | 'compte' | 'securite';

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('theme');
  const [mounted, setMounted] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwStatus, setPwStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

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
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await res.json();
      if (!res.ok) setPwStatus({ type: 'error', msg: data.error ?? 'Erreur serveur.' });
      else { setPwStatus({ type: 'success', msg: 'Mot de passe mis à jour !' }); setPwForm({ current: '', next: '', confirm: '' }); }
    } catch { setPwStatus({ type: 'error', msg: 'Erreur réseau.' }); }
    finally { setPwLoading(false); }
  };
  useEffect(() => setMounted(true), []);

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

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 md:p-8 mb-6">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 inline-flex items-center gap-1 transition-colors"
          >
            ← Retour
          </button>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl">
              ⚙️
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Personnalisez votre expérience</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 border-b-2 border-gray-200 dark:border-gray-700">
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
        </div>

        {/* Tab: Compte */}
        {activeTab === 'compte' && session && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 md:p-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Mon compte</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Informations de votre compte</p>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                  {(session?.user?.name ?? session?.user?.email ?? '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{session?.user?.username ?? session?.user?.name ?? 'Utilisateur'}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{session?.user?.email}</div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400 text-center">
                D'autres options arrivent bientôt…
              </div>
            </div>
          </div>
        )}


        {/* Tab: Sécurité */}
        {activeTab === 'securite' && session && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 md:p-8">
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
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 md:p-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Apparence</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Choisissez le thème de l'interface</p>
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
