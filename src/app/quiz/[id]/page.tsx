// src/app/quiz/[id]/page.tsx
'use client';
import LoadingSpinner from '@/components/LoadingSpinner';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { notFound } from 'next/navigation';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { getQuizSocket } from '@/lib/socket';
import { QuestionResult } from '@/components/Quiz/QuizResults';

interface Answer {
    id: string;
    text?: string; // plus jamais garanti côté client
}

interface Question {
    id: string;
    text: string;
    type: 'TRUE_FALSE' | 'MCQ' | 'TEXT' | 'MULTI_TEXT';
    points: number;
    strictOrder?: boolean;
    answers?: Answer[]; // texte présent pour TRUE_FALSE/MCQ, absent pour TEXT/MULTI_TEXT
}

interface Quiz {
    id: string;
    title: string;
    description: string;
    creatorId: string;
    randomizeQuestions: boolean;
    creator: { id: string; name: string };
    questions: Question[];
}

interface UserAnswer {
    questionId: string;
    answerId?: string;
    answerIds?: string[];
    freeText?: string;
}

interface FeedbackState {
    isCorrect: boolean;
    earnedPoints: number;
    correctAnswerText: string;
    // Pour MULTI_TEXT : les bonnes réponses à afficher dans le feedback
    correctAnswers?: string[];
}

