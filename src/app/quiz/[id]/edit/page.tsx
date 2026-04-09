// src/app/quiz/[id]/edit/page.tsx
import QuizForm from '@/components/Quiz/QuizForm';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function EditQuizPage({ params }: Props) {
    const { id } = await params;

    const data = await prisma.quiz.findUnique({
        where: { id },
        include: {
            category: true,
            questions: {
                include: { answers: true }
            }
        }
    });

    if (!data) notFound();

    const initialData = {
        id: data.id,
        title: data.title,
        description: data.description ?? '',
        isPublic: data.isPublic,
        randomizeQuestions: data.randomizeQuestions ?? true,
        categoryId: data.category?.id ?? '',
        questions: data.questions.map(q => ({
            id: q.id,
            text: q.content,           // QuestionForm uses `text`, not `content`
            type: q.type,
            points: q.points,
            strictOrder: q.strictOrder ?? false,
            answers: q.answers.map(a => ({
                id: a.id,
                text: a.content ?? '', // AnswerForm uses `text`, not `content`
                isCorrect: a.isCorrect,
            })),
        })),
    };

    return <QuizForm mode="edit" initialData={initialData} />;
}
