'use client';

import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import TimerBar from '@/components/TimerBar';
import { useQuizPlayer } from '@/hooks/useQuizPlayer';
import QuizHeader from '@/components/Quiz/parts/QuizHeader';
import AnswerOption from '@/components/Quiz/parts/AnswerOption';
import TrueFalseOptions from '@/components/Quiz/parts/TrueFalseOptions';
import TextInput from '@/components/Quiz/parts/TextInput';
import MultiTextInput from '@/components/Quiz/parts/MultiTextInput';
import FeedbackBanner from '@/components/Quiz/parts/FeedbackBanner';
import { LockClosedIcon } from '@heroicons/react/24/outline';

// ─── Constants ────────────────────────────────────────────────────────────────

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

// ─── Props ────────────────────────────────────────────────────────────────────

interface QuizPlayerProps {
    quizId: string;
    lobbyId?: string;
    resultUrl: string;
    loginCallbackUrl?: string;
    timeMode?: string;
    timePerQuestion?: number;
    notAllowedBackButton?: React.ReactNode;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// ─── Main component ───────────────────────────────────────────────────────────

export default function QuizPlayer({ quizId, lobbyId, resultUrl, loginCallbackUrl, timeMode: timeModeProp, timePerQuestion: timePerQuestionProp }: QuizPlayerProps) {
    const {
        quizData, isLoadingQuiz,
        currentQuestion, currentQuestionIndex, isLastQuestion, progress,
        selectedAnswer, setSelectedAnswer,
        selectedAnswers, toggleAnswer,
        freeTextAnswer, setFreeTextAnswer,
        multiTextAnswers, setMultiTextAnswers,
        feedback, showFeedback,
        isValidating, isSubmitting, canProceed,
        handleValidateAnswer, handleNextQuestion,
        status, timerEndsAt, timerDuration,
    } = useQuizPlayer({ quizId, lobbyId, resultUrl, timeMode: timeModeProp, timePerQuestion: timePerQuestionProp });

    if (isLoadingQuiz) return <LoadingSpinner message="Chargement du quiz..." />;

    return (
        <div className="flex flex-col min-h-screen wood-table text-gray-900 dark:text-white">
            <QuizHeader
                title={quizData.title}
                progress={progress}
                currentIndex={currentQuestionIndex}
                total={quizData.questions.length}
                points={currentQuestion?.points ?? 0}
            />

            <TimerBar endsAt={timerEndsAt} duration={timerDuration} />

            <main className="flex-1 flex flex-col items-center px-4 py-8">
                <div className="max-w-2xl w-full flex flex-col gap-5">

                    {status === 'unauthenticated' && (
                        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl px-4 py-3">
                            <LockClosedIcon className="w-4 h-4 shrink-0" />
                            <p className="text-sm">
                                Scores non enregistrés sans connexion.{' '}
                                {loginCallbackUrl && (
                                    <Link href={loginCallbackUrl} className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-200 transition-colors">
                                        Se connecter
                                    </Link>
                                )}
                            </p>
                        </div>
                    )}

                    {currentQuestion ? (
                        <div className="wood-tile rounded-2xl overflow-hidden shadow-xl">
                            {/* Question text */}
                            <div className="px-6 pt-6 pb-5 border-b border-gray-100 dark:border-gray-800">
                                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100 leading-snug">
                                    {currentQuestion.text}
                                </p>
                                {currentQuestion.imageUrl && (
                                    <img
                                        src={currentQuestion.imageUrl}
                                        alt="Illustration de la question"
                                        className="mt-4 w-full max-h-64 object-contain rounded-xl border border-gray-100 dark:border-gray-800"
                                    />
                                )}
                                {currentQuestion.type === 'MCQ' && (
                                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
                                        Plusieurs réponses possibles
                                    </p>
                                )}
                            </div>

                            {/* Answers */}
                            <div className="p-4 flex flex-col gap-2.5">
                                {currentQuestion.type === 'TRUE_FALSE' && (
                                    <TrueFalseOptions
                                        question={currentQuestion}
                                        selectedAnswer={selectedAnswer}
                                        feedback={feedback}
                                        showFeedback={showFeedback}
                                        onSelect={setSelectedAnswer}
                                    />
                                )}

                                {(currentQuestion.type === 'MCQ_UNIQUE' || currentQuestion.type === 'MCQ') && (
                                    <div className="flex flex-col gap-2.5">
                                        {currentQuestion.answers?.map((answer, i) => {
                                            const isMulti = currentQuestion.type === 'MCQ';
                                            const isSelected = isMulti
                                                ? selectedAnswers.includes(answer.id)
                                                : selectedAnswer === answer.id;
                                            // Match correct answers by ID (avoids breakage when texts contain commas).
                                            const correctIds = feedback?.correctAnswerIds ?? [];
                                            const showCorrect = showFeedback && (
                                                isMulti ? correctIds.includes(answer.id)
                                                    : (correctIds.length > 0 ? correctIds.includes(answer.id) : feedback?.correctAnswerText === answer.text)
                                            );
                                            const showWrong = showFeedback && isSelected && !showCorrect;

                                            return (
                                                <AnswerOption
                                                    key={answer.id}
                                                    label={LABELS[i] ?? String(i + 1)}
                                                    text={answer.text}
                                                    isSelected={isSelected}
                                                    showCorrect={showCorrect}
                                                    showWrong={showWrong}
                                                    disabled={showFeedback}
                                                    onClick={() => isMulti ? toggleAnswer(answer.id) : setSelectedAnswer(answer.id)}
                                                />
                                            );
                                        })}
                                    </div>
                                )}

                                {currentQuestion.type === 'TEXT' && (
                                    <TextInput
                                        value={freeTextAnswer}
                                        onChange={setFreeTextAnswer}
                                        disabled={showFeedback}
                                        feedback={feedback}
                                        showFeedback={showFeedback}
                                    />
                                )}

                                {currentQuestion.type === 'MULTI_TEXT' && (
                                    <MultiTextInput
                                        values={multiTextAnswers}
                                        count={currentQuestion.answers?.length || 1}
                                        onChange={(i, v) => setMultiTextAnswers(prev => {
                                            const next = [...prev];
                                            next[i] = v;
                                            return next;
                                        })}
                                        disabled={showFeedback}
                                        feedback={feedback}
                                        showFeedback={showFeedback}
                                    />
                                )}
                            </div>

                            {showFeedback && feedback && <FeedbackBanner feedback={feedback} />}
                        </div>
                    ) : (
                        <div className="wood-tile rounded-2xl p-6 shadow-xl">
                            <p className="text-gray-500 dark:text-gray-400">Chargement de la question...</p>
                        </div>
                    )}

                    {/* Action button */}
                    {!showFeedback ? (
                        <button
                            onClick={handleValidateAnswer}
                            disabled={!canProceed || isValidating}
                            className="w-full py-3.5 rounded-xl bg-primary-500 hover:bg-primary-400 active:bg-primary-600 text-stone-950 disabled:bg-stone-300 dark:disabled:bg-stone-700 disabled:text-stone-500 dark:disabled:text-stone-500 font-bold transition-all duration-150 disabled:cursor-not-allowed shadow-lg shadow-black/20"
                        >
                            {isValidating ? 'Vérification...' : 'Valider ma réponse'}
                        </button>
                    ) : (
                        <button
                            onClick={handleNextQuestion}
                            disabled={isSubmitting}
                            className="w-full py-3.5 rounded-xl bg-felt-600 hover:bg-felt-500 active:bg-felt-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-semibold transition-all duration-150 disabled:cursor-not-allowed shadow-lg shadow-black/20"
                        >
                            {isSubmitting ? 'Envoi en cours...' : isLastQuestion ? 'Voir mes résultats' : 'Question suivante →'}
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
}
