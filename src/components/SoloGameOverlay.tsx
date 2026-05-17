'use client';

import Link from 'next/link';
import type { Session } from 'next-auth';
import type { Phase, SubmitState } from '@/hooks/useSoloGame';
import { CheckIcon } from '@heroicons/react/24/outline';

interface SoloGameOverlayProps {
    phase: Phase;
    displayScore: number;
    displayLevel?: number;
    isNewBest: boolean;
    submitState: SubmitState;
    session: Session | null | undefined;
    leaderboardHref: string;
    onReplay: () => void;
    bgClassName?: string;
    title?: string;
    titleClassName?: string;
    scoreClassName?: string;
    newBestClassName?: string;
    replayClassName?: string;
    leaderboardClassName?: string;
    children?: React.ReactNode;
}

export default function SoloGameOverlay({
    phase,
    displayScore,
    displayLevel,
    isNewBest,
    submitState,
    session,
    leaderboardHref,
    onReplay,
    bgClassName = 'bg-black/75',
    title,
    titleClassName = 'text-yellow-400',
    scoreClassName = 'text-white',
    newBestClassName = 'text-amber-400',
    replayClassName = 'px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm rounded-xl transition-all',
    leaderboardClassName = 'px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm rounded-xl transition-all',
    children,
}: SoloGameOverlayProps) {
    if (phase !== 'over') return null;

    return (
        <div className={`absolute inset-0 flex flex-col items-center justify-center ${bgClassName} gap-2`}>
            {title && <div className={`text-2xl font-black ${titleClassName}`}>{title}</div>}
            <div className={`text-3xl font-black ${scoreClassName}`}>{displayScore} pts</div>
            {displayLevel !== undefined && (
                <div className="text-sm text-gray-400">Niveau atteint : {displayLevel}</div>
            )}
            {isNewBest && displayScore > 0 && (
                <div className={`text-sm font-bold ${newBestClassName}`}>Nouveau record !</div>
            )}
            {session?.user ? (
                <div className="text-xs text-gray-400 dark:text-gray-500 h-4">
                    {submitState === 'loading' && 'Sauvegarde…'}
                    {submitState === 'done' && <span><CheckIcon className="inline-block w-3.5 h-3.5 text-green-500 align-text-bottom mr-1" />Score sauvegardé</span>}
                    {submitState === 'error' && 'Erreur de sauvegarde'}
                </div>
            ) : displayScore > 0 ? (
                <div className="text-xs text-gray-400 dark:text-gray-500 h-4">
                    <Link href="/login" className="underline hover:text-gray-300 dark:hover:text-gray-300">Connectez-vous</Link> pour sauvegarder
                </div>
            ) : <div className="h-4" />}
            {children}
            <div className="flex gap-3 mt-1">
                <button onClick={onReplay} className={replayClassName}>Rejouer</button>
                <Link href={leaderboardHref} className={leaderboardClassName}>Classement</Link>
            </div>
        </div>
    );
}
