// src/app/quiz/create/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import QuizForm from '@/components/Quiz/QuizForm';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function NewQuizPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [initialData, setInitialData] = useState<any>(undefined);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (status === 'loading') return;
        if (status === 'unauthenticated') {
            router.push(`/login?callbackUrl=${encodeURIComponent('/quiz/create')}`);
            return;
        }
        if (session?.user?.isAnonymous) {
            router.replace('/dashboard?error=members_only');
            return;
        }

        const stored = sessionStorage.getItem('generatedQuizData');
        if (stored) {
            sessionStorage.removeItem('generatedQuizData');
            setInitialData(JSON.parse(stored));
        }
        setReady(true);
    }, [status, session, router]);

    if (status === 'loading' || status === 'unauthenticated' || session?.user?.isAnonymous || !ready) {
        return <LoadingSpinner fullScreen={false} />;
    }

    return (
        <>
            {initialData && (
                <div className="max-w-4xl mx-auto px-4 pt-6">
                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg px-4 py-2 text-sm">
                        🤖 Quiz généré par <span className="font-semibold ml-1">Groq — Llama 3.3</span> — vérifiez et modifiez avant de publier.
                    </div>
                </div>
            )}
            <QuizForm mode="create" initialData={initialData} />
        </>
    );
}
