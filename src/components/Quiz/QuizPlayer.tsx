'use client';

import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import TimerBar from '@/components/TimerBar';
import { useQuizPlayer, type Question, type Feedback } from '@/hooks/useQuizPlayer';
import { normalizeAnswer } from '@/lib/utils';

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

function QuizHeader({ title, progress, currentIndex, total, points }: {
    title: string;
    progress: number;
    currentIndex: number;
    total: number;
    points: number;
}) {
    return (
        <header className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center gap-4">
            <div className="w-36 shrink-0 flex items-center gap-2 min-w-0">
                <span className="shrink-0 text-base">📝</span>
                <span className="font-semibold truncate text-gray-900 dark:text-white text-sm">{title}</span>
            </div>
            <div className="flex-1 flex flex-col justify-center items-center gap-1">
                <div className="w-full max-w-xs bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                    Question {currentIndex + 1} / {total}
                </span>
            </div>
            <div className="w-36 shrink-0 flex justify-end">
                <span className="text-xs font-bold bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full whitespace-nowrap">
                    {points} pt{points > 1 ? 's' : ''}
                </span>
            </div>
        </header>
    );
}

function AnswerOption({ label, text, isSelected, showCorrect, showWrong, disabled, onClick }: {
    label: string;
    text: string;
    isSelected: boolean;
    showCorrect: boolean;
    showWrong: boolean;
    disabled: boolean;
    onClick: () => void;
}) {
    const rowCls = showCorrect
        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
        : showWrong
            ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            : isSelected
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer';

    const badgeCls = showCorrect
        ? 'bg-green-500 text-white'
        : showWrong
            ? 'bg-red-400 text-white'
            : isSelected
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400';

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 font-medium transition-all duration-150 select-none ${rowCls}`}
        >
            <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${badgeCls}`}>
                {showCorrect ? '✓' : showWrong ? '✗' : label}
            </span>
            <span>{text}</span>
        </button>
    );
}

function TrueFalseOptions({ question, selectedAnswer, feedback, showFeedback, onSelect }: {
    question: Question;
    selectedAnswer: string | null;
    feedback: Feedback | null;
    showFeedback: boolean;
    onSelect: (id: string) => void;
}) {
    return (
        <div className="grid grid-cols-2 gap-3">
            {question.answers?.map((answer) => {
                const isSelected = selectedAnswer === answer.id;
                const showCorrect = showFeedback && feedback?.correctAnswerText === answer.text;
                const showWrong = showFeedback && isSelected && !showCorrect;
                return (
                    <button
                        key={answer.id}
                        onClick={() => onSelect(answer.id)}
                        disabled={showFeedback}
                        className={`flex items-center justify-center py-6 rounded-xl border-2 font-bold text-lg transition-all duration-150 select-none
                            ${showCorrect
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/25 text-green-700 dark:text-green-300 scale-[1.02]'
                                : showWrong
                                    ? 'border-red-400 bg-red-50 dark:bg-red-900/25 text-red-700 dark:text-red-300'
                                    : isSelected
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 scale-[1.02]'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 text-gray-700 dark:text-gray-200 cursor-pointer'
                            }`}
                    >
                        {showCorrect ? '✓' : showWrong ? '✗' : answer.text}
                    </button>
                );
            })}
        </div>
    );
}

function TextInput({ value, onChange, disabled, feedback, showFeedback }: {
    value: string;
    onChange: (v: string) => void;
    disabled: boolean;
    feedback: Feedback | null;
    showFeedback: boolean;
}) {
    const displayValue = value;

    return (
        <div className="flex flex-col gap-2">
            <input
                type="text"
                value={displayValue}
                onChange={e => onChange(e.target.value)}
                disabled={disabled}
                placeholder="Votre réponse..."
                className={`w-full px-4 py-3.5 rounded-xl border-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none transition-colors disabled:opacity-60
                    ${showFeedback
                        ? feedback?.isCorrect
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-red-400 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-700 focus:border-blue-500'
                    }`}
            />
            {showFeedback && !feedback?.isCorrect && feedback?.correctAnswerText && (
                <p className="text-sm text-green-600 dark:text-green-400 px-1">
                    Bonne réponse : <strong>{feedback.correctAnswerText}</strong>
                </p>
            )}
        </div>
    );
}

