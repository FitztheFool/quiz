'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getTabooSocket } from '@/lib/socket';

type Attempt = { word: string; userId: string; username: string };

type TabooState = {
    phase: 'trap' | 'playing' | 'between_turns' | 'finished';
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
    trapStarted: boolean;
    team0Traps: string[];
    team1Traps: string[];
    team0Word: string | null;
    team1Word: string | null;
    firstTeam: 0 | 1 | null;
    gameStarted: boolean;
    trapsByPlayer: Record<string, string[]>;
};

export default function TabooGamePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams<{ lobbyId: string }>();
    const lobbyId = params?.lobbyId ?? '';
    const socket = useMemo(() => getTabooSocket(), []);

    const joinedRef = useRef(false);
    const attemptsEndRef = useRef<HTMLDivElement>(null);

    const [game, setGame] = useState<TabooState | null>(null);
    const [attemptInput, setAttemptInput] = useState('');

    const myId = session?.user?.id ?? '';
    const myTeam = game?.teams?.[myId] ?? null;

    const [localTraps, setLocalTraps] = useState<string[]>([]);
    const focusedSlot = useRef<number | null>(null);

    // Sync depuis serveur sauf pour le slot en cours d'édition
    useEffect(() => {
        if (!game || myTeam === null) return;
        const allPlayers = game.players.filter(p => p.team === myTeam);
        setLocalTraps(prev => Array.from({ length: game.trapWordCount }, (_, i) => {
            if (focusedSlot.current === i) return prev[i] ?? '';
            for (const p of allPlayers) {
                if (p.userId === myId) continue;
                const val = game.trapsByPlayer?.[p.userId]?.[i];
                if (val && val.trim()) return val;
            }
            return prev[i] ?? '';
        }));
    }, [game?.trapsByPlayer]);

    useEffect(() => {
        if (!socket || !lobbyId || status !== 'authenticated' || !myId) return;

        const username = session.user.username ?? session.user.email ?? 'User';

        const join = () => {
            if (!joinedRef.current) {
                joinedRef.current = true;
                const teamsRaw = sessionStorage.getItem(`taboo_teams_${lobbyId}`);
                const teams = teamsRaw ? JSON.parse(teamsRaw) : null;
                const hostId = sessionStorage.getItem(`taboo_hostId_${lobbyId}`) ?? undefined;
                socket.emit('taboo:join', { lobbyId, userId: myId, username });
            }
        };

        socket.on('taboo:state', (state: TabooState) => {
            console.log('mon myId:', myId, 'trapsByPlayer keys:', Object.keys(state.trapsByPlayer));
            setGame(state);
        });

        socket.on('taboo:requestWords', async ({ count }: { count: number }) => {
            const res = await fetch(`/api/taboo/word?count=${count}`);
            if (!res.ok) return;
            const words: string[] = await res.json();
            socket.emit('taboo:setWords', { lobbyId, team0Word: words[0], team1Word: words[1] });
        });

        socket.on('taboo:needWords', async () => {
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

        if (socket.connected) {
            join();
        } else {
            socket.once('connect', join);
        }

        return () => {
            socket.off('connect', join);
            socket.off('taboo:state');
            socket.off('taboo:requestWords');
            socket.off('taboo:needWords');
        };
    }, [socket, lobbyId, status, myId]);

    useEffect(() => {
        attemptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [game?.attempts]);

    if (status === 'loading' || !game) return (
        <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );
    if (status !== 'authenticated') return null;

    const isHost = game.hostId === myId;
    const isCurrentTeam = myTeam === game.currentTeam;
    const isAdversary = myTeam !== game.currentTeam && myTeam !== null;

    const timerPct = game.turnDuration > 0 ? game.turnTimeLeft / game.turnDuration : 0;
    const timerColor = timerPct > 0.5 ? '#22c55e' : timerPct > 0.25 ? '#f97316' : '#ef4444';
    const circumference = 2 * Math.PI * 40;

    const sendAttempt = () => {
        const w = attemptInput.trim();
        if (!w) return;
        socket?.emit('taboo:attempt', { lobbyId, word: w });
        setAttemptInput('');
    };

    const handleTrapChange = (i: number, value: string) => {
        const next = Array.from({ length: game.trapWordCount }, (_, idx) => {
            const allPlayers = game.players.filter(p => p.team === myTeam);
            for (const p of allPlayers) {
                const val = game.trapsByPlayer?.[p.userId]?.[idx];
                if (val && val.trim()) return val;
            }
            return '';
        });
        next[i] = value;
        socket?.emit('taboo:submitTraps', { lobbyId, traps: next });
    };

    // ── Fin de partie ─────────────────────────────────────────────────────────
    if (game.phase === 'finished') {
        const scores = Object.entries(game.scores).sort((a, b) => b[1] - a[1]);
        const winner = scores[0];
        return (
            <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col items-center justify-center px-4 gap-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Bebas+Neue&display=swap');`}</style>
                <div className="text-center">
                    <div className="text-7xl mb-4">🏆</div>
                    <h1 style={{ fontFamily: "'Bebas Neue'" }} className="text-5xl tracking-widest">FIN DE PARTIE</h1>
                    <p className="text-white/40 mt-2">
                        Victoire de l'équipe {winner[0] === '0' ? '🔵 Bleue' : '🔴 Rouge'} !
                    </p>
                </div>
                <div className="flex gap-6">
                    {scores.map(([team, pts], i) => (
                        <div key={team} className={`text-center px-8 py-6 rounded-2xl border ${i === 0
                            ? 'bg-yellow-500/10 border-yellow-500/40'
                            : 'bg-white/5 border-white/10'}`}>
                            <div className="text-3xl mb-1">{team === '0' ? '🔵' : '🔴'}</div>
                            <div style={{ fontFamily: "'Bebas Neue'" }} className={`text-5xl ${i === 0 ? 'text-yellow-400' : 'text-white/50'}`}>{pts}</div>
                            <div className="text-xs text-white/30 mt-1">point{pts > 1 ? 's' : ''}</div>
                        </div>
                    ))}
                </div>
                <button onClick={() => router.push('/dashboard')} className="px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-semibold transition-colors">
                    Retour au dashboard
                </button>
            </div>
        );
    }

    // ── Entre deux tours / phase trap ─────────────────────────────────────────
    if (game.phase === 'between_turns' || game.phase === 'trap') {
        const nextTeamLabel = game.currentTeam === 0 ? '🔵 Équipe Bleue' : '🔴 Équipe Rouge';
        const isMyTurnNext = isCurrentTeam;
        const wordToPiege = myTeam === 0 ? game.team1Word : game.team0Word;

        return (
            <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col items-center justify-center px-4 gap-6 text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Bebas+Neue&display=swap');`}</style>

                {game.phase === 'trap' && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-md w-full">
                        <p className="text-orange-400 font-bold mb-1">⏳ Phase des pièges</p>

                        {game.trapStarted ? (
                            <p className="text-white/40 text-sm mb-3">
                                {game.trapTimeLeft !== null && game.trapTimeLeft > 0
                                    ? `${game.trapTimeLeft}s restantes`
                                    : 'Temps écoulé'}
                            </p>
                        ) : (
                            <p className="text-white/30 text-sm italic mb-3">En attente du lancement…</p>
                        )}

                        {myTeam !== null && wordToPiege && (
                            <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                                <p className="text-xs text-white/40 uppercase tracking-widest mb-1">
                                    Mot à piéger ({myTeam === 0 ? 'équipe Rouge' : 'équipe Bleue'})
                                </p>
                                <p style={{ fontFamily: "'Bebas Neue'" }} className="text-4xl tracking-widest text-yellow-400">
                                    {wordToPiege}
                                </p>
                            </div>
                        )}

                        {myTeam !== null && (
                            <div className="space-y-5 text-left">
                                <div>
                                    <p className="text-xs text-white/40 mb-2">🤝 Pièges de l'équipe</p>
                                    <div className="space-y-2">
                                        {Array.from({ length: game.trapWordCount }).map((_, i) => {
                                            const allTeamPlayers = game.players.filter(p => p.team === myTeam);
                                            const mergedValue = (() => {
                                                for (const p of allTeamPlayers) {
                                                    const val = game.trapsByPlayer?.[p.userId]?.[i];
                                                    if (val && val.trim()) return val;
                                                }
                                                return '';
                                            })();

                                            return (
                                                <input
                                                    key={i}
                                                    value={localTraps[i] ?? mergedValue}
                                                    onFocus={() => { focusedSlot.current = i; }}
                                                    onBlur={() => { focusedSlot.current = null; }}
                                                    onChange={e => handleTrapChange(i, e.target.value)}
                                                    placeholder={`Mot piégé ${i + 1}`}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 placeholder:text-white/20"
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {isHost && game.team0Word && game.team1Word && !game.gameStarted && (
                            <button
                                onClick={() => socket?.emit('taboo:startGame', { lobbyId })}
                                className="mt-5 w-full py-3 rounded-xl bg-green-500 hover:bg-green-400 font-bold text-sm transition-colors shadow-lg shadow-green-500/20"
                            >
                                ▶ Démarrer la partie
                            </button>
                        )}
                        {!isHost && !game.gameStarted && (
                            <p className="text-white/30 text-sm mt-4">En attente du host…</p>
                        )}
                    </div>
                )}

                {game.phase === 'between_turns' && (
                    <>
                        <div className="flex gap-4">
                            {Object.entries(game.scores).map(([t, pts]) => (
                                <div key={t} className={`px-6 py-3 rounded-xl border text-center ${t === String(game.currentTeam)
                                    ? t === '0' ? 'bg-blue-500/20 border-blue-500/40' : 'bg-red-500/20 border-red-500/40'
                                    : 'bg-white/5 border-white/10'}`}>
                                    <div>{t === '0' ? '🔵' : '🔴'}</div>
                                    <div style={{ fontFamily: "'Bebas Neue'" }} className="text-3xl">{pts}</div>
                                </div>
                            ))}
                        </div>

                        <div>
                            <p style={{ fontFamily: "'Bebas Neue'" }} className="text-3xl tracking-widest">
                                {isMyTurnNext ? "C'EST VOTRE TOUR !" : `TOUR DE ${nextTeamLabel}`}
                            </p>
                            <p className="text-white/40 mt-1">Round {game.round}/{game.totalRounds}</p>
                        </div>

                        {isHost && (
                            <button
                                onClick={() => socket?.emit('taboo:startTurn', { lobbyId })}
                                className="px-10 py-4 rounded-2xl bg-green-500 hover:bg-green-400 font-bold text-lg transition-all shadow-lg shadow-green-500/20"
                            >
                                ▶ Démarrer le tour
                            </button>
                        )}
                        {!isHost && <p className="text-white/30 text-sm">En attente du host…</p>}
                    </>
                )}
            </div>
        );
    }

    // ── Tour en cours ─────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Bebas+Neue&display=swap');`}</style>

            <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${game.currentTeam === 0 ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'}`}>
                        {game.currentTeam === 0 ? '🔵 Équipe Bleue' : '🔴 Équipe Rouge'}
                    </span>
                    <span className="text-white/30 text-sm">Round {game.round}/{game.totalRounds}</span>
                </div>
                <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke={timerColor} strokeWidth="10"
                            strokeDasharray={circumference} strokeDashoffset={circumference * (1 - timerPct)}
                            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: timerColor }}>
                        {game.paused ? '⏸' : game.turnTimeLeft}
                    </span>
                </div>
                <div className="flex gap-2">
                    {Object.entries(game.scores).map(([t, pts]) => (
                        <div key={t} className={`text-xs font-bold px-2 py-1 rounded border ${String(myTeam) === t ? 'border-white/30 text-white' : 'border-white/10 text-white/40'}`}>
                            {t === '0' ? '🔵' : '🔴'} {pts}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-0 overflow-hidden">
                <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">

                    <div className={`w-full max-w-sm rounded-3xl border-2 p-8 text-center ${isCurrentTeam ? 'border-white/20 bg-white/5' : 'border-white/10 bg-white/3'}`}>
                        <p className="text-xs text-white/30 uppercase tracking-widest mb-3">
                            {isCurrentTeam ? 'Mot à faire deviner' : 'Mot en cours'}
                        </p>
                        <p style={{ fontFamily: "'Bebas Neue'" }} className="text-5xl tracking-widest">
                            {isCurrentTeam ? (game.currentWord ?? '???') : '???'}
                        </p>

                        {isCurrentTeam && game.currentTraps.length > 0 && (
                            <div className="mt-6">
                                <p className="text-xs text-white/30 mb-2">Mots interdits</p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {game.currentTraps.map((trap, i) => (
                                        <span key={i} className="text-xs bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-1 rounded-full">
                                            🚫 {trap}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {isCurrentTeam && game.phase === 'playing' && !game.paused && (
                        <div className="w-full max-w-sm flex gap-2">
                            <input
                                value={attemptInput}
                                onChange={e => setAttemptInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendAttempt()}
                                placeholder="Tentative…"
                                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-bold uppercase tracking-wider focus:outline-none focus:border-white/50 placeholder:text-white/20"
                            />
                            <button onClick={sendAttempt} className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                                ↵
                            </button>
                        </div>
                    )}

                    <div className="flex gap-3 flex-wrap justify-center">
                        <button
                            onClick={() => socket?.emit('taboo:pause', { lobbyId })}
                            className="px-4 py-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 font-semibold text-sm transition-colors"
                        >
                            {game.paused ? '▶ Reprendre' : '⏸ Pause'}
                        </button>

                        {isCurrentTeam && (
                            <button
                                onClick={() => socket?.emit('taboo:validate', { lobbyId })}
                                className="px-5 py-2 rounded-xl bg-green-500 hover:bg-green-400 font-bold text-sm transition-colors shadow-lg shadow-green-500/20"
                            >
                                ✅ Valider
                            </button>
                        )}

                        {isAdversary && (
                            <button
                                onClick={() => socket?.emit('taboo:fail', { lobbyId })}
                                className="px-5 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 font-bold text-sm transition-colors"
                            >
                                ❌ Échec
                            </button>
                        )}
                    </div>

                    <p className="text-xs text-white/30">
                        {game.attempts.length}/{game.maxAttempts} tentatives
                    </p>
                </div>

                <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-white/10 flex flex-col">
                    <div className="px-4 py-3 border-b border-white/10">
                        <p className="text-xs text-white/40 uppercase tracking-widest">Historique</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {game.attempts.length === 0 && (
                            <p className="text-xs text-white/20 text-center py-8">Aucune tentative…</p>
                        )}
                        {game.attempts.map((a, i) => (
                            <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${game.currentTraps.includes(a.word)
                                ? 'bg-red-500/20 border-red-500/30 text-red-300'
                                : 'bg-white/5 border-white/10 text-white/70'
                                }`}>
                                <span className="font-mono font-bold">{a.word}</span>
                                <span className="text-xs opacity-50">{a.username}</span>
                                {game.currentTraps.includes(a.word) && <span>🚫</span>}
                            </div>
                        ))}
                        <div ref={attemptsEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
}
