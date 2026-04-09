// src/app/quiz/[id]/[quizId]/page.tsx  (id = lobbyId, quizId = quiz DB id)
'use client';
import { useParams, useRouter } from 'next/navigation';
import QuizPlayer from '@/components/Quiz/QuizPlayer';

export default function QuizPage() {
    const params = useParams<{ id: string; quizId: string }>();
    const router = useRouter();

    const lobbyId = params?.id ?? '';
    const quizId = params?.quizId ?? '';

    return (
        <QuizPlayer
            quizId={quizId}
            lobbyId={lobbyId}
            resultUrl={`/quiz/${lobbyId}/${quizId}/result`}
            loginCallbackUrl={`/login?callbackUrl=${encodeURIComponent(`/quiz/${lobbyId}/${quizId}`)}`}
            notAllowedBackButton={<button onClick={() => router.push(`/lobby/create/${lobbyId}`)} className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Retour au lobby
            </button>} />
    );
}
