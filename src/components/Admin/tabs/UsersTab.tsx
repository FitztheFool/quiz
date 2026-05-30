'use client';

import Link from 'next/link';
import Pagination from '@/components/Pagination';
import { useSession } from 'next-auth/react';
import {
    LockClosedIcon, MagnifyingGlassIcon, TrashIcon,
    ShieldExclamationIcon, ShieldCheckIcon, UserGroupIcon,
} from '@heroicons/react/24/outline';
import type { AdminUser, UserSort } from '../types';
import UserAvatar from '@/components/UserAvatar';

const ROLES = ['GUEST', 'USER', 'RANDOM', 'ADMIN'] as const;

const PROVIDER_LABELS: Record<string, { label: string; className: string }> = {
    credentials: { label: 'Email', className: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700' },
    google: { label: 'Google', className: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' },
    discord: { label: 'Discord', className: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' },
};

function ProviderBadge({ provider }: { provider: string }) {
    const cfg = PROVIDER_LABELS[provider] ?? { label: provider, className: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700' };
    return (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${cfg.className}`}>{cfg.label}</span>
    );
}

interface Props {
    users: AdminUser[];
    userPage: number;
    userTotalPages: number;
    userQuery: string;
    setUserQuery: (q: string) => void;
    userSort: UserSort;
    setUserSort: (s: UserSort) => void;
    userRole: string;
    setUserRole: (r: string) => void;
    userStatus: string;
    setUserStatus: (s: string) => void;
    onPageChange: (p: number) => void;
    onRoleChange: (userId: string, role: string) => void;
    onToggleBan: (userId: string, isBanned: boolean) => void;
    onDeleteUser: (userId: string, username: string) => void;
    onDeleteGuests: () => void;
}

export default function UsersTab({
    users, userPage, userTotalPages,
    userQuery, setUserQuery, userSort, setUserSort,
    userRole, setUserRole, userStatus, setUserStatus,
    onPageChange, onRoleChange, onToggleBan, onDeleteUser, onDeleteGuests,
}: Props) {
    const { data: session } = useSession();

    const selectCls = 'text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400';

    return (
        <div id="admin-users" className="scroll-mt-24 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <MagnifyingGlassIcon className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        value={userQuery}
                        onChange={e => setUserQuery(e.target.value)}
                        placeholder="Rechercher (username ou email)…"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                </div>
                <select value={userSort} onChange={e => setUserSort(e.target.value as UserSort)} className={selectCls}>
                    <option value="createdAt_desc">Plus récents</option>
                    <option value="createdAt_asc">Plus anciens</option>
                    <option value="username_asc">Username A → Z</option>
                    <option value="username_desc">Username Z → A</option>
                </select>
                <select value={userStatus || 'ALL'} onChange={e => setUserStatus(e.target.value === 'ALL' ? '' : e.target.value)} className={selectCls}>
                    <option value="ALL">Tous les statuts</option>
                    <option value="ACTIVE">Actif</option>
                    <option value="PENDING">En attente</option>
                    <option value="BANNED">Banni</option>
                    <option value="DEACTIVATED">Désactivé</option>
                </select>
                <select value={userRole || 'ALL'} onChange={e => setUserRole(e.target.value === 'ALL' ? '' : e.target.value)} className={selectCls}>
                    <option value="ALL">Tous les rôles</option>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {session?.user?.role === 'ADMIN' && (
                    <button
                        onClick={onDeleteGuests}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors whitespace-nowrap"
                    >
                        <UserGroupIcon className="w-4 h-4" />
                        Supprimer les guests
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                                {['', 'Utilisateur', 'Email', 'Provider', 'Inscrit le', 'Vu le'].map(h => (
                                    <th key={h} className="px-4 py-2.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                ))}
                                <th className="px-4 py-2.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                    <span className="inline-flex items-center gap-1">
                                        Statut
                                        <span className="relative group">
                                            <span className="cursor-help text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">ⓘ</span>
                                            <div className="absolute left-1/2 -translate-x-1/2 top-5 z-50 hidden group-hover:block w-56 bg-gray-900 dark:bg-gray-700 text-white text-[11px] rounded-lg shadow-lg p-3 normal-case tracking-normal font-normal">
                                                <p className="mb-1"><span className="font-semibold text-green-400">Actif</span> / <span className="font-semibold text-red-400">Banni</span> — désactivation admin.</p>
                                                <p><span className="font-semibold text-orange-400">Désactivé</span> — auto-désactivation utilisateur.</p>
                                            </div>
                                        </span>
                                    </span>
                                </th>
                                {['Rôle', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-2.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50 bg-white dark:bg-gray-900">
                            {users.length === 0 ? (
                                <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">Aucun utilisateur trouvé</td></tr>
                            ) : users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="px-4 py-2.5">
                                        <UserAvatar name={user.username} image={user.image} size="sm" shape="square" />
                                    </td>
                                    <td className="px-4 py-2.5 font-semibold text-xs whitespace-nowrap">
                                        <Link href={session?.user?.username === user.username ? '/dashboard' : `/user/${user.username}`} className="text-blue-600 dark:text-blue-400 hover:underline">{user.username}</Link>
                                    </td>
                                    <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{user.email}</td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex flex-wrap gap-1">
                                            {user.providers.length === 0
                                                ? <span className="text-[10px] text-gray-400">—</span>
                                                : user.providers.map(p => <ProviderBadge key={p} provider={p} />)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap tabular-nums">
                                        {new Date(user.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </td>
                                    <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap tabular-nums">
                                        {user.lastSeen ? (
                                            <>
                                                {new Date(user.lastSeen).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                <br />
                                                <span className="text-gray-400 dark:text-gray-500">
                                                    à {new Date(user.lastSeen).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </>
                                        ) : '—'}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        {user.status === 'BANNED' ? (
                                            <span className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 whitespace-nowrap">Banni</span>
                                        ) : user.status === 'DEACTIVATED' ? (
                                            <span className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 whitespace-nowrap">Désactivé</span>
                                        ) : user.status === 'PENDING' ? (
                                            <span className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 whitespace-nowrap">En attente</span>
                                        ) : (
                                            <span className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Actif</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        {user.role === 'ADMIN' ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
                                                ADMIN <LockClosedIcon className="w-3 h-3 opacity-60" />
                                            </span>
                                        ) : (
                                            <select
                                                value={user.role}
                                                onChange={e => onRoleChange(user.id, e.target.value)}
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${user.role === 'RANDOM' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                                                    : user.role === 'GUEST' ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                                                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                                    }`}
                                            >
                                                {ROLES.map(r => (
                                                    <option key={r} value={r} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-normal">{r}</option>
                                                ))}
                                            </select>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        {user.role !== 'ADMIN' && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => onToggleBan(user.id, user.status === 'BANNED')}
                                                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 border rounded-lg transition-colors ${user.status === 'BANNED'
                                                        ? 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                        : 'text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                                                        }`}
                                                >
                                                    {user.status === 'BANNED'
                                                        ? <><ShieldCheckIcon className="w-3 h-3" />Débannir</>
                                                        : <><ShieldExclamationIcon className="w-3 h-3" />Bannir</>
                                                    }
                                                </button>
                                                <button
                                                    onClick={() => onDeleteUser(user.id, user.username)}
                                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400 px-2 py-1 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    <TrashIcon className="w-3 h-3" />
                                                    Supprimer
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <Pagination currentPage={userPage} totalPages={userTotalPages} onPageChange={onPageChange} />
        </div>
    );
}
