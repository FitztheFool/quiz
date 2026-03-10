'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getTabooSocket } from '@/lib/socket';
import { TrapPhase } from '@/components/TrapPhase';
import type { TrapSlotData } from '@/components/TrapPhase';

type Attempt = { word: string; userId: string; username: string };

type TabooState = {
    phase: 'trap' | 'playing' | 'between_turns' | 'finished' | 'recap';
    currentTeam: 0 | 1 | null;
    currentWord: string | null;
    currentTraps: string[];
    attempts: Attempt[];
    turnTimeLeft: number;
    turnDuration: number;
    paused: boolean;
    scores: Record<string, number>;
    round: number;
    totalRounds: number;
    maxAttempts: number;
    trapWordCount: number;
    players: { userId: string; username: string; team: 0 | 1 | null }[];
    teams: Record<string, 0 | 1> | null;
    hostId: string;
    trapTimeLeft: number | null;
    trapDeadline: number | null;
    trapStarted: boolean;
    team0Traps: string[];
    team1Traps: string[];
    team0Slots?: TrapSlotData[];
    team1Slots?: TrapSlotData[];
    team0Word: string | null;
    team1Word: string | null;
    firstTeam: 0 | 1 | null;
    gameStarted: boolean;
    trapsByPlayer: Record<string, string[]>;
    orators?: { '0': string | null; '1': string | null };
    lastTurnResult: 'validated' | 'fail' | 'timeout' | null;
    trapDuration: number;
};

// ── Composants partagés ───────────────────────────────────────────────────────

function ScoreBar({ scores, myTeam, currentTeam }: {
    scores: Record<string, number>;
    myTeam: 0 | 1 | null;
    currentTeam: 0 | 1 | null;
}) {
    return (
        <div className="flex gap-3 justify-center">
            {(['0', '1'] as const).map(t => {
                const isActive = String(currentTeam) === t;
                const isMe = String(myTeam) === t;
                return (
                    <div key={t} className={`px-5 py-2 rounded-xl border text-center transition-all
                        ${isActive ? (t === '0' ? 'bg-blue-500/25 border-blue-500/50' : 'bg-red-500/25 border-red-500/50') : 'bg-white/5 border-white/10'}
                        ${isMe ? 'ring-1 ring-white/20' : ''}`}>
                        <div className="text-sm">{t === '0' ? '🔵' : '🔴'}</div>
                        <div style={{ fontFamily: "'Bebas Neue', cursive" }} className="text-2xl leading-tight">{scores[t] ?? 0}</div>
                        {isMe && <div className="text-xs text-white/30 mt-0.5">vous</div>}
                    </div>
                );
            })}
        </div>
    );
}

