'use client';

import { useParams } from 'next/navigation';
import QuizPlayer from '@/components/Quiz/QuizPlayer';

interface QuizPageWrapperProps {
    lobbyId?: string;
    quizId?: string;
}

export default function QuizPageWrapper({ lobbyId, quizId }: QuizPageWrapperProps) {
    const params = useParams();

    const finalLobbyId = lobbyId ?? (params?.lobbyId as string); // ← était params?.quizId
    const finalQuizId = quizId ?? (params?.quizId as string);

    if (!finalLobbyId || !finalQuizId) {
        return (
            <div className="flex items-center justify-center min-h-screen text-gray-700 dark:text-gray-300">
                <div className="text-center">
                    <p className="text-lg font-medium">⚠️ Quiz introuvable</p>
                    <p className="text-sm mt-2">Vérifiez l'URL ou revenez à l'accueil.</p>
                </div>
            </div>
        );
    }

    const resultUrl = finalLobbyId
        ? `/lobby/create/${finalLobbyId}`
        : `/quiz/${finalQuizId}/results`;

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <QuizPlayer
                lobbyId={finalLobbyId}
                quizId={finalQuizId}
                resultUrl={resultUrl}
            />
        </div>
    );
}
