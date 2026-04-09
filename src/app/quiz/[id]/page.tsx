// src/app/quiz/[id]/page.tsx
'use client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import QuizPlayer from '@/components/Quiz/QuizPlayer';

export default function QuizPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();

    const quizId = params?.id as string;
    const lobbyCode = searchParams.get('lobby');

    return (
        <QuizPlayer
            quizId={quizId}
            lobbyId={lobbyCode ?? undefined}
            resultUrl={`/quiz/${quizId}/result${lobbyCode ? `?lobby=${lobbyCode}` : ''}`}
            loginCallbackUrl={`/login?callbackUrl=${encodeURIComponent(`/quiz/${quizId}`)}`}
            notAllowedBackButton={lobbyCode
                ? <button onClick={() => router.push(`/lobby/create/${lobbyCode}`)} className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">Retour au lobby</button>
                : <button onClick={() => router.push('/')} className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">Retour à l&apos;accueil</button>} />
    );
}
