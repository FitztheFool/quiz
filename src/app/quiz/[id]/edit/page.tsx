// app/quiz/[id]/edit/page.tsx
'use client';
import LoadingSpinner from '@/components/LoadingSpinner';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import QuizForm from '@/components/QuizForm';

export default function EditQuizPage() {
  const params = useParams();
  const quizId = params?.id as string;
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quizId) return;
    fetch(`/api/quiz/${quizId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Quiz introuvable');
        return res.json();
      })
      .then((data) => {
        // Normalise les réponses : l'API retourne `text` dans answer.text
        const normalized = {
          ...data,
          categoryId: data.category?.id ?? '',
          questions: data.questions.map((q: any) => ({
            ...q,
            answers: q.answers?.map((a: any) => ({
              ...a,
              text: a.text ?? a.content ?? '',
            })),
          })),
        };
        setInitialData(normalized);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [quizId]);

  if (loading) {
    return (
      <LoadingSpinner />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        ⚠️ {error}
      </div>
    );
  }

  return <QuizForm mode="edit" initialData={initialData!} />;
}