function MultiTextInput({ values, count, onChange, disabled, feedback, showFeedback }: {
    values: string[];
    count: number;
    onChange: (index: number, value: string) => void;
    disabled: boolean;
    feedback: Feedback | null;
    showFeedback: boolean;
}) {
    const correctParts = feedback?.correctAnswerText?.split(', ') ?? [];

    return (
        <div className="flex flex-col gap-2">
            {Array.from({ length: count }).map((_, i) => {
                const userVal = values[i] ?? '';
                const matchIndex = showFeedback
                    ? correctParts.findIndex(c => normalizeAnswer(c) === normalizeAnswer(userVal))
                    : -1;
                const displayVal = userVal;
                const isFieldCorrect = showFeedback && matchIndex >= 0;
                const isFieldWrong = showFeedback && matchIndex < 0 && userVal.length > 0;

                return (
                    <div key={i} className="flex items-center gap-2">
                        <span className={`shrink-0 w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center
                            ${isFieldCorrect ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : isFieldWrong ? 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                            {isFieldCorrect ? '✓' : isFieldWrong ? '✗' : i + 1}
                        </span>
                        <input
                            type="text"
                            value={displayVal}
                            onChange={e => onChange(i, e.target.value)}
                            disabled={disabled}
                            placeholder={`Réponse ${i + 1}…`}
                            className={`flex-1 px-4 py-3 rounded-xl border-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors disabled:opacity-60
                                ${isFieldCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                : isFieldWrong ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                                : 'border-gray-200 dark:border-gray-700'}`}
                        />
                    </div>
                );
            })}
            {showFeedback && !feedback?.isCorrect && feedback?.correctAnswerText && (
                <p className="text-sm text-green-600 dark:text-green-400 px-1">
                    Bonne(s) réponse(s) : <strong>{feedback.correctAnswerText}</strong>
                </p>
            )}
        </div>
    );
}

function FeedbackBanner({ feedback }: { feedback: Feedback }) {
    return (
        <div className={`mx-4 mb-4 flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold text-sm border
            ${feedback.isCorrect
                ? 'bg-green-50 dark:bg-green-900/25 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/25 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
            }`}>
            <span className="text-base font-bold shrink-0">{feedback.isCorrect ? '✓' : '✗'}</span>
            <span>{feedback.isCorrect ? 'Bonne réponse !' : 'Mauvaise réponse'}</span>
        </div>
    );
}

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
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
            <QuizHeader
                title={quizData.title}
                progress={progress}
                currentIndex={currentQuestionIndex}
                total={quizData.questions.length}
                points={currentQuestion?.points ?? 0}
            />

            <TimerBar endsAt={timerEndsAt} duration={timerDuration} label="Temps restant" />

            <main className="flex-1 flex flex-col items-center px-4 py-8">
                <div className="max-w-2xl w-full flex flex-col gap-5">

                    {status === 'unauthenticated' && (
                        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl px-4 py-3">
                            <span className="shrink-0">🔒</span>
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
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                            {/* Question text */}
                            <div className="px-6 pt-6 pb-5 border-b border-gray-100 dark:border-gray-800">
                                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100 leading-snug">
                                    {currentQuestion.text}
                                </p>
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
                                            const correctList = isMulti
                                                ? feedback?.correctAnswerText?.split(', ') ?? []
                                                : [];
                                            const showCorrect = showFeedback && (
                                                isMulti ? correctList.includes(answer.text) : feedback?.correctAnswerText === answer.text
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
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                            <p className="text-gray-400">Chargement de la question...</p>
                        </div>
                    )}

                    {/* Action button */}
                    {!showFeedback ? (
                        <button
                            onClick={handleValidateAnswer}
                            disabled={!canProceed || isValidating}
                            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-500 text-white font-semibold transition-all duration-150 disabled:cursor-not-allowed shadow-sm"
                        >
                            {isValidating ? 'Vérification...' : 'Valider ma réponse'}
                        </button>
                    ) : (
                        <button
                            onClick={handleNextQuestion}
                            disabled={isSubmitting}
                            className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-semibold transition-all duration-150 disabled:cursor-not-allowed shadow-sm"
                        >
                            {isSubmitting ? 'Envoi en cours...' : isLastQuestion ? 'Voir mes résultats 🎯' : 'Question suivante →'}
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
}
