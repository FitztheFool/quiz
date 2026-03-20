// src/app/just-one/[lobbyId]/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getJustOneSocket } from '@/lib/socket';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useChat } from '@/context/ChatContext';
import GameOverModal from '@/components/GameOverModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type RoundState = 'WAITING' | 'WRITE_CLUES' | 'VALIDATE_CLUES' | 'GUESS_PHASE' | 'RESOLUTION' | 'END_GAME';
type Player = { id: string; name: string };
type Clue = { playerId: string; value: string; valid: boolean };
type RoundResult = {
    result: 'CORRECT' | 'LOST' | 'PASS';
    reason?: 'NO_VALID_CLUES' | 'WRONG_GUESS';
    score: number;
    targetWord: string;
};
type HistoryEntry = RoundResult & { round: number };

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
                    : 'border-gray-200 dark:border-slate-700/50 bg-gray-100 dark:bg-slate-800/40 text-gray-500 dark:text-slate-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                ${isGuesser ? 'bg-yellow-400' : submitted ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`} />
            <span>{name}{isMe ? ' (moi)' : ''}</span>
            {isGuesser && <span>👁️</span>}
            {!isGuesser && submitted && <span>✅</span>}
        </div>
    );
}

function Timer({ seconds, max }: { seconds: number; max: number }) {
    const pct = Math.min((seconds / max) * 100, 100);
    const color = seconds > max * 0.4 ? 'from-green-500 to-emerald-500'
        : seconds > max * 0.2 ? 'from-yellow-500 to-orange-500'
            : 'from-red-500 to-rose-500';
    return (
        <div className="flex items-center gap-3">
            <span className={`text-lg font-bold tabular-nums w-10 ${seconds <= max * 0.2 ? 'text-red-500' : 'text-gray-700 dark:text-slate-300'}`}>
                {seconds}s
            </span>
            <div className="flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000`}
                    style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function ScoreBadge({ score }: { score: number }) {
    return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <span className="text-xs text-blue-500 dark:text-blue-400 font-semibold">Score</span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-300">{score}</span>
            <span className="text-xs text-gray-400 dark:text-slate-500">/13</span>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JustOnePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams<{ lobbyId: string }>();
    const lobbyId = params?.lobbyId ?? '';

    const socket = useMemo(() => getJustOneSocket(), []);
    const joinedRef = useRef(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const [players, setPlayers] = useState<Player[]>([]);
    const [guesserId, setGuesserId] = useState<string | null>(null);
    const [guesserName, setGuesserName] = useState('');
    const [roundState, setRoundState] = useState<RoundState>('WAITING');
    const [card, setCard] = useState<{ words: string[] } | null>(null);
    const [score, setScore] = useState(0);
    const [round, setRound] = useState(0);
    const [timerSeconds, setTimerSeconds] = useState(60);
    const [timerMax, setTimerMax] = useState(60);

    const [submittedPlayers, setSubmittedPlayers] = useState<string[]>([]);
    const [myClue, setMyClue] = useState('');
    const [clueSubmitted, setClueSubmitted] = useState(false);

    const [validatedClues, setValidatedClues] = useState<Clue[]>([]);
    const [validClues, setValidClues] = useState<string[]>([]);
    const [myGuess, setMyGuess] = useState('');

    const [lastResult, setLastResult] = useState<RoundResult | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [finalScore, setFinalScore] = useState<{ score: number; level: string } | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);

    const { setLobbyId } = useChat();

    useEffect(() => {
        setLobbyId(lobbyId);
        return () => setLobbyId(null);
    }, [lobbyId]);

    const me = session?.user?.id ?? '';
    const myName = session?.user?.username ?? session?.user?.email ?? 'Moi';
    const isGuesser = guesserId === me;

    function startTimer(seconds: number) {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimerMax(seconds);
        setTimerSeconds(seconds);
        timerRef.current = setInterval(() => {
            setTimerSeconds(prev => {
                if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
                return prev - 1;
            });
        }, 1000);
    }

    function stopTimer() {
        if (timerRef.current) clearInterval(timerRef.current);
    }

    useEffect(() => {
        if (!socket || !lobbyId || status !== 'authenticated' || !me) return;
        if (joinedRef.current) return;
        joinedRef.current = true;

        socket.emit('just-one:join', { lobbyId, playerName: myName, userId: me });

        socket.on('just-one:players', ({ players }: { players: Player[] }) => {
            setPlayers(players);
        });

        socket.on('just-one:roundStart', (payload) => {
            setRound(r => r + 1);
            setRoundState('WAITING');
            setGuesserId(payload.guesserId);
            setGuesserName(payload.guesserName);
            setCard(payload.card ?? null);
            setMyClue('');
            setClueSubmitted(false);
            setSubmittedPlayers([]);
            setValidatedClues([]);
            setValidClues([]);
            setMyGuess('');
            setLastResult(null);
            startTimer(30);
        });

        socket.on('just-one:writeClues', ({ wordIndex }) => {
            setCurrentWordIndex(wordIndex)
            setRoundState('WRITE_CLUES')
            startTimer(60)
        })

        socket.on('just-one:clueSubmitted', ({ playerId }: { playerId: string }) => {
            setSubmittedPlayers(prev =>
                prev.includes(playerId) ? prev : [...prev, playerId]
            );
        });

        socket.on('just-one:cluesValidated', ({ allClues }: { allClues: Clue[] }) => {
            setRoundState('VALIDATE_CLUES');
            setValidatedClues(allClues);
            stopTimer();
        });

        socket.on('just-one:guessStart', ({ validClues }: { validClues: string[] }) => {
            setRoundState('GUESS_PHASE');
            setValidClues(validClues);
            startTimer(30);
        });

        socket.on('just-one:roundResult', (result: RoundResult) => {
            setRoundState('RESOLUTION');
            setLastResult(result);
            setScore(result.score);
            setHistory(prev => [...prev, { ...result, round: prev.length + 1 }]);
            stopTimer();
        });

        socket.on('just-one:gameEnd', (payload: { score: number; level: string }) => {
            setRoundState('END_GAME');
            setFinalScore(payload);
            stopTimer();
        });

        return () => {
            socket.off('just-one:players');
            socket.off('just-one:roundStart');
            socket.off('just-one:writeClues');
            socket.off('just-one:clueSubmitted');
            socket.off('just-one:cluesValidated');
            socket.off('just-one:guessStart');
            socket.off('just-one:roundResult');
            socket.off('just-one:gameEnd');
            joinedRef.current = false;
        };
    }, [socket, lobbyId, status, me]);

    if (status === 'loading') return <LoadingSpinner />;
    if (status !== 'authenticated') return null;

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
                : lastResult.result === 'PASS' ? 'text-gray-500 dark:text-slate-400'
                    : 'text-red-500 dark:text-red-400';
            return (
                <div className="text-center space-y-4">
                    <div className="text-5xl">{emoji}</div>
                    <p className={`text-xl font-bold ${color}`}>{label}</p>
                    <div className="bg-gray-100 dark:bg-slate-800/60 rounded-xl px-6 py-3 inline-block">
                        <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">Le mot était</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-widest">{lastResult.targetWord}</p>
                    </div>
                    <p className="text-sm text-gray-400 dark:text-slate-500">Prochaine manche dans quelques secondes…</p>
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
                        <p className="text-sm text-gray-500 dark:text-slate-400">Choisis un numéro de 1 à 5.</p>
                        <Timer seconds={timerSeconds} max={timerMax} /> {/* ← ajouter */}
                        <div className="flex justify-center gap-3 flex-wrap">
                            {[1, 2, 3, 4, 5].map(i => (
                                <button key={i}
                                    onClick={() => socket?.emit('just-one:pickWord', { lobbyId, wordIndex: i - 1 })}
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
                    <p className="text-gray-500 dark:text-slate-400 text-sm">
                        <span className="font-semibold text-gray-900 dark:text-white">{guesserName}</span> choisit son mot…
                    </p>
                    {card && (
                        <div className="bg-gray-100 dark:bg-slate-800/60 rounded-2xl p-4 mt-2">
                            <p className="text-xs text-gray-400 dark:text-slate-500 mb-3 uppercase tracking-wider">La carte</p>
                            <div className="grid grid-cols-5 gap-2">
                                {card.words.map((w, i) => (
                                    <div key={i} className="flex flex-col items-center gap-1">
                                        <span className="text-xs text-gray-400 dark:text-slate-500 font-semibold">{i + 1}</span>
                                        <div className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl px-2 py-2 text-center">
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
            // Le mot mystère = card.words[currentWordIndex]
            // Le serveur ne l'envoie pas aux non-devineurs via writeClues
            // On utilise le mot sélectionné par index — le serveur doit l'envoyer
            if (isGuesser) {
                return (
                    <div className="text-center space-y-4">
                        <div className="text-4xl">🤫</div>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">Les autres écrivent leurs indices…</p>
                        <Timer seconds={timerSeconds} max={timerMax} />
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
                        <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Mot mystère</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-widest">
                            {card && currentWordIndex !== null
                                ? card.words[currentWordIndex]
                                : '???'}
                        </p>
                    </div>
                    <Timer seconds={timerSeconds} max={timerMax} />
                    {!clueSubmitted ? (
                        <div className="space-y-3">
                            <input
                                type="text"
                                value={myClue}
                                onChange={e => setMyClue(e.target.value.toUpperCase())}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && myClue.trim()) {
                                        socket?.emit('just-one:submitClue', { lobbyId, clue: myClue.trim() });
                                        setClueSubmitted(true);
                                    }
                                }}
                                placeholder="Ton indice…"
                                maxLength={30}
                                autoFocus
                                className="w-full bg-gray-100 dark:bg-slate-800/60 border border-gray-300 dark:border-slate-600/50 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 text-lg font-semibold text-center uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition-all"
                            />
                            <button
                                onClick={() => {
                                    if (!myClue.trim()) return;
                                    socket?.emit('just-one:submitClue', { lobbyId, clue: myClue.trim() });
                                    setClueSubmitted(true);
                                }}
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
                            <p className="text-xs text-gray-400 dark:text-slate-500">En attente des autres joueurs…</p>
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
                    <p className="text-xs text-gray-400 dark:text-slate-500 text-center">En attente du devineur…</p>
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
                        <Timer seconds={timerSeconds} max={timerMax} />
                        <input
                            type="text"
                            value={myGuess}
                            onChange={e => setMyGuess(e.target.value.toUpperCase())}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && myGuess.trim()) {
                                    socket?.emit('just-one:submitGuess', { lobbyId, guess: myGuess.trim() });
                                }
                            }}
                            placeholder="Ta réponse…"
                            maxLength={30}
                            autoFocus
                            className="w-full bg-gray-100 dark:bg-slate-800/60 border border-gray-300 dark:border-slate-600/50 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 text-lg font-semibold text-center uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition-all"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => socket?.emit('just-one:submitGuess', { lobbyId, guess: null })}
                                className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-slate-600/50 text-gray-500 dark:text-slate-400 text-sm font-semibold hover:border-gray-400 transition-all">
                                ⏭️ Passer
                            </button>
                            <button
                                onClick={() => {
                                    if (!myGuess.trim()) return;
                                    socket?.emit('just-one:submitGuess', { lobbyId, guess: myGuess.trim() });
                                }}
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
                    <p className="text-gray-500 dark:text-slate-400 text-sm">
                        <span className="font-semibold text-gray-900 dark:text-white">{guesserName}</span> est en train de deviner…
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mt-3">
                        {validClues.map((c, i) => (
                            <div key={i} className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-700 dark:text-blue-300 font-semibold text-sm">
                                {c}
                            </div>
                        ))}
                    </div>
                    <Timer seconds={timerSeconds} max={timerMax} />
                </div>
            );
        }

        return null;
    };

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-lg space-y-4">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🔤</span>
                        <div>
                            <h1 className="text-sm font-bold text-gray-900 dark:text-white">Just One</h1>
                            {round > 0 && <p className="text-xs text-gray-400 dark:text-slate-500">Manche {round}/13</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ScoreBadge score={score} />
                        <button onClick={() => setShowHistory(h => !h)}
                            className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 transition-all">
                            📜 Historique
                        </button>
                    </div>
                </div>

                {/* Joueurs */}
                <div className="flex flex-wrap gap-2">
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

                {/* Phase */}
                <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 rounded-2xl shadow-2xl p-6">
                    {renderPhase()}
                </div>

                {/* Historique */}
                {showHistory && history.length > 0 && (
                    <div className="bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700/50 rounded-2xl p-4 space-y-2">
                        <p className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Historique</p>
                        {[...history].reverse().map((h, i) => (
                            <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100 dark:border-slate-800 last:border-0">
                                <span className="text-gray-400 dark:text-slate-500">Manche {h.round}</span>
                                <span className="font-semibold text-gray-700 dark:text-slate-300">{h.targetWord}</span>
                                <span>{h.result === 'CORRECT' ? '✅' : h.result === 'PASS' ? '⏭️' : '❌'}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
