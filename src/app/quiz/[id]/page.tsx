// src/app/quiz/[id]/page.tsx
'use client';
import LoadingSpinner from '@/components/LoadingSpinner';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { getQuizSocket } from '@/lib/socket';
import { QuestionResult } from '@/components/QuizResults';

interface Answer {
    id: string;
    text: string;
    isCorrect?: boolean;
}

interface Question {
    id: string;
    text: string;
    type: 'TRUE_FALSE' | 'MCQ' | 'TEXT' | 'MULTI_TEXT';
    points: number;
    strictOrder?: boolean;
    answers?: Answer[];
    correctAnswerText?: string;
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

export default function QuizPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const lobbyCode = searchParams.get('lobby');
    const { data: session, status } = useSession();
    const quizId = params?.id as string;

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
    const [isCorrect, setIsCorrect] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const socket = useMemo(() => getQuizSocket(), []);

    const [timeMode, setTimeMode] = useState<'per_question' | 'total' | 'none' | null>(null);
    const [timePerQuestion, setTimePerQuestion] = useState(15);
    const timePerQuestionRef = useRef(15);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const timerStartedRef = useRef(false);

    const quizRef = useRef<Quiz | null>(null);

    useEffect(() => { selectedAnswerRef.current = selectedAnswer; }, [selectedAnswer]);
    useEffect(() => { selectedAnswersRef.current = selectedAnswers; }, [selectedAnswers]);
    useEffect(() => { freeTextAnswerRef.current = freeTextAnswer; }, [freeTextAnswer]);
    useEffect(() => { multiTextAnswersRef.current = multiTextAnswers; }, [multiTextAnswers]);
    useEffect(() => { currentQuestionIndexRef.current = currentQuestionIndex; }, [currentQuestionIndex]);
    useEffect(() => { quizRef.current = quiz; }, [quiz]);