export default function QuizPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const lobbyCode = searchParams.get('lobby');
    const { data: session, status } = useSession();
    const quizId = params?.id as string;

    const [soloLobbyId] = useState(() => crypto.randomUUID());
    const effectiveLobbyId = lobbyCode ?? soloLobbyId;

    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
    const userAnswersRef = useRef<UserAnswer[]>([]);

    const [selectedAnswer, setSelectedAnswer] = useState('');
    const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
    const [freeTextAnswer, setFreeTextAnswer] = useState('');
    const [multiTextAnswers, setMultiTextAnswers] = useState<string[]>([]);

    const selectedAnswerRef = useRef('');
    const selectedAnswersRef = useRef<string[]>([]);
    const freeTextAnswerRef = useRef('');
    const multiTextAnswersRef = useRef<string[]>([]);
    const currentQuestionIndexRef = useRef(0);

    const [showFeedback, setShowFeedback] = useState(false);
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [quizNotAllowed, setQuizNotAllowed] = useState(false);
    const [quizNotFound, setQuizNotFound] = useState(false);

    const socket = useMemo(() => getQuizSocket(), []);

    const [timeMode, setTimeMode] = useState<'quiz:per_question' | 'total' | 'none' | null>(null);
    const [timePerQuestion, setTimePerQuestion] = useState(0);
    const timePerQuestionRef = useRef(0);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const timerStartedRef = useRef(false);

    const quizRef = useRef<Quiz | null>(null);

    useEffect(() => { selectedAnswerRef.current = selectedAnswer; }, [selectedAnswer]);
    useEffect(() => { selectedAnswersRef.current = selectedAnswers; }, [selectedAnswers]);
    useEffect(() => { freeTextAnswerRef.current = freeTextAnswer; }, [freeTextAnswer]);
    useEffect(() => { multiTextAnswersRef.current = multiTextAnswers; }, [multiTextAnswers]);
    useEffect(() => { currentQuestionIndexRef.current = currentQuestionIndex; }, [currentQuestionIndex]);
    useEffect(() => { quizRef.current = quiz; }, [quiz]);

    const setUserAnswersAndRef = (answers: UserAnswer[]) => {
        userAnswersRef.current = answers;
        setUserAnswers(answers);
    };

    useEffect(() => {
        if (!quizId || status === 'loading') return;
        fetchQuiz();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quizId, status]);

    useEffect(() => {
        if (!quizId || !session?.user?.id) return;
        socket?.emit('quiz:join', {
            lobbyId: effectiveLobbyId,
            quizId,
            userId: session.user.id,
            username: session.user.username ?? session.user.email ?? 'User',
        });
    }, [effectiveLobbyId, quizId, session?.user?.id, socket]);

    useEffect(() => {
        if (!socket) return;
        socket.on('notFound', () => setQuizNotFound(true));
        socket.on('quiz:notAllowed', () => setQuizNotAllowed(true));
        return () => {
            socket.off('notFound');
            socket.off('quiz:notAllowed');
        };
    }, [socket]);

    useEffect(() => {
        if (!socket) return;
        const handler = ({ timeMode: tm, timePerQuestion: tpq }: { timeMode: string; timePerQuestion: number }) => {
            const mode = tm as 'quiz:per_question' | 'total' | 'none';
            setTimeMode(mode);
            setTimePerQuestion(tpq);
            timePerQuestionRef.current = tpq;
        };
        socket.on('quiz:sessionInfo', handler);
        return () => { socket.off('quiz:sessionInfo', handler); };
    }, [socket]);

    const buildCurrentAnswer = useCallback((q: Question): UserAnswer => {
        const answer: UserAnswer = { questionId: q.id };
        if (q.type === 'TEXT') answer.freeText = freeTextAnswerRef.current.trim();
        else if (q.type === 'MULTI_TEXT') answer.freeText = multiTextAnswersRef.current.join('||');
        else if (q.type === 'MCQ') answer.answerIds = [...selectedAnswersRef.current];
        else answer.answerId = selectedAnswerRef.current;
        return answer;
    }, []);

    const submitQuiz = useCallback((answers: UserAnswer[]) => {
        const currentQuiz = quizRef.current;
        if (!currentQuiz) return;
        setIsSubmitting(true);

        const totalPoints = currentQuiz.questions.reduce((sum, q) => sum + q.points, 0);
        const resultKey = `quiz_result_${quizId}`;

        // Payload provisoire
        sessionStorage.setItem(resultKey, JSON.stringify({
            score: 0,
            totalPoints,
            quizTitle: currentQuiz.title,
            isOwnQuiz: currentQuiz.creatorId === session?.user?.id,
            questionResults: [],
            lobbyCode: lobbyCode ?? null,
        }));

        if (session?.user?.id) {
            // Enregistrer le listener AVANT d'émettre et AVANT de naviguer
            // Le singleton socket survit à la navigation
            socket?.once('quiz:result', ({ score, totalPoints: tp, questionResults }) => {
                sessionStorage.setItem(resultKey, JSON.stringify({
                    score,
                    totalPoints: tp,
                    quizTitle: currentQuiz.title,
                    isOwnQuiz: currentQuiz.creatorId === session?.user?.id,
                    questionResults,
                    lobbyCode: lobbyCode ?? null,
                }));
                // Forcer un re-read du sessionStorage dans useQuizResult
                window.dispatchEvent(new CustomEvent('quiz:result:ready', { detail: { quizId } }));
            });

            socket?.emit('quiz:playerFinished', {
                answers,
                lobbyId: effectiveLobbyId,
                userId: session.user.id,
                username: session.user.username ?? session.user.email ?? 'User',
                quizId,
            });
        }

        router.push(`/quiz/${quizId}/result${lobbyCode ? `?lobby=${lobbyCode}` : ''}`);
    }, [session?.user?.id, lobbyCode, socket, quizId, router, effectiveLobbyId]);

    const handleNextQuestionFromTimer = useCallback(() => {
        const currentQuiz = quizRef.current;
        if (!currentQuiz) return;

        const idx = currentQuestionIndexRef.current;
        const q = currentQuiz.questions[idx];
        const answer = buildCurrentAnswer(q);
        const newAnswers = [...userAnswersRef.current, answer];
        setUserAnswersAndRef(newAnswers);

        if (idx === currentQuiz.questions.length - 1) {
            submitQuiz(newAnswers);
        } else {
            const nextIndex = idx + 1;
            setCurrentQuestionIndex(nextIndex);
            setSelectedAnswer('');
            setSelectedAnswers([]);
            setFreeTextAnswer('');
            setMultiTextAnswers([]);
            setShowFeedback(false);
            setFeedback(null);

            if (session?.user?.id) {
                socket?.emit('quiz:playerProgress', {
                    currentQuestion: nextIndex + 1,
                    totalQuestions: currentQuiz.questions.length,
                });
            }
        }
    }, [buildCurrentAnswer, submitQuiz, session?.user?.id, socket]);

    useEffect(() => {
        if (!timeMode || timeMode === 'none' || !quiz || !session?.user?.id) return;
        if (timeMode === 'total' && timerStartedRef.current) return;
        if (timeMode === 'total') timerStartedRef.current = true;

        const duration = timePerQuestionRef.current;
        if (!duration) return;
        setTimeLeft(duration);

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev === null || prev <= 1) { clearInterval(interval); return 0; }
                return prev - 1;
            });
        }, 1000);

        const timeout = setTimeout(() => {
            handleNextQuestionFromTimer();
        }, duration * 1000);

        return () => { clearInterval(interval); clearTimeout(timeout); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentQuestionIndex, quiz?.id, timeMode, session?.user?.id]);

    const fetchQuiz = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`/api/quiz/${quizId}`);
            if (res.status === 403) { setError("Vous n'avez pas accès à ce quiz privé"); return; }
            if (!res.ok) throw new Error('Erreur lors du chargement du quiz');
            const data = await res.json();
            if (data.randomizeQuestions) {
                data.questions = [...data.questions].sort(() => Math.random() - 0.5);
            }
            setQuiz(data);

            if (session?.user?.id) {
                socket?.emit('quiz:playerProgress', {
                    currentQuestion: 1,
                    totalQuestions: data.questions.length,
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerSelect = (id: string) => { if (!showFeedback) setSelectedAnswer(id); };
    const handleMultipleAnswerToggle = (id: string) => {
        if (showFeedback) return;
        setSelectedAnswers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // Validation côté serveur — plus de lecture de isCorrect en local
    const handleValidateAnswer = async () => {
        if (!quiz || isValidating) return;
        const q = quiz.questions[currentQuestionIndex];

        setIsValidating(true);
        try {
            const body: Record<string, unknown> = { questionId: q.id };
            if (q.type === 'TEXT') body.freeText = freeTextAnswer.trim();
            else if (q.type === 'MULTI_TEXT') body.freeText = multiTextAnswers.join('||');
            else if (q.type === 'MCQ') body.answerIds = selectedAnswers;
            else body.answerId = selectedAnswer;

            const res = await fetch(`/api/quiz/${quizId}/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error('Erreur lors de la vérification');
            const { isCorrect, earnedPoints, correctAnswerText } = await res.json();

            setFeedback({
                isCorrect,
                earnedPoints,
                correctAnswerText,
                correctAnswers: q.type === 'MULTI_TEXT'
                    ? correctAnswerText.split(', ')
                    : undefined,
            });
            setShowFeedback(true);
        } catch {
            // En cas d'erreur réseau, on affiche le feedback sans correction
            setFeedback({ isCorrect: false, earnedPoints: 0, correctAnswerText: '' });
            setShowFeedback(true);
        } finally {
            setIsValidating(false);
        }
    };

    const handleNextQuestion = () => {
        if (!quiz) return;
        const q = quiz.questions[currentQuestionIndex];
        const answer: UserAnswer = { questionId: q.id };
        if (q.type === 'TEXT') answer.freeText = freeTextAnswer.trim();
        else if (q.type === 'MULTI_TEXT') answer.freeText = multiTextAnswers.join('||');
        else if (q.type === 'MCQ') answer.answerIds = [...selectedAnswers];
        else answer.answerId = selectedAnswer;

        const newAnswers = [...userAnswers, answer];
        setUserAnswersAndRef(newAnswers);

        if (currentQuestionIndex === quiz.questions.length - 1) {
            submitQuiz(newAnswers);
        } else {
            const nextIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIndex);
            setSelectedAnswer('');
            setSelectedAnswers([]);
            setFreeTextAnswer('');
            setMultiTextAnswers([]);
            setShowFeedback(false);
            setFeedback(null);

            if (session?.user?.id) {
                socket?.emit('quiz:playerProgress', {
                    currentQuestion: nextIndex + 1,
                    totalQuestions: quiz.questions.length,
                });
            }
        }
    };

    // ─── Loading ──────────────────────────────────────────────────────────────

    if (status === 'loading' || loading) {
        return <LoadingSpinner message={status === 'loading' ? "Vérification de l'authentification..." : 'Chargement du quiz...'} />;
    }

    if (quizNotFound) notFound();

    if (quizNotAllowed) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-10 flex flex-col items-center gap-4 text-center max-w-sm w-full">
                    <div className="text-4xl">📝</div>
                    <h1 className="text-lg font-bold">Quiz en cours</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Une partie de quiz est en cours. Vous n&apos;en faites pas partie.</p>
                    {lobbyCode
                        ? <button onClick={() => router.push(`/lobby/create/${lobbyCode}`)} className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">Retour au lobby</button>
                        : <button onClick={() => router.push('/')} className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">Retour à l&apos;accueil</button>
                    }
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
                <header className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center gap-4">
                    <div className="w-48 shrink-0 flex items-center gap-2">
                        <span>📝</span>
                        <span className="font-semibold truncate text-gray-900 dark:text-white">Quiz</span>
                    </div>
                    <div className="flex-1" />
                    <div className="w-48 shrink-0" />
                </header>
                <main className="flex-1 overflow-auto p-4 flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center max-w-md w-full">
                        <div className="text-red-500 text-5xl mb-4">⚠️</div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Erreur</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
                        <Link href="/" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block">
                            Retour à l&apos;accueil
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    if (!quiz) return null;

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
    const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

    const canProceed =
        currentQuestion.type === 'TEXT' ? freeTextAnswer.trim().length > 0
            : currentQuestion.type === 'MULTI_TEXT' ? multiTextAnswers.length === (currentQuestion.answers?.length ?? 0) && multiTextAnswers.every(t => (t ?? '').trim().length > 0)
                : currentQuestion.type === 'MCQ' ? selectedAnswers.length > 0
                    : selectedAnswer !== '';

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">

            <header className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center gap-4">
                <div className="w-48 shrink-0 flex items-center gap-2 min-w-0">
                    <span className="shrink-0">📝</span>
                    <span className="font-semibold truncate text-gray-900 dark:text-white text-sm">{quiz.title}</span>
                </div>
                <div className="flex-1 flex justify-center items-center gap-2.5">
                    <div className="w-40 sm:w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-2 shrink-0">
                        <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap shrink-0">
                        {currentQuestionIndex + 1} / {quiz.questions.length}
                    </span>
                </div>
                <div className="w-48 shrink-0 flex justify-end items-center">
                    <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full whitespace-nowrap">
                        {currentQuestion.points} pt{currentQuestion.points > 1 ? 's' : ''}
                    </span>
                </div>
            </header>

            <main className="flex-1 overflow-auto flex flex-col items-center justify-center p-4 py-8">
                <div className="max-w-2xl w-full flex flex-col gap-4">

                    {status === 'unauthenticated' && (
                        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 rounded-xl px-4 py-3">
                            <span className="text-lg shrink-0">🔒</span>
                            <p className="text-sm">
                                Vos scores ne sont enregistrés que lorsque vous êtes connecté.{' '}
                                <Link href={`/login?callbackUrl=${encodeURIComponent(`/quiz/${quizId}`)}`} className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-200 transition-colors">
                                    Se connecter
                                </Link>
                            </p>
                        </div>
                    )}

                    {timeMode && timeMode !== 'none' && timeLeft !== null && timePerQuestion > 0 && (
                        <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className={`h-1.5 rounded-full transition-all duration-1000 ${timeLeft <= 10 ? 'bg-red-500' : 'bg-orange-400'}`}
                                    style={{ width: `${(timeLeft / timePerQuestion) * 100}%` }}
                                />
                            </div>
                            <span className={`text-sm font-semibold tabular-nums shrink-0 ${timeLeft <= 10 ? 'text-red-500 dark:text-red-400' : 'text-orange-500 dark:text-orange-400'}`}>
                                {timeLeft >= 60 ? `${Math.floor(timeLeft / 60)}m${timeLeft % 60}s` : `${timeLeft}s`}
                            </span>
                        </div>
                    )}

                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">{currentQuestion.text}</h2>

                        {/* TRUE_FALSE */}
                        {currentQuestion.type === 'TRUE_FALSE' && currentQuestion.answers && (
                            <div className="space-y-3">
                                {currentQuestion.answers.map((answer) => {
                                    const isSelected = selectedAnswer === answer.id;
                                    // feedback.correctAnswerText contient le texte de la bonne réponse
                                    const showCorrect = showFeedback && feedback?.correctAnswerText === answer.text;
                                    const showWrong = showFeedback && isSelected && feedback?.correctAnswerText !== answer.text;
                                    return (
                                        <button key={answer.id} onClick={() => handleAnswerSelect(answer.id)} disabled={showFeedback}
                                            className={`w-full p-4 rounded-lg border-2 transition-all text-left
                                                ${showCorrect
                                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600'
                                                    : showWrong
                                                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                                                        : isSelected
                                                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                                                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                                                }
                                                ${showFeedback ? 'cursor-not-allowed' : ''}`}>
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-gray-800 dark:text-gray-200">{answer.text}</span>
                                                {showCorrect && <span className="text-green-600 dark:text-green-400 text-xl">✓</span>}
                                                {showWrong && <span className="text-red-600 dark:text-red-400 text-xl">✗</span>}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* MCQ */}
                        {currentQuestion.type === 'MCQ' && currentQuestion.answers && (
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 italic">💡 Plusieurs réponses peuvent être correctes - Sélectionnez toutes les bonnes réponses</p>
                                <div className="space-y-3">
                                    {currentQuestion.answers.map((answer) => {
                                        const isSelected = selectedAnswers.includes(answer.id);
                                        const correctTexts = feedback?.correctAnswerText?.split(', ') ?? [];
                                        const showCorrect = showFeedback && correctTexts.includes(answer.text ?? '');
                                        const showWrong = showFeedback && isSelected && !correctTexts.includes(answer.text ?? '');
                                        return (
                                            <label key={answer.id} className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-3
                                                ${showCorrect
                                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600'
                                                    : showWrong
                                                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                                                        : isSelected
                                                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                                                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                                                }
                                                ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                                <input type="checkbox" className="h-5 w-5 accent-blue-600" checked={isSelected} onChange={() => handleMultipleAnswerToggle(answer.id)} disabled={showFeedback} />
                                                <span className="font-medium text-gray-800 dark:text-gray-200 flex-1">{answer.text}</span>
                                                {showCorrect && <span className="text-green-600 dark:text-green-400 text-xl">✓</span>}
                                                {showWrong && <span className="text-red-600 dark:text-red-400 text-xl">✗</span>}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* TEXT */}
                        {currentQuestion.type === 'TEXT' && (
                            <div>
                                <textarea
                                    value={freeTextAnswer}
                                    onChange={e => setFreeTextAnswer(e.target.value)}
                                    placeholder="Saisissez votre réponse..."
                                    className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-blue-600 dark:focus:border-blue-500 focus:outline-none min-h-32 resize-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
                                    disabled={showFeedback}
                                />
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Cette question vaut {currentQuestion.points} points</p>
                                {showFeedback && feedback && (
                                    <div>
                                        <div className={`mt-4 p-4 rounded-lg border-2 ${feedback.isCorrect
                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-600'
                                            : 'bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-600'}`}>
                                            <p className={`font-semibold mb-2 ${feedback.isCorrect ? 'text-green-900 dark:text-green-300' : 'text-red-900 dark:text-red-300'}`}>
                                                {feedback.isCorrect ? '✓ Bonne réponse !' : '✗ Réponse incorrecte'}
                                            </p>
                                            <p className={`text-sm ${feedback.isCorrect ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'}`}>
                                                Votre réponse : <span className="font-medium">{freeTextAnswer.trim()}</span>
                                            </p>
                                        </div>
                                        {!feedback.isCorrect && feedback.correctAnswerText && (
                                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 dark:border-blue-600 rounded-lg">
                                                <p className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Réponse attendue :</p>
                                                <p className="text-blue-800 dark:text-blue-400 font-medium">{feedback.correctAnswerText}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* MULTI_TEXT */}
                        {currentQuestion.type === 'MULTI_TEXT' && (
                            <div className="space-y-3">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 italic">
                                    {currentQuestion.strictOrder ? '💡 Remplissez chaque champ dans le bon ordre' : "💡 Remplissez chaque champ avec une bonne réponse (l'ordre n'a pas d'importance)"}
                                </p>

                                {/* Inputs toujours visibles, désactivés après validation */}
                                {currentQuestion.answers?.map((_, i) => (
                                    <input
                                        key={i}
                                        value={multiTextAnswers[i] || ''}
                                        onChange={e => { const u = [...multiTextAnswers]; u[i] = e.target.value; setMultiTextAnswers(u); }}
                                        placeholder={`Réponse ${i + 1}`}
                                        disabled={showFeedback}
                                        className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-blue-600 dark:focus:border-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-60"
                                    />
                                ))}

                                {/* Réponses attendues affichées EN DESSOUS après validation */}
                                {showFeedback && feedback && (
                                    <div className="border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 mt-2">
                                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Réponses attendues :</p>
                                        <div className="space-y-1">
                                            {(feedback.correctAnswers ?? []).map((correctText, i) => {
                                                const isGood = currentQuestion.strictOrder
                                                    ? (multiTextAnswers[i] ?? '').trim().toLowerCase() === correctText.trim().toLowerCase()
                                                    : multiTextAnswers.some(u => (u ?? '').trim().toLowerCase() === correctText.trim().toLowerCase());
                                                return (
                                                    <div key={i} className={`text-sm px-3 py-1.5 rounded-lg border font-medium
                                ${isGood
                                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300'
                                                            : 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'}`}>
                                                        {isGood ? '✓' : '•'} {correctText}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Feedback banner (TRUE_FALSE / MCQ) */}
                    {showFeedback && feedback && currentQuestion.type !== 'TEXT' && currentQuestion.type !== 'MULTI_TEXT' && (
                        <div className={`p-4 rounded-xl border ${feedback.isCorrect
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-700'
                            : 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-700'}`}>
                            <p className={`font-semibold ${feedback.isCorrect ? 'text-green-900 dark:text-green-300' : 'text-red-900 dark:text-red-300'}`}>
                                {feedback.isCorrect ? '✓ Bonne réponse !' : '✗ Réponse incorrecte'}
                            </p>
                        </div>
                    )}

                    <div className="flex justify-center gap-4">
                        {!showFeedback ? (
                            <button
                                onClick={handleValidateAnswer}
                                disabled={!canProceed || isValidating}
                                className={`px-8 py-3 rounded-lg font-medium transition-all ${canProceed && !isValidating
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'}`}>
                                {isValidating ? 'Vérification...' : 'Valider ma réponse'}
                            </button>
                        ) : (
                            <button
                                onClick={handleNextQuestion}
                                disabled={isSubmitting}
                                className={`px-8 py-3 rounded-lg font-medium transition-all ${isSubmitting
                                    ? 'bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                                {isSubmitting ? 'Envoi en cours...' : isLastQuestion ? 'Voir mes résultats 🎯' : 'Question suivante →'}
                            </button>
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
}
