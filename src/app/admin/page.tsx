// src/app/admin/page.tsx
'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminPanel from '@/components/AdminPanel';

export default function AdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/admin');
        } else if (status === 'authenticated' && session.user?.role !== 'ADMIN') {
            router.push('/');
        }
    }, [status, session, router]);

    if (status === 'loading' || !session || session.user?.role !== 'ADMIN') return null;

    return (
        <main className="flex-1 p-4 md:p-8">
            <AdminPanel />
        </main>
    );
}
