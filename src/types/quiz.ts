// src/types/quiz.ts

import { ReactNode } from "react";

export type Answer = {
    content: ReactNode;
    isCorrect: boolean;
    id: string;
    text?: string;
};

export type Question = {
    content: ReactNode;
    quizId: any;
    id: string;
    text: string;
    type: 'TRUE_FALSE' | 'MCQ' | 'MCQ_UNIQUE' | 'TEXT' | 'MULTI_TEXT';
    points: number;
    strictOrder?: boolean;
    answers?: Answer[];
};

export type UserAnswer = {
    questionId: string;
    answerId?: string;
    answerIds?: string[];
    freeText?: string;
};

export type Quiz = {
    id: string;
    title: string;
    description: string;
    creatorId: string;
    randomizeQuestions: boolean;
    creator: { id: string; name: string };
    questions: Question[];
};

export type FeedbackState = {
    isCorrect: boolean;
    earnedPoints: number;
    correctAnswerText: string;
    correctAnswers?: string[];
};

export interface QuizFormState {
    title: string;
    description: string;
    categoryId: string;
    creatorId: string;
    questions: Question[];
}
