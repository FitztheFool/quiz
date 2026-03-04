'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { plural } from '@/lib/utils';
import { getSocket } from '@/lib/socket';

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
    creator: {
        id: string;
        name: string;
    };
    questions: Question[];
}

interface UserAnswer {
    questionId: string;
    answerId?: string;
    answerIds?: string[];
    freeText?: string;
}

interface QuestionResult {
    questionId: string;
    questionText: string;
    type: 'TRUE_FALSE' | 'MCQ' | 'TEXT' | 'MULTI_TEXT';
    points: number;
    earnedPoints: number;
    isCorrect: boolean;
    userAnswerText: string;
    correctAnswerText: string;
    strictOrder?: boolean;
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
    // ✅ Ref pour accéder aux réponses actuelles depuis les closures (timers)
    const userAnswersRef = useRef<UserAnswer[]>([]);

    const [selectedAnswer, setSelectedAnswer] = useState<string>('');
    const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
    const [freeTextAnswer, setFreeTextAnswer] = useState('');
    const [multiTextAnswers, setMultiTextAnswers] = useState<string[]>([]);

    const [showFeedback, setShowFeedback] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [score, setScore] = useState<number | null>(null);
    const [totalPoints, setTotalPoints] = useState<number | null>(null);
    const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);

    const socket = useMemo(() => getSocket(), []);

    const [timeMode, setTimeMode] = useState<'per_question' | 'total' | 'none' | null>(null);
    const [timePerQuestion, setTimePerQuestion] = useState<number>(15);
    // ✅ Ref pour la valeur initiale du timer — ne déclenche pas de re-render ni de relance du useEffect
    const timePerQuestionRef = useRef<number>(15);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    // ✅ Empêche le timer total de se relancer si quiz change ou autre dep change
    const timerStartedRef = useRef(false);

    // ✅ Lecture sessionStorage côté client uniquement (après hydration)
    useEffect(() => {
        if (!lobbyCode) return;
        const mode = sessionStorage.getItem(`lobby_timeMode_${lobbyCode}`) as 'per_question' | 'total' | 'none' | null;
        const tpq = Number(sessionStorage.getItem(`lobby_timePerQuestion_${lobbyCode}`)) || 15;
        timePerQuestionRef.current = tpq;
        setTimeMode(mode);
        setTimePerQuestion(tpq);
    }, [lobbyCode]);

    // ✅ Helper pour mettre à jour userAnswers ET le ref en même temps
    const setUserAnswersAndRef = (answers: UserAnswer[]) => {
        userAnswersRef.current = answers;
        setUserAnswers(answers);
    };

    useEffect(() => {
        if (!quizId) return;
        if (status === 'loading') return;
        fetchQuiz();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quizId, status]);

    // ✅ Timer
    useEffect(() => {
        if (!lobbyCode || !timeMode || timeMode === 'none') return;
        if (!quiz) return;

        // ✅ Pour le mode total : ne lancer qu'une seule fois
        if (timeMode === 'total' && timerStartedRef.current) return;
        if (timeMode === 'total') timerStartedRef.current = true;

        const duration = timePerQuestionRef.current;
        setTimeLeft(duration);

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev === null || prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        const timeout = setTimeout(() => {
            if (timeMode === 'per_question') {
                handleNextQuestion();
            } else {
                // ✅ timeMode === 'total' : soumet avec userAnswersRef.current
                submitQuiz(userAnswersRef.current, (totalScore) => {
                    socket.emit('lobby:playerFinished', { totalScore });
                    router.push(`/lobby/${lobbyCode}/results`);
                });
            }
        }, duration * 1000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        timeMode === 'per_question' ? currentQuestionIndex : null,
        quiz?.id,
        timeMode,
    ]);

    const fetchQuiz = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`/api/quiz/${quizId}`);
            if (response.status === 403) {
                setError("Vous n'avez pas accès à ce quiz privé");
                return;
            }
            if (!response.ok) throw new Error('Erreur lors du chargement du quiz');
            const quizData = await response.json();
            if (quizData.randomizeQuestions) {
                quizData.questions = [...quizData.questions].sort(() => Math.random() - 0.5);
            }
            setQuiz(quizData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerSelect = (answerId: string) => {
        if (showFeedback) return;
        setSelectedAnswer(answerId);
    };

    const handleMultipleAnswerToggle = (answerId: string) => {
        if (showFeedback) return;
        setSelectedAnswers((prev) =>
            prev.includes(answerId) ? prev.filter((id) => id !== answerId) : [...prev, answerId]
        );
    };

    const checkMultiText = (userTexts: string[], correctTexts: string[], strictOrder: boolean): boolean => {
        const userNorm = userTexts.map(t => t.trim().toLowerCase());
        const correctNorm = correctTexts.map(t => t.trim().toLowerCase());
        if (userNorm.length !== correctNorm.length) return false;
        if (strictOrder) {
            return userNorm.every((t, i) => t === correctNorm[i]);
        } else {
            return userNorm.every(t => correctNorm.includes(t));
        }
    };

    const handleValidateAnswer = () => {
        if (!quiz) return;
        const currentQuestion = quiz.questions[currentQuestionIndex];
        let correct = false;

        if (currentQuestion.type === 'TRUE_FALSE') {
            const selectedAns = currentQuestion.answers?.find((a) => a.id === selectedAnswer);
            correct = selectedAns?.isCorrect === true;
        } else if (currentQuestion.type === 'MCQ') {
            const correctIds = currentQuestion.answers?.filter((a) => a.isCorrect).map((a) => a.id) || [];
            correct =
                selectedAnswers.length === correctIds.length &&
                selectedAnswers.every((id) => correctIds.includes(id));
        } else if (currentQuestion.type === 'TEXT') {
            const userAnswerTrimmed = freeTextAnswer.trim().toLowerCase();
            const correctAnswerText = currentQuestion.answers?.[0]?.text || currentQuestion.correctAnswerText || '';
            correct = userAnswerTrimmed === correctAnswerText.trim().toLowerCase();
        } else if (currentQuestion.type === 'MULTI_TEXT') {
            const correctTexts = currentQuestion.answers?.map(a => a.text) || [];
            correct = checkMultiText(multiTextAnswers, correctTexts, currentQuestion.strictOrder ?? false);
        }

        setIsCorrect(correct);
        setShowFeedback(true);
    };

    const handleNextQuestion = () => {
        if (!quiz) return;
        const currentQuestion = quiz.questions[currentQuestionIndex];
        const answer: UserAnswer = { questionId: currentQuestion.id };

        if (currentQuestion.type === 'TEXT') {
            answer.freeText = freeTextAnswer.trim();
        } else if (currentQuestion.type === 'MULTI_TEXT') {
            answer.freeText = multiTextAnswers.join('||');
        } else if (currentQuestion.type === 'MCQ') {
            answer.answerIds = [...selectedAnswers];
        } else {
            answer.answerId = selectedAnswer;
        }

        const newAnswers = [...userAnswers, answer];
        // ✅ Mise à jour synchronisée état + ref
        setUserAnswersAndRef(newAnswers);
        const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

        if (isLastQuestion) {
            submitQuiz(newAnswers, (totalScore) => {
                if (lobbyCode) {
                    socket.emit('lobby:playerFinished', { totalScore });
                    router.push(`/lobby/${lobbyCode}/results`);
                }
            });
        } else {
            setCurrentQuestionIndex((i) => i + 1);
            setSelectedAnswer('');
            setSelectedAnswers([]);
            setFreeTextAnswer('');
            setMultiTextAnswers([]);
            setShowFeedback(false);
            setIsCorrect(false);
        }
    };

    const submitQuiz = async (answers: UserAnswer[], onFinished?: (totalScore: number) => void) => {
        try {
            setIsSubmitting(true);
            setError(null);

            const response = await fetch(`/api/quiz/${quizId}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers }),
            });

            if (!response.ok) throw new Error('Erreur lors de la soumission du quiz');

            const result = await response.json();
            setScore(result.score);
            setTotalPoints(result.totalPoints);

            onFinished?.(result.score);

            if (quiz) {
                const results: QuestionResult[] = quiz.questions.map((q) => {
                    const userAnswer = answers.find((a) => a.questionId === q.id);
                    let userAnswerText = '';
                    let correctAnswerText = '';
                    let isCorrect = false;
                    let earnedPoints = 0;

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
                        const correctCount = userTexts.filter(t =>
                            correctTexts.some(c => c.trim().toLowerCase() === t.trim().toLowerCase())
                        ).length;
                        earnedPoints = Math.round((correctCount / correctTexts.length) * q.points);
                    } else if (q.type === 'TRUE_FALSE') {
                        const selected = q.answers?.find((a) => a.id === userAnswer?.answerId);
                        userAnswerText = selected?.text || '';
                        correctAnswerText = q.answers?.find((a) => a.isCorrect)?.text || '';
                        isCorrect = selected?.isCorrect === true;
                        earnedPoints = isCorrect ? q.points : 0;
                    } else if (q.type === 'MCQ') {
                        const selectedIds = userAnswer?.answerIds || [];
                        const correctIds = q.answers?.filter((a) => a.isCorrect).map((a) => a.id) || [];
                        userAnswerText = selectedIds
                            .map((id) => q.answers?.find((a) => a.id === id)?.text || '')
                            .filter(Boolean)
                            .join(', ');
                        correctAnswerText = q.answers?.filter((a) => a.isCorrect).map((a) => a.text).join(', ') || '';
                        isCorrect =
                            selectedIds.length === correctIds.length &&
                            selectedIds.every((id) => correctIds.includes(id));
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

                setQuestionResults(results);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRestart = () => {
        setCurrentQuestionIndex(0);
        setUserAnswersAndRef([]);
        timerStartedRef.current = false;
        setSelectedAnswer('');
        setSelectedAnswers([]);
        setFreeTextAnswer('');
        setMultiTextAnswers([]);
        setScore(null);
        setTotalPoints(null);
        setQuestionResults([]);
        setShowFeedback(false);
        setIsCorrect(false);
    };

    // ─── Loading / Error states ───────────────────────────────────────────────

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
                    <p className="text-gray-600 text-lg">Vérification de l&apos;authentification...</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
                    <p className="text-gray-600 text-lg">Chargement du quiz...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="max-w-2xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-xl shadow-2xl p-8 text-center">
                        <div className="text-red-500 text-6xl mb-4">⚠️</div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Erreur</h2>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <Link
                            href="/"
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block"
                        >
                            Retour à l&apos;accueil
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!quiz) return null;

    // ─── Page de résultats ────────────────────────────────────────────────────

    if (score !== null && totalPoints !== null) {
        const percentage = Math.round((score / totalPoints) * 100);
        const correctCount = questionResults.filter((r) => r.isCorrect).length;
        const totalCount = quiz.questions.length;

        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">

                    {/* Carte score */}
                    <div className="bg-white rounded-xl shadow-2xl p-8 mb-8">
                        <div className="text-center">
                            <div className="text-6xl mb-4">
                                {percentage >= 80 ? '🏆' : percentage >= 60 ? '👍' : '📚'}
                            </div>
                            <h2 className="text-3xl font-bold text-gray-800 mb-2">Quiz terminé !</h2>
                            <p className="text-xl text-gray-600 mb-6">{quiz.title}</p>
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-6 mb-4">
                                <p className="text-lg font-semibold opacity-90 mb-1">{score}/{totalPoints} pts</p>
                                <p className="text-5xl font-bold mb-1">
                                    {correctCount}/{totalCount}{' '}
                                    {plural(totalCount, 'question correcte', 'questions correctes')}
                                </p>
                                <p className="text-base opacity-80">{percentage}% des points obtenus</p>
                            </div>
                            {status === 'unauthenticated' && (
                                <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-5 py-4 mb-6 shadow-sm">
                                    <span className="text-xl shrink-0">🔒</span>
                                    <p className="text-sm">
                                        Vos scores ne sont enregistrés que lorsque vous êtes connecté.{' '}
                                        <Link
                                            href={`/login?callbackUrl=${encodeURIComponent(`/quiz/${quizId}`)}`}
                                            className="font-semibold underline hover:text-amber-900 transition-colors"
                                        >
                                            Se connecter
                                        </Link>
                                    </p>
                                </div>
                            )}
                            <div className="flex gap-4 justify-center flex-wrap">
                                <button
                                    onClick={handleRestart}
                                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Rejouer
                                </button>
                                <Link
                                    href="/dashboard"
                                    className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    href="/leaderboard"
                                    className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    Classement
                                </Link>
                                <Link
                                    href="/"
                                    className="bg-white text-gray-700 px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                                >
                                    Accueil
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Bandeau créateur */}
                    {quiz.creatorId === session?.user?.id && (
                        <div className="flex items-center gap-3 bg-blue-50 border border-blue-300 text-blue-800 rounded-xl px-5 py-4 mb-6 shadow-sm">
                            <span className="text-xl shrink-0">ℹ️</span>
                            <p className="text-sm">
                                Ce quiz étant le vôtre, il ne vous rapporte pas de points au classement.
                            </p>
                        </div>
                    )}

                    {/* Récapitulatif */}
                    <div className="bg-white rounded-xl shadow-2xl p-8">
                        <h3 className="text-2xl font-bold text-gray-800 mb-6">📋 Récapitulatif</h3>
                        <div className="space-y-4">
                            {questionResults.map((result, index) => (
                                <div
                                    key={result.questionId}
                                    className={`p-5 rounded-xl border-2 ${result.isCorrect
                                        ? 'border-green-400 bg-green-50'
                                        : 'border-red-400 bg-red-50'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <p className="font-semibold text-gray-900">
                                            <span className="text-gray-500 font-normal mr-2">Q{index + 1}.</span>
                                            {result.questionText}
                                        </p>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className={`text-xl ${result.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                                {result.isCorrect ? '✓' : '✗'}
                                            </span>
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${result.isCorrect ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                                {result.earnedPoints > 0 ? `+${result.earnedPoints} pts` : '0 pt'}
                                            </span>
                                        </div>
                                    </div>

                                    {result.type === 'MULTI_TEXT' ? (
                                        <div className="mt-2">
                                            <div className={`text-sm mb-2 ${result.isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                                                <span className="font-medium">Votre réponse : </span>
                                                {result.userAnswerText
                                                    ? <span>{result.userAnswerText}</span>
                                                    : <span className="italic opacity-70">Aucune réponse</span>
                                                }
                                            </div>
                                            <div className="border-2 border-blue-300 bg-blue-50 rounded-lg px-3 py-2">
                                                <p className="text-sm font-medium text-blue-800 mb-2">Réponses attendues :</p>
                                                <div className="space-y-1">
                                                    {result.correctAnswerText.split(', ').map((c, i) => {
                                                        const userTexts = result.userAnswerText.split(', ');
                                                        const isGood = userTexts.some(u => u.trim().toLowerCase() === c.trim().toLowerCase());
                                                        return (
                                                            <div key={i} className={`text-sm px-3 py-1.5 rounded-lg border font-medium ${isGood ? 'bg-green-50 border-green-300 text-green-800' : 'bg-white border-blue-200 text-blue-700'}`}>
                                                                {isGood ? '✓' : '•'} {c}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className={`text-sm mb-2 ${result.isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                                                <span className="font-medium">Votre réponse : </span>
                                                {result.userAnswerText
                                                    ? <span>{result.userAnswerText}</span>
                                                    : <span className="italic opacity-70">Aucune réponse</span>
                                                }
                                            </div>
                                            {!result.isCorrect && (
                                                <div className="text-sm text-blue-800 bg-blue-50 border border-blue-300 rounded-lg px-3 py-2">
                                                    <span className="font-medium">✅ Réponse attendue : </span>
                                                    <span>{result.correctAnswerText}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        );
    }

    // ─── Page de question ─────────────────────────────────────────────────────

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
    const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

    const canProceed =
        currentQuestion.type === 'TEXT'
            ? freeTextAnswer.trim().length > 0
            : currentQuestion.type === 'MULTI_TEXT'
                ? multiTextAnswers.length === (currentQuestion.answers?.length ?? 0) &&
                multiTextAnswers.every(t => t.trim().length > 0)
                : currentQuestion.type === 'MCQ'
                    ? selectedAnswers.length > 0
                    : selectedAnswer !== '';

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">{quiz.title}</h1>
                    <p className="text-gray-600 mb-4">{quiz.description}</p>
                    <p className="text-sm text-gray-500">Par {quiz.creator.name}</p>
                </div>

                {/* Bandeau non connecté */}
                {status === 'unauthenticated' && (
                    <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-5 py-4 mb-6 shadow-sm">
                        <span className="text-xl shrink-0">🔒</span>
                        <p className="text-sm">
                            Vos scores ne sont enregistrés que lorsque vous êtes connecté.{' '}
                            <Link
                                href={`/login?callbackUrl=${encodeURIComponent(`/quiz/${quizId}`)}`}
                                className="font-semibold underline hover:text-amber-900 transition-colors"
                            >
                                Se connecter
                            </Link>
                        </p>
                    </div>
                )}

                {/* Progress + Timer */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">
                            Question {currentQuestionIndex + 1} sur {quiz.questions.length}
                        </span>
                        <span className="text-sm font-medium text-blue-600">
                            {currentQuestion.points} point{currentQuestion.points > 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* ✅ Timer */}
                    {lobbyCode && timeMode && timeMode !== 'none' && timeLeft !== null && (
                        <div className="mt-4">
                            <p className={`text-sm font-medium mb-1 ${timeLeft <= 10 ? 'text-red-500' : 'text-gray-600'}`}>
                                {timeMode === 'total'
                                    ? timeLeft >= 60
                                        ? `⏱ Il vous reste ${Math.floor(timeLeft / 60)} min ${timeLeft % 60}s pour finir le quiz`
                                        : `⏱ Il vous reste ${timeLeft}s pour finir le quiz`
                                    : `⏱ Il vous reste ${timeLeft}s pour répondre`
                                }
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all duration-1000 ${timeLeft <= 10 ? 'bg-red-500' : 'bg-orange-400'}`}
                                    style={{ width: `${(timeLeft / timePerQuestion) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Question card */}
                <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6">{currentQuestion.text}</h2>

                    {/* TRUE_FALSE */}
                    {currentQuestion.type === 'TRUE_FALSE' && currentQuestion.answers && (
                        <div className="space-y-3">
                            {currentQuestion.answers.map((answer) => {
                                const isSelected = selectedAnswer === answer.id;
                                const showCorrect = showFeedback && answer.isCorrect;
                                const showWrong = showFeedback && isSelected && !answer.isCorrect;
                                return (
                                    <button
                                        key={answer.id}
                                        onClick={() => handleAnswerSelect(answer.id)}
                                        disabled={showFeedback}
                                        className={`w-full p-4 rounded-lg border-2 transition-all ${showCorrect ? 'border-green-500 bg-green-50' : showWrong ? 'border-red-500 bg-red-50' : isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'} ${showFeedback ? 'cursor-not-allowed' : ''}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-gray-800">{answer.text}</span>
                                            {showCorrect && <span className="text-green-600 text-xl">✓</span>}
                                            {showWrong && <span className="text-red-600 text-xl">✗</span>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* MCQ */}
                    {currentQuestion.type === 'MCQ' && currentQuestion.answers && (
                        <div>
                            <p className="text-sm text-gray-600 mb-3 italic">
                                💡 Plusieurs réponses peuvent être correctes - Sélectionnez toutes les bonnes réponses
                            </p>
                            <div className="space-y-3">
                                {currentQuestion.answers.map((answer) => {
                                    const isSelected = selectedAnswers.includes(answer.id);
                                    const showCorrect = showFeedback && answer.isCorrect;
                                    const showWrong = showFeedback && isSelected && !answer.isCorrect;
                                    return (
                                        <label
                                            key={answer.id}
                                            className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${showCorrect ? 'border-green-500 bg-green-50' : showWrong ? 'border-red-500 bg-red-50' : isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'} ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="h-5 w-5"
                                                checked={isSelected}
                                                onChange={() => handleMultipleAnswerToggle(answer.id)}
                                                disabled={showFeedback}
                                            />
                                            <span className="font-medium text-gray-800 flex-1">{answer.text}</span>
                                            {showCorrect && <span className="text-green-600 text-xl">✓</span>}
                                            {showWrong && <span className="text-red-600 text-xl">✗</span>}
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
                                onChange={(e) => setFreeTextAnswer(e.target.value)}
                                placeholder="Saisissez votre réponse..."
                                className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:outline-none min-h-32 resize-none"
                                disabled={showFeedback}
                            />
                            <p className="text-sm text-gray-500 mt-2">
                                Cette question vaut {currentQuestion.points} points
                            </p>
                            {showFeedback && (
                                <div>
                                    <div className={`mt-4 p-4 rounded-lg border-2 ${isCorrect ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                                        <p className={`font-semibold mb-2 ${isCorrect ? 'text-green-900' : 'text-red-900'}`}>
                                            {isCorrect ? '✓ Bonne réponse !' : '✗ Réponse incorrecte'}
                                        </p>
                                        <p className={`text-sm ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                                            Votre réponse : <span className="font-medium">{freeTextAnswer.trim()}</span>
                                        </p>
                                    </div>
                                    {!isCorrect && (
                                        <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-400 rounded-lg">
                                            <p className="font-semibold text-blue-900 mb-2">Réponse attendue :</p>
                                            <p className="text-blue-800 font-medium">
                                                {currentQuestion.answers?.[0]?.text || currentQuestion.correctAnswerText || 'Non disponible'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* MULTI_TEXT */}
                    {currentQuestion.type === 'MULTI_TEXT' && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600 mb-3 italic">
                                {currentQuestion.strictOrder
                                    ? '💡 Remplissez chaque champ dans le bon ordre'
                                    : "💡 Remplissez chaque champ avec une bonne réponse (l'ordre n'a pas d'importance)"}
                            </p>
                            {!showFeedback && currentQuestion.answers?.map((_, i) => (
                                <input
                                    key={i}
                                    value={multiTextAnswers[i] || ''}
                                    onChange={(e) => {
                                        const updated = [...multiTextAnswers];
                                        updated[i] = e.target.value;
                                        setMultiTextAnswers(updated);
                                    }}
                                    placeholder={`Réponse ${i + 1}`}
                                    className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:outline-none"
                                />
                            ))}
                            {showFeedback && (
                                <div className="border-2 border-blue-300 bg-blue-50 rounded-lg px-3 py-2">
                                    <p className="text-sm font-medium text-blue-800 mb-2">Réponses attendues :</p>
                                    <div className="space-y-1">
                                        {currentQuestion.answers?.map((answer, i) => {
                                            const isGood = multiTextAnswers.some(u => u.trim().toLowerCase() === answer.text.trim().toLowerCase());
                                            return (
                                                <div key={i} className={`text-sm px-3 py-1.5 rounded-lg border font-medium ${isGood ? 'bg-green-50 border-green-300 text-green-800' : 'bg-white border-blue-200 text-blue-700'}`}>
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

                {/* Feedback TRUE_FALSE / MCQ */}
                {showFeedback && currentQuestion.type !== 'TEXT' && currentQuestion.type !== 'MULTI_TEXT' && (
                    <div className={`mb-6 p-4 rounded-lg border-2 ${isCorrect ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500'}`}>
                        <p className={`font-semibold ${isCorrect ? 'text-green-900' : 'text-red-900'}`}>
                            {isCorrect ? '✓ Bonne réponse !' : '✗ Réponse incorrecte'}
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-4">
                    {!showFeedback ? (
                        <button
                            onClick={handleValidateAnswer}
                            disabled={!canProceed}
                            className={`px-8 py-3 rounded-lg font-medium transition-all ${canProceed ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                        >
                            Valider ma réponse
                        </button>
                    ) : (
                        <button
                            onClick={handleNextQuestion}
                            disabled={isSubmitting}
                            className={`px-8 py-3 rounded-lg font-medium transition-all ${isSubmitting ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'}`}
                        >
                            {isSubmitting ? 'Envoi en cours...' : isLastQuestion ? 'Voir mes résultats 🎯' : 'Question suivante →'}
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
