// src/components/ScoreCards.tsx
'use client';

import React from 'react';
import {
    LightBulbIcon,
    CheckCircleIcon,
    PencilSquareIcon,
    FireIcon,
    TrophyIcon,
    RectangleGroupIcon,
} from '@heroicons/react/24/outline';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuizScoreCardProps {
    totalScore: number;
    quizzesCompleted: number;
    quizzesCreated: number;
}

export interface UnoScoreCardProps {
    totalScore: number;
    top1: number;
    top2: number;
    top3: number;
    gamesPlayed: number;
}

export interface StatCardProps {
    label: string;
    value: number | string;
    icon: React.ReactNode;
    colorClass: string;
    iconBgClass: string;
    labelColorClass: string;
    suffix?: string;
}

// ─── Medal badge ──────────────────────────────────────────────────────────────

function MedalBadge({ rank }: { rank: 1 | 2 | 3 }) {
    const styles = {
        1: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
        2: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300',
        3: 'bg-orange-200 dark:bg-orange-900/50 text-orange-800 dark:text-orange-400',
    };
    return (
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${styles[rank]}`}>
            {rank}
        </span>
    );
}

// ─── StatCard primitive ───────────────────────────────────────────────────────

export function StatCard({ label, value, icon, colorClass, iconBgClass, labelColorClass, suffix }: StatCardProps) {
    return (
        <div className={`rounded-2xl border p-5 shadow-sm ${colorClass}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className={`text-xs font-semibold tracking-wide uppercase ${labelColorClass}`}>{label}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                        {value}
                        {suffix && <span className="text-lg font-semibold text-gray-500 ml-1">{suffix}</span>}
                    </p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-inner ${iconBgClass}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

// ─── Quiz Score Cards ─────────────────────────────────────────────────────────

export function QuizScoreCards({ totalScore, quizzesCompleted, quizzesCreated }: QuizScoreCardProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
                label="Score total"
                value={totalScore}
                suffix="pts"
                icon={<LightBulbIcon className="w-5 h-5 text-blue-600" />}
                colorClass="border-blue-200/60 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-gray-900 dark:border-blue-800/40"
                iconBgClass="bg-blue-100 dark:bg-blue-900/30"
                labelColorClass="text-blue-700 dark:text-blue-400"
            />
            <StatCard
                label={quizzesCompleted <= 1 ? 'Quiz complété' : 'Quizzes complétés'}
                value={quizzesCompleted}
                icon={<CheckCircleIcon className="w-5 h-5 text-emerald-600" />}
                colorClass="border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-gray-900 dark:border-emerald-800/40"
                iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
                labelColorClass="text-emerald-700 dark:text-emerald-400"
            />
            <StatCard
                label={quizzesCreated <= 1 ? 'Quiz créé' : 'Quizzes créés'}
                value={quizzesCreated}
                icon={<PencilSquareIcon className="w-5 h-5 text-violet-600" />}
                colorClass="border-violet-200/60 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/20 dark:to-gray-900 dark:border-violet-800/40"
                iconBgClass="bg-violet-100 dark:bg-violet-900/30"
                labelColorClass="text-violet-700 dark:text-violet-400"
            />
        </div>
    );
}

// ─── UNO Score Cards ──────────────────────────────────────────────────────────

export function UnoScoreCards({ totalScore, top1, top2, top3, gamesPlayed }: UnoScoreCardProps) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
                label="Points totaux"
                value={totalScore}
                icon={<FireIcon className="w-5 h-5 text-orange-600" />}
                colorClass="rounded-3xl border-orange-200 dark:border-orange-800/40 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-gray-900"
                iconBgClass="bg-orange-100 dark:bg-orange-900/30"
                labelColorClass="text-orange-700 dark:text-orange-400"
            />
            <StatCard
                label="1ère place"
                value={top1}
                icon={<MedalBadge rank={1} />}
                colorClass="rounded-3xl border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-gray-900"
                iconBgClass="bg-amber-100 dark:bg-amber-900/30"
                labelColorClass="text-amber-700 dark:text-amber-400"
            />
            <StatCard
                label="2ème place"
                value={top2}
                icon={<MedalBadge rank={2} />}
                colorClass="rounded-3xl border-indigo-200 dark:border-indigo-800/40 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-gray-900"
                iconBgClass="bg-indigo-100 dark:bg-indigo-900/30"
                labelColorClass="text-indigo-700 dark:text-indigo-400"
            />
            <StatCard
                label="3ème place"
                value={top3}
                icon={<MedalBadge rank={3} />}
                colorClass="rounded-3xl border-rose-200 dark:border-rose-800/40 bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/20 dark:to-gray-900"
                iconBgClass="bg-rose-100 dark:bg-rose-900/30"
                labelColorClass="text-rose-700 dark:text-rose-400"
            />
            <StatCard
                label="Participations"
                value={gamesPlayed}
                icon={<RectangleGroupIcon className="w-5 h-5 text-sky-600" />}
                colorClass="rounded-3xl border-sky-200 dark:border-sky-800/40 bg-gradient-to-br from-sky-50 to-white dark:from-sky-950/20 dark:to-gray-900"
                iconBgClass="bg-sky-100 dark:bg-sky-900/30"
                labelColorClass="text-sky-700 dark:text-sky-400"
            />
        </div>
    );
}
