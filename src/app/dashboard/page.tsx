// src/app/dashboard/page.tsx
'use client';
import { useSession } from 'next-auth/react';
import UserProfilePage from '@/components/UserProfilePage';

export default function DashboardPage() {
    const { data: session, status } = useSession();
    if (status === 'loading' || !session?.user?.username) return null;
    return <UserProfilePage username={session.user.username} isOwnProfile />;
}
