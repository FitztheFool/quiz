// src/app/taboo/[lobbyId]/page.tsx
'use client';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';
import GameOverModal from '@/components/GameOverModal';

import { useEffect, useRef, useState } from 'react';
import { notFound } from 'next/navigation';
import { useGamePage } from '@/hooks/useGamePage';
import { useTaboo } from '@/hooks/useTaboo';
import { TrapPhase } from '@/components/TrapPhase';

import { useChat } from '@/context/ChatContext';
import { plural } from '@/lib/utils';

type Attempt = { word: string; userId: string; username: string };

// ── Composants partagés ───────────────────────────────────────────────────────

function ScoreBar({ scores, myTeam, currentTeam }: {
    scores: Record<string, number>;
    myTeam: 0 | 1 | null;
    currentTeam: 0 | 1 | null;
}) {
    const myT = myTeam !== null ? String(myTeam) : '0';
    const advT = myTeam !== null ? String(1 - myTeam) : '1';
    const myIcon = myT === '0' ? '🔵' : '🔴';
    const advIcon = advT === '0' ? '🔵' : '🔴';
    const myActive = String(currentTeam) === myT;
    const advActive = String(currentTeam) === advT;

    return (
        <div className="flex items-center gap-2 justify-center">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">vous</span>
            <span className="text-base leading-none">{myIcon}</span>
            <span style={{ fontFamily: "'Bebas Neue', cursive" }}
                className={`text-2xl leading-none transition-colors ${myActive ? (myT === '0' ? 'text-blue-500' : 'text-red-500') : 'text-gray-900 dark:text-white'}`}>
                {scores[myT] ?? 0}
            </span>
            <span className="text-gray-400 dark:text-gray-500 font-bold text-sm">–</span>
            <span style={{ fontFamily: "'Bebas Neue', cursive" }}
                className={`text-2xl leading-none transition-colors ${advActive ? (advT === '0' ? 'text-blue-500' : 'text-red-500') : 'text-gray-900 dark:text-white'}`}>
                {scores[advT] ?? 0}
            </span>
            <span className="text-base leading-none">{advIcon}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">adv</span>
        </div>
    );
}

function AttemptsList({ attempts, refEl }: {
    attempts: Attempt[];
    refEl?: React.RefObject<HTMLDivElement>;
}) {
    if (attempts.length === 0) return (
        <p className="text-gray-400 dark:text-white/20 text-xs text-center py-2">Aucune tentative…</p>
    );
    return (
        <div className="space-y-1 max-h-40 overflow-y-auto w-full">
            {attempts.map((a, i) => {
                return (
                    <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60">
                        <span className="font-mono font-bold">{a.word}</span>
                        <span className="text-xs opacity-50">{a.username}</span>
                    </div>
                );
            })}
            {refEl && <div ref={refEl} />}
        </div>
    );
}

// ── Top bar shared header ─────────────────────────────────────────────────────

