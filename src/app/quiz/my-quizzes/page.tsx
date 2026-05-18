// src/app/quiz/my-quizzes/page.tsx
'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MyQuizzesPanel from '@/components/Quiz/MyQuizzesPanel';

export default function MyQuizzesPage() {
    const { status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/quiz/my-quizzes');
        }
    }, [status, router]);

    if (status !== 'authenticated') return null;

    return (
        <main className="flex-1 p-4 md:p-8">
            <MyQuizzesPanel />
        </main>
    );
}
