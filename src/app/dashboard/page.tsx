// src/app/dashboard/page.tsx
'use client';
import { useSession } from 'next-auth/react';
import LoadingSpinner from '@/components/LoadingSpinner';
import UserProfilePage from '@/components/UserProfilePage';

export default function DashboardPage() {
    const { data: session, status } = useSession();
    if (status === 'loading') return <main className="flex-1 p-4 md:p-8 flex items-center justify-center"><LoadingSpinner /></main>;
    if (!session?.user?.username) return null;
    return <UserProfilePage username={session.user.username} isOwnProfile />;
}
