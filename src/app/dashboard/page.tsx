// src/app/dashboard/page.tsx
'use client';
import { useSession } from 'next-auth/react';
import UserProfilePage from '@/components/UserProfilePage';

export default function DashboardPage() {
    const { data: session, status } = useSession();
    if (status === 'loading') return null;
    if (!session?.user) return null;
    const username = session.user.username || session.user.id;
    return <UserProfilePage username={username} isOwnProfile />;
}
