'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import {
    ArrowRightStartOnRectangleIcon,
    UserCircleIcon,
    Cog6ToothIcon,
    ChevronUpIcon,
} from '@heroicons/react/24/outline';
import UserAvatar from '@/components/UserAvatar';

interface Props {
    collapsed: boolean;
}

export default function SidebarUser({ collapsed }: Props) {
    const { data: session } = useSession();
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    if (!session?.user) return null;

    const user = session.user;
    const name = user.name ?? user.email ?? 'Utilisateur';
    const role = user.role;
    const isAdmin = role === 'ADMIN';

    return (
        <div ref={wrapRef} className="relative px-2 py-3 flex flex-col">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${open ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                title={collapsed ? name : undefined}
                aria-expanded={open}
            >
                <UserAvatar
                    seed={user.id ?? name}
                    name={name}
                    image={user.image}
                    size="sm"
                    shape="round"
                />

                {!collapsed && (
                    <>
                        <div className="flex-1 min-w-0 text-left">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                                <span className="truncate">{name}</span>
                                {isAdmin && <span className="text-[9px] font-black px-1 rounded bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30">ADMIN</span>}
                            </div>
                            {user.email && user.email !== name && (
                                <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
                            )}
                        </div>
                        <ChevronUpIcon className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? '' : 'rotate-180'}`} />
                    </>
                )}
            </button>

            {open && (
                <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1 ${collapsed ? 'absolute z-40 left-full ml-2 bottom-0 w-56' : 'order-first mx-2 mb-2'}`}>
                    <Link
                        href="/dashboard"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60"
                    >
                        <UserCircleIcon className="w-4 h-4 text-gray-400" />
                        Profil
                    </Link>
                    <Link
                        href="/settings"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60"
                    >
                        <Cog6ToothIcon className="w-4 h-4 text-gray-400" />
                        Paramètres
                    </Link>
                    <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                    <button
                        type="button"
                        onClick={() => { setOpen(false); signOut({ callbackUrl: '/' }); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
                        Déconnexion
                    </button>
                </div>
            )}
        </div>
    );
}
