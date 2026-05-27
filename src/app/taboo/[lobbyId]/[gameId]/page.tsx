// src/app/taboo/[lobbyId]/page.tsx
'use client';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';
import GameOverModal from '@/components/GameOverModal';
import GamePageHeader from '@/components/GamePageHeader';
import GameIcon from '@/components/GameIcon';
import TimerBar from '@/components/TimerBar';

import { useEffect, useRef, useState } from 'react';
import { notFound } from 'next/navigation';
import { useGamePage } from '@/hooks/useGamePage';
import { useTaboo } from '@/hooks/useTaboo';
import { TrapPhase } from '@/components/TrapPhase';
import { NoSymbolIcon, FlagIcon, EyeIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

import { useChat } from '@/context/ChatContext';
import { plural } from '@/lib/utils';
import TeamDot from '@/components/Taboo/TeamDot';
import ScoreBar from '@/components/Taboo/ScoreBar';
import AttemptsList, { type Attempt } from '@/components/Taboo/AttemptsList';
import { GameLogSidebar } from '@/components/GameLog';

const TABOO_LEFT = (
    <>
        <GameIcon gameType="taboo" className="shrink-0 w-5 h-5 text-gray-700 dark:text-gray-300" />
        <span className="hidden sm:block font-bold text-gray-900 dark:text-white truncate">Taboo</span>
    </>
);

// ── Page principale ───────────────────────────────────────────────────────────

export default function TabooGamePage() {
    const { session, status, router, lobbyId, isNotFound, setIsNotFound } = useGamePage();

    const myId = session?.user?.id ?? '';
    const username = session?.user?.username ?? session?.user?.email ?? 'User';

    const { socketRef, game, kickedPlayers } = useTaboo({
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
    if (status === 'loading') return <LoadingSpinner message="Vérification de la session..." />;
    if (status !== 'authenticated') return null;
    if (!game) return (
        <GameWaitingScreen gameType="taboo" gameName="Taboo" lobbyId={lobbyId} players={[]} myUserId={myId} />
    );

    const myTeam = game.teams?.[myId] ?? null;
    const currentOratorId = game.currentTeam !== null
        ? (game.orators?.[String(game.currentTeam) as '0' | '1'] ?? null)
        : null;
    const isOrator = currentOratorId !== null && currentOratorId === myId;
    const isCurrentTeam = myTeam === game.currentTeam;
    const isGuesser = isCurrentTeam && !isOrator;
    const isAdversary = myTeam !== null && myTeam !== game.currentTeam;

    const sendAttempt = () => {
        const w = attemptInput.trim();
        if (!w) return;
        socketRef.current?.emit('taboo:attempt', { lobbyId, word: w });
        setAttemptInput('');
    };



    // ── Phase trap ────────────────────────────────────────────────────────────
    if (game.phase === 'trap') {
        return (
            <div className="flex-1 flex flex-col mystery-table text-white">
                
                <GamePageHeader
                    left={TABOO_LEFT}
                    center={<ScoreBar scores={game.scores} myTeam={myTeam} currentTeam={game.currentTeam} />}
                    right={
                        <div className="flex items-center gap-2">
                            <span className="hidden sm:inline text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Phase pièges</span>
                            <button
                                onClick={() => { if (confirm('Abandonner la partie ?')) { socketRef.current?.emit('taboo:surrender'); router.push('/'); } }}
                                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 px-3 py-1.5 rounded-lg transition-all"
                            >
                                <span className="hidden sm:inline-flex items-center gap-1.5"><FlagIcon className="w-4 h-4" />Abandonner</span>
                                <FlagIcon className="w-4 h-4 sm:hidden" />
                            </button>
                        </div>
                    }
                />
                <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 lg:items-start justify-center">
                    <div className="w-full lg:flex-1 flex justify-center py-4">
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
                    <GameLogSidebar entries={game.log ?? []} />
                </div>
            </div>
        );
    }

    // ── Récap du tour ─────────────────────────────────────────────────────────
    if (game.phase === 'recap') {
        const teamWhoJustPlayed = game.currentTeam;
        const teamColor = teamWhoJustPlayed === 0 ? 'text-primary-600 dark:text-primary-400' : 'text-felt-700 dark:text-felt-400';
        const teamLabel = teamWhoJustPlayed === 0 ? (<><TeamDot team="0" className="w-4 h-4" /> Équipe Ambre</>) : (<><TeamDot team="1" className="w-4 h-4" /> Équipe Verte</>);

        const resultLabel = game.lastTurnResult === 'validated'
            ? (<><CheckCircleIcon className="w-5 h-5 inline-block align-middle text-green-500" /> Mot trouvé !</>)
            : game.lastTurnResult === 'fail'
                ? (<><XCircleIcon className="w-5 h-5 inline-block align-middle text-red-500" /> Mot interdit !</>)
                : game.lastTurnResult === 'max_attempts'
                    ? (<><XCircleIcon className="w-5 h-5 inline-block align-middle text-orange-500" /> Tentatives épuisées</>)
                    : '⏱ Temps écoulé';
        const resultColor = game.lastTurnResult === 'validated'
            ? 'text-green-600 dark:text-green-400'
            : game.lastTurnResult === 'fail'
                ? 'text-red-600 dark:text-red-400'
                : 'text-orange-600 dark:text-orange-400';

        const wordJustPlayed = teamWhoJustPlayed === 0 ? game.team0Word : game.team1Word;
        const trapsUsed = game.currentTraps.filter(t => t);

        return (
            <div className="flex-1 flex flex-col mystery-table text-white">
                
                <GamePageHeader
                    left={TABOO_LEFT}
                    center={<ScoreBar scores={game.scores} myTeam={myTeam} currentTeam={game.currentTeam} />}
                    right={
                        <div className="flex items-center gap-2">
                            <span className="hidden sm:inline">Round </span><span className="whitespace-nowrap">{game.round}/{game.totalRounds}</span>
                            <button
                                onClick={() => { if (confirm('Abandonner la partie ?')) { socketRef.current?.emit('taboo:surrender'); router.push('/'); } }}
                                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 px-3 py-1.5 rounded-lg transition-all"
                            >
                                <span className="hidden sm:inline-flex items-center gap-1.5"><FlagIcon className="w-4 h-4" />Abandonner</span>
                                <FlagIcon className="w-4 h-4 sm:hidden" />
                            </button>
                        </div>
                    }
                />
                <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 lg:items-start justify-center">
                    <div className="w-full lg:flex-1 flex justify-center py-4">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 max-w-sm w-full space-y-4">
                        <p className="text-xs text-gray-400 dark:text-white/30 uppercase tracking-widest text-center">Fin du tour</p>
                        <p className={`text-2xl font-bold text-center ${teamColor}`}>{teamLabel}</p>
                        <p className={`text-xl font-bold text-center ${resultColor}`}>{resultLabel}</p>
                        <p className="text-gray-400 dark:text-white/30 text-xs text-center">Round {game.round}/{game.totalRounds}</p>

                        <div className="rounded-2xl border-2 border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/5 p-4 text-center">
                            <p className="text-xs text-gray-400 dark:text-white/30 uppercase tracking-widest mb-1 inline-flex items-center justify-center gap-1.5">Mot mystère <EyeIcon className="w-3.5 h-3.5" /></p>
                            <p className="text-2xl sm:text-3xl md:text-4xl tracking-wider break-words leading-tight text-yellow-600 dark:text-yellow-300">
                                {wordJustPlayed ?? '???'}
                            </p>
                        </div>

                        {trapsUsed.length > 0 && (
                            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                                <p className="text-xs text-gray-400 dark:text-white/40 uppercase tracking-widest mb-2">Mots piégés</p>
                                <div className="flex flex-wrap gap-1 justify-center">
                                    {trapsUsed.map((t, i) => (
                                        <span key={i} className="text-xs bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300 border border-red-300 dark:border-red-500/30 px-2 py-1 rounded-full font-semibold">
                                            {t}
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
                                <span className="inline-flex items-center justify-center gap-2"><ArrowRightIcon className="w-5 h-5" /> Tour suivant</span>
                            </button>
                        ) : (
                            <p className="mt-2 text-center text-sm text-gray-400 dark:text-white/40 italic">En attente de l'hôte…</p>
                        )}
                    </div>
                    </div>
                    <GameLogSidebar entries={game.log ?? []} />
                </div>
            </div>
        );
    }

    // ── Entre deux tours ──────────────────────────────────────────────────────
    if (game.phase === 'between_turns') {
        const currentOratorName = currentOratorId
            ? (game.players.find(p => p.userId === currentOratorId)?.username ?? '?')
            : '?';
        const teamLabel = game.currentTeam === 0 ? (<><TeamDot team="0" className="w-4 h-4" /> Équipe Ambre</>) : (<><TeamDot team="1" className="w-4 h-4" /> Équipe Verte</>);
        const teamColor = game.currentTeam === 0 ? 'text-primary-600 dark:text-primary-400' : 'text-felt-700 dark:text-felt-400';
        const playingTeamPlayers = game.players.filter(p => p.team === game.currentTeam);
        const guessers = playingTeamPlayers.filter(p => p.userId !== currentOratorId);
        const myTeamPlayers = game.players.filter(p => p.team === myTeam);

        return (
            <div className="flex-1 flex flex-col mystery-table text-white">
                
                <GamePageHeader
                    left={TABOO_LEFT}
                    center={<ScoreBar scores={game.scores} myTeam={myTeam} currentTeam={game.currentTeam} />}
                    right={
                        <div className="flex items-center gap-2">
                            <span className="hidden sm:inline">Round </span><span className="whitespace-nowrap">{game.round}/{game.totalRounds}</span>
                            <button
                                onClick={() => { if (confirm('Abandonner la partie ?')) { socketRef.current?.emit('taboo:surrender'); router.push('/'); } }}
                                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 px-3 py-1.5 rounded-lg transition-all"
                            >
                                <span className="hidden sm:inline-flex items-center gap-1.5"><FlagIcon className="w-4 h-4" />Abandonner</span>
                                <FlagIcon className="w-4 h-4 sm:hidden" />
                            </button>
                        </div>
                    }
                />
                <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 lg:items-start justify-center">
                    <div className="w-full lg:flex-1 flex justify-center py-4">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 max-w-sm w-full space-y-4">
                        <p className="text-xs text-gray-400 dark:text-white/30 uppercase tracking-widest text-center">Prochain tour</p>
                        <p className={`text-2xl font-bold text-center ${teamColor}`}>{teamLabel}</p>

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
                                <p className="text-3xl tracking-wider text-gray-400 dark:text-white/20 text-center">???</p>
                                <p className="text-xs text-gray-400 dark:text-white/30 mt-2 text-center">{isOrator ? 'Le mot vous sera révélé une fois prêt !' : "Écoutez l'orateur !"}</p>
                            </div>
                        )}

                        {isAdversary && (
                            <>
                                <div className="rounded-2xl border-2 border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/5 p-4 text-center">
                                    <p className="text-xs text-gray-400 dark:text-white/30 uppercase tracking-widest mb-2 inline-flex items-center justify-center gap-1.5">Mot mystère <EyeIcon className="w-3.5 h-3.5" /></p>
                                    <p className="text-2xl sm:text-3xl md:text-4xl tracking-wider break-words leading-tight text-yellow-600 dark:text-yellow-300">
                                        {game.currentWord ?? '???'}
                                    </p>
                                </div>
                                {game.currentTraps.length > 0 && (
                                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                                        <p className="text-xs text-gray-400 dark:text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1 justify-center"><NoSymbolIcon className="w-3 h-3" /> Vos mots piégés</p>
                                        <div className="flex flex-wrap gap-1 justify-center">
                                            {game.currentTraps.map((t, i) => (
                                                <span key={i} className="text-xs bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300 border border-red-300 dark:border-red-500/30 px-2 py-1 rounded-full flex items-center gap-0.5">
                                                    <NoSymbolIcon className="w-3 h-3 flex-shrink-0" />{t}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {kickedPlayers.length > 0 && (
                            <div className="flex flex-wrap gap-1 justify-center">
                                {kickedPlayers.map(p => (
                                    <span key={p.userId} className="px-2 py-1 rounded-lg text-xs font-semibold line-through opacity-50 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/30">
                                        {p.username}
                                    </span>
                                ))}
                            </div>
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
                                                            : 'bg-white dark:bg-white/10 border-primary-300 dark:border-primary-500/50 text-primary-600 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-500/20 hover:border-primary-400 dark:hover:border-primary-400'}`}>
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
                                {isAdversary ? (<><EyeIcon className="w-4 h-4 inline-block align-middle" /> Préparez-vous à surveiller !</>) : `En attente de ${currentOratorName}…`}
                            </p>
                        )}
                    </div>
                    </div>
                    <GameLogSidebar entries={game.log ?? []} />
                </div>
            </div>
        );
    }

    // ── Tour en cours (playing) ───────────────────────────────────────────────
    const currentOratorUsername = currentOratorId
        ? (game.players.find(p => p.userId === currentOratorId)?.username ?? '?')
        : '?';

    return (
        <div className="flex-1 flex flex-col mystery-table text-white">
            

            <GamePageHeader
                left={TABOO_LEFT}
                center={<ScoreBar scores={game.scores} myTeam={myTeam} currentTeam={game.currentTeam} />}
                right={
                    <div className="flex items-center gap-2">
                        <span className="whitespace-nowrap text-xs sm:text-sm"><span className="hidden sm:inline">Round </span>{game.round}/{game.totalRounds}</span>
                        <button
                            onClick={() => { if (confirm('Abandonner la partie ?')) { socketRef.current?.emit('taboo:surrender'); router.push('/'); } }}
                            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 px-3 py-1.5 rounded-lg transition-all"
                        >
                            <FlagIcon className="w-4 h-4 inline-block align-middle" /> <span className="hidden sm:inline">Abandonner</span>
                        </button>
                    </div>
                }
            />

            <div className="shrink-0 px-4 py-1.5 bg-white/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400 text-center flex items-center justify-center gap-3 flex-wrap">
                <span>🎤 Orateur : <span className="font-semibold text-gray-900 dark:text-white">{currentOratorUsername}</span></span>
                {kickedPlayers.map(p => (
                    <span key={p.userId} className="line-through opacity-50">{p.username}</span>
                ))}
            </div>

            <TimerBar endsAt={game.turnDeadline ?? undefined} duration={game.turnDuration} paused={game.paused} />

            <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 lg:items-start">
              <div className="w-full lg:flex-1 flex flex-col items-center justify-center py-4 gap-4 min-w-0">

                {isOrator && (
                    <div className="w-full max-w-sm space-y-3">
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                            <div className="rounded-3xl border-2 border-green-500/30 bg-green-50 dark:bg-green-500/5 p-6 text-center">
                                <p className="text-xs text-gray-400 dark:text-white/30 uppercase tracking-widest mb-2">Mot à faire deviner</p>
                                <p className="text-3xl sm:text-4xl md:text-5xl tracking-wider break-words leading-tight text-green-700 dark:text-green-300">
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
                            <p className="text-4xl sm:text-5xl tracking-wider text-gray-400 dark:text-white/40">???</p>
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
                                <p className="text-xs text-gray-400 dark:text-white/30 uppercase tracking-widest mb-2 inline-flex items-center justify-center gap-1.5">Mot mystère <EyeIcon className="w-3.5 h-3.5" /></p>
                                <p className="text-3xl sm:text-4xl md:text-5xl tracking-wider break-words leading-tight text-yellow-600 dark:text-yellow-300">
                                    {game.currentWord ?? '???'}
                                </p>
                            </div>
                        </div>
                        {game.currentTraps.length > 0 && (
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                                <div className="p-5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-center">
                                    <p className="text-xs text-gray-400 dark:text-white/40 uppercase tracking-widest mb-3 flex items-center gap-1 justify-center"><NoSymbolIcon className="w-3 h-3" /> Vos mots piégés</p>
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
                                <span className="inline-flex items-center justify-center gap-1.5"><XCircleIcon className="w-4 h-4" />Mot interdit !</span>
                            </button>
                        </div>
                    </div>
                )}

                {myTeam === null && (
                    <p className="text-gray-400 dark:text-white/30 text-sm">Vous observez la partie…</p>
                )}
              </div>

              <GameLogSidebar entries={game.log ?? []} />
            </div>

            {game.phase === 'finished' && (() => {
                const scores = Object.entries(game.scores).sort((a, b) => b[1] - a[1]);
                const isDraw = scores.length >= 2 && scores[0][1] === scores[1][1];
                const winner = scores[0];
                return (
                    <GameOverModal
                        title="Fin de partie !"
                        subtitle={isDraw ? 'Égalité !' : `Victoire de l'équipe ${winner[0] === '0' ? 'Ambre' : 'Verte'} !`}
                        onLobby={() => router.push(`/lobby/create/${lobbyId}`)}
                        onLeave={() => router.push('/')}
                        asModal
                    >
                        <div className="flex gap-4 justify-center">
                            {scores.map(([team, pts], i) => (
                                <div key={team} className={`flex-1 text-center px-6 py-5 rounded-2xl border ${i === 0 ? 'bg-yellow-500/10 border-yellow-500/40' : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}>
                                    <div className="flex justify-center mb-1"><TeamDot team={team as '0' | '1'} className="w-8 h-8" /></div>
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
