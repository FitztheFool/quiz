'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getQuizSocket } from '@/lib/socket';
import { normalizeAnswer } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuestionType = 'TRUE_FALSE' | 'MCQ' | 'MCQ_UNIQUE' | 'TEXT' | 'MULTI_TEXT';

export type Answer = { id: string; text: string };

export type Question = {
    id: string;
    text: string;
    type: QuestionType;
    points: number;
    answers?: Answer[];
    strictOrder?: boolean;
};

export type Quiz = {
    id: string;
    title: string;
    questions: Question[];
    creatorId?: string;
};

export type Feedback = {
    isCorrect: boolean;
    correctAnswerText?: string;
};

type UserAnswer = { questionId: string; answerIds: string[] | string; text?: string };

type QuestionResult = {
    questionId: string;
    questionText: string;
    type: QuestionType;
    points: number;
    earnedPoints: number;
    isCorrect: boolean;
    userAnswerText: string;
    correctAnswerText: string;
    strictOrder?: boolean;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseQuizPlayerOptions {
    quizId: string;
    lobbyId?: string;
    resultUrl: string;
    timeMode?: string;
    timePerQuestion?: number;
}

const EMPTY_QUIZ: Quiz = { id: '', title: '', questions: [] };

export function useQuizPlayer({ quizId, lobbyId, resultUrl, timeMode, timePerQuestion = 10 }: UseQuizPlayerOptions) {
    const router = useRouter();
    const { data: session, status } = useSession();
    const socket = useMemo(() => (lobbyId ? getQuizSocket() : null), [lobbyId]);

    // Quiz data
    const [quizData, setQuizData] = useState<Quiz>(EMPTY_QUIZ);
    const [isLoadingQuiz, setIsLoadingQuiz] = useState(true);
    const quizRef = useRef<Quiz | null>(null);

    useEffect(() => {
        if (!quizId) return;
        setIsLoadingQuiz(true);
        fetch(`/api/quiz/${quizId}`)
            .then(r => r.json())
            .then(data => {
                if (data?.id) {
                    setQuizData(data);
                    quizRef.current = data;
                }
            })
            .finally(() => setIsLoadingQuiz(false));
    }, [quizId]);

    // Question navigation
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const currentQuestion = quizData.questions[currentQuestionIndex] ?? null;
    const isLastQuestion = currentQuestionIndex === quizData.questions.length - 1;
    const progress = quizData.questions.length > 0
        ? ((currentQuestionIndex + 1) / quizData.questions.length) * 100
        : 0;

    // Answer state
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
    const [freeTextAnswer, setFreeTextAnswer] = useState('');
    const [multiTextAnswers, setMultiTextAnswers] = useState<string[]>(['']);

    const toggleAnswer = useCallback((id: string) =>
        setSelectedAnswers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]),
        []);

    // Feedback & submission
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);

    const earnedPointsRef = useRef(0);
    const answersRef = useRef<UserAnswer[]>([]);
    const questionResultsRef = useRef<QuestionResult[]>([]);

    const canProceed = selectedAnswer !== null
        || selectedAnswers.length > 0
        || freeTextAnswer.trim() !== ''
        || multiTextAnswers.some(t => t.trim() !== '');

    // Timer via socket
    useEffect(() => {
        if (!socket) return;

        const onTimeLeft = ({ timeLeft: t }: { timeLeft: number }) => {
            if (timeMode === 'total') setTimerEndsAt(Date.now() + t * 1000);
        };
        const onPerQuestionTimeLeft = ({ timeLeft: t }: { timeLeft: number }) => {
            if (timeMode === 'quiz:per_question') setTimerEndsAt(Date.now() + t * 1000);
        };

        socket.on('game:timeLeft', onTimeLeft);
        socket.on('game:perQuestionTimeLeft', onPerQuestionTimeLeft);

        return () => {
            socket.off('game:timeLeft', onTimeLeft);
            socket.off('game:perQuestionTimeLeft', onPerQuestionTimeLeft);
        };
    }, [socket, timeMode]);

    // Reset timer on question change (per_question mode)
    useEffect(() => {
        if (timeMode === 'quiz:per_question') setTimerEndsAt(null);
    }, [currentQuestionIndex, timeMode]);

    // Socket: join + progress
    useEffect(() => {
        if (!lobbyId || !socket || !session?.user?.id || quizData.questions.length === 0) return;
        socket.emit('quiz:join', {
            lobbyId,
            userId: session.user.id,
            username: session.user.username ?? session.user.email ?? 'User',
            quizId,
            timeMode,
            timePerQuestion,
        });
    }, [lobbyId, socket, session?.user?.id, quizData.questions.length]);

    useEffect(() => {
        if (!lobbyId || !socket || quizData.questions.length === 0) return;
        socket.emit('quiz:playerProgress', {
            currentQuestion: currentQuestionIndex,
            totalQuestions: quizData.questions.length,
        });
    }, [lobbyId, socket, currentQuestionIndex, quizData.questions.length]);

    // Submit
    const submitQuiz = useCallback((answers: UserAnswer[]) => {
        const quiz = quizRef.current;
        if (!quiz) return;

        setIsSubmitting(true);
        const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
        const resultKey = `quiz_result_${quizId}`;
        const basePayload = {
            score: earnedPointsRef.current,
            totalPoints,
            quizTitle: quiz.title,
            isOwnQuiz: quiz.creatorId === session?.user?.id,
            questionResults: questionResultsRef.current,
            lobbyCode: lobbyId ?? null,
        };

        sessionStorage.setItem(resultKey, JSON.stringify(basePayload));

        if (session?.user?.id && socket) {
            let navigated = false;
            const navigate = () => { if (!navigated) { navigated = true; router.push(resultUrl); } };
            const fallback = setTimeout(navigate, 5000);

            socket.once('quiz:result', ({ score, totalPoints: tp, questionResults }: any) => {
                clearTimeout(fallback);
                sessionStorage.setItem(resultKey, JSON.stringify({
                    ...basePayload, score, totalPoints: tp, questionResults,
                }));
                window.dispatchEvent(new CustomEvent('quiz:result:ready', { detail: { quizId } }));
                navigate();
            });

            socket.emit('quiz:playerFinished', {
                answers, lobbyId, quizId,
                userId: session.user.id,
                username: session.user.username ?? session.user.email ?? 'User',
            });
        } else {
            router.push(resultUrl);
        }
    }, [quizId, lobbyId, resultUrl, session, socket, router]);

    // Validate answer
    const handleValidateAnswer = useCallback(async () => {
        if (!currentQuestion) return;
        setIsValidating(true);

        const body: Record<string, unknown> = { questionId: currentQuestion.id };
        if (currentQuestion.type === 'TRUE_FALSE' || currentQuestion.type === 'MCQ_UNIQUE') {
            body.answerId = selectedAnswer;
        } else if (currentQuestion.type === 'MCQ') {
            body.answerIds = selectedAnswers;
        } else if (currentQuestion.type === 'TEXT') {
            body.freeText = freeTextAnswer;
        } else if (currentQuestion.type === 'MULTI_TEXT') {
            body.freeText = multiTextAnswers.join('||');
        }

        try {
            const res = await fetch(`/api/quiz/${quizId}/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            setFeedback({ isCorrect: data.isCorrect, correctAnswerText: data.correctAnswerText });
            earnedPointsRef.current += data.earnedPoints ?? 0;

            const userAnswerText = buildUserAnswerText(currentQuestion, selectedAnswer, selectedAnswers, freeTextAnswer, multiTextAnswers);

            const qr: QuestionResult = {
                questionId: currentQuestion.id,
                questionText: currentQuestion.text,
                type: currentQuestion.type,
                points: currentQuestion.points,
                earnedPoints: data.earnedPoints ?? 0,
                isCorrect: data.isCorrect,
                userAnswerText,
                correctAnswerText: data.correctAnswerText ?? '',
                strictOrder: currentQuestion.strictOrder,
            };
            questionResultsRef.current = [
                ...questionResultsRef.current.filter(r => r.questionId !== currentQuestion.id),
                qr,
            ];

            const ua: UserAnswer = {
                questionId: currentQuestion.id,
                answerIds: selectedAnswers.length > 0 ? selectedAnswers : (selectedAnswer ?? ''),
            };
            if (currentQuestion.type === 'TEXT') ua.text = freeTextAnswer;
            if (currentQuestion.type === 'MULTI_TEXT') ua.text = multiTextAnswers.join('||');
            answersRef.current = [
                ...answersRef.current.filter(a => a.questionId !== currentQuestion.id),
                ua,
            ];
        } catch {
            setFeedback({ isCorrect: false });
        } finally {
            setIsValidating(false);
        }
    }, [currentQuestion, selectedAnswer, selectedAnswers, freeTextAnswer, multiTextAnswers, quizId]);

    // Next question
    const handleNextQuestion = useCallback(() => {
        if (isLastQuestion) {
            submitQuiz(answersRef.current);
            return;
        }
        setFeedback(null);
        setSelectedAnswer(null);
        setSelectedAnswers([]);
        setFreeTextAnswer('');
        setMultiTextAnswers(['']);
        setCurrentQuestionIndex(prev => prev + 1);
    }, [isLastQuestion, submitQuiz]);

    return {
        quizData, isLoadingQuiz,
        currentQuestion, currentQuestionIndex, isLastQuestion, progress,
        selectedAnswer, setSelectedAnswer,
        selectedAnswers, toggleAnswer,
        freeTextAnswer, setFreeTextAnswer,
        multiTextAnswers, setMultiTextAnswers,
        feedback, showFeedback: feedback !== null,
        isValidating, isSubmitting, canProceed,
        handleValidateAnswer, handleNextQuestion,
        session, status,
        timerEndsAt,
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildUserAnswerText(
    question: Question,
    selectedAnswer: string | null,
    selectedAnswers: string[],
    freeTextAnswer: string,
    multiTextAnswers: string[],
): string {
    if (question.type === 'TEXT') return freeTextAnswer;
    if (question.type === 'MULTI_TEXT') return multiTextAnswers.filter(Boolean).join(', ');
    if (question.type === 'MCQ') {
        return question.answers?.filter(a => selectedAnswers.includes(a.id)).map(a => a.text).join(', ') ?? '';
    }
    return question.answers?.find(a => a.id === selectedAnswer)?.text ?? '';
}

export { normalizeAnswer };
