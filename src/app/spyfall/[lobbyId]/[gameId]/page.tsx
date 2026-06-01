// src/app/spyfall/[lobbyId]/[gameId]/page.tsx
'use client';

import { notFound } from 'next/navigation';
import { useGamePage } from '@/hooks/useGamePage';
import { useSpyfall } from '@/hooks/useSpyfall';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';
import GameIcon from '@/components/GameIcon';
import GameOverModal from '@/components/GameOverModal';
import TimerBar from '@/components/TimerBar';
import GamePageHeader from '@/components/GamePageHeader';
import SurrenderButton from '@/components/SurrenderButton';
import AfkCountdown from '@/components/AfkCountdown';
import { GameLogSidebar } from '@/components/GameLog';
import { TrophyIcon, FaceFrownIcon, CheckCircleIcon, XCircleIcon, EyeSlashIcon, MapPinIcon, UserIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function SpyfallPage() {
    const { session, status, me, router, lobbyId, isNotFound, setIsNotFound } = useGamePage();

    const {
        players, role, location, yourRole, board, roundState,
        askerId, askerName, exchangeCount, totalExchanges,
        voteRequestCount, voteRequestThreshold, hasRequestedVote,
        votedFor, pendingVoteFor, votedCount,
        spyName, guessResult, gameEnd,
        timerEndsAt, timerDuration, inactivityUserId, inactivityEndsAt, kickedPlayerIds, log,
        ask, requestVote, declareSpy, vote, confirmVote, guessLocation, surrender,
    } = useSpyfall({
        lobbyId,
        userId: me.userId,
        playerName: session?.user?.name ?? 'Joueur',
        onNotFound: () => setIsNotFound(true),
    });

    if (status === 'loading') return <LoadingSpinner message="Vérification de la session..." />;
    if (isNotFound) notFound();

    const isSpy = role === 'spy';

    // ─── Fin de partie ────────────────────────────────────────────────────────

    if (roundState === 'END' && gameEnd) {
        const iWon = (gameEnd.winner === 'civilians' && !isSpy) || (gameEnd.winner === 'spy' && isSpy);
        const sortedScores = Object.entries(gameEnd.scores ?? {})
            .sort(([, a], [, b]) => b - a)
            .map(([id, pts]) => ({ id, pts, name: players.find(p => p.id === id)?.name ?? id }));
        return (
            <GameOverModal
                icon={iWon ? <TrophyIcon className="w-8 h-8 text-amber-500" /> : <FaceFrownIcon className="w-8 h-8 text-gray-400" />}
                title={gameEnd.winner === 'civilians' ? 'Les civils ont gagné !' : "L'espion a gagné !"}
                subtitle={`Lieu : "${gameEnd.location}" — Espion : ${gameEnd.spyName ?? '?'}`}
                onLobby={() => router.push(`/lobby/create/${lobbyId}`)}
                onLeave={() => router.push('/')}
                asModal
            >
                {gameEnd.spyGuess != null && (
                    <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium mt-2
                        ${gameEnd.spyGuessCorrect
                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                            : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                        <span>Lieu deviné par l'espion :</span>
                        <span className="font-bold flex items-center gap-1">{gameEnd.spyGuessCorrect ? <CheckCircleIcon className="w-4 h-4" /> : <XCircleIcon className="w-4 h-4" />} {gameEnd.spyGuess}</span>
                    </div>
                )}
                <div className="space-y-1 mt-2">
                    {sortedScores.map((p, i) => {
                        const votedForId = gameEnd.votes?.[p.id];
                        const votedForName = votedForId ? (players.find(pl => pl.id === votedForId)?.name ?? votedForId) : null;
                        const votedCorrectly = votedForId === gameEnd.spyId;
                        return (
                            <div key={p.id} className="flex justify-between items-center px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 gap-2">
                                <span className="text-gray-700 dark:text-gray-300 text-sm flex-shrink-0 flex items-center gap-1">{i + 1}. {p.name}{p.id === gameEnd.spyId ? <EyeSlashIcon className="w-3.5 h-3.5 text-red-400" /> : null}</span>
                                {votedForName && p.id !== gameEnd.spyId && (
                                    <span className={`text-xs truncate ${votedCorrectly ? 'text-green-400' : 'text-gray-500'}`}>→ {votedForName}</span>
                                )}
                                <span className="text-gray-900 dark:text-white font-bold text-sm flex-shrink-0">{p.pts} pts</span>
                            </div>
                        );
                    })}
                </div>
            </GameOverModal>
        );
    }

    // ─── Shared header ────────────────────────────────────────────────────────

    const phaseLabel: Record<typeof roundState, string> = {
        WAITING: 'En attente',
        ASKING: 'Interrogatoire',
        VOTING: 'Vote',
        SPY_GUESS: 'Devinette',
        END: '',
    };

    const header = (
        <GamePageHeader
            left={<><GameIcon gameType="spyfall" className="w-5 h-5 text-gray-700 dark:text-gray-300" /><span className="font-bold">Spyfall</span></>}
            center={<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                {roundState === 'ASKING' && <span className="font-semibold text-gray-900 dark:text-white">Échange {Math.min(exchangeCount + 1, totalExchanges)}/{totalExchanges}</span>}
                <span>{phaseLabel[roundState]}</span>
            </div>}
            right={<>
                {role && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isSpy ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30' : 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30'}`}>
                        {isSpy ? <><EyeSlashIcon className="w-3.5 h-3.5 inline mr-1" />Espion</> : <><UserIcon className="w-3.5 h-3.5 inline mr-1" />Civil</>}
                    </span>
                )}
                {roundState !== 'WAITING' && roundState !== 'END' && <SurrenderButton onSurrender={surrender} />}
            </>}
        />
    );

    // ─── Rôle banner ──────────────────────────────────────────────────────────

    const roleBanner = role && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium
            ${isSpy
                ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                : 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400'}`}>
            {isSpy ? <EyeSlashIcon className="w-8 h-8 flex-shrink-0" /> : <MapPinIcon className="w-8 h-8 flex-shrink-0" />}
            <div>
                <div className="font-bold">{isSpy ? "Vous êtes l'espion !" : 'Vous êtes un civil'}</div>
                {!isSpy && location && <div>Lieu : <span className="font-bold text-blue-600 dark:text-blue-400">{location}</span>{yourRole && <> — rôle : <span className="font-bold">{yourRole}</span></>}</div>}
                {isSpy && <div>Devinez le lieu sans vous faire repérer !</div>}
            </div>
        </div>
    );

    // ─── Board (candidate locations) ──────────────────────────────────────────

    const boardCard = (clickable: boolean) => (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                Lieux possibles{clickable ? ' — choisissez le bon' : ''}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {board.map(loc => (
                    <button key={loc} disabled={!clickable}
                        onClick={() => clickable && guessLocation(loc)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium text-left transition-colors border
                            ${clickable
                                ? 'bg-gray-50 dark:bg-gray-800 hover:bg-red-500/15 border-transparent hover:border-red-500/40 text-gray-700 dark:text-gray-300 cursor-pointer'
                                : 'bg-gray-50 dark:bg-gray-800/60 border-transparent text-gray-500 dark:text-gray-400 cursor-default'}`}>
                        {loc}
                    </button>
                ))}
            </div>
        </div>
    );

    const timerBar = <TimerBar endsAt={timerEndsAt} duration={timerDuration} />;

    // ─── Attente ──────────────────────────────────────────────────────────────

    if (roundState === 'WAITING') return (
        <GameWaitingScreen gameType="spyfall" gameName="Spyfall" lobbyId={lobbyId}
            players={players.map(p => ({ userId: p.id, username: p.name }))}
            myUserId={me.userId} />
    );

    // ─── Phase d'interrogatoire ────────────────────────────────────────────────

    if (roundState === 'ASKING') {
        const isMyTurn = askerId === me.userId;
        return (
            <div className="flex-1 flex flex-col mystery-table text-white">
                {header}
                {timerBar}
                <main className="flex-1 p-4 flex flex-col lg:flex-row lg:items-start lg:justify-center gap-4">
                    <div className="w-full max-w-lg space-y-4">
                        {roleBanner}

                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                            <div className="text-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">C'est au tour de</p>
                                <p className={`text-xl font-bold ${isMyTurn ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                                    {isMyTurn ? 'Vous' : (askerName || '…')}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {isMyTurn
                                        ? 'Posez votre question à l\'oral, puis désignez la personne interrogée.'
                                        : `${askerName || 'Le joueur'} interroge quelqu'un à l'oral.`}
                                </p>
                            </div>

                            {isMyTurn && (
                                <div className="mt-4">
                                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Je passe la parole à…</p>
                                    <div className="flex flex-col gap-2">
                                        {players.filter(p => p.id !== me.userId).map(p => {
                                            const kicked = kickedPlayerIds.includes(p.id);
                                            return (
                                                <button key={p.id} disabled={kicked}
                                                    onClick={() => !kicked && ask(p.id)}
                                                    className={`w-full py-2.5 px-4 rounded-xl font-medium text-left transition-all
                                                        ${kicked ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800 text-gray-400'
                                                            : 'bg-gray-100 dark:bg-gray-800 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/40 text-gray-700 dark:text-gray-300'}`}>
                                                    <span className={kicked ? 'line-through' : ''}>{p.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {boardCard(false)}

                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Passer au vote</p>
                                    {voteRequestThreshold > 0 && (
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{voteRequestCount}/{voteRequestThreshold} joueurs</p>
                                    )}
                                </div>
                                <button disabled={hasRequestedVote} onClick={requestVote}
                                    className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors flex-shrink-0
                                        ${hasRequestedVote ? 'bg-orange-500/20 text-orange-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}>
                                    {hasRequestedVote ? <><CheckCircleIcon className="w-4 h-4 inline mr-1" />Demandé</> : 'Demander un vote'}
                                </button>
                            </div>
                            {isSpy && (
                                <button onClick={declareSpy}
                                    className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-700 text-white transition-colors">
                                    <EyeSlashIcon className="w-4 h-4 inline mr-1" />Je suis l'espion — deviner le lieu
                                </button>
                            )}
                        </div>

                        {(inactivityUserId && inactivityEndsAt != null) && (
                            <div className="text-center text-xs text-amber-300/80">
                                {players.find(p => p.id === inactivityUserId)?.name ?? 'Un joueur'} inactif <AfkCountdown endsAt={inactivityEndsAt} />
                            </div>
                        )}
                    </div>
                    <GameLogSidebar entries={log ?? []} />
                </main>
            </div>
        );
    }

    // ─── Vote ──────────────────────────────────────────────────────────────────

    if (roundState === 'VOTING') {
        return (
            <div className="flex-1 flex flex-col mystery-table text-white">
                {header}
                {timerBar}
                <main className="flex-1 p-4 flex flex-col lg:flex-row lg:items-start lg:justify-center gap-4">
                    <div className="w-full max-w-lg space-y-4">
                        {roleBanner}
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-5">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="font-bold text-gray-900 dark:text-white">Qui est l'espion ?</h2>
                                    <span className="text-xs text-gray-400">{votedCount}/{players.length}</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {players.filter(p => p.id !== me.userId).map(p => {
                                        const kicked = kickedPlayerIds.includes(p.id);
                                        const isPending = pendingVoteFor === p.id;
                                        const isConfirmed = votedFor === p.id;
                                        return (
                                            <button key={p.id} disabled={!!votedFor || kicked}
                                                onClick={() => !kicked && vote(p.id)}
                                                className={`w-full py-3 px-4 rounded-xl font-medium transition-all text-left
                                                    ${kicked ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800 text-gray-400'
                                                        : isConfirmed ? 'bg-red-500 text-white cursor-not-allowed'
                                                            : isPending ? 'bg-red-500/15 border border-red-500/50 text-red-600 dark:text-red-400'
                                                                : votedFor ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                                                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-red-500/10 border border-transparent text-gray-700 dark:text-gray-300'}`}>
                                                <span className="flex items-center gap-2">
                                                    <span className={kicked ? 'line-through' : ''}>{p.name}</span>
                                                    {isConfirmed && <span className="text-xs opacity-75">← votre vote</span>}
                                                    {inactivityUserId === p.id && inactivityEndsAt != null && <AfkCountdown endsAt={inactivityEndsAt} />}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            {!votedFor ? (
                                <button disabled={!pendingVoteFor} onClick={confirmVote}
                                    className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-colors bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white">
                                    Valider mon vote
                                </button>
                            ) : (
                                <p className="text-center text-sm text-gray-400">En attente des autres…</p>
                            )}
                        </div>
                    </div>
                    <GameLogSidebar entries={log ?? []} />
                </main>
            </div>
        );
    }

    // ─── Phase devinette espion ────────────────────────────────────────────────

    if (roundState === 'SPY_GUESS') {
        return (
            <div className="flex-1 flex flex-col mystery-table text-white">
                {header}
                {timerBar}
                <main className="flex-1 p-4 flex flex-col lg:flex-row lg:items-start lg:justify-center gap-4">
                    <div className="w-full max-w-lg space-y-4">
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 text-center space-y-3">
                            <MagnifyingGlassIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500" />
                            <h2 className="font-bold text-gray-900 dark:text-white text-lg">
                                {isSpy ? 'À vous de deviner le lieu !' : `${spyName || "L'espion"} tente de deviner le lieu…`}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {isSpy ? 'Choisissez le lieu où vous pensez vous trouver.' : 'Si l\'espion trouve, il vole la victoire.'}
                            </p>
                            {guessResult && (
                                <div className={`rounded-xl px-4 py-3 font-semibold text-sm flex items-center justify-center gap-2 ${guessResult.correct ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                                    {guessResult.correct
                                        ? <><CheckCircleIcon className="w-5 h-5 flex-shrink-0" /> Bien joué ! Le lieu était « {guessResult.location} »</>
                                        : <><XCircleIcon className="w-5 h-5 flex-shrink-0" /> Raté. Le lieu était « {guessResult.location} »</>}
                                </div>
                            )}
                        </div>
                        {isSpy && !guessResult && boardCard(true)}
                    </div>
                    <GameLogSidebar entries={log ?? []} />
                </main>
            </div>
        );
    }

    return <LoadingSpinner message="Chargement du jeu..." />;
}
