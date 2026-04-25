'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { usePacman } from '@/hooks/usePacman';
import { COLS, ROWS, CELL } from '@/lib/pacman/constants';

export default function PacmanPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const {
        phase,
        displayScore,
        displayLives,
        bestScore,
        isNewBest,
        submitState,
        startGame,
        session,
    } = usePacman(canvasRef);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center pt-6 pb-12 px-4">
            <div className="w-full max-w-[440px] flex items-center justify-between mb-4">
                <Link href="/" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors">← Accueil</Link>
                <span className="text-gray-900 dark:text-white font-bold text-lg">Pac-Man</span>
                <Link href="/leaderboard/pacman" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors">Classement →</Link>
            </div>

            <div className="w-full max-w-[440px] flex justify-between mb-3 px-1">
                <div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Score</div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{displayScore}</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Vies</div>
                    <div className="text-2xl font-black text-yellow-500 dark:text-yellow-400 tabular-nums">{displayLives}</div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Meilleur</div>
                    <div className="text-2xl font-black text-amber-500 dark:text-amber-400 tabular-nums">{Math.max(bestScore, displayScore)}</div>
                </div>
            </div>

            <div className="relative rounded-xl overflow-hidden shadow-lg w-full max-w-[400px]">
                <canvas
                    ref={canvasRef}
                    width={COLS * CELL}
                    height={ROWS * CELL}
                    className="block w-full"
                    style={{ touchAction: 'none', background: '#0f0f23' }}
                />

                {(phase === 'over' || phase === 'win') && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 gap-2">
                        <div className="text-2xl font-black text-yellow-400">
                            {phase === 'win' ? '🎉 Gagné !' : 'Game Over'}
                        </div>
                        <div className="text-3xl font-black text-white">{displayScore} pts</div>
                        {isNewBest && displayScore > 0 && (
                            <div className="text-amber-400 text-sm font-bold">Nouveau record !</div>
                        )}
                        {session?.user ? (
                            <div className="text-xs text-gray-400 h-4">
                                {submitState === 'loading' && 'Sauvegarde…'}
                                {submitState === 'done' && '✓ Score sauvegardé'}
                                {submitState === 'error' && 'Erreur de sauvegarde'}
                            </div>
                        ) : displayScore > 0 ? (
                            <div className="text-xs text-gray-400 h-4">
                                <Link href="/login" className="underline hover:text-gray-300">Connectez-vous</Link> pour sauvegarder
                            </div>
                        ) : <div className="h-4" />}
                        <div className="flex gap-3 mt-1">
                            <button onClick={startGame}
                                className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm rounded-xl transition-all">
                                Rejouer
                            </button>
                            <Link href="/leaderboard/pacman"
                                className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm rounded-xl transition-all">
                                Classement
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {phase === 'idle' && (
                <div className="mt-4 flex flex-col items-center gap-3">
                    <button onClick={startGame}
                        className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-yellow-900/30">
                        Jouer
                    </button>
                    <p className="text-gray-400 dark:text-gray-600 text-xs">Glissez sur le plateau · Flèches/ZQSD sur clavier</p>
                </div>
            )}
        </div>
    );
}
