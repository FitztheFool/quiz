// src/app/just-one/[lobbyId]/page.tsx
'use client';

import { notFound } from 'next/navigation';
import { useGamePage } from '@/hooks/useGamePage';
import { useJustOne } from '@/hooks/useJustOne';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';
import GameIcon from '@/components/GameIcon';
import GameOverModal from '@/components/GameOverModal';
import TimerBar from '@/components/TimerBar';
import GamePageHeader from '@/components/GamePageHeader';
import SurrenderButton from '@/components/SurrenderButton';
import AfkCountdown from '@/components/AfkCountdown';
import { GameLogSidebar } from '@/components/GameLog';
import { TrophyIcon, StarIcon, FaceSmileIcon, ClockIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon, XCircleIcon, ForwardIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

// ─── Composants ───────────────────────────────────────────────────────────────

function PlayerBadge({ name, submitted, isGuesser, isMe, inactivityEndsAt, kicked }: {
    name: string; submitted: boolean; isGuesser: boolean; isMe: boolean; inactivityEndsAt?: number | null; kicked?: boolean;
}) {
    if (kicked) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-gray-100/40 dark:bg-gray-800/40 text-xs font-medium opacity-50">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-gray-300 dark:bg-gray-600" />
                <span className="line-through">{name}{isMe ? ' (moi)' : ''}</span>
            </div>
        );
    }
    const isInactive = inactivityEndsAt != null;
    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all
            ${isInactive
                ? 'border-orange-400/60 bg-orange-400/10 text-orange-600 dark:text-orange-300'
                : isGuesser
                    ? 'border-yellow-400/50 bg-yellow-400/10 text-yellow-600 dark:text-yellow-300'
                    : submitted
                        ? 'border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                ${isInactive ? 'bg-orange-400' : isGuesser ? 'bg-yellow-400' : submitted ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
            <span>{name}{isMe ? ' (moi)' : ''}</span>
            {isGuesser && <EyeIcon className="w-3 h-3" />}
            {!isGuesser && submitted && <CheckCircleIcon className="w-3 h-3" />}
            {isInactive && <AfkCountdown endsAt={inactivityEndsAt!} />}
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
        cluesPerPlayer,
        myClue,
        setMyClue,
        myClue2,
        setMyClue2,
        clueSubmitted,
        validatedClues,
        validClues,
        myGuess,
        setMyGuess,
        lastResult,
        finalScore,
        currentWordIndex,
        inactivityUserId,
        inactivityEndsAt,
        kickedPlayers,
        isGuesser,
        log,
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


    const me = meInfo.userId;

    if (status === 'loading') return <LoadingSpinner message="Vérification de la session..." />;
    if (isNotFound) notFound();
    if (status !== 'authenticated') return null;

    if (roundState === 'WAITING' && !guesserName) return (
        <GameWaitingScreen gameType="just_one" gameName="Just One" lobbyId={lobbyId}
            players={players.map(p => ({ userId: p.id, username: p.name }))}
            myUserId={me} />
    );

    const renderPhase = () => {

        // END GAME
        if (roundState === 'END_GAME' && finalScore) {
            return (
                <GameOverModal
                    icon={finalScore.score >= 10 ? <TrophyIcon className="w-8 h-8 text-amber-500" /> : finalScore.score >= 7 ? <StarIcon className="w-8 h-8 text-blue-400" /> : <FaceSmileIcon className="w-8 h-8 text-gray-400" />}
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
            const icon = lastResult.result === 'CORRECT'
                ? <CheckCircleIcon className="w-12 h-12 mx-auto text-green-500" />
                : lastResult.result === 'PASS'
                    ? <ForwardIcon className="w-12 h-12 mx-auto text-gray-400" />
                    : <XCircleIcon className="w-12 h-12 mx-auto text-red-500" />;
            const label = lastResult.result === 'CORRECT' ? 'Bonne réponse !'
                : lastResult.result === 'PASS' ? 'Passé'
                    : lastResult.reason === 'NO_VALID_CLUES' ? 'Aucun indice valide !' : 'Mauvaise réponse !';
            const color = lastResult.result === 'CORRECT' ? 'text-green-600 dark:text-green-400'
                : lastResult.result === 'PASS' ? 'text-gray-500 dark:text-gray-400'
                    : 'text-red-500 dark:text-red-400';
            return (
                <div className="text-center space-y-4">
                    {icon}
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
                        <EyeIcon className="w-12 h-12 mx-auto text-blue-500" />
                        <p className="text-lg font-bold text-gray-900 dark:text-white">C'est ton tour de deviner !</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Choisis un numéro de 1 à 5.</p>
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
                    <ClockIcon className="w-12 h-12 mx-auto text-gray-400 animate-pulse" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        <span className="font-semibold text-gray-900 dark:text-white">{guesserName}</span> choisit son mot…
                    </p>
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
                        <EyeSlashIcon className="w-12 h-12 mx-auto text-gray-400" />
                        <p className="text-lg font-bold text-gray-900 dark:text-white">Les autres écrivent leurs indices…</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {players.filter(p => p.id !== guesserId).map(p => (
                                <PlayerBadge key={p.id} name={p.name}
                                    submitted={submittedPlayers.includes(p.id)}
                                    isGuesser={false} isMe={p.id === me}
                                    inactivityEndsAt={inactivityUserId === p.id ? inactivityEndsAt : null} />
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
                    {!clueSubmitted ? (
                        <div className="space-y-3">
                            <input
                                type="text"
                                value={myClue}
                                onChange={e => setMyClue(e.target.value.toUpperCase())}
                                onKeyDown={e => { if (e.key === 'Enter' && myClue.trim() && (cluesPerPlayer < 2 || myClue2.trim())) submitClue(); }}
                                placeholder={cluesPerPlayer >= 2 ? 'Indice 1…' : 'Ton indice…'}
                                maxLength={30}
                                autoFocus
                                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-lg font-semibold text-center uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition-all"
                            />
                            {cluesPerPlayer >= 2 && (
                                <input
                                    type="text"
                                    value={myClue2}
                                    onChange={e => setMyClue2(e.target.value.toUpperCase())}
                                    onKeyDown={e => { if (e.key === 'Enter' && myClue.trim() && myClue2.trim()) submitClue(); }}
                                    placeholder="Indice 2…"
                                    maxLength={30}
                                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-lg font-semibold text-center uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition-all"
                                />
                            )}
                            <button
                                onClick={submitClue}
                                disabled={!myClue.trim() || (cluesPerPlayer >= 2 && !myClue2.trim())}
                                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all">
                                {cluesPerPlayer >= 2 ? 'Envoyer mes 2 indices' : 'Envoyer mon indice'}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center space-y-2">
                            <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
                                <p className="text-xs text-green-600 dark:text-green-400 flex items-center justify-center gap-1"><CheckCircleIcon className="w-3 h-3" /> Indices envoyés</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{myClue}{cluesPerPlayer >= 2 && myClue2 ? ` · ${myClue2}` : ''}</p>
                            </div>
                            <p className="text-xs text-gray-400 dark:text-gray-500">En attente des autres joueurs…</p>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2 justify-center">
                        {players.filter(p => p.id !== guesserId).map(p => (
                            <PlayerBadge key={p.id} name={p.name}
                                submitted={p.id === me ? clueSubmitted : submittedPlayers.includes(p.id)}
                                isGuesser={false} isMe={p.id === me}
                                inactivityEndsAt={inactivityUserId === p.id ? inactivityEndsAt : null} />
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
                                {c.valid ? <CheckCircleIcon className="w-4 h-4 text-green-500" /> : <XCircleIcon className="w-4 h-4 text-red-400" />}
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
                                <ForwardIcon className="w-4 h-4 inline mr-1" />Passer
                            </button>
                            <button
                                onClick={() => { if (!myGuess.trim()) return; submitGuess(myGuess.trim()); }}
                                disabled={!myGuess.trim()}
                                className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all">
                                <CheckCircleIcon className="w-4 h-4 inline mr-1" />Valider
                            </button>
                        </div>
                    </div>
                );
            }
            return (
                <div className="text-center space-y-3">
                    <QuestionMarkCircleIcon className="w-12 h-12 mx-auto text-gray-400 animate-bounce" />
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
                </div>
            );
        }

        return null;
    };

    return (
        <div className="flex-1 flex flex-col casino-felt text-gray-100">

            <GamePageHeader
                left={<><GameIcon gameType="just_one" className="w-5 h-5 text-gray-700 dark:text-gray-300" /><span className="font-bold">Just One</span></>}
                center={<div className="text-center leading-tight">
                    {round > 0 && <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Manche {round}/13 · <span className="text-blue-500">{score} pt{score !== 1 ? 's' : ''}</span></p>}
                    {guesserName && <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">{isGuesser ? 'Tu devines' : <><EyeIcon className="w-3 h-3" /><span className="font-medium">{guesserName}</span> devine</>}</p>}
                </div>}
                right={roundState !== 'WAITING' && roundState !== 'END_GAME' && <SurrenderButton onSurrender={surrender} />}
            />

            <TimerBar endsAt={timerEndsAt} duration={timerDuration} />

            <div className="shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 flex flex-wrap gap-2">
                {players.map(p => (
                    <PlayerBadge
                        key={p.id}
                        name={p.name}
                        submitted={submittedPlayers.includes(p.id) || (p.id === me && clueSubmitted)}
                        isGuesser={p.id === guesserId}
                        isMe={p.id === me}
                        inactivityEndsAt={inactivityUserId === p.id ? inactivityEndsAt : null}
                    />
                ))}
                {kickedPlayers.map(p => (
                    <PlayerBadge key={p.id} name={p.name} submitted={false} isGuesser={false} isMe={p.id === me} kicked />
                ))}
            </div>

            <main className="flex-1 p-4 flex flex-col lg:flex-row items-start justify-center gap-4">
                <div className="w-full max-w-lg space-y-4">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                        {renderPhase()}
                    </div>

                </div>

                <GameLogSidebar entries={log ?? []} />
            </main>
        </div>
    );
}
