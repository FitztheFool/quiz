'use client';

import Link from 'next/link';
import Pagination from '@/components/Pagination';
import { useSession } from 'next-auth/react';
import type { AdminUser, UserSort } from '../types';

const ROLES = ['GUEST', 'USER', 'RANDOM', 'ADMIN'] as const;

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
}

export default function UsersTab({
    users, userPage, userTotalPages,
    userQuery, setUserQuery, userSort, setUserSort,
    userRole, setUserRole,
    userStatus, setUserStatus,
    onPageChange, onRoleChange, onToggleBan, onDeleteUser,
}: Props) {
    const { data: session } = useSession();

    return (
        <div id="admin-users" className="scroll-mt-24 space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3 flex flex-wrap gap-2 items-center">
                <input
                    type="text"
                    value={userQuery}
                    onChange={e => setUserQuery(e.target.value)}
                    placeholder="Rechercher (username ou email)…"
                    className="flex-1 min-w-0 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <select
                    value={userSort}
                    onChange={e => setUserSort(e.target.value as UserSort)}
                    className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg px-3 py-1.5 text-gray-600 dark:text-gray-300"
                >
                    <option value="createdAt_desc">Plus récents</option>
                    <option value="createdAt_asc">Plus anciens</option>
                    <option value="username_asc">Username A → Z</option>
                    <option value="username_desc">Username Z → A</option>
                </select>
                <select
                    value={userRole || 'ALL'}
                    onChange={e => setUserRole(e.target.value === 'ALL' ? '' : e.target.value)}
                    className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg px-3 py-1.5 text-gray-600 dark:text-gray-300"
                >
                    <option value="ALL">Tous les rôles</option>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select
                    value={userStatus || 'ALL'}
                    onChange={e => setUserStatus(e.target.value === 'ALL' ? '' : e.target.value)}
                    className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg px-3 py-1.5 text-gray-600 dark:text-gray-300"
                >
                    <option value="ALL">Tous les statuts</option>
                    <option value="ACTIVE">Actif</option>
                    <option value="PENDING">En attente</option>
                    <option value="BANNED">Banni</option>
                    <option value="DEACTIVATED">Désactivé</option>
                </select>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                    <table className="w-full text-sm">
                        <thead className="bg-white dark:bg-gray-900">
                            <tr className="text-left">
                                {['', 'Utilisateur', 'Email', 'Inscrit le', 'Vu le'].map(h => (
                                    <th key={h} className="px-3 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{h}</th>
                                ))}
                                <th className="px-3 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                    <span className="inline-flex items-center gap-1">
                                        Statut
                                        <span className="relative group">
                                            <span className="cursor-help text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-[11px] font-bold leading-none">ⓘ</span>
                                            <div className="absolute left-1/2 -translate-x-1/2 top-5 z-50 hidden group-hover:block w-56 bg-gray-900 dark:bg-gray-700 text-white text-[11px] rounded-lg shadow-lg p-3 normal-case tracking-normal font-normal">
                                                <p className="mb-1"><span className="font-semibold text-green-400">Actif</span> / <span className="font-semibold text-red-400">Banni</span> — désactivation admin, bloque la connexion.</p>
                                                <p><span className="font-semibold text-orange-400">Désactivé</span> — auto-désactivation par l'utilisateur, réactivée à la reconnexion.</p>
                                            </div>
                                        </span>
                                    </span>
                                </th>
                                {['Rôle', 'Actions'].map(h => (
                                    <th key={h} className="px-3 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {users.length === 0 ? (
                                <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">Aucun utilisateur trouvé</td></tr>
                            ) : users.map(user => (
                                <tr key={user.id} className="hover:bg-white dark:hover:bg-gray-900 transition-colors">

                                    {/* Avatar */}
                                    <td className="px-3 py-2">
                                        {user.image
                                            ? <img src={user.image} className="w-8 h-8 rounded-lg object-cover border border-gray-100 dark:border-gray-800" />
                                            : <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">{user.username[0]?.toUpperCase()}</div>}
                                    </td>

                                    {/* Username */}
                                    <td className="px-3 py-2 font-semibold text-xs">
                                        <Link href={session?.user?.username === user.username ? '/dashboard' : `/user/${user.username}`} className="text-blue-600 dark:text-blue-400 hover:underline">{user.username}</Link>
                                    </td>

                                    {/* Email */}
                                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{user.email}</td>

                                    {/* Inscrit le */}
                                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString('fr-FR')}</td>

                                    {/* Vu le */}
                                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                        {user.lastSeen ? new Date(user.lastSeen).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                    </td>

                                    {/* Statut */}
                                    <td className="px-3 py-2">
                                        <div className="flex flex-col gap-1">
                                            {user.status === 'BANNED' ? (
                                                <span className="text-[10px] font-semibold whitespace-nowrap text-red-600 dark:text-red-400">
                                                    Banni {user.bannedAt ? `le ${new Date(user.bannedAt).toLocaleDateString('fr-FR')}` : ''}
                                                </span>
                                            ) : user.status === 'DEACTIVATED' ? (
                                                <span className="text-[10px] font-semibold whitespace-nowrap text-orange-500 dark:text-orange-400">
                                                    Compte désactivé {user.deactivatedAt ? `le ${new Date(user.deactivatedAt).toLocaleDateString('fr-FR')}` : ''}
                                                </span>
                                            ) : user.status === 'PENDING' ? (
                                                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">En attente</span>
                                            ) : (
                                                <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">Actif</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Rôle */}
                                    <td className="px-3 py-2">
                                        {user.role === 'ADMIN' ? (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
                                                ADMIN <span className="opacity-60">🔒</span>
                                            </span>
                                        ) : (
                                            <select
                                                value={user.role}
                                                onChange={e => onRoleChange(user.id, e.target.value)}
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${user.role === 'RANDOM'
                                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                                                    : user.role === 'GUEST'
                                                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                                                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                                    }`}
                                            >
                                                {ROLES.map(r => (
                                                    <option key={r} value={r} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-normal">{r}</option>
                                                ))}
                                            </select>
                                        )}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-3 py-2">
                                        {user.role !== 'ADMIN' && (
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => onToggleBan(user.id, user.status === 'BANNED')}
                                                    className={`text-[10px] font-semibold px-2 py-0.5 border rounded-lg transition-colors ${user.status === 'BANNED'
                                                        ? 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                        : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                        }`}
                                                >
                                                    {user.status === 'BANNED' ? 'Débannir' : 'Bannir'}
                                                </button>
                                                <button
                                                    onClick={() => onDeleteUser(user.id, user.username)}
                                                    className="text-[10px] font-semibold text-red-500 hover:text-red-700 px-2 py-0.5 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
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
                <Pagination currentPage={userPage} totalPages={userTotalPages} onPageChange={onPageChange} />
            </div>
        </div>
    );
}