function TopBar({
    centerSlot,
    rightSlot,
}: {
    centerSlot: React.ReactNode;
    rightSlot?: React.ReactNode;
}) {
    return (
        <div className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center gap-4">
            {/* Left slot */}
            <div className="w-48 shrink-0 flex items-center gap-2">
                <span className="text-xl">🚫</span>
                <span className="font-bold text-gray-900 dark:text-white">Taboo</span>
            </div>
            {/* Center slot */}
            <div className="flex-1 flex justify-center">
                {centerSlot}
            </div>
            {/* Right slot */}
            <div className="w-48 shrink-0 flex justify-end text-sm text-gray-500 dark:text-gray-400">
                {rightSlot}
            </div>
        </div>
    );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function TabooGamePage() {
    const { session, status, router, lobbyId, isNotFound, setIsNotFound, modalDismissed, setModalDismissed } = useGamePage();

    const myId = session?.user?.id ?? '';
    const username = session?.user?.username ?? session?.user?.email ?? 'User';

    const { socketRef, game } = useTaboo({
        lobbyId,
        userId: myId,
        username,
        onNotFound: () => setIsNotFound(true),
    });

    const attemptsEndRef = useRef<HTMLDivElement>(null);
    const [attemptInput, setAttemptInput] = useState('');

    const isHost = !!game && game.hostId === myId;

    const { overrideMyTeam } = useChat();

    useEffect(() => {
        const t = game?.teams?.[myId];
        overrideMyTeam(t === 0 || t === 1 ? t : undefined);
    }, [game?.teams, myId]);

    useEffect(() => {
        if (attemptsEndRef.current) {
            attemptsEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [game?.attempts]);

    if (isNotFound) notFound();
    if (status === 'loading') return <LoadingSpinner />;
    if (status !== 'authenticated') return null;
    if (!game) return (
        <GameWaitingScreen icon="🗣️" gameName="Taboo" lobbyId={lobbyId} players={[]} myUserId={myId} />
    );

    const myTeam = game.teams?.[myId] ?? null;
    const currentOratorId = game.currentTeam !== null
        ? (game.orators?.[String(game.currentTeam) as '0' | '1'] ?? null)
        : null;
    const isOrator = currentOratorId !== null && currentOratorId === myId;
    const isCurrentTeam = myTeam === game.currentTeam;
    const isGuesser = isCurrentTeam && !isOrator;
    const isAdversary = myTeam !== null && myTeam !== game.currentTeam;

    const timerPct = game.turnDuration > 0 ? game.turnTimeLeft / game.turnDuration : 0;
    const timerColor = timerPct > 0.5 ? '#22c55e' : timerPct > 0.25 ? '#f97316' : '#ef4444';
    const circumference = 2 * Math.PI * 56;

    const sendAttempt = () => {
        const w = attemptInput.trim();
        if (!w) return;
        socketRef.current?.emit('taboo:attempt', { lobbyId, word: w });
        setAttemptInput('');
    };

    const FONTS = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Bebas+Neue&display=swap');`;


    // ── Phase trap ────────────────────────────────────────────────────────────
    if (game.phase === 'trap') {
        return (
            <div className="flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white"
                style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <style>{FONTS}</style>
                <TopBar
                    centerSlot={<ScoreBar scores={game.scores} myTeam={myTeam} currentTeam={game.currentTeam} />}
                    rightSlot={
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Phase pièges</span>
                            <button
                                onClick={() => { if (confirm('Abandonner la partie ?')) socketRef.current?.emit('taboo:surrender'); }}
                                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 px-3 py-1.5 rounded-lg transition-all"
                            >
                                🏳️ Abandonner
                            </button>
                        </div>
                    }
                />
                <div className="flex items-center justify-center p-4 py-8">
                    <TrapPhase
                        game={{
                            ...game,
                            team0Slots: game.team0Slots ?? [],
                            team1Slots: game.team1Slots ?? [],
                        }}
                        myId={myId}
                        myTeam={myTeam}
                        lobbyId={lobbyId}
                        socketRef={socketRef}
                    />
                </div>
            </div>
        );
    }

    // ── Récap du tour ─────────────────────────────────────────────────────────
    if (game.phase === 'recap') {
        const teamWhoJustPlayed = game.currentTeam;
        const teamColor = teamWhoJustPlayed === 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400';
        const teamLabel = teamWhoJustPlayed === 0 ? '🔵 Équipe Bleue' : '🔴 Équipe Rouge';

        const resultLabel = game.lastTurnResult === 'validated'
            ? '✅ Mot trouvé !'
            : game.lastTurnResult === 'fail'
                ? '❌ Mot interdit !'
                : '⏱ Temps écoulé';
        const resultColor = game.lastTurnResult === 'validated'
            ? 'text-green-600 dark:text-green-400'
            : game.lastTurnResult === 'fail'
                ? 'text-red-600 dark:text-red-400'
                : 'text-orange-600 dark:text-orange-400';

        const wordJustPlayed = teamWhoJustPlayed === 0 ? game.team0Word : game.team1Word;
        const trapsUsed = teamWhoJustPlayed === 0 ? game.team1Traps : game.team0Traps;

        return (
            <div className="flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white"
                style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <style>{FONTS}</style>
                <TopBar
                    centerSlot={<ScoreBar scores={game.scores} myTeam={myTeam} currentTeam={game.currentTeam} />}
                    rightSlot={
                        <div className="flex items-center gap-2">
                            <span>Round {game.round}/{game.totalRounds}</span>
                            <button
                                onClick={() => { if (confirm('Abandonner la partie ?')) socketRef.current?.emit('taboo:surrender'); }}
                                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 px-3 py-1.5 rounded-lg transition-all"
                            >
                                🏳️ Abandonner
                            </button>
                        </div>
                    }
                />
                <div className="flex items-center justify-center p-4 py-8">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 max-w-sm w-full space-y-4">
                        <p className="text-xs text-gray-400 dark:text-white/30 uppercase tracking-widest text-center">Fin du tour</p>
                        <p style={{ fontFamily: "'Bebas Neue'" }} className={`text-3xl tracking-widest text-center ${teamColor}`}>{teamLabel}</p>
                        <p className={`text-xl font-bold text-center ${resultColor}`}>{resultLabel}</p>
                        <p className="text-gray-400 dark:text-white/30 text-xs text-center">Round {game.round}/{game.totalRounds}</p>

                        <div className="rounded-2xl border-2 border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/5 p-4 text-center">
                            <p className="text-xs text-gray-400 dark:text-white/30 uppercase tracking-widest mb-1">Mot mystère 👁</p>
                            <p style={{ fontFamily: "'Bebas Neue'" }} className="text-4xl tracking-widest text-yellow-600 dark:text-yellow-300">
                                {wordJustPlayed ?? '???'}
                            </p>
                        </div>

                        {trapsUsed.filter(t => t).length > 0 && (
                            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                                <p className="text-xs text-gray-400 dark:text-white/40 uppercase tracking-widest mb-2">🚫 Mots piégés</p>
                                <div className="flex flex-wrap gap-1 justify-center">
                                    {trapsUsed.filter(t => t).map((t, i) => (
                                        <span key={i} className="text-xs bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300 border border-red-300 dark:border-red-500/30 px-2 py-1 rounded-full">
                                            🚫 {t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {game.attempts.length > 0 && (
                            <div className="rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 text-left">
                                <p className="text-xs text-gray-400 dark:text-white/30 mb-2 uppercase tracking-widest">Tentatives du tour</p>
                                <AttemptsList attempts={game.attempts} />
                            </div>
                        )}

                        {isHost ? (
                            <button onClick={() => socketRef.current?.emit('taboo:nextTurn', { lobbyId })}
                                className="mt-2 w-full px-8 py-4 rounded-2xl bg-green-600 hover:bg-green-500 font-bold text-lg text-white transition-all shadow-lg shadow-green-500/20">
                                ➡ Tour suivant
                            </button>
                        ) : (
                            <p className="mt-2 text-center text-sm text-gray-400 dark:text-white/40 italic">En attente de l'hôte…</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── Entre deux tours ──────────────────────────────────────────────────────
    if (game.phase === 'between_turns') {
        const currentOratorName = currentOratorId
            ? (game.players.find(p => p.userId === currentOratorId)?.username ?? '?')
            : '?';
        const teamLabel = game.currentTeam === 0 ? '🔵 Équipe Bleue' : '🔴 Équipe Rouge';
        const teamColor = game.currentTeam === 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400';
        const playingTeamPlayers = game.players.filter(p => p.team === game.currentTeam);
        const guessers = playingTeamPlayers.filter(p => p.userId !== currentOratorId);
        const myTeamPlayers = game.players.filter(p => p.team === myTeam);

        return (
            <div className="flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white"
                style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <style>{FONTS}</style>
                <TopBar
                    centerSlot={<ScoreBar scores={game.scores} myTeam={myTeam} currentTeam={game.currentTeam} />}
                    rightSlot={
                        <div className="flex items-center gap-2">
                            <span>Round {game.round}/{game.totalRounds}</span>
                            <button
                                onClick={() => { if (confirm('Abandonner la partie ?')) socketRef.current?.emit('taboo:surrender'); }}
                                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 px-3 py-1.5 rounded-lg transition-all"
                            >
                                🏳️ Abandonner
                            </button>
                        </div>
                    }
                />
                <div className="flex items-center justify-center p-4 py-8">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 max-w-sm w-full space-y-4">
                        <p className="text-xs text-gray-400 dark:text-white/30 uppercase tracking-widest text-center">Prochain tour</p>
                        <p style={{ fontFamily: "'Bebas Neue'" }} className={`text-3xl tracking-widest text-center ${teamColor}`}>{teamLabel}</p>

                        <div className="space-y-1 text-sm text-center">
                            <p className="text-gray-500 dark:text-white/60">
                                Orateur : <span className="font-bold text-gray-900 dark:text-white">🎤 {currentOratorName}</span>
                            </p>
                            {guessers.length > 0 && (
                                <p className="text-gray-500 dark:text-white/60">
                                    {plural(guessers.length, 'Devineur', 'Devineurs')} :{' '}
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        {guessers.map(p => p.username).join(', ')}
                                    </span>
                                </p>
                            )}
                        </div>

                        {myTeam !== null && (
                            <p className="text-gray-500 dark:text-white/60 text-sm text-center">
                                Mon équipe :{' '}
                                <span className="font-bold text-gray-900 dark:text-white">
                                    {myTeamPlayers.map(p => p.username).join(', ')}
                                </span>
                            </p>
                        )}

                        {isCurrentTeam && (
                            <div className="p-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                                <p className="text-xs text-gray-400 dark:text-white/40 uppercase tracking-widest mb-1 text-center">Mot à trouver</p>
                                <p style={{ fontFamily: "'Bebas Neue'" }} className="text-3xl tracking-widest text-gray-400 dark:text-white/20 text-center">???</p>
                                <p className="text-xs text-gray-400 dark:text-white/30 mt-2 text-center">{isOrator ? 'Le mot vous sera révélé une fois prêt !' : "Écoutez l'orateur !"}</p>
                            </div>
                        )}

                        {isAdversary && (
                            <>
                                <div className="rounded-2xl border-2 border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/5 p-4 text-center">
                                    <p className="text-xs text-gray-400 dark:text-white/30 uppercase tracking-widest mb-2">Mot mystère 👁</p>
                                    <p style={{ fontFamily: "'Bebas Neue'" }} className="text-4xl tracking-widest text-yellow-600 dark:text-yellow-300">
                                        {game.currentWord ?? '???'}
                                    </p>
                                </div>
                                {game.currentTraps.length > 0 && (
                                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                                        <p className="text-xs text-gray-400 dark:text-white/40 uppercase tracking-widest mb-2">🚫 Vos mots piégés</p>
                                        <div className="flex flex-wrap gap-1 justify-center">
                                            {game.currentTraps.map((t, i) => (
                                                <span key={i} className="text-xs bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300 border border-red-300 dark:border-red-500/30 px-2 py-1 rounded-full">
                                                    🚫 {t}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {isCurrentTeam && (
                            <div className="mt-2 space-y-1">
                                <p className="text-xs text-gray-400 dark:text-white/30 uppercase tracking-widest mb-1 text-center">🎤 Choisir l'orateur</p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {game.players
                                        .filter(p => p.team === game.currentTeam)
                                        .map(p => {
                                            const isSelected = currentOratorId === p.userId;
                                            const isMe = p.userId === myId;
                                            return isMe ? (
                                                <button
                                                    key={p.userId}
                                                    onClick={() => socketRef.current?.emit('taboo:changeOrator', { lobbyId, userId: p.userId })}
                                                    className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all shadow-sm
                                                        ${isSelected
                                                            ? 'bg-green-100 dark:bg-green-500/20 border-green-400 dark:border-green-500/50 text-green-700 dark:text-green-300'
                                                            : 'bg-white dark:bg-white/10 border-blue-300 dark:border-blue-500/50 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/20 hover:border-blue-400 dark:hover:border-blue-400'}`}>
                                                    {isSelected ? '🎤 ' : ''}{p.username}
                                                </button>
                                            ) : (
                                                <span
                                                    key={p.userId}
                                                    className={`px-3 py-1.5 rounded-xl text-sm font-semibold border
                                                        ${isSelected
                                                            ? 'bg-green-100 dark:bg-green-500/20 border-green-400 dark:border-green-500/50 text-green-700 dark:text-green-300'
                                                            : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/30'}`}>
                                                    {isSelected ? '🎤 ' : ''}{p.username}
                                                </span>
                                            );
                                        })}
                                </div>
                            </div>
                        )}

                        {isOrator ? (
                            <button onClick={() => socketRef.current?.emit('taboo:startTurn', { lobbyId })}
                                className="mt-2 w-full px-8 py-4 rounded-2xl bg-green-600 hover:bg-green-500 font-bold text-lg text-white transition-all shadow-lg shadow-green-500/20">
                                ▶ Je suis prêt !
                            </button>
                        ) : (
                            <p className="text-gray-400 dark:text-white/30 text-sm mt-2 text-center">
                                {isAdversary ? '👀 Préparez-vous à surveiller !' : `En attente de ${currentOratorName}…`}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── Tour en cours (playing) ───────────────────────────────────────────────
    const currentOratorUsername = currentOratorId
        ? (game.players.find(p => p.userId === currentOratorId)?.username ?? '?')
        : '?';

    return (
        <div className="flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white"
            style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <style>{FONTS}</style>

            <TopBar
                centerSlot={<ScoreBar scores={game.scores} myTeam={myTeam} currentTeam={game.currentTeam} />}
                rightSlot={
                    <div className="flex items-center gap-2">
                        <span className="text-right leading-tight">
                            <span>Round {game.round}/{game.totalRounds}</span>
                            <span className="text-gray-400 dark:text-gray-500"> · 🎤 {currentOratorUsername}</span>
                        </span>
                        <button
                            onClick={() => { if (confirm('Abandonner la partie ?')) socketRef.current?.emit('taboo:surrender'); }}
                            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 px-3 py-1.5 rounded-lg transition-all"
                        >
                            🏳️ Abandonner
                        </button>
                    </div>
                }
            />

            <div className="flex flex-col items-center justify-center p-4 py-8 gap-4">

                <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 130 130">
                        <circle cx="65" cy="65" r="56" fill="none" stroke="rgba(0,0,0,0.08)" className="dark:[stroke:rgba(255,255,255,0.08)]" strokeWidth="10" />
                        <circle cx="65" cy="65" r="56" fill="none" stroke={timerColor} strokeWidth="10"
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference * (1 - timerPct)}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold" style={{ color: timerColor }}>
                            {game.paused ? '⏸' : game.turnTimeLeft}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-white/30">sec</span>
                    </div>
                </div>

                {isOrator && (
                    <div className="w-full max-w-sm space-y-3">
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                            <div className="rounded-3xl border-2 border-green-500/30 bg-green-50 dark:bg-green-500/5 p-6 text-center">
                                <p className="text-xs text-gray-400 dark:text-white/30 uppercase tracking-widest mb-2">Mot à faire deviner</p>
                                <p style={{ fontFamily: "'Bebas Neue'" }} className="text-5xl tracking-widest text-green-700 dark:text-green-300">
                                    {game.currentWord ?? '???'}
                                </p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
                            <p className="text-xs text-gray-400 dark:text-white/30 mb-2 uppercase tracking-widest">
                                Tentatives {game.attempts.length}/{game.maxAttempts}
                            </p>
                            <AttemptsList attempts={game.attempts} refEl={attemptsEndRef} />
                        </div>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => socketRef.current?.emit('taboo:pause', { lobbyId })}
                                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 font-semibold text-sm transition-colors text-gray-700 dark:text-white">
                                {game.paused ? '▶ Reprendre' : '⏸ Pause'}
                            </button>
                        </div>
                    </div>
                )}

                {isGuesser && (
                    <div className="w-full max-w-sm space-y-3">
                        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 p-6 text-center">
                            <p className="text-xs text-gray-400 dark:text-white/50 uppercase tracking-widest mb-2">Mot à trouver</p>
                            <p style={{ fontFamily: "'Bebas Neue'" }} className="text-5xl tracking-widest text-gray-400 dark:text-white/40">???</p>
                        </div>
                        {!game.paused && (
                            <div className="flex gap-2">
                                <input
                                    value={attemptInput}
                                    onChange={e => setAttemptInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && sendAttempt()}
                                    placeholder="Votre réponse…"
                                    className="flex-1 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl px-4 py-3 font-bold uppercase tracking-wider focus:outline-none focus:border-gray-500 dark:focus:border-white/50 placeholder:text-gray-400 dark:placeholder:text-white/20 text-gray-900 dark:text-white"
                                />
                                <button onClick={sendAttempt}
                                    className="px-4 py-3 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors text-gray-700 dark:text-white">↵</button>
                            </div>
                        )}
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
                            <p className="text-xs text-gray-400 dark:text-white/30 mb-2 uppercase tracking-widest">
                                Tentatives {game.attempts.length}/{game.maxAttempts}
                            </p>
                            <AttemptsList attempts={game.attempts} refEl={attemptsEndRef} />
                        </div>
                        <button onClick={() => socketRef.current?.emit('taboo:pause', { lobbyId })}
                            className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 font-semibold text-sm transition-colors text-gray-700 dark:text-white">
                            {game.paused ? '▶ Reprendre' : '⏸ Pause'}
                        </button>
                    </div>
                )}

                {isAdversary && !isOrator && (
                    <div className="w-full max-w-sm space-y-3">
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                            <div className="rounded-3xl border-2 border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/5 p-6 text-center">
                                <p className="text-xs text-gray-400 dark:text-white/30 uppercase tracking-widest mb-2">Mot mystère 👁</p>
                                <p style={{ fontFamily: "'Bebas Neue'" }} className="text-5xl tracking-widest text-yellow-600 dark:text-yellow-300">
                                    {game.currentWord ?? '???'}
                                </p>
                            </div>
                        </div>
                        {game.currentTraps.length > 0 && (
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                                <div className="p-5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-center">
                                    <p className="text-xs text-gray-400 dark:text-white/40 uppercase tracking-widest mb-3">🚫 Vos mots piégés</p>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {game.currentTraps.map((t, i) => (
                                            <span key={i} className="text-sm bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300 border border-red-300 dark:border-red-500/30 px-3 py-1.5 rounded-full font-semibold">
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
                            <p className="text-xs text-gray-400 dark:text-white/30 mb-2 uppercase tracking-widest">
                                Tentatives {game.attempts.length}/{game.maxAttempts}
                            </p>
                            <AttemptsList attempts={game.attempts} refEl={attemptsEndRef} />
                        </div>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => socketRef.current?.emit('taboo:pause', { lobbyId })}
                                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 font-semibold text-sm transition-colors text-gray-700 dark:text-white">
                                {game.paused ? '▶ Reprendre' : '⏸ Pause'}
                            </button>
                            <button onClick={() => socketRef.current?.emit('taboo:fail', { lobbyId })}
                                className="px-6 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 font-bold text-sm transition-colors text-white">
                                ❌ Mot interdit !
                            </button>
                        </div>
                    </div>
                )}

                {myTeam === null && (
                    <p className="text-gray-400 dark:text-white/30 text-sm">Vous observez la partie…</p>
                )}
            </div>

            {game.phase === 'finished' && !modalDismissed && (() => {
                const scores = Object.entries(game.scores).sort((a, b) => b[1] - a[1]);
                const isDraw = scores.length >= 2 && scores[0][1] === scores[1][1];
                const winner = scores[0];
                return (
                    <GameOverModal
                        title="Fin de partie !"
                        subtitle={isDraw ? 'Égalité !' : `Victoire de l'équipe ${winner[0] === '0' ? '🔵 Bleue' : '🔴 Rouge'} !`}
                        onLobby={() => router.push(`/lobby/create/${lobbyId}`)}
                        onLeave={() => router.push('/')}
                        onClose={() => setModalDismissed(true)}
                        asModal
                    >
                        <div className="flex gap-4 justify-center">
                            {scores.map(([team, pts], i) => (
                                <div key={team} className={`flex-1 text-center px-6 py-5 rounded-2xl border ${i === 0 ? 'bg-yellow-500/10 border-yellow-500/40' : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}>
                                    <div className="text-3xl mb-1">{team === '0' ? '🔵' : '🔴'}</div>
                                    <div className={`text-4xl font-black ${i === 0 ? 'text-yellow-400' : 'text-gray-500 dark:text-white/50'}`}>{pts}</div>
                                    <div className="text-xs text-gray-400 dark:text-white/30 mt-1">point{pts > 1 ? 's' : ''}</div>
                                </div>
                            ))}
                        </div>
                    </GameOverModal>
                );
            })()}
        </div>
    );
}
