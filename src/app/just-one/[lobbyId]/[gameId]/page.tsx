// src/app/just-one/[lobbyId]/page.tsx
'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import { useGamePage } from '@/hooks/useGamePage';
import { useJustOne } from '@/hooks/useJustOne';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';
import GameOverModal from '@/components/GameOverModal';
import TurnTimer from '@/components/TurnTimer';

// ─── Composants ───────────────────────────────────────────────────────────────

function PlayerBadge({ name, submitted, isGuesser, isMe }: {
    name: string; submitted: boolean; isGuesser: boolean; isMe: boolean;
}) {
    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all
            ${isGuesser
                ? 'border-yellow-400/50 bg-yellow-400/10 text-yellow-600 dark:text-yellow-300'
                : submitted
                    ? 'border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                ${isGuesser ? 'bg-yellow-400' : submitted ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
            <span>{name}{isMe ? ' (moi)' : ''}</span>
            {isGuesser && <span>👁️</span>}
            {!isGuesser && submitted && <span>✅</span>}
        </div>
    );
}

function ScoreBadge({ score }: { score: number }) {
    return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <span className="text-xs text-blue-500 dark:text-blue-400 font-semibold">Score</span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-300">{score}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">/13</span>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JustOnePage() {
    const { status, router, me: meInfo, lobbyId, isNotFound, setIsNotFound } = useGamePage();

    const {
        players,
        guesserId,
        guesserName,
        roundState,
        card,
        score,
        round,
        timerEndsAt,
        timerDuration,
        submittedPlayers,
        myClue,
        setMyClue,
        clueSubmitted,
        validatedClues,
        validClues,
        myGuess,
        setMyGuess,
        lastResult,
        history,
        finalScore,
        currentWordIndex,
        isGuesser,
        pickWord,
        submitClue,
        submitGuess,
        surrender,
    } = useJustOne({
        lobbyId,
        userId: meInfo.userId,
        username: meInfo.username ?? '',
        onNotFound: () => setIsNotFound(true),
    });

    const [showHistory, setShowHistory] = useState(false);

    const me = meInfo.userId;

    if (status === 'loading') return <LoadingSpinner />;
    if (isNotFound) notFound();
    if (status !== 'authenticated') return null;

    if (roundState === 'WAITING' && !guesserName) return (
        <GameWaitingScreen icon="🔤" gameName="Just One" lobbyId={lobbyId}
            players={players.map(p => ({ userId: p.id, username: p.name }))}
            myUserId={me} />
    );

    const renderPhase = () => {

        // END GAME
        if (roundState === 'END_GAME' && finalScore) {
            return (
                <GameOverModal
                    emoji={finalScore.score >= 10 ? '🏆' : finalScore.score >= 7 ? '🎉' : '😅'}
                    title={`${finalScore.score}/13`}
                    subtitle={finalScore.level}
                    onLobby={() => router.push(`/lobby/create/${lobbyId}`)}
                    onLeave={() => router.push('/')}
                    asModal
                />
            );
        }

        // RESOLUTION
        if (roundState === 'RESOLUTION' && lastResult) {
            const emoji = lastResult.result === 'CORRECT' ? '✅' : lastResult.result === 'PASS' ? '⏭️' : '❌';
            const label = lastResult.result === 'CORRECT' ? 'Bonne réponse !'
                : lastResult.result === 'PASS' ? 'Passé'
                    : lastResult.reason === 'NO_VALID_CLUES' ? 'Aucun indice valide !' : 'Mauvaise réponse !';
            const color = lastResult.result === 'CORRECT' ? 'text-green-600 dark:text-green-400'
                : lastResult.result === 'PASS' ? 'text-gray-500 dark:text-gray-400'
                    : 'text-red-500 dark:text-red-400';
            return (
                <div className="text-center space-y-4">
                    <div className="text-5xl">{emoji}</div>
                    <p className={`text-xl font-bold ${color}`}>{label}</p>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-6 py-3 inline-block">
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Le mot était</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-widest">{lastResult.targetWord}</p>
                    </div>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Prochaine manche dans quelques secondes…</p>
                </div>
            );
        }

        // WAITING
        if (roundState === 'WAITING') {
            if (isGuesser) {
                return (
                    <div className="text-center space-y-4">
                        <div className="text-4xl">👁️</div>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">C'est ton tour de deviner !</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Choisis un numéro de 1 à 5.</p>
                        {timerEndsAt && <TurnTimer endsAt={timerEndsAt} duration={timerDuration} />}
                        <div className="flex justify-center gap-3 flex-wrap">
                            {[1, 2, 3, 4, 5].map(i => (
                                <button key={i}
                                    onClick={() => pickWord(i - 1)}
                                    className="w-14 h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xl font-bold transition-all shadow-lg shadow-blue-500/20 hover:scale-105">
                                    {i}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            }
            return (
                <div className="text-center space-y-3">
                    <div className="text-4xl animate-pulse">⏳</div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        <span className="font-semibold text-gray-900 dark:text-white">{guesserName}</span> choisit son mot…
                    </p>
                    {timerEndsAt && <TurnTimer endsAt={timerEndsAt} duration={timerDuration} />}
                    {card && (
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 mt-2">
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-wider">La carte</p>
                            <div className="grid grid-cols-5 gap-2">
                                {card.words.map((w, i) => (
                                    <div key={i} className="flex flex-col items-center gap-1">
                                        <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold">{i + 1}</span>
                                        <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-2 py-2 text-center">
                                            <span className="text-xs font-bold text-gray-900 dark:text-white">{w}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // WRITE CLUES
        if (roundState === 'WRITE_CLUES') {
            if (isGuesser) {
                return (
                    <div className="text-center space-y-4">
                        <div className="text-4xl">🤫</div>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">Les autres écrivent leurs indices…</p>
                        {timerEndsAt && <TurnTimer endsAt={timerEndsAt} duration={timerDuration} />}
                        <div className="flex flex-wrap gap-2 justify-center">
                            {players.filter(p => p.id !== guesserId).map(p => (
                                <PlayerBadge key={p.id} name={p.name}
                                    submitted={submittedPlayers.includes(p.id)}
                                    isGuesser={false} isMe={p.id === me} />
                            ))}
                        </div>
                    </div>
                );
            }
            return (
                <div className="space-y-4">
                    <div className="text-center">
                        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Mot mystère</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-widest">
                            {card && currentWordIndex !== null ? card.words[currentWordIndex] : '???'}
                        </p>
                    </div>
                    {timerEndsAt && <TurnTimer endsAt={timerEndsAt} duration={timerDuration} />}
                    {!clueSubmitted ? (
                        <div className="space-y-3">
                            <input
                                type="text"
                                value={myClue}
                                onChange={e => setMyClue(e.target.value.toUpperCase())}
                                onKeyDown={e => { if (e.key === 'Enter' && myClue.trim()) submitClue(); }}
                                placeholder="Ton indice…"
                                maxLength={30}
                                autoFocus
                                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-lg font-semibold text-center uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition-all"
                            />
                            <button
                                onClick={submitClue}
                                disabled={!myClue.trim()}
                                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all">
                                Envoyer mon indice
                            </button>
                        </div>
                    ) : (
                        <div className="text-center space-y-2">
                            <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
                                <p className="text-xs text-green-600 dark:text-green-400">Indice envoyé ✅</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{myClue}</p>
                            </div>
                            <p className="text-xs text-gray-400 dark:text-gray-500">En attente des autres joueurs…</p>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2 justify-center">
                        {players.filter(p => p.id !== guesserId).map(p => (
                            <PlayerBadge key={p.id} name={p.name}
                                submitted={p.id === me ? clueSubmitted : submittedPlayers.includes(p.id)}
                                isGuesser={false} isMe={p.id === me} />
                        ))}
                    </div>
                </div>
            );
        }

        // VALIDATE CLUES
        if (roundState === 'VALIDATE_CLUES') {
            return (
                <div className="space-y-4">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider text-center">Indices soumis</p>
                    <div className="space-y-2">
                        {validatedClues.map((c, i) => (
                            <div key={i} className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-semibold
                                ${c.valid
                                    ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300'
                                    : 'border-red-500/30 bg-red-500/10 text-red-500 dark:text-red-400 line-through opacity-60'}`}>
                                <span>{c.value}</span>
                                {c.valid ? <span>✅</span> : <span>❌</span>}
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center">En attente du devineur…</p>
                </div>
            );
        }

        // GUESS PHASE
        if (roundState === 'GUESS_PHASE') {
            if (isGuesser) {
                return (
                    <div className="space-y-4">
                        <p className="text-center text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Tes indices</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {validClues.map((c, i) => (
                                <div key={i} className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-700 dark:text-blue-300 font-semibold text-sm">
                                    {c}
                                </div>
                            ))}
                        </div>
                        {timerEndsAt && <TurnTimer endsAt={timerEndsAt} duration={timerDuration} />}
                        <input
                            type="text"
                            value={myGuess}
                            onChange={e => setMyGuess(e.target.value.toUpperCase())}
                            onKeyDown={e => { if (e.key === 'Enter' && myGuess.trim()) submitGuess(myGuess.trim()); }}
                            placeholder="Ta réponse…"
                            maxLength={30}
                            autoFocus
                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-lg font-semibold text-center uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition-all"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => submitGuess(null)}
                                className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-sm font-semibold hover:border-gray-400 transition-all">
                                ⏭️ Passer
                            </button>
                            <button
                                onClick={() => { if (!myGuess.trim()) return; submitGuess(myGuess.trim()); }}
                                disabled={!myGuess.trim()}
                                className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all">
                                ✅ Valider
                            </button>
                        </div>
                    </div>
                );
            }
            return (
                <div className="text-center space-y-3">
                    <div className="text-4xl animate-bounce">🤔</div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        <span className="font-semibold text-gray-900 dark:text-white">{guesserName}</span> est en train de deviner…
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mt-3">
                        {validClues.map((c, i) => (
                            <div key={i} className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-700 dark:text-blue-300 font-semibold text-sm">
                                {c}
                            </div>
                        ))}
                    </div>
                    {timerEndsAt && <TurnTimer endsAt={timerEndsAt} duration={timerDuration} />}
                </div>
            );
        }

        return null;
    };

    return (
        <div className="flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">

            <header className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center gap-4">
                <div className="w-48 shrink-0">
                    <span className="font-bold text-gray-900 dark:text-white">🔤 Just One</span>
                </div>
                <div className="flex-1 flex justify-center">
                    <div className="text-center">
                        {round > 0 && (
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Manche {round}/13</p>
                        )}
                        {guesserName && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {isGuesser ? 'Tu devines' : <>👁️ <span className="font-medium">{guesserName}</span> devine</>}
                            </p>
                        )}
                    </div>
                </div>
                <div className="w-48 shrink-0 flex justify-end items-center gap-2">
                    <ScoreBadge score={score} />
                    <button onClick={() => setShowHistory(h => !h)}
                        className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-all">
                        📜 Historique
                    </button>
                    {roundState !== 'WAITING' && roundState !== 'END_GAME' && (
                        <button
                            onClick={() => { if (confirm('Abandonner la partie ?')) surrender(); }}
                            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 px-3 py-1.5 rounded-lg transition-all"
                        >
                            🏳️ Abandonner
                        </button>
                    )}
                </div>
            </header>

            <div className="shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 flex flex-wrap gap-2">
                {players.map(p => (
                    <PlayerBadge
                        key={p.id}
                        name={p.name}
                        submitted={submittedPlayers.includes(p.id) || (p.id === me && clueSubmitted)}
                        isGuesser={p.id === guesserId}
                        isMe={p.id === me}
                    />
                ))}
            </div>

            <main className="p-4 flex flex-col items-center">
                <div className="w-full max-w-lg space-y-4">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                        {renderPhase()}
                    </div>

                    {showHistory && history.length > 0 && (
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-2">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Historique</p>
                            {[...history].reverse().map((h, i) => (
                                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                    <span className="text-gray-400 dark:text-gray-500">Manche {h.round}</span>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">{h.targetWord}</span>
                                    <span>{h.result === 'CORRECT' ? '✅' : h.result === 'PASS' ? '⏭️' : '❌'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
