import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminUser, UserSort } from '../types';

const PAGE_SIZE = 10;

export function useAdminUsers() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [userPage, setUserPage] = useState(1);
    const [userTotalPages, setUserTotalPages] = useState(1);
    const [userQuery, setUserQuery] = useState('');
    const [userSort, setUserSort] = useState<UserSort>('createdAt_desc');
    const [userRole, setUserRole] = useState('');
    const [userStatus, setUserStatus] = useState('');

    const queryRef = useRef(userQuery);
    const sortRef = useRef(userSort);
    const roleRef = useRef(userRole);
    const statusRef = useRef(userStatus);

    queryRef.current = userQuery;
    sortRef.current = userSort;
    roleRef.current = userRole;
    statusRef.current = userStatus;

    const fetchUsers = useCallback(async (page = 1) => {
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(PAGE_SIZE),
            q: queryRef.current,
            sort: sortRef.current,
            ...(roleRef.current && { role: roleRef.current }),
            ...(statusRef.current && { status: statusRef.current }),
        });
        const res = await fetch(`/api/admin/users?${params}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        setUsers(data.users);
        setUserTotalPages(data.totalPages);
        setUserPage(page);
    }, []);

    useEffect(() => { fetchUsers(1); }, [userQuery, userSort, userRole, userStatus]);

    const handleRoleChange = async (userId: string, role: string) => {
        const res = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, role }) });
        if (res.ok) await fetchUsers(userPage);
        else alert((await res.json())?.error ?? 'Erreur');
    };

    const handleToggleBan = async (userId: string, isBanned: boolean) => {
        const action = isBanned ? 'débannir' : 'bannir';  // ← était 'réactiver'/'désactiver'
        if (!confirm(`${action[0].toUpperCase() + action.slice(1)} ce compte ?`)) return;
        const res = await fetch('/api/admin/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, action: 'toggleBan' }),
        });
        if (res.ok) await fetchUsers(userPage);
        else alert((await res.json())?.error ?? 'Erreur');
    };

    const handleDeleteUser = async (userId: string, username: string) => {
        if (!confirm(`Supprimer l'utilisateur "${username}" ?`)) return;
        const res = await fetch('/api/admin/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
        if (res.ok) await fetchUsers(userPage);
        else alert((await res.json()).error);
    };

    return {
        users, userPage, userTotalPages,
        userQuery, setUserQuery,
        userSort, setUserSort,
        userRole, setUserRole,
        userStatus, setUserStatus,
        fetchUsers,
        handleRoleChange, handleToggleBan, handleDeleteUser,
    };
}
