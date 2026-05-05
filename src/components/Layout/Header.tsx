// src/components/Header.tsx
'use client';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { UserIcon, XMarkIcon } from '@heroicons/react/24/outline';
export default function Header() {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const isAnonymous = session?.user?.isAnonymous ?? false;
  const isGuestRole = session?.user?.role === 'GUEST';
  const isPending = session?.user?.status === 'PENDING';
  const showBanner = isGuestRole || (!isAnonymous && isPending);
  const isBlue = !isAnonymous && isPending;

  const bannerBase = "px-4 py-2 flex items-center justify-center gap-3 text-sm border-b";
  const bannerColor = isBlue
    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50"
    : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50";
  const textColor = isBlue ? "text-blue-700 dark:text-blue-300" : "text-amber-700 dark:text-amber-300";
  const linkColor = isBlue
    ? "text-blue-800 dark:text-blue-200 hover:text-blue-900 dark:hover:text-white"
    : "text-amber-800 dark:text-amber-200 hover:text-amber-900 dark:hover:text-white";

  return (
    <>
      {/* Banniere invite / en attente de verification */}
      {session && showBanner && (
        <div className={bannerBase + " " + bannerColor}>
          <span className={textColor}>
            <UserIcon className="w-4 h-4 inline mr-1" />
            {isBlue
              ? "Vérifiez votre boîte mail pour activer votre compte"
              : "Les comptes invités sont supprimés quotidiennement"}
          </span>
          <Link href="/dashboard" className={"font-semibold underline underline-offset-2 transition-colors " + linkColor}>
            {isBlue ? "Renvoyer le mail →" : "Finaliser l'inscription →"}
          </Link>
        </div>
      )}
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="w-full px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/logo/icon-light.svg" alt="Kwizar" width={36} height={36}
                className="rounded-lg block dark:hidden" />
              <img src="/logo/icon-dark.svg" alt="Kwizar" width={36} height={36}
                className="rounded-lg hidden dark:block" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">Kwizar</span>
            </Link>
            {isLoading ? (
              <div className="h-10 w-32 sm:w-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            ) : session ? (
              <div className="flex items-center gap-2 sm:gap-4 ml-auto min-w-0">
                <Link href="/dashboard" className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-all min-w-0">
                  <span className="hidden sm:inline text-sm">{isAnonymous ? <UserIcon className="w-4 h-4 inline" /> : 'Bonjour,'}</span>
                  <span className={"truncate max-w-[80px] sm:max-w-[140px] " + (session.user.role === 'ADMIN'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded text-xs font-semibold'
                    : isAnonymous
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-blue-600 dark:text-blue-400')}>
                    {session.user.username ?? session.user.email}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 opacity-50 shrink-0">
                    <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 0 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="shrink-0 px-2 sm:px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-md font-medium transition-all shadow-sm hover:shadow"
                >
                  <span className="hidden sm:inline">Se déconnecter</span>
                  <span className="sm:hidden"><XMarkIcon className="w-4 h-4" /></span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-4 ml-auto">
                <Link href="/login" className="btn-secondary">Connexion</Link>
                <Link href="/register" className="btn-primary">Inscription</Link>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
