// src/components/ScoreCards.tsx
'use client';

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
    icon: string;
    colorClass: string;       // border + bg gradient classes
    iconBgClass: string;      // icon bg class
    labelColorClass: string;  // label text color
    suffix?: string;
}

// ─── StatCard primitive ───────────────────────────────────────────────────────

export function StatCard({
    label,
    value,
    icon,
    colorClass,
    iconBgClass,
    labelColorClass,
    suffix,
}: StatCardProps) {
    return (
        <div className={`rounded-2xl border p-5 shadow-sm ${colorClass}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className={`text-xs font-semibold tracking-wide uppercase ${labelColorClass}`}>
                        {label}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                        {value}
                        {suffix && <span className="text-lg font-semibold text-gray-500 ml-1">{suffix}</span>}
                    </p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl shadow-inner ${iconBgClass}`}>
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
                icon="🧠"
                colorClass="border-blue-200/60 bg-gradient-to-br from-blue-50 to-white"
                iconBgClass="bg-blue-100"
                labelColorClass="text-blue-700"
            />
            <StatCard
                label={quizzesCompleted <= 1 ? 'Quiz complété' : 'Quizzes complétés'}
                value={quizzesCompleted}
                icon="✅"
                colorClass="border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-white"
                iconBgClass="bg-emerald-100"
                labelColorClass="text-emerald-700"
            />
            <StatCard
                label={quizzesCreated <= 1 ? 'Quiz créé' : 'Quizzes créés'}
                value={quizzesCreated}
                icon="✍️"
                colorClass="border-violet-200/60 bg-gradient-to-br from-violet-50 to-white"
                iconBgClass="bg-violet-100"
                labelColorClass="text-violet-700"
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
                icon="🔥"
                colorClass="rounded-3xl border-orange-200 bg-gradient-to-br from-orange-50 to-white"
                iconBgClass="bg-orange-100"
                labelColorClass="text-orange-700"
            />
            <StatCard
                label="1ère place"
                value={top1}
                icon="🥇"
                colorClass="rounded-3xl border-amber-200 bg-gradient-to-br from-amber-50 to-white"
                iconBgClass="bg-amber-100"
                labelColorClass="text-amber-700"
            />
            <StatCard
                label="2ème place"
                value={top2}
                icon="🥈"
                colorClass="rounded-3xl border-indigo-200 bg-gradient-to-br from-indigo-50 to-white"
                iconBgClass="bg-indigo-100"
                labelColorClass="text-indigo-700"
            />
            <StatCard
                label="3ème place"
                value={top3}
                icon="🥉"
                colorClass="rounded-3xl border-rose-200 bg-gradient-to-br from-rose-50 to-white"
                iconBgClass="bg-rose-100"
                labelColorClass="text-rose-700"
            />
            <StatCard
                label="Participations"
                value={gamesPlayed}
                icon="🎮"
                colorClass="rounded-3xl border-sky-200 bg-gradient-to-br from-sky-50 to-white"
                iconBgClass="bg-sky-100"
                labelColorClass="text-sky-700"
            />
        </div>
    );
}
