// src/app/impostor/[lobbyId]/page.tsx
'use client';

import { notFound } from 'next/navigation';
import { useGamePage } from '@/hooks/useGamePage';
import { useImpostor } from '@/hooks/useImpostor';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';
import GameOverModal from '@/components/GameOverModal';
import TurnTimer from '@/components/TurnTimer';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImpostorPage() {
    const { session, status, me, router, lobbyId, isNotFound, setIsNotFound } = useGamePage();

    const {
        players,
        role,
        word,
        roundState,
        currentRound,
        totalRounds,
        speakingOrder,
        currentSpeakerId,
        clueInput,
        setClueInput,
        clueSubmitted,
        submittedCount,
        cluesThisRound,
        pastCluesByPlayer,
        unmaskCount,
        unmaskThreshold,
        hasVotedUnmask,
        revealedClues,
        isLastRound,
        votedFor,
        votedCount,
        guessInput,
        setGuessInput,
        guessSubmitted,
        impostorGuessName,
        wordGuessResult,
        gameEnd,
        timerEndsAt,
        timerDuration,
        submitClue,
        requestUnmask,
        vote,
        guessWord,
        surrender,
    } = useImpostor({
        lobbyId,
        userId: me.userId,
        playerName: session?.user?.name ?? 'Joueur',
        onNotFound: () => setIsNotFound(true),
    });

    if (status === 'loading') return <LoadingSpinner />;
    if (isNotFound) notFound();

    // ─── Fin de partie ────────────────────────────────────────────────────────

    if (roundState === 'END' && gameEnd) {
        const iWon = (gameEnd.winner === 'players' && role === 'player') ||
            (gameEnd.winner === 'impostor' && role === 'impostor');
        const sortedScores = Object.entries(gameEnd.scores ?? {})
            .sort(([, a], [, b]) => b - a)
            .map(([id, pts]) => ({ id, pts, name: players.find(p => p.id === id)?.name ?? id }));
        return (
            <GameOverModal
                emoji={iWon ? '🎉' : '😔'}
                title={gameEnd.winner === 'players' ? 'Les joueurs ont gagné !' : "L'imposteur a gagné !"}
                subtitle={`Mot secret : "${gameEnd.word}" — Imposteur : ${gameEnd.impostorName}`}
                onLobby={() => router.push(`/lobby/create/${lobbyId}`)}
                onLeave={() => router.push('/')}
                asModal
            >
                {gameEnd.impostorGuess != null && (
                    <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium mt-2
                        ${gameEnd.impostorGuessCorrect
                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                            : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                        <span>Réponse de l'imposteur :</span>
                        <span className="font-bold">{gameEnd.impostorGuessCorrect ? '✓' : '✗'} {gameEnd.impostorGuess}</span>
                    </div>
                )}
                <div className="space-y-1 mt-2">
                    {sortedScores.map((p, i) => {
                        const votedForId = gameEnd.votes?.[p.id];
                        const votedForName = votedForId ? (players.find(pl => pl.id === votedForId)?.name ?? votedForId) : null;
                        const votedCorrectly = votedForId === gameEnd.impostorId;
                        return (
                            <div key={p.id} className="flex justify-between items-center px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 gap-2">
                                <span className="text-gray-700 dark:text-gray-300 text-sm flex-shrink-0">{i + 1}. {p.name}{p.id === gameEnd.impostorId ? ' 🕵️' : ''}</span>
                                {votedForName && p.id !== gameEnd.impostorId && (
                                    <span className={`text-xs truncate ${votedCorrectly ? 'text-green-400' : 'text-gray-500'}`}>
                                        → {votedForName}
                                    </span>
                                )}
                                <span className="text-gray-900 dark:text-white font-bold text-sm flex-shrink-0">{p.pts} pts</span>
                            </div>
                        );
                    })}
                </div>
                {gameEnd.allClues && gameEnd.allClues.length > 0 && (() => {
                    const byPlayer: Record<string, { name: string; clues: string[] }> = {};
                    for (const { clues } of gameEnd.allClues) {
                        for (const c of clues) {
                            if (!byPlayer[c.playerId]) byPlayer[c.playerId] = { name: c.playerName, clues: [] };
                            if (c.text) byPlayer[c.playerId].clues.push(c.text);
                        }
                    }
                    const ordered = sortedScores
                        .map(p => ({ id: p.id, ...byPlayer[p.id] }))
                        .filter(p => p.clues?.length);
                    if (!ordered.length) return null;
                    return (
                        <div className="mt-3 space-y-1.5">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Historique des indices</p>
                            {ordered.map(p => (
                                <div key={p.id} className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                    <span className="text-gray-500 dark:text-gray-400 text-xs">{p.name}{p.id === gameEnd.impostorId ? ' 🕵️' : ''} — </span>
                                    <span className="text-gray-800 dark:text-gray-200 text-sm italic">{p.clues.join(', ')}</span>
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </GameOverModal>
        );
    }

    // ─── Shared header ────────────────────────────────────────────────────────

    const phaseLabel: Record<typeof roundState, string> = {
        WAITING: 'En attente',
        WRITING: 'Indices',
        REVEAL: 'Révélation',
        VOTING: 'Vote',
        IMPOSTOR_GUESS: 'Devinette',
        END: '',
    };

    const header = (
        <header className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center gap-4">
            <div className="w-48 shrink-0 font-bold">🎭 Imposteur</div>
            <div className="flex-1 flex justify-center text-sm text-gray-600 dark:text-gray-400 gap-2 items-center">
                {roundState !== 'WAITING' && (
                    <span className="font-semibold text-gray-900 dark:text-white">
                        Round {currentRound}/{totalRounds}
                    </span>
                )}
                <span>{phaseLabel[roundState]}</span>
            </div>
            <div className="w-48 shrink-0 flex justify-end items-center gap-2">
                {role && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                        ${role === 'impostor'
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
                            : 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30'}`}>
                        {role === 'impostor' ? '🎭 Imposteur' : '🧑 Joueur'}
                    </span>
                )}
                {roundState !== 'WAITING' && roundState !== 'END' && (
                    <button
                        onClick={() => { if (confirm('Abandonner la partie ?')) surrender(); }}
                        className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 px-3 py-1.5 rounded-lg transition-all"
                    >
                        🏳️ Abandonner
                    </button>
                )}
            </div>
        </header>
    );

    // ─── Rôle banner ──────────────────────────────────────────────────────────

    const roleBanner = role && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium
            ${role === 'impostor'
                ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                : 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400'}`}>
            <span className="text-2xl">{role === 'impostor' ? '🎭' : '🧑'}</span>
            <div>
                <div className="font-bold">{role === 'impostor' ? "Vous êtes l'imposteur !" : 'Vous êtes un joueur normal'}</div>
                {role === 'player' && word && <div>Mot secret : <span className="font-bold text-blue-600 dark:text-blue-400">{word}</span></div>}
                {role === 'impostor' && <div>Devinez le mot secret grâce aux indices !</div>}
            </div>
        </div>
    );

    // ─── Attente ──────────────────────────────────────────────────────────────

    if (roundState === 'WAITING') return (
        <GameWaitingScreen icon="🎭" gameName="Imposteur" lobbyId={lobbyId}
            players={players.map(p => ({ userId: p.id, username: p.name }))}
            myUserId={me.userId} />
    );

    // ─── Phase d'écriture (tour par tour) ────────────────────────────────────

    if (roundState === 'WRITING') {
        const isMyTurn = currentSpeakerId === me.userId;
        const currentSpeakerName = players.find(p => p.id === currentSpeakerId)?.name ?? '…';

        return (
            <div className="flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
                {header}
                <main className="p-4 flex flex-col items-center">
                    <div className="w-full max-w-lg space-y-4">
                        {roleBanner}

                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-bold text-gray-900 dark:text-white">Round {currentRound}/{totalRounds}</h2>
                                <span className="text-xs text-gray-400">{submittedCount}/{speakingOrder.length} joué</span>
                            </div>
                            {timerEndsAt && <TurnTimer endsAt={timerEndsAt} duration={timerDuration} />}
                            <div className="mt-4 text-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">C'est au tour de</p>
                                <p className={`text-xl font-bold ${isMyTurn ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                                    {isMyTurn ? 'Vous' : currentSpeakerName}
                                </p>
                                {isMyTurn && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {role === 'impostor' ? 'Vous ne connaissez pas le mot — improvisez !' : 'Donnez un indice sans révéler le mot.'}
                                    </p>
                                )}
                            </div>
                            {isMyTurn && !clueSubmitted && (
                                <div className="flex gap-2 mt-4">
                                    <input
                                        autoFocus
                                        value={clueInput}
                                        onChange={e => setClueInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && clueInput.trim()) submitClue(); }}
                                        placeholder="Votre indice…"
                                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                    <button
                                        disabled={!clueInput.trim()}
                                        onClick={submitClue}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition-colors">
                                        Envoyer
                                    </button>
                                </div>
                            )}
                            {isMyTurn && clueSubmitted && (
                                <div className="text-center py-3 mt-2 text-green-500 font-medium text-sm">✓ Indice envoyé</div>
                            )}
                        </div>

                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Ordre de passage</h3>
                            <div className="flex flex-col gap-2">
                                {speakingOrder.map((id, i) => {
                                    const p = players.find(pl => pl.id === id);
                                    const clue = cluesThisRound.find(c => c.playerId === id);
                                    const past = pastCluesByPlayer[id] ?? [];
                                    const allForPlayer = clue?.text ? [...past, clue.text] : past;
                                    const done = !!clue;
                                    const current = id === currentSpeakerId;
                                    return (
                                        <div key={id} className={`flex items-start justify-between gap-2 px-3 py-1.5 rounded-lg text-sm transition-all
                                            ${current ? 'bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 font-semibold'
                                                : done ? 'text-gray-400 dark:text-gray-500'
                                                    : 'text-gray-600 dark:text-gray-400'}`}>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="w-5 text-center text-xs flex-shrink-0">{done ? '✓' : current ? '▶' : i + 1}</span>
                                                <span className={done ? 'line-through' : ''}>{p?.name ?? id}{id === me.userId ? ' (moi)' : ''}</span>
                                            </div>
                                            {allForPlayer.length > 0 && (
                                                <span className="text-gray-700 dark:text-gray-300 font-semibold text-sm text-right">
                                                    {allForPlayer.join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Démasquer l'imposteur</p>
                                    {unmaskThreshold > 0 && (
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                            {unmaskCount}/{unmaskThreshold} joueurs — passe directement à la devinette
                                        </p>
                                    )}
                                </div>
                                <button
                                    disabled={hasVotedUnmask}
                                    onClick={requestUnmask}
                                    className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors flex-shrink-0
                                        ${hasVotedUnmask
                                            ? 'bg-orange-500/20 text-orange-400 cursor-not-allowed'
                                            : 'bg-orange-500 hover:bg-orange-600 text-white'}`}
                                >
                                    {hasVotedUnmask ? '✓ Demandé' : '🎭 Démasquer'}
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // ─── Révélation des indices ───────────────────────────────────────────────

    if (roundState === 'REVEAL') {
        return (
            <div className="flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
                {header}
                <main className="p-4 flex flex-col items-center">
                    <div className="w-full max-w-lg space-y-4">
                        {roleBanner}
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                            <h2 className="font-bold text-gray-900 dark:text-white mb-4">Indices du round {currentRound}/{totalRounds}</h2>
                            <div className="flex flex-col gap-2">
                                {revealedClues.map(c => (
                                    <div key={c.playerId} className="flex justify-between items-center px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                                        <span className="text-xs text-gray-400 dark:text-gray-500">{c.playerName}</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">{c.text || <em className="text-gray-400">—</em>}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
                                {isLastRound ? 'Phase de vote en cours de chargement…' : `Round ${currentRound + 1} dans quelques secondes…`}
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // ─── Phase de vote ────────────────────────────────────────────────────────

    if (roundState === 'VOTING') {
        return (
            <div className="flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
                {header}
                <main className="p-4 flex flex-col items-center">
                    <div className="w-full max-w-lg space-y-4">
                        {roleBanner}
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="font-bold text-gray-900 dark:text-white">Vote final</h2>
                                <span className="text-xs text-gray-400">{votedCount}/{players.length}</span>
                            </div>
                            {timerEndsAt && <TurnTimer endsAt={timerEndsAt} duration={timerDuration} />}
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 mb-4">Qui est l'imposteur ?</p>
                            <div className="flex flex-col gap-2">
                                {players.filter(p => p.id !== me.userId).map(p => (
                                    <button key={p.id} disabled={!!votedFor}
                                        onClick={() => vote(p.id)}
                                        className={`w-full py-3 px-4 rounded-xl font-medium transition-all text-left
                                            ${votedFor === p.id ? 'bg-red-500 text-white'
                                                : votedFor ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-red-500/10 border border-transparent text-gray-700 dark:text-gray-300'}`}>
                                        {p.name}{votedFor === p.id ? ' ← votre vote' : ''}
                                    </button>
                                ))}
                            </div>
                            {votedFor && <p className="text-center text-sm text-gray-400 mt-3">En attente des autres…</p>}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // ─── Phase devinette imposteur ────────────────────────────────────────────

    if (roundState === 'IMPOSTOR_GUESS') {
        const isImpostor = role === 'impostor';
        return (
            <div className="flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
                {header}
                <main className="p-4 flex flex-col items-center">
                    <div className="w-full max-w-lg">
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 text-center space-y-4">
                            <div className="text-4xl">🕵️</div>
                            <h2 className="font-bold text-gray-900 dark:text-white text-lg">
                                {isImpostor ? 'Vous avez été démasqué !' : `${impostorGuessName} a été démasqué !`}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {isImpostor ? 'Connaissez-vous le mot secret ? Tentez votre chance !' : "L'imposteur tente de deviner le mot secret…"}
                            </p>
                            {timerEndsAt && <TurnTimer endsAt={timerEndsAt} duration={timerDuration} />}
                            {isImpostor && !guessSubmitted && (
                                <div className="flex gap-2">
                                    <input
                                        value={guessInput}
                                        onChange={e => setGuessInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && guessInput.trim()) guessWord(); }}
                                        placeholder="Le mot secret est…"
                                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                    <button disabled={!guessInput.trim()}
                                        onClick={guessWord}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition-colors">
                                        Deviner
                                    </button>
                                </div>
                            )}
                            {isImpostor && guessSubmitted && !wordGuessResult && (
                                <p className="text-green-500 font-medium text-sm">Réponse envoyée…</p>
                            )}
                            {wordGuessResult && (
                                <div className={`rounded-xl px-4 py-3 font-semibold text-sm ${wordGuessResult.correct ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                                    {wordGuessResult.correct
                                        ? `✅ Bonne réponse ! Le mot était « ${wordGuessResult.word} »`
                                        : `❌ Mauvaise réponse. Le mot était « ${wordGuessResult.word} »`}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return <LoadingSpinner />;
}