    useEffect(() => {
        if (!lobbyCode) return;
        const mode = sessionStorage.getItem(`lobby_timeMode_${lobbyCode}`) as 'per_question' | 'total' | 'none' | null;
        const tpq = Number(sessionStorage.getItem(`lobby_timePerQuestion_${lobbyCode}`)) || 15;
        timePerQuestionRef.current = tpq;
        setTimeMode(mode);
        setTimePerQuestion(tpq);
    }, [lobbyCode]);

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
        if (!lobbyCode || !quizId || !session?.user?.id || !timeMode) return;
        socket?.emit('quiz:join', {
            lobbyId: lobbyCode,
            quizId,
            userId: session.user.id,
            username: session.user.username ?? session.user.email ?? 'User',
            timeMode,
            timePerQuestion: timePerQuestionRef.current,
        });
    }, [lobbyCode, quizId, session?.user?.id, timeMode, socket]);

    const checkMultiText = (userTexts: string[], correctTexts: string[], strictOrder: boolean) => {
        const u = userTexts.map(t => t.trim().toLowerCase());
        const c = correctTexts.map(t => t.trim().toLowerCase());
        if (u.length !== c.length) return false;
        return strictOrder ? u.every((t, i) => t === c[i]) : u.every(t => c.includes(t));
    };

    const buildCurrentAnswer = useCallback((q: Question): UserAnswer => {
        const answer: UserAnswer = { questionId: q.id };
        if (q.type === 'TEXT') answer.freeText = freeTextAnswerRef.current.trim();
        else if (q.type === 'MULTI_TEXT') answer.freeText = multiTextAnswersRef.current.join('||');
        else if (q.type === 'MCQ') answer.answerIds = [...selectedAnswersRef.current];
        else answer.answerId = selectedAnswerRef.current;
        return answer;
    }, []);

    const submitQuiz = useCallback(async (answers: UserAnswer[]) => {
        const currentQuiz = quizRef.current;
        if (!currentQuiz) return;

        try {
            setIsSubmitting(true);
            setError(null);

            const res = await fetch(`/api/quiz/${quizId}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers }),
            });
            if (!res.ok) throw new Error('Erreur lors de la soumission du quiz');
            const result = await res.json();

            const questionResults: QuestionResult[] = currentQuiz.questions.map((q) => {
                const userAnswer = answers.find(a => a.questionId === q.id);
                let userAnswerText = '', correctAnswerText = '', isCorrect = false, earnedPoints = 0;

                if (q.type === 'TEXT') {
                    userAnswerText = userAnswer?.freeText || '';
                    correctAnswerText = q.answers?.[0]?.text || q.correctAnswerText || '';
                    isCorrect = userAnswerText.toLowerCase() === correctAnswerText.toLowerCase();
                    earnedPoints = isCorrect ? q.points : 0;
                } else if (q.type === 'MULTI_TEXT') {
                    const userTexts = userAnswer?.freeText?.split('||') ?? [];
                    const correctTexts = q.answers?.map(a => a.text) || [];
                    userAnswerText = userTexts.join(', ');
                    correctAnswerText = correctTexts.join(', ');
                    isCorrect = checkMultiText(userTexts, correctTexts, q.strictOrder ?? false);
                    const correctCount = userTexts.filter(t => correctTexts.some(c => c.trim().toLowerCase() === t.trim().toLowerCase())).length;
                    earnedPoints = Math.round((correctCount / correctTexts.length) * q.points);
                } else if (q.type === 'TRUE_FALSE') {
                    const selected = q.answers?.find(a => a.id === userAnswer?.answerId);
                    userAnswerText = selected?.text || '';
                    correctAnswerText = q.answers?.find(a => a.isCorrect)?.text || '';
                    isCorrect = selected?.isCorrect === true;
                    earnedPoints = isCorrect ? q.points : 0;
                } else if (q.type === 'MCQ') {
                    const selectedIds = userAnswer?.answerIds || [];
                    const correctIds = q.answers?.filter(a => a.isCorrect).map(a => a.id) || [];
                    userAnswerText = selectedIds.map(id => q.answers?.find(a => a.id === id)?.text || '').filter(Boolean).join(', ');
                    correctAnswerText = q.answers?.filter(a => a.isCorrect).map(a => a.text).join(', ') || '';
                    isCorrect = selectedIds.length === correctIds.length && selectedIds.every(id => correctIds.includes(id));
                    earnedPoints = isCorrect ? q.points : 0;
                }

                return {
                    questionId: q.id,
                    questionText: q.text,
                    type: q.type,
                    points: q.points,
                    earnedPoints,
                    strictOrder: q.strictOrder,
                    isCorrect,
                    userAnswerText,
                    correctAnswerText,
                };
            });

            const payload = {
                score: result.score,
                totalPoints: result.totalPoints,
                quizTitle: currentQuiz.title,
                isOwnQuiz: currentQuiz.creatorId === session?.user?.id,
                questionResults,
                lobbyCode: lobbyCode ?? null,
            };
            sessionStorage.setItem(`quiz_result_${quizId}`, JSON.stringify(payload));

            if (lobbyCode) {
                socket?.emit('quiz:playerFinished', { totalScore: result.score, questionResults });
            }

            router.push(`/quiz/${quizId}/result${lobbyCode ? `?lobby=${lobbyCode}` : ''}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setIsSubmitting(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quizId, lobbyCode, session?.user?.id, socket, router]);

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
            setIsCorrect(false);

            if (lobbyCode) {
                socket?.emit('quiz:playerProgress', {
                    currentQuestion: nextIndex + 1,
                    totalQuestions: currentQuiz.questions.length,
                });
            }
        }
    }, [buildCurrentAnswer, submitQuiz]);

    useEffect(() => {
        if (!lobbyCode || !timeMode || timeMode === 'none' || !quiz) return;
        if (timeMode === 'total' && timerStartedRef.current) return;
        if (timeMode === 'total') timerStartedRef.current = true;

        const duration = timePerQuestionRef.current;
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
    }, [currentQuestionIndex, quiz?.id, timeMode, lobbyCode]);

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

            if (lobbyCode) {
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

    const handleValidateAnswer = () => {
        if (!quiz) return;
        const q = quiz.questions[currentQuestionIndex];
        let correct = false;
        if (q.type === 'TRUE_FALSE') {
            correct = q.answers?.find(a => a.id === selectedAnswer)?.isCorrect === true;
        } else if (q.type === 'MCQ') {
            const correctIds = q.answers?.filter(a => a.isCorrect).map(a => a.id) || [];
            correct = selectedAnswers.length === correctIds.length && selectedAnswers.every(id => correctIds.includes(id));
        } else if (q.type === 'TEXT') {
            correct = freeTextAnswer.trim().toLowerCase() === (q.answers?.[0]?.text || q.correctAnswerText || '').trim().toLowerCase();
        } else if (q.type === 'MULTI_TEXT') {
            correct = checkMultiText(multiTextAnswers, q.answers?.map(a => a.text) || [], q.strictOrder ?? false);
        }
        setIsCorrect(correct);
        setShowFeedback(true);
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
            setIsCorrect(false);

            if (lobbyCode) {
                socket?.emit('quiz:playerProgress', {
                    currentQuestion: nextIndex + 1,
                    totalQuestions: quiz.questions.length,
                });
            }
        }
    };

    // ─── Loading / Error ──────────────────────────────────────────────────────

    if (status === 'loading' || loading) {
        return <LoadingSpinner message={status === 'loading' ? "Vérification de l'authentification..." : 'Chargement du quiz...'} />;
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
                <div className="max-w-2xl mx-auto px-4 py-12">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 text-center">
                        <div className="text-red-500 text-6xl mb-4">⚠️</div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Erreur</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
                        <Link href="/" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block">
                            Retour à l&apos;accueil
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!quiz) return null;

    // ─── Question ─────────────────────────────────────────────────────────────

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
    const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

    const canProceed =
        currentQuestion.type === 'TEXT' ? freeTextAnswer.trim().length > 0
            : currentQuestion.type === 'MULTI_TEXT' ? multiTextAnswers.length === (currentQuestion.answers?.length ?? 0) && multiTextAnswers.every(t => t.trim().length > 0)
                : currentQuestion.type === 'MCQ' ? selectedAnswers.length > 0
                    : selectedAnswer !== '';

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900">
            <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

                {/* Quiz header */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">{quiz.title}</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{quiz.description}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">Par {quiz.creator.name}</p>
                </div>

                {status === 'unauthenticated' && (
                    <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 rounded-xl px-5 py-4 mb-6 shadow-sm">
                        <span className="text-xl shrink-0">🔒</span>
                        <p className="text-sm">
                            Vos scores ne sont enregistrés que lorsque vous êtes connecté.{' '}
                            <Link href={`/login?callbackUrl=${encodeURIComponent(`/quiz/${quizId}`)}`} className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-200 transition-colors">
                                Se connecter
                            </Link>
                        </p>
                    </div>
                )}

                {/* Progress + Timer */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Question {currentQuestionIndex + 1} sur {quiz.questions.length}</span>
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{currentQuestion.points} point{currentQuestion.points > 1 ? 's' : ''}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>

                    {lobbyCode && timeMode && timeMode !== 'none' && timeLeft !== null && (
                        <div className="mt-4">
                            <p className={`text-sm font-medium mb-1 ${timeLeft <= 10 ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                {timeMode === 'total'
                                    ? timeLeft >= 60 ? `⏱ Il vous reste ${Math.floor(timeLeft / 60)} min ${timeLeft % 60}s pour finir le quiz` : `⏱ Il vous reste ${timeLeft}s pour finir le quiz`
                                    : `⏱ Il vous reste ${timeLeft}s pour répondre`}
                            </p>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div className={`h-2 rounded-full transition-all duration-1000 ${timeLeft <= 10 ? 'bg-red-500' : 'bg-orange-400'}`} style={{ width: `${(timeLeft / timePerQuestion) * 100}%` }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Question card */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 mb-6">
                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-6">{currentQuestion.text}</h2>

                    {/* TRUE_FALSE */}
                    {currentQuestion.type === 'TRUE_FALSE' && currentQuestion.answers && (
                        <div className="space-y-3">
                            {currentQuestion.answers.map((answer) => {
                                const isSelected = selectedAnswer === answer.id;
                                const showCorrect = showFeedback && answer.isCorrect;
                                const showWrong = showFeedback && isSelected && !answer.isCorrect;
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
                                    const showCorrect = showFeedback && answer.isCorrect;
                                    const showWrong = showFeedback && isSelected && !answer.isCorrect;
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
                            {showFeedback && (
                                <div>
                                    <div className={`mt-4 p-4 rounded-lg border-2 ${isCorrect
                                        ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-600'
                                        : 'bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-600'}`}>
                                        <p className={`font-semibold mb-2 ${isCorrect ? 'text-green-900 dark:text-green-300' : 'text-red-900 dark:text-red-300'}`}>
                                            {isCorrect ? '✓ Bonne réponse !' : '✗ Réponse incorrecte'}
                                        </p>
                                        <p className={`text-sm ${isCorrect ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'}`}>
                                            Votre réponse : <span className="font-medium">{freeTextAnswer.trim()}</span>
                                        </p>
                                    </div>
                                    {!isCorrect && (
                                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 dark:border-blue-600 rounded-lg">
                                            <p className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Réponse attendue :</p>
                                            <p className="text-blue-800 dark:text-blue-400 font-medium">{currentQuestion.answers?.[0]?.text || currentQuestion.correctAnswerText || 'Non disponible'}</p>
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
                            {!showFeedback && currentQuestion.answers?.map((_, i) => (
                                <input
                                    key={i}
                                    value={multiTextAnswers[i] || ''}
                                    onChange={e => { const u = [...multiTextAnswers]; u[i] = e.target.value; setMultiTextAnswers(u); }}
                                    placeholder={`Réponse ${i + 1}`}
                                    className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-blue-600 dark:focus:border-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
                                />
                            ))}
                            {showFeedback && (
                                <div className="border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Réponses attendues :</p>
                                    <div className="space-y-1">
                                        {currentQuestion.answers?.map((answer, i) => {
                                            const isGood = multiTextAnswers.some(u => u.trim().toLowerCase() === answer.text.trim().toLowerCase());
                                            return (
                                                <div key={i} className={`text-sm px-3 py-1.5 rounded-lg border font-medium
                                                    ${isGood
                                                        ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300'
                                                        : 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'}`}>
                                                    {isGood ? '✓' : '•'} {answer.text}
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
                {showFeedback && currentQuestion.type !== 'TEXT' && currentQuestion.type !== 'MULTI_TEXT' && (
                    <div className={`mb-6 p-4 rounded-lg border-2 ${isCorrect
                        ? 'bg-green-100 dark:bg-green-900/20 border-green-500 dark:border-green-600'
                        : 'bg-red-100 dark:bg-red-900/20 border-red-500 dark:border-red-600'}`}>
                        <p className={`font-semibold ${isCorrect ? 'text-green-900 dark:text-green-300' : 'text-red-900 dark:text-red-300'}`}>
                            {isCorrect ? '✓ Bonne réponse !' : '✗ Réponse incorrecte'}
                        </p>
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex justify-end gap-4">
                    {!showFeedback ? (
                        <button
                            onClick={handleValidateAnswer}
                            disabled={!canProceed}
                            className={`px-8 py-3 rounded-lg font-medium transition-all ${canProceed
                                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'}`}>
                            Valider ma réponse
                        </button>
                    ) : (
                        <button
                            onClick={handleNextQuestion}
                            disabled={isSubmitting}
                            className={`px-8 py-3 rounded-lg font-medium transition-all ${isSubmitting
                                ? 'bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'}`}>
                            {isSubmitting ? 'Envoi en cours...' : isLastQuestion ? 'Voir mes résultats 🎯' : 'Question suivante →'}
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
