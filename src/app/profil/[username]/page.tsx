// src/app/profil/[username]/page.tsx
'use client';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import UserProfilePage from '@/components/UserProfilePage';

export default function ProfilPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session, status } = useSession();
    const username = params?.username as string;

    useEffect(() => {
        if (status === 'authenticated' && session?.user?.username === username) {
            router.replace('/dashboard');
        }
    }, [status, session, username]);

    if (!username) return null;
    return <UserProfilePage username={username} />;
}
