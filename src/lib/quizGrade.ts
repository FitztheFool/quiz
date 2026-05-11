import { normalizeAnswer as normalize } from './utils';

export type GradeAnswer = {
    questionId: string;
    answerId?: string;
    answerIds?: string[];
    freeText?: string;
};

type DbAnswer = { id: string; content: string; isCorrect: boolean };
type DbQuestion = {
    id: string;
    type: string;
    points: number;
    answers: DbAnswer[];
    strictOrder?: boolean | null;
};

export function correctAnswerText(question: DbQuestion): string {
    const correct = question.answers.filter(a => a.isCorrect);
    if (correct.length === 0) {
        return question.answers[0]?.content ?? '';
    }
    return correct.map(a => a.content).join(', ');
}

export function gradeQuestion(
    question: DbQuestion,
    input: GradeAnswer,
): { isCorrect: boolean; earnedPoints: number } {
    const { answerId, answerIds, freeText } = input;

    if (question.type === 'TRUE_FALSE' || question.type === 'MCQ_UNIQUE') {
        const selected = question.answers.find(a => a.id === answerId);
        const isCorrect = selected?.isCorrect === true;
        return { isCorrect, earnedPoints: isCorrect ? question.points : 0 };
    }

    if (question.type === 'MCQ') {
        const correctIds = question.answers.filter(a => a.isCorrect).map(a => a.id);
        const selected = Array.isArray(answerIds) ? answerIds : [];
        const isCorrect =
            selected.length === correctIds.length &&
            selected.every(id => correctIds.includes(id));
        return { isCorrect, earnedPoints: isCorrect ? question.points : 0 };
    }

    if (question.type === 'TEXT') {
        const correct = question.answers.find(a => a.isCorrect) ?? question.answers[0];
        const userText = normalize(freeText ?? '');
        const isCorrect = userText.length > 0 && userText === normalize(correct?.content ?? '');
        return { isCorrect, earnedPoints: isCorrect ? question.points : 0 };
    }

    if (question.type === 'MULTI_TEXT') {
        const correctTexts = question.answers.filter(a => a.isCorrect).map(a => normalize(a.content));
        const userTexts = (freeText ?? '').split('||').map(t => normalize(t));
        const strictOrder = question.strictOrder ?? false;
        const correctCount = strictOrder
            ? userTexts.filter((t, i) => t === correctTexts[i]).length
            : userTexts.filter(t => correctTexts.includes(t)).length;
        const pointsPerAnswer = correctTexts.length > 0 ? question.points / correctTexts.length : 0;
        return {
            isCorrect: correctCount === correctTexts.length,
            earnedPoints: Math.round(correctCount * pointsPerAnswer),
        };
    }

    return { isCorrect: false, earnedPoints: 0 };
}

export function gradeQuiz(
    questions: DbQuestion[],
    answers: GradeAnswer[],
): { score: number; correctAnswers: number; totalAnswers: number } {
    const byId = new Map(questions.map(q => [q.id, q]));
    let score = 0;
    let correctAnswers = 0;
    for (const a of answers) {
        const q = byId.get(a.questionId);
        if (!q) continue;
        const { isCorrect, earnedPoints } = gradeQuestion(q, a);
        score += earnedPoints;
        if (isCorrect) correctAnswers++;
    }
    return { score, correctAnswers, totalAnswers: questions.length };
}