function AttemptsList({ attempts, currentTraps, refEl }: {
    attempts: Attempt[];
    currentTraps: string[];
    refEl?: React.RefObject<HTMLDivElement>;
}) {
    if (attempts.length === 0) return (
        <p className="text-white/20 text-xs text-center py-2">Aucune tentative…</p>
    );
    return (
        <div className="space-y-1 max-h-40 overflow-y-auto w-full">
            {attempts.map((a, i) => {
                const trapped = currentTraps.includes(a.word);
                return (
                    <div key={i} className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm
                        ${trapped ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-white/60'}`}>
                        <span className="font-mono font-bold">{a.word}</span>
                        <span className="text-xs opacity-50">{a.username}</span>
                        {trapped && <span>🚫</span>}
                    </div>
                );
            })}
            {refEl && <div ref={refEl} />}
        </div>
    );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function TabooGamePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams<{ lobbyId: string }>();
    const lobbyId = params?.lobbyId ?? '';
    const socketRef = useRef<ReturnType<typeof getTabooSocket>>(null);

    const joinedRef = useRef(false);
    const attemptsEndRef = useRef<HTMLDivElement>(null);
    const isHostRef = useRef(false);

    const [game, setGame] = useState<TabooState | null>(null);
    const [attemptInput, setAttemptInput] = useState('');

    const myId = session?.user?.id ?? '';

    useEffect(() => {
        isHostRef.current = !!game && game.hostId === myId;
    }, [game?.hostId, myId]);

    useEffect(() => {
        if (!socketRef.current || !game) return;
        if (game.phase === 'trap' && !game.trapStarted && game.team0Word && game.team1Word && isHostRef.current) {
            socketRef.current.emit('taboo:startTrap', { lobbyId });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game?.phase, game?.trapStarted, game?.team0Word, game?.team1Word]);

    const startGameSentRef = useRef(false);

    useEffect(() => {
        if (game?.phase === 'trap') startGameSentRef.current = false;
    }, [game?.round, game?.phase]);

    useEffect(() => {
        if (!socketRef.current || !game) return;
        if (
            game.phase === 'trap' &&
            game.trapStarted &&
            game.team0Word &&
            game.team1Word &&
            game.trapTimeLeft !== null &&
            game.trapTimeLeft <= 0 &&
            isHostRef.current &&
            !startGameSentRef.current
        ) {
            startGameSentRef.current = true;
            const event = game.gameStarted ? 'taboo:startRound' : 'taboo:startGame';
            socketRef.current.emit(event, { lobbyId });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game?.trapTimeLeft]);

    useEffect(() => {
        if (!lobbyId || status !== 'authenticated' || !myId) return;
        const username = session.user.username ?? session.user.email ?? 'User';

        const socket = getTabooSocket();
        if (!socket) return;
        socketRef.current = socket;

        const join = () => {
            if (joinedRef.current) return;
            joinedRef.current = true;
            socket.emit('taboo:join', { lobbyId, userId: myId, username });
        };

        socket.on('taboo:state', (state: TabooState) => setGame(state));

        socket.on('taboo:requestWords', async ({ count }: { count: number }) => {
            const res = await fetch(`/api/taboo/word?count=${count}`);
            if (!res.ok) return;
            const words: string[] = await res.json();
            socket.emit('taboo:setWords', { lobbyId, team0Word: words[0], team1Word: words[1] });
        });

        socket.on('taboo:needWords', () => {
            setGame(currentGame => {
                if (currentGame?.hostId !== myId) return currentGame;
                fetch(`/api/taboo/word?count=2`)
                    .then(r => r.json())
                    .then((words: string[]) => {
                        socket.emit('taboo:setWordsForRound', { lobbyId, team0Word: words[0], team1Word: words[1] });
                    });
                return currentGame;
            });
        });

        if (!socket.connected) socket.connect();
        if (socket.connected) join();
        else socket.once('connect', join);

        return () => {
            socket.off('connect', join);
            socket.off('taboo:state');
            socket.off('taboo:requestWords');
            socket.off('taboo:needWords');
            joinedRef.current = false;
        };
    }, [lobbyId, status, myId]);

    useEffect(() => {
        if (attemptsEndRef.current) {
            attemptsEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [game?.attempts]);

    if (status === 'loading' || !game) return (
        <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );
    if (status !== 'authenticated') return null;

    const isHost = game.hostId === myId;
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

    // ── Fin de partie ─────────────────────────────────────────────────────────
    if (game.phase === 'finished') {
        const scores = Object.entries(game.scores).sort((a, b) => b[1] - a[1]);
        const winner = scores[0];
        return (
            <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col items-center justify-center px-4 gap-8 pt-8"
                style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <style>{FONTS}</style>
                <div className="text-center">
                    <div className="text-7xl mb-4">🏆</div>
                    <h1 style={{ fontFamily: "'Bebas Neue'" }} className="text-5xl tracking-widest">FIN DE PARTIE</h1>
                    <p className="text-white/40 mt-2">Victoire de l'équipe {winner[0] === '0' ? '🔵 Bleue' : '🔴 Rouge'} !</p>
                </div>
                <div className="flex gap-6">
                    {scores.map(([team, pts], i) => (
                        <div key={team} className={`text-center px-8 py-6 rounded-2xl border ${i === 0 ? 'bg-yellow-500/10 border-yellow-500/40' : 'bg-white/5 border-white/10'}`}>
                            <div className="text-3xl mb-1">{team === '0' ? '🔵' : '🔴'}</div>
                            <div style={{ fontFamily: "'Bebas Neue'" }} className={`text-5xl ${i === 0 ? 'text-yellow-400' : 'text-white/50'}`}>{pts}</div>
                            <div className="text-xs text-white/30 mt-1">point{pts > 1 ? 's' : ''}</div>
                        </div>
                    ))}
                </div>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button onClick={() => router.push(`/lobby/${lobbyId}`)}
                        className="w-full px-8 py-3 rounded-xl bg-green-500 hover:bg-green-400 font-bold text-lg transition-colors shadow-lg shadow-green-500/20">
                        🔄 Rejouer
                    </button>
                    <button onClick={() => router.push('/dashboard')}
                        className="w-full px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-semibold transition-colors">
                        🏠 Retour au dashboard
                    </button>
                </div>
            </div>
        );
    }

    // ── Phase trap ────────────────────────────────────────────────────────────
    if (game.phase === 'trap') {
        return (
            <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col items-center justify-center px-4 gap-5 text-center pt-10"
                style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <style>{FONTS}</style>
                <ScoreBar scores={game.scores} myTeam={myTeam} currentTeam={game.currentTeam} />
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
        );
    }

    // ── Récap du tour ─────────────────────────────────────────────────────────
    if (game.phase === 'recap') {
        const teamWhoJustPlayed = game.currentTeam;
        const teamColor = teamWhoJustPlayed === 0 ? 'text-blue-400' : 'text-red-400';
        const teamLabel = teamWhoJustPlayed === 0 ? '🔵 Équipe Bleue' : '🔴 Équipe Rouge';

        const resultLabel = game.lastTurnResult === 'validated'
            ? '✅ Mot trouvé !'
            : game.lastTurnResult === 'fail'
                ? '❌ Mot interdit !'
                : '⏱ Temps écoulé';
        const resultColor = game.lastTurnResult === 'validated'
            ? 'text-green-400'
            : game.lastTurnResult === 'fail'
                ? 'text-red-400'
                : 'text-orange-400';

        const wordJustPlayed = teamWhoJustPlayed === 0 ? game.team0Word : game.team1Word;
        const trapsUsed = teamWhoJustPlayed === 0 ? game.team1Traps : game.team0Traps;

        return (
            <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col items-center justify-center px-4 gap-5 text-center pt-10"
                style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <style>{FONTS}</style>

                <ScoreBar scores={game.scores} myTeam={myTeam} currentTeam={game.currentTeam} />

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4">
                    <p className="text-xs text-white/30 uppercase tracking-widest">Fin du tour</p>
                    <p style={{ fontFamily: "'Bebas Neue'" }} className={`text-3xl tracking-widest ${teamColor}`}>{teamLabel}</p>
                    <p className={`text-xl font-bold ${resultColor}`}>{resultLabel}</p>
                    <p className="text-white/30 text-xs">Round {game.round}/{game.totalRounds}</p>

                    <div className="rounded-2xl border-2 border-yellow-500/30 bg-yellow-500/5 p-4 text-center">
                        <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Mot mystère 👁</p>
                        <p style={{ fontFamily: "'Bebas Neue'" }} className="text-4xl tracking-widest text-yellow-300">
                            {wordJustPlayed ?? '???'}
                        </p>
                    </div>

                    {trapsUsed.filter(t => t).length > 0 && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                            <p className="text-xs text-white/40 uppercase tracking-widest mb-2">🚫 Mots piégés</p>
                            <div className="flex flex-wrap gap-1 justify-center">
                                {trapsUsed.filter(t => t).map((t, i) => (
                                    <span key={i} className="text-xs bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-1 rounded-full">
                                        🚫 {t}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {game.attempts.length > 0 && (
                        <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-left">
                            <p className="text-xs text-white/30 mb-2 uppercase tracking-widest">Tentatives du tour</p>
                            <AttemptsList attempts={game.attempts} currentTraps={game.currentTraps} />
                        </div>
                    )}

                    {isHost ? (
                        <button onClick={() => socketRef.current?.emit('taboo:nextTurn', { lobbyId })}
                            className="mt-2 w-full px-8 py-4 rounded-2xl bg-green-500 hover:bg-green-400 font-bold text-lg transition-all shadow-lg shadow-green-500/20">
                            ➡ Tour suivant
                        </button>
                    ) : (
                        <p className="text-white/30 text-sm mt-2">En attente du host…</p>
                    )}
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
        const teamColor = game.currentTeam === 0 ? 'text-blue-400' : 'text-red-400';

        return (
            <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col items-center justify-center px-4 gap-5 text-center pt-10"
                style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <style>{FONTS}</style>

                <ScoreBar scores={game.scores} myTeam={myTeam} currentTeam={game.currentTeam} />

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-3">
                    <p className="text-xs text-white/30 uppercase tracking-widest">Prochain tour</p>
                    <p style={{ fontFamily: "'Bebas Neue'" }} className={`text-3xl tracking-widest ${teamColor}`}>{teamLabel}</p>
                    <p className="text-white/60 text-sm">Orateur : <span className="text-white font-bold">🎤 {currentOratorName}</span></p>

                    <div className="flex flex-wrap gap-1 justify-center">
                        <p className="text-white/60 text-sm">Mon équipe :
                            {game.players
                                .filter(p => p.team === myTeam)
                                .map((p, i) => (
                                    <span key={p.userId} className="font-bold text-white">
                                        {i > 0 ? ', ' : ' '}{p.username}
                                    </span>
                                ))
                            }
                        </p>
                    </div>

                    <p className="text-white/30 text-xs">Round {game.round}/{game.totalRounds}</p>

                    {isCurrentTeam && (
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Mot à trouver</p>
                            <p style={{ fontFamily: "'Bebas Neue'" }} className="text-3xl tracking-widest text-white/20">???</p>
                            <p className="text-xs text-white/30 mt-2">{isOrator ? 'Le mot vous sera révélé une fois prêt !' : "Écoutez l'orateur !"}</p>
                        </div>
                    )}

                    {isAdversary && (
                        <>
                            <div className="rounded-2xl border-2 border-yellow-500/30 bg-yellow-500/5 p-4 text-center">
                                <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Mot mystère 👁</p>
                                <p style={{ fontFamily: "'Bebas Neue'" }} className="text-4xl tracking-widest text-yellow-300">
                                    {game.currentWord ?? '???'}
                                </p>
                            </div>
                            {game.currentTraps.length > 0 && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                    <p className="text-xs text-white/40 uppercase tracking-widest mb-2">🚫 Vos mots piégés</p>
                                    <div className="flex flex-wrap gap-1 justify-center">
                                        {game.currentTraps.map((t, i) => (
                                            <span key={i} className="text-xs bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-1 rounded-full">
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
                            <p className="text-xs text-white/30 uppercase tracking-widest mb-1">🎤 Choisir l'orateur</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {game.players
                                    .filter(p => p.team === game.currentTeam)
                                    .map(p => {
                                        const isSelected = currentOratorId === p.userId;
                                        return (
                                            <button
                                                key={p.userId}
                                                onClick={() => socketRef.current?.emit('taboo:changeOrator', { lobbyId, userId: p.userId })}
                                                className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all
                                                    ${isSelected
                                                        ? 'bg-green-500/20 border-green-500/50 text-green-300'
                                                        : 'bg-white/5 border-white/10 text-white/50 hover:border-white/30 hover:text-white/80'}`}>
                                                {isSelected ? '🎤 ' : ''}{p.username}
                                            </button>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    {isOrator ? (
                        <button onClick={() => socketRef.current?.emit('taboo:startTurn', { lobbyId })}
                            className="mt-2 w-full px-8 py-4 rounded-2xl bg-green-500 hover:bg-green-400 font-bold text-lg transition-all shadow-lg shadow-green-500/20">
                            ▶ Je suis prêt !
                        </button>
                    ) : (
                        <p className="text-white/30 text-sm mt-2">
                            {isAdversary ? '👀 Préparez-vous à surveiller !' : `En attente de ${currentOratorName}…`}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // ── Tour en cours (playing) ───────────────────────────────────────────────
    const currentOratorUsername = currentOratorId
        ? (game.players.find(p => p.userId === currentOratorId)?.username ?? '?')
        : '?';

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col pt-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <style>{FONTS}</style>

            <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${game.currentTeam === 0 ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'}`}>
                        {game.currentTeam === 0 ? '🔵 Bleue' : '🔴 Rouge'}
                    </span>
                    <span className="text-white/30 text-sm">Round {game.round}/{game.totalRounds}</span>
                    <span className="text-white/30 text-xs">🎤 {currentOratorUsername}</span>
                </div>
                <div className="flex gap-2">
                    {Object.entries(game.scores).map(([t, pts]) => (
                        <div key={t} className={`text-xs font-bold px-3 py-1.5 rounded-lg border
                            ${String(myTeam) === t
                                ? (t === '0' ? 'border-blue-500/50 bg-blue-500/15 text-blue-200' : 'border-red-500/50 bg-red-500/15 text-red-200')
                                : 'border-white/10 text-white/40'}`}>
                            {t === '0' ? '🔵' : '🔴'} {pts}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">

                <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 130 130">
                        <circle cx="65" cy="65" r="56" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
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
                        <span className="text-xs text-white/30">sec</span>
                    </div>
                </div>

                {isOrator && (
                    <div className="w-full max-w-sm space-y-3">
                        <div className="rounded-3xl border-2 border-green-500/30 bg-green-500/5 p-6 text-center">
                            <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Mot à faire deviner</p>
                            <p style={{ fontFamily: "'Bebas Neue'" }} className="text-5xl tracking-widest text-green-300">
                                {game.currentWord ?? '???'}
                            </p>
                        </div>
                        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                            <p className="text-xs text-white/30 mb-2 uppercase tracking-widest">
                                Tentatives {game.attempts.length}/{game.maxAttempts}
                            </p>
                            <AttemptsList attempts={game.attempts} currentTraps={game.currentTraps} refEl={attemptsEndRef} />
                        </div>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => socketRef.current?.emit('taboo:pause', { lobbyId })}
                                className="px-4 py-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 font-semibold text-sm transition-colors">
                                {game.paused ? '▶ Reprendre' : '⏸ Pause'}
                            </button>
                            <button onClick={() => socketRef.current?.emit('taboo:validate', { lobbyId })}
                                className="px-6 py-2 rounded-xl bg-green-500 hover:bg-green-400 font-bold text-sm transition-colors shadow-lg shadow-green-500/20">
                                ✅ Validé !
                            </button>
                        </div>
                    </div>
                )}

                {isGuesser && (
                    <div className="w-full max-w-sm space-y-3">
                        <div className="rounded-3xl border-2 border-white/10 bg-white/3 p-6 text-center">
                            <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Mot à trouver</p>
                            <p style={{ fontFamily: "'Bebas Neue'" }} className="text-5xl tracking-widest text-white/20">???</p>
                        </div>
                        {!game.paused && (
                            <div className="flex gap-2">
                                <input
                                    value={attemptInput}
                                    onChange={e => setAttemptInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && sendAttempt()}
                                    placeholder="Votre réponse…"
                                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-bold uppercase tracking-wider focus:outline-none focus:border-white/50 placeholder:text-white/20"
                                />
                                <button onClick={sendAttempt}
                                    className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">↵</button>
                            </div>
                        )}
                        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                            <p className="text-xs text-white/30 mb-2 uppercase tracking-widest">
                                Tentatives {game.attempts.length}/{game.maxAttempts}
                            </p>
                            <AttemptsList attempts={game.attempts} currentTraps={game.currentTraps} refEl={attemptsEndRef} />
                        </div>
                        <button onClick={() => socketRef.current?.emit('taboo:pause', { lobbyId })}
                            className="w-full px-4 py-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 font-semibold text-sm transition-colors">
                            {game.paused ? '▶ Reprendre' : '⏸ Pause'}
                        </button>
                    </div>
                )}

                {isAdversary && (
                    <div className="w-full max-w-sm space-y-3">
                        <div className="rounded-3xl border-2 border-yellow-500/30 bg-yellow-500/5 p-6 text-center">
                            <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Mot mystère 👁</p>
                            <p style={{ fontFamily: "'Bebas Neue'" }} className="text-5xl tracking-widest text-yellow-300">
                                {game.currentWord ?? '???'}
                            </p>
                        </div>
                        {game.currentTraps.length > 0 && (
                            <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
                                <p className="text-xs text-white/40 uppercase tracking-widest mb-3">🚫 Vos mots piégés</p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {game.currentTraps.map((t, i) => (
                                        <span key={i} className="text-sm bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-full font-semibold">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                            <p className="text-xs text-white/30 mb-2 uppercase tracking-widest">
                                Tentatives {game.attempts.length}/{game.maxAttempts}
                            </p>
                            <AttemptsList attempts={game.attempts} currentTraps={game.currentTraps} refEl={attemptsEndRef} />
                        </div>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => socketRef.current?.emit('taboo:pause', { lobbyId })}
                                className="px-4 py-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 font-semibold text-sm transition-colors">
                                {game.paused ? '▶ Reprendre' : '⏸ Pause'}
                            </button>
                            <button onClick={() => socketRef.current?.emit('taboo:fail', { lobbyId })}
                                className="px-6 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 font-bold text-sm transition-colors">
                                ❌ Mot interdit !
                            </button>
                        </div>
                    </div>
                )}

                {myTeam === null && (
                    <p className="text-white/30 text-sm">Vous observez la partie…</p>
                )}
            </div>
        </div>
    );
}
