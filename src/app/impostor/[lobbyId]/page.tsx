// src/app/impostor/[lobbyId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { getImpostorSocket } from '@/lib/socket';
import { useGamePage } from '@/hooks/useGamePage';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';
import GameOverModal from '@/components/GameOverModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type RoundState = 'WAITING' | 'WRITING' | 'REVEAL' | 'VOTING' | 'IMPOSTOR_GUESS' | 'END';
type Role = 'player' | 'impostor';
type Player = { id: string; name: string };
type Clue = { playerId: string; playerName: string; text: string };

type GameEndPayload = {
    winner: 'players' | 'impostor';
    impostorId: string;
    impostorName: string;
    word: string;
    scores: Record<string, number>;
    votes?: Record<string, string>;
    impostorCaught?: boolean;
    impostorGuess?: string | null;
    impostorGuessCorrect?: boolean;
    allClues?: { round: number; clues: Clue[] }[];
};

// ─── Timer ────────────────────────────────────────────────────────────────────

import TurnTimer from '@/components/TurnTimer';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImpostorPage() {
    const { session, status, me, router, lobbyId, isNotFound, setIsNotFound } = useGamePage();

    const [players, setPlayers] = useState<Player[]>([]);
    const [role, setRole] = useState<Role | null>(null);
    const [word, setWord] = useState<string | null>(null);
    const [roundState, setRoundState] = useState<RoundState>('WAITING');
    const [currentRound, setCurrentRound] = useState(1);
    const [totalRounds, setTotalRounds] = useState(1);

    // Writing phase
    const [speakingOrder, setSpeakingOrder] = useState<string[]>([]);
    const [currentSpeakerId, setCurrentSpeakerId] = useState<string>('');
    const [clueInput, setClueInput] = useState('');
    const [clueSubmitted, setClueSubmitted] = useState(false);
    const [submittedCount, setSubmittedCount] = useState(0);
    const [cluesThisRound, setCluesThisRound] = useState<Clue[]>([]);
    const [pastCluesByPlayer, setPastCluesByPlayer] = useState<Record<string, string[]>>({});

    // Unmask vote
    const [unmaskCount, setUnmaskCount] = useState(0);
    const [unmaskThreshold, setUnmaskThreshold] = useState(0);
    const [hasVotedUnmask, setHasVotedUnmask] = useState(false);

    // Reveal phase
    const [revealedClues, setRevealedClues] = useState<Clue[]>([]);
    const [isLastRound, setIsLastRound] = useState(false);

    // Voting phase
    const [votedFor, setVotedFor] = useState<string | null>(null);
    const [votedCount, setVotedCount] = useState(0);

    // Impostor guess phase
    const [guessInput, setGuessInput] = useState('');
    const [guessSubmitted, setGuessSubmitted] = useState(false);
    const [impostorGuessName, setImpostorGuessName] = useState('');

    // End
    const [gameEnd, setGameEnd] = useState<GameEndPayload | null>(null);

    const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
    const [timerDuration, setTimerDuration] = useState(60);

    const userId = me.userId;
    const socket = getImpostorSocket();

    function startTimer(seconds: number) {
        setTimerDuration(seconds);
        setTimerEndsAt(Date.now() + seconds * 1000);
    }

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/');
    }, [status, router]);

    useEffect(() => {
        if (!socket || !userId || !lobbyId) return;

        socket.emit('impostor:join', { lobbyId, userId, playerName: session?.user?.name ?? 'Joueur' });

        socket.on('notFound', () => setIsNotFound(true));
        socket.on('impostor:players', ({ players }: { players: Player[] }) => setPlayers(players));

        socket.on('impostor:gameStart', ({ role, word, players, totalRounds, speakingOrder }: {
            role: Role; word: string | null; players: Player[]; totalRounds: number; speakingOrder: string[];
        }) => {
            setRole(role);
            setWord(word);
            setPlayers(players);
            setTotalRounds(totalRounds);
            setSpeakingOrder(speakingOrder);
            setPastCluesByPlayer({});
        });

        socket.on('impostor:writingPhase', ({ round, totalRounds, speakingOrder, players }: {
            round: number; totalRounds: number; speakingOrder: string[]; players: Player[];
        }) => {
            setCurrentRound(round);
            setTotalRounds(totalRounds);
            setSpeakingOrder(speakingOrder);
            setPlayers(players);
            setClueInput('');
            setClueSubmitted(false);
            setSubmittedCount(0);
            setCluesThisRound([]);
            setUnmaskCount(0);
            setUnmaskThreshold(0);
            setHasVotedUnmask(false);
            setRoundState('WRITING');
        });

        socket.on('impostor:speakerTurn', ({ speakerId, index, total, timePerRound }: {
            speakerId: string; speakerName: string; index: number; total: number; timePerRound: number;
        }) => {
            setCurrentSpeakerId(speakerId);
            setSubmittedCount(index);
            setClueInput('');
            setClueSubmitted(false);
            startTimer(timePerRound ?? 60);
            void total;
        });

        socket.on('impostor:clueSubmitted', ({ playerId, playerName, text, submittedCount }: {
            playerId: string; playerName: string; text: string; submittedCount: number;
        }) => {
            setSubmittedCount(submittedCount);
            setCluesThisRound(prev => [...prev, { playerId, playerName, text }]);
        });

        socket.on('impostor:cluesRevealed', ({ clues, isLastRound }: {
            round: number; totalRounds: number; clues: Clue[]; isLastRound: boolean;
        }) => {
            setRevealedClues(clues);
            setIsLastRound(isLastRound);
            setPastCluesByPlayer(prev => {
                const next = { ...prev };
                for (const c of clues) {
                    if (c.text) next[c.playerId] = [...(next[c.playerId] ?? []), c.text];
                }
                return next;
            });
            setRoundState('REVEAL');
            setTimerEndsAt(null);
        });

        socket.on('impostor:unmaskVoteUpdate', ({ count, threshold }: {
            count: number; threshold: number; voters: string[];
        }) => {
            setUnmaskCount(count);
            setUnmaskThreshold(threshold);
        });

        socket.on('impostor:votingPhase', ({ players, round, timePerRound }: {
            players: Player[]; round: number; timePerRound: number;
        }) => {
            setPlayers(players);
            setCurrentRound(round);
            setVotedFor(null);
            setVotedCount(0);
            setRoundState('VOTING');
            startTimer(timePerRound ?? 60);
        });

        socket.on('impostor:voteUpdate', ({ votedCount }: { votedCount: number }) => setVotedCount(votedCount));

        socket.on('impostor:guessPhase', ({ impostorName }: { impostorId: string; impostorName: string }) => {
            setImpostorGuessName(impostorName);
            setGuessInput('');
            setGuessSubmitted(false);
            setRoundState('IMPOSTOR_GUESS');
            startTimer(30);
        });

        socket.on('impostor:gameEnd', (payload: GameEndPayload) => {
            setTimerEndsAt(null);
            setGameEnd(payload);
            setRoundState('END');
        });

        return () => {
            socket.off('notFound');
            socket.off('impostor:players');
            socket.off('impostor:gameStart');
            socket.off('impostor:writingPhase');
            socket.off('impostor:speakerTurn');
            socket.off('impostor:clueSubmitted');
            socket.off('impostor:cluesRevealed');
            socket.off('impostor:unmaskVoteUpdate');
            socket.off('impostor:votingPhase');
            socket.off('impostor:voteUpdate');
            socket.off('impostor:guessPhase');
            socket.off('impostor:gameEnd');
        };
    }, [socket, userId, lobbyId]);

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
                    // Regrouper par joueur : playerId → [indice round1, indice round2, ...]
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

    const phaseLabel: Record<RoundState, string> = {
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
                        onClick={() => { if (confirm('Abandonner la partie ?')) socket?.emit('impostor:surrender'); }}
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
            myUserId={userId} />
    );

    // ─── Phase d'écriture (tour par tour) ────────────────────────────────────

    if (roundState === 'WRITING') {
        const isMyTurn = currentSpeakerId === userId;
        const currentSpeakerName = players.find(p => p.id === currentSpeakerId)?.name ?? '…';

        return (
            <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
                {header}
                <main className="flex-1 overflow-auto p-4 flex flex-col items-center">
                    <div className="w-full max-w-lg space-y-4">
                        {roleBanner}

                        {/* Tour actuel */}
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
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && clueInput.trim()) {
                                                setClueSubmitted(true);
                                                socket?.emit('impostor:submitClue', { lobbyId, text: clueInput.trim() });
                                            }
                                        }}
                                        placeholder="Votre indice…"
                                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                    <button
                                        disabled={!clueInput.trim()}
                                        onClick={() => {
                                            setClueSubmitted(true);
                                            socket?.emit('impostor:submitClue', { lobbyId, text: clueInput.trim() });
                                        }}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition-colors">
                                        Envoyer
                                    </button>
                                </div>
                            )}
                            {isMyTurn && clueSubmitted && (
                                <div className="text-center py-3 mt-2 text-green-500 font-medium text-sm">✓ Indice envoyé</div>
                            )}
                        </div>

                        {/* Ordre de passage */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Ordre de passage</h3>
                            <div className="flex flex-col gap-2">
                                {speakingOrder.map((id, i) => {
                                    const p = players.find(pl => pl.id === id);
                                    const clue = cluesThisRound.find(c => c.playerId === id);
                                    const past = pastCluesByPlayer[id] ?? [];
                                    const allForPlayer = clue?.text
                                        ? [...past, clue.text]
                                        : past;
                                    const done = !!clue;
                                    const current = id === currentSpeakerId;
                                    return (
                                        <div key={id} className={`flex items-start justify-between gap-2 px-3 py-1.5 rounded-lg text-sm transition-all
                                            ${current ? 'bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 font-semibold'
                                                : done ? 'text-gray-400 dark:text-gray-500'
                                                    : 'text-gray-600 dark:text-gray-400'}`}>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="w-5 text-center text-xs flex-shrink-0">{done ? '✓' : current ? '▶' : i + 1}</span>
                                                <span className={done ? 'line-through' : ''}>{p?.name ?? id}{id === userId ? ' (moi)' : ''}</span>
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

                        {/* Bouton Démasquer */}
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
                                    onClick={() => {
                                        setHasVotedUnmask(true);
                                        socket?.emit('impostor:requestUnmask', { lobbyId });
                                    }}
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
            <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
                {header}
                <main className="flex-1 overflow-auto p-4 flex flex-col items-center">
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
            <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
                {header}
                <main className="flex-1 overflow-auto p-4 flex flex-col items-center">
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
                                {players.filter(p => p.id !== userId).map(p => (
                                    <button key={p.id} disabled={!!votedFor}
                                        onClick={() => { setVotedFor(p.id); socket?.emit('impostor:vote', { lobbyId, targetId: p.id }); }}
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
            <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
                {header}
                <main className="flex-1 overflow-auto p-4 flex flex-col items-center">
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
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && guessInput.trim()) {
                                                setGuessSubmitted(true);
                                                socket?.emit('impostor:guessWord', { lobbyId, guess: guessInput.trim() });
                                            }
                                        }}
                                        placeholder="Le mot secret est…"
                                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                    <button disabled={!guessInput.trim()}
                                        onClick={() => { setGuessSubmitted(true); socket?.emit('impostor:guessWord', { lobbyId, guess: guessInput.trim() }); }}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition-colors">
                                        Deviner
                                    </button>
                                </div>
                            )}
                            {isImpostor && guessSubmitted && (
                                <p className="text-green-500 font-medium text-sm">Réponse envoyée…</p>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return <LoadingSpinner />;
}
