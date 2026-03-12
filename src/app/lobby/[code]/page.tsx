'use client';
import LoadingSpinner from '@/components/LoadingSpinner';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getLobbySocket } from '@/lib/socket';

type Player = { userId: string; username: string };
type GameType = 'quiz' | 'uno' | 'taboo' | 'skyjow' | 'yahtzee';

type UnoOptions = {
    stackable: boolean;
    jumpIn: boolean;
    teamMode: 'none' | '2v2';
    teamWinMode: 'one' | 'both';
};

type TabooOptions = {
    turnDuration: number;
    totalRounds: number;
    trapWordCount: number;
    maxAttempts: number;
    trapDuration: number;
};

type SkyjowOptions = {
    eliminateRows: boolean;
};

type LobbyState = {
    hostId: string | null;
    quizId: string | null;
    status: 'WAITING' | 'PLAYING' | string;
    timePerQuestion: number;
    timeMode: 'per_question' | 'total' | 'none';
    players: Player[];
    gameType: GameType;
    unoOptions: UnoOptions;
    tabooOptions: TabooOptions;
    skyjowOptions: SkyjowOptions;
    teams: Record<string, 0 | 1> | null;
};

type ChatMessage = { userId: string; username: string; text: string; sentAt: number };

export default function LobbyPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams<{ code: string }>();
    const lobbyId = params?.code ?? '';

    const socket = useMemo(() => getLobbySocket(), []);
    const joinedRef = useRef(false);

    const [lobby, setLobby] = useState<LobbyState>({
        hostId: null, quizId: null, status: 'WAITING', timePerQuestion: 15, timeMode: 'per_question',
        players: [], gameType: 'quiz',
        unoOptions: { stackable: false, jumpIn: false, teamMode: 'none', teamWinMode: 'one' },
        tabooOptions: { turnDuration: 60, totalRounds: 3, trapWordCount: 5, maxAttempts: 10, trapDuration: 60 },
        skyjowOptions: { eliminateRows: false },
        teams: null,
    });

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatText, setChatText] = useState('');
    const [quizList, setQuizList] = useState<{ id: string; title: string; _count: { questions: number } }[]>([]);
    const [quizSearch, setQuizSearch] = useState('');
    const [quizCategory, setQuizCategory] = useState('');
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [quizPage, setQuizPage] = useState(1);
    const [quizTotalPages, setQuizTotalPages] = useState(1);
    const [copied, setCopied] = useState(false);
    const QUIZ_PAGE_SIZE = 10;

    const fetchQuizList = useCallback(async (p = 1) => {
        const params = new URLSearchParams({ page: String(p), pageSize: String(QUIZ_PAGE_SIZE) });
        if (quizSearch.trim()) params.set('search', quizSearch.trim());
        if (quizCategory) params.set('categoryId', quizCategory);
        const res = await fetch(`/api/quiz?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        setQuizList(Array.isArray(data) ? data : data.quizzes ?? []);
        setQuizTotalPages(data.totalPages ?? 1);
        setQuizPage(p);
    }, [quizSearch, quizCategory]);

    useEffect(() => { fetchQuizList(1); }, [fetchQuizList]);

    useEffect(() => {
        if (!lobbyId) return;
        if (status === 'unauthenticated') router.replace(`/login?callbackUrl=${encodeURIComponent(`/lobby/${lobbyId}`)}`);
    }, [status, router, lobbyId]);

    useEffect(() => {
        fetch('/api/categories').then(r => r.ok ? r.json() : []).then(setCategories);
    }, []);

    useEffect(() => {
        if (!socket || !lobbyId || status !== 'authenticated' || !session?.user?.id) return;
        const meUserId = session.user.id;
        const meUsername = session.user.username ?? session.user.email ?? 'User';

        const onState = (state: LobbyState) => setLobby({
            ...state,
            unoOptions: { ...(state.unoOptions ?? {}), teamMode: state.unoOptions?.teamMode ?? 'none', teamWinMode: state.unoOptions?.teamWinMode ?? 'one' },
            tabooOptions: {
                turnDuration: state.tabooOptions?.turnDuration ?? 60,
                totalRounds: state.tabooOptions?.totalRounds ?? 3,
                trapWordCount: state.tabooOptions?.trapWordCount ?? 5,
                maxAttempts: state.tabooOptions?.maxAttempts ?? 10,
                trapDuration: state.tabooOptions?.trapDuration ?? 60,
            },
            teams: state.teams ?? null,
        });

        socket.on('lobby:teamFull', ({ team }: { team: number }) => alert(`L'équipe ${team === 0 ? 'Bleue' : 'Rouge'} est complète !`));
        socket.on('lobby:kicked', () => { alert('Vous avez été expulsé du lobby.'); router.push('/dashboard'); });

        const onChatNew = (m: ChatMessage) => setMessages(prev => [...prev, m]);
        const onGameStart = (payload: { gameType: GameType; quizId?: string; timeMode?: string; timePerQuestion?: number; lobbyId?: string }) => {
            if (payload.gameType === 'uno') {
                router.push(`/uno/${lobbyId}`);
            } else if (payload.gameType === 'taboo') {
                router.push(`/taboo/${lobbyId}/game`);
            } else if (payload.gameType === 'skyjow') {
                router.push(`/skyjow/${payload.lobbyId ?? lobbyId}`);
            } else if (payload.gameType === 'yahtzee') {
                router.push(`/yahtzee/${lobbyId}`);
            } else {
                sessionStorage.setItem(`lobby_timeMode_${lobbyId}`, payload.timeMode ?? 'none');
                sessionStorage.setItem(`lobby_timePerQuestion_${lobbyId}`, String(payload.timePerQuestion ?? 15));
                router.push(`/quiz/${payload.quizId}?lobby=${lobbyId}`);
            }
        };

        socket.on('lobby:state', onState);
        socket.on('chat:new', onChatNew);
        socket.on('game:start', onGameStart);

        if (!joinedRef.current) {
            joinedRef.current = true;
            socket.emit('lobby:join', { lobbyId, userId: meUserId, username: meUsername });
        }

        return () => {
            socket.emit('lobby:leave');
            socket.off('lobby:state', onState);
            socket.off('chat:new', onChatNew);
            socket.off('game:start', onGameStart);
            socket.off('lobby:kicked');
            socket.off('lobby:teamFull');
            joinedRef.current = false;
        };
    }, [socket, lobbyId, status, session?.user?.id, session?.user?.username, session?.user?.email]);

    if (status === 'loading') return <LoadingSpinner />;
    if (status !== 'authenticated' || !session?.user?.id) return null;

    const me = { userId: session.user.id, username: session.user.username ?? session.user.email ?? 'User' };
    const isHost = lobby.hostId === me.userId;
    const is2v2 = lobby.unoOptions.teamMode === '2v2';
    const playerCount = lobby.players.length;
    console.log('DEBUG isHost:', isHost, '| hostId:', lobby.hostId, '| me.userId:', me.userId);

    const myTeam = lobby.teams ? lobby.teams[me.userId] : undefined;
    const team0Count = lobby.teams ? Object.values(lobby.teams).filter(t => t === 0).length : 0;
    const team1Count = lobby.teams ? Object.values(lobby.teams).filter(t => t === 1).length : 0;
    const unoTeamsReady = is2v2 && team0Count === 2 && team1Count === 2;
    const tabooTeamsValid = lobby.gameType === 'taboo' && team0Count >= 2 && team1Count >= 2;

    const setTeam = (team: 0 | 1) => socket?.emit('lobby:setTeam', { team });
    const shuffleTeams = () => socket?.emit('lobby:shuffleTeams');
    const kickPlayer = (targetUserId: string, targetUsername: string) => {
        if (!isHost || !confirm(`Expulser ${targetUsername} ?`)) return;
        socket?.emit('lobby:kick', { targetUserId });
    };
    const transferHost = (targetUserId: string, targetUsername: string) => {
        if (!isHost || !confirm(`Donner le rôle d'hôte à ${targetUsername} ?`)) return;
        socket?.emit('lobby:transferHost', { targetUserId });
    };
    const sendChat = () => {
        const text = chatText.trim();
        if (!text || !socket) return;
        socket.emit('chat:send', { text });
        setChatText('');
    };
    const setTime = (t: number) => socket?.emit('lobby:setTimePerQuestion', { timePerQuestion: t });
    const setGameType = (gameType: GameType) => socket?.emit('lobby:setGameType', { gameType });
    const setUnoOption = (key: keyof UnoOptions, value: boolean | string) => socket?.emit('lobby:setUnoOptions', { [key]: value });
    const setTabooOption = (opts: Partial<TabooOptions>) => socket?.emit('lobby:setTabooOptions', opts);

    const DEFAULT_TIME: Record<string, number> = { total: 300, per_question: 15 };
    const TIME_OPTIONS_TOTAL = [60, 120, 180, 300, 600, 900, 1200, 1800, 3600];
    const TIME_OPTIONS_PER_QUESTION = [5, 10, 15, 20, 30, 45, 60, 90, 120];
    const formatTotalTime = (t: number) => { if (t < 60) return `${t}s`; const m = Math.floor(t / 60); const s = t % 60; return s === 0 ? `${m} min` : `${m} min ${s}s`; };

    const canStart = lobby.gameType === 'uno'
        ? is2v2 ? playerCount === 4 && unoTeamsReady : playerCount >= 2 && playerCount <= 8
        : lobby.gameType === 'taboo'
            ? tabooTeamsValid
            : lobby.gameType === 'skyjow' || lobby.gameType === 'yahtzee'
                ? playerCount >= 2 && playerCount <= 8
                : playerCount >= 2 && !!lobby.quizId;

    const startLabel = () => {
        if (!isHost) return 'En attente du host…';
        if (lobby.gameType === 'skyjow') {
            if (playerCount < 2) return '⏳ Min. 2 joueurs';
            if (playerCount > 8) return '⛔ Max. 8 joueurs';
            return '🂠 Lancer Skyjow !';
        }
        if (lobby.gameType === 'yahtzee') {
            if (playerCount < 2) return '⏳ Min. 2 joueurs';
            if (playerCount > 8) return '⛔ Max. 8 joueurs';
            return '🎲 Lancer Yahtzee !';
        }
        if (canStart) return `🚀 Lancer ${lobby.gameType === 'uno' ? 'UNO' : lobby.gameType === 'taboo' ? 'Taboo' : 'le quiz'} !`;
        if (lobby.gameType === 'taboo') {
            if (playerCount < 4) return `⏳ Min. 4 joueurs (${playerCount}/4)`;
            if (team0Count < 2 || team1Count < 2) return '⚠️ 2 joueurs par équipe min.';
        }
        if (lobby.gameType === 'uno') {
            if (is2v2) return playerCount < 4 ? `⏳ ${playerCount}/4 joueurs` : '⛔ Max. 4 joueurs en 2v2';
            return playerCount < 2 ? '⏳ Min. 2 joueurs' : '⛔ Max. 8 joueurs';
        }
        return playerCount < 2 ? '⏳ Min. 2 joueurs' : '🎯 Choisir un quiz';
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">

                <div className="bg-white dark:bg-gray-900 rounded-xl p-4 md:p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                            Lobby <span className="font-mono">{lobbyId}</span>
                            <div className="relative">
                                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/lobby/${lobbyId}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>⧉</button>
                                {copied && <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs bg-black text-white px-2 py-1 rounded whitespace-nowrap">Copié !</span>}
                            </div>
                        </h1>
                        <p className="text-sm opacity-70">{isHost ? '👑 Vous êtes Host' : lobby.hostId ? 'En attente du host…' : 'Connexion…'}</p>
                    </div>
                    <button onClick={() => router.push('/dashboard')} className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800">Quitter</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">

                    {/* ── Panneau gauche ── */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm space-y-5">

                        {/* Participants */}
                        <div>
                            <h2 className="font-bold text-lg mb-3">
                                Participants
                                <span className="ml-2 text-xs font-normal text-gray-400">({playerCount})</span>
                            </h2>
                            <div className="space-y-2">
                                {lobby.players.map((p) => {
                                    const pTeam = lobby.teams ? lobby.teams[p.userId] : undefined;
                                    const isMe = p.userId === me.userId;
                                    const isPlayerHost = p.userId === lobby.hostId;

                                    return (
                                        <div key={p.userId} className={`flex items-center justify-between border rounded-lg p-2
                                            ${pTeam === 0 ? 'border-blue-300 bg-blue-50' : pTeam === 1 ? 'border-red-300 bg-red-50' : ''}`}>
                                            <div className="flex items-center gap-2 min-w-0">
                                                {pTeam === 0 && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                                                {pTeam === 1 && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                                                <span className="font-semibold text-sm truncate">{p.username}</span>
                                                {isPlayerHost && <span title="Host">👑</span>}
                                                {isMe && <span className="text-xs opacity-60 flex-shrink-0">(moi)</span>}
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {isMe && (lobby.gameType === 'taboo' || is2v2) && (
                                                    <div className="flex gap-1">
                                                        <button onClick={() => setTeam(0)}
                                                            className={`text-xs px-2 py-1 rounded font-semibold transition-all ${myTeam === 0 ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
                                                            🔵
                                                        </button>
                                                        <button onClick={() => setTeam(1)}
                                                            className={`text-xs px-2 py-1 rounded font-semibold transition-all ${myTeam === 1 ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                                                            🔴
                                                        </button>
                                                    </div>
                                                )}
                                                {isHost && !isMe && (
                                                    <div className="flex gap-1 ml-1">
                                                        <button onClick={() => transferHost(p.userId, p.username)} title={`Donner l'hôte à ${p.username}`}
                                                            className="text-xs px-1.5 py-1 rounded bg-yellow-50 hover:bg-yellow-100 text-yellow-600 border border-yellow-200">👑</button>
                                                        <button onClick={() => kickPlayer(p.userId, p.username)} title={`Expulser ${p.username}`}
                                                            className="text-xs px-1.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-500 border border-red-200">🚫</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {lobby.players.length === 0 && <div className="text-sm opacity-60">Personne pour l'instant…</div>}
                            </div>

                            {/* Indicateur équipes Taboo */}
                            {lobby.gameType === 'taboo' && (
                                <div className="mt-3 space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className={`font-semibold ${team0Count >= 2 ? 'text-blue-500' : 'text-gray-400'}`}>🔵 Équipe Bleue : {team0Count}</span>
                                        <span className={`font-semibold ${team1Count >= 2 ? 'text-red-500' : 'text-gray-400'}`}>🔴 Équipe Rouge : {team1Count}</span>
                                    </div>
                                    {tabooTeamsValid
                                        ? <p className="text-xs text-green-500">✅ Équipes prêtes !</p>
                                        : <p className="text-xs text-orange-400">⚠️ Minimum 2 joueurs par équipe</p>
                                    }
                                    {isHost && (
                                        <button onClick={shuffleTeams} className="text-xs text-gray-400 hover:text-gray-600 underline mt-1">
                                            🔀 Mélanger aléatoirement
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Indicateur équipes UNO 2v2 */}
                            {is2v2 && lobby.gameType === 'uno' && (
                                <div className="mt-2 space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-blue-500 font-semibold">🔵 Équipe Bleue : {team0Count}/2</span>
                                        <span className="text-red-500 font-semibold">🔴 Équipe Rouge : {team1Count}/2</span>
                                    </div>
                                    {!unoTeamsReady && playerCount === 4 && <p className="text-xs text-orange-500">⚠️ Choisissez votre équipe</p>}
                                    {unoTeamsReady && <p className="text-xs text-green-500">✅ Équipes prêtes !</p>}
                                    {isHost && <button onClick={shuffleTeams} className="text-xs text-gray-400 hover:text-gray-600 underline mt-1">🔀 Mélanger</button>}
                                </div>
                            )}
                        </div>

                        {/* Choix du jeu */}
                        <div>
                            <h2 className="font-bold text-sm text-gray-500 uppercase mb-2">Jeu</h2>
                            <div className="grid grid-cols-2 gap-2">
                                {(['quiz', 'uno', 'taboo', 'skyjow', 'yahtzee'] as GameType[]).map((g) => (
                                    <button key={g} onClick={() => isHost && setGameType(g)} disabled={!isHost}
                                        className={`py-2 rounded-lg border-2 font-semibold text-xs transition-all
                                            ${lobby.gameType === g ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'}
                                            ${!isHost ? 'cursor-default opacity-70' : 'cursor-pointer'}`}>
                                        {g === 'quiz' ? '🎯 Quiz'
                                            : g === 'uno' ? '🃏 UNO'
                                                : g === 'taboo' ? '🚫 Taboo'
                                                    : g === 'skyjow' ? '🂠 Skyjow'
                                                        : '🎲 Yahtzee'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Options Skyjow */}
                        {lobby.gameType === 'skyjow' && (
                            <div>
                                <h2 className="font-bold text-sm text-gray-500 uppercase mb-2">Options Skyjow</h2>
                                <label className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${isHost ? 'cursor-pointer hover:border-blue-300' : 'cursor-default opacity-70'} ${lobby.skyjowOptions?.eliminateRows ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                                    <input
                                        type="checkbox"
                                        checked={lobby.skyjowOptions?.eliminateRows ?? false}
                                        onChange={e => isHost && socket?.emit('lobby:setSkyjowOptions', { eliminateRows: e.target.checked })}
                                        disabled={!isHost}
                                        className="w-4 h-4 accent-blue-500"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Éliminer les lignes</p>
                                        <p className="text-xs text-gray-400">4 cartes identiques sur une même ligne → ligne éliminée</p>
                                    </div>
                                </label>
                            </div>
                        )}

                        {/* Options Quiz */}
                        {lobby.gameType === 'quiz' && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Mode de temps</label>
                                    <select value={lobby.timeMode} onChange={(e) => { const m = e.target.value; socket?.emit('lobby:setTimeMode', { timeMode: m }); if (m !== 'none') socket?.emit('lobby:setTimePerQuestion', { timePerQuestion: DEFAULT_TIME[m] ?? 15 }); }} disabled={!isHost} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white disabled:opacity-60">
                                        <option value="total">Questionnaire</option>
                                        <option value="per_question">Temps par question</option>
                                        <option value="none">Pas de temps</option>
                                    </select>
                                </div>
                                {lobby.timeMode !== 'none' && (
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">{lobby.timeMode === 'total' ? 'Temps total' : 'Temps par question'}</label>
                                        <select value={Number(lobby.timePerQuestion)} onChange={(e) => setTime(Number(e.target.value))} disabled={!isHost} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white disabled:opacity-60">
                                            {(lobby.timeMode === 'total' ? TIME_OPTIONS_TOTAL : TIME_OPTIONS_PER_QUESTION).map(t => <option key={t} value={t}>{lobby.timeMode === 'total' ? formatTotalTime(t) : `${t}s`}</option>)}
                                        </select>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Options UNO */}
                        {lobby.gameType === 'uno' && (
                            <div className="space-y-2">
                                <h2 className="text-sm font-semibold text-gray-500 uppercase">Options UNO</h2>
                                <div className="grid grid-cols-2 gap-2">
                                    {[{ value: 'none', label: '👤 Solo', desc: '2–8' }, { value: '2v2', label: '👥 2v2', desc: '4 joueurs' }].map(opt => (
                                        <button key={opt.value} onClick={() => isHost && setUnoOption('teamMode', opt.value)} disabled={!isHost}
                                            className={`py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-all flex flex-col items-center ${lobby.unoOptions.teamMode === opt.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'} ${!isHost ? 'cursor-default opacity-70' : 'cursor-pointer'}`}>
                                            <span>{opt.label}</span><span className="text-xs font-normal opacity-60">{opt.desc}</span>
                                        </button>
                                    ))}
                                </div>
                                {is2v2 && <select value={lobby.unoOptions.teamWinMode} onChange={e => isHost && setUnoOption('teamWinMode', e.target.value)} disabled={!isHost} className="w-full border rounded-lg px-3 py-2 bg-white text-sm disabled:opacity-60"><option value="one">Un joueur vide sa main</option><option value="both">Les 2 vident leur main</option></select>}
                                <label className={`flex items-center justify-between border rounded-lg px-3 py-2 ${isHost ? 'cursor-pointer' : 'opacity-60'}`}>
                                    <span className="text-sm">Cartes empilables (+2/+4)</span>
                                    <input type="checkbox" checked={lobby.unoOptions.stackable} onChange={e => isHost && setUnoOption('stackable', e.target.checked)} disabled={!isHost} className="w-4 h-4" />
                                </label>
                                <label className={`flex items-center justify-between border rounded-lg px-3 py-2 ${is2v2 ? 'opacity-40 cursor-not-allowed' : isHost ? 'cursor-pointer' : 'opacity-60'}`}>
                                    <span className="text-sm">Jump-in {is2v2 && <span className="text-xs text-gray-400">(indispo en 2v2)</span>}</span>
                                    <input type="checkbox" checked={!is2v2 && lobby.unoOptions.jumpIn} onChange={e => isHost && !is2v2 && setUnoOption('jumpIn', e.target.checked)} disabled={!isHost || is2v2} className="w-4 h-4" />
                                </label>
                            </div>
                        )}

                        {/* Options Taboo */}
                        {lobby.gameType === 'taboo' && (
                            <div className="space-y-3">
                                <h2 className="text-sm font-semibold text-gray-500 uppercase">Options Taboo</h2>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Durée d'un tour</label>
                                    <select value={lobby.tabooOptions.turnDuration} onChange={e => isHost && setTabooOption({ turnDuration: Number(e.target.value) })} disabled={!isHost} className="w-full border rounded-lg px-3 py-2 bg-white text-sm disabled:opacity-60">
                                        {[15, 30, 45, 60, 90, 120, 180, 240, 300].map(t => <option key={t} value={t}>{t}s</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Nombre de rounds</label>
                                    <select value={lobby.tabooOptions.totalRounds} onChange={e => isHost && setTabooOption({ totalRounds: Number(e.target.value) })} disabled={!isHost} className="w-full border rounded-lg px-3 py-2 bg-white text-sm disabled:opacity-60">
                                        {[1, 2, 3, 4, 5, 7, 10].map(r => <option key={r} value={r}>{r} round{r > 1 ? 's' : ''}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Mots piégés max</label>
                                    <select value={lobby.tabooOptions.trapWordCount} onChange={e => isHost && setTabooOption({ trapWordCount: Number(e.target.value) })} disabled={!isHost} className="w-full border rounded-lg px-3 py-2 bg-white text-sm disabled:opacity-60">
                                        {[2, 3, 4, 5, 6, 7, 8, 10].map(n => <option key={n} value={n}>{n} mots</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Temps chercher mots piégés</label>
                                    <select value={lobby.tabooOptions.trapDuration} onChange={e => isHost && setTabooOption({ trapDuration: Number(e.target.value) })} disabled={!isHost} className="w-full border rounded-lg px-3 py-2 bg-white text-sm disabled:opacity-60">
                                        {[15, 30, 45, 60, 90, 120, 180].map(t => <option key={t} value={t}>{t}s</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Tentatives max par tour</label>
                                    <select value={lobby.tabooOptions.maxAttempts} onChange={e => isHost && setTabooOption({ maxAttempts: Number(e.target.value) })} disabled={!isHost} className="w-full border rounded-lg px-3 py-2 bg-white text-sm disabled:opacity-60">
                                        {[3, 5, 7, 10, 15, 20, 30].map(n => <option key={n} value={n}>{n} tentatives</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Statut */}
                        <div>
                            <label className="block text-sm font-semibold mb-2">Statut</label>
                            <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border bg-yellow-50 text-yellow-700 border-yellow-200">⏳ En attente</span>
                        </div>

                        {/* Bouton lancer */}
                        <button disabled={!isHost || !canStart} onClick={() => socket?.emit('lobby:start')}
                            className={`w-full py-3 rounded-lg font-bold transition-all ${isHost && canStart ? 'bg-green-500 hover:bg-green-600 text-white shadow-md' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}>
                            {startLabel()}
                        </button>
                    </div>

                    {/* ── Zone centrale ── */}
                    {lobby.gameType === 'quiz' ? (
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm lg:col-span-2">
                            <h2 className="font-bold text-lg mb-3">Quiz</h2>
                            <div className="flex gap-2 mb-3">
                                <input type="text" value={quizSearch} onChange={(e) => { setQuizSearch(e.target.value); fetchQuizList(1); }} placeholder="Rechercher un quiz..." className="flex-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
                                <select value={quizCategory} onChange={(e) => { setQuizCategory(e.target.value); fetchQuizList(1); }} className="border rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-600">
                                    <option value="">Toutes les catégories</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {quizList.map(q => (
                                    <div key={q.id} onClick={() => isHost && socket?.emit('lobby:setQuiz', { quizId: lobby.quizId === q.id ? null : q.id })}
                                        className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${lobby.quizId === q.id ? 'border-green-500 bg-green-50 dark:bg-green-900/20 cursor-pointer' : isHost ? 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer' : 'border-gray-200 dark:border-gray-700 cursor-default'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${lobby.quizId === q.id ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                                                {lobby.quizId === q.id && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                            <span className={`font-medium text-sm ${lobby.quizId === q.id ? 'text-green-700' : 'text-gray-800 dark:text-gray-100'}`}>{q.title}</span>
                                        </div>
                                        <span className="text-xs text-gray-400">{q._count.questions} questions</span>
                                    </div>
                                ))}
                                {quizList.length === 0 && <p className="text-sm text-gray-400">Aucun quiz disponible.</p>}
                            </div>
                            {quizTotalPages > 1 && (
                                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                                    <button onClick={() => fetchQuizList(quizPage - 1)} disabled={quizPage === 1} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">← Précédent</button>
                                    <span className="text-xs text-gray-400">{quizPage} / {quizTotalPages}</span>
                                    <button onClick={() => fetchQuizList(quizPage + 1)} disabled={quizPage === quizTotalPages} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Suivant →</button>
                                </div>
                            )}
                        </div>
                    ) : lobby.gameType === 'taboo' ? (
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm lg:col-span-2 flex flex-col items-center justify-center text-center gap-4">
                            <div className="text-6xl">🚫</div>
                            <h2 className="text-xl font-bold">Taboo</h2>
                            <div className="text-sm text-gray-500 space-y-2 max-w-sm">
                                <p>Chaque équipe reçoit un <strong>mot secret</strong> tiré aléatoirement. L'équipe adverse pose des <strong>mots piégés</strong> que l'orateur ne peut pas prononcer.</p>
                                <p>L'orateur fait deviner le mot à son équipe sans utiliser les mots piégés. <strong>Valider</strong> = 1 point.</p>
                                <p>L'équipe adverse peut déclarer <strong>Échec</strong> si l'orateur utilise un mot piégé ou dépasse le temps.</p>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center text-xs mt-2">
                                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-semibold">⏱ {lobby.tabooOptions.turnDuration}s / tour</span>
                                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">🔄 {lobby.tabooOptions.totalRounds} round{lobby.tabooOptions.totalRounds > 1 ? 's' : ''}</span>
                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold">🚫 {lobby.tabooOptions.trapWordCount} mots piégés</span>
                                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-semibold">🎯 {lobby.tabooOptions.maxAttempts} tentatives max</span>
                            </div>
                            <div className="mt-2 text-xs text-gray-400">
                                {team0Count > 0 || team1Count > 0
                                    ? <span>🔵 {team0Count} · 🔴 {team1Count} — {tabooTeamsValid ? '✅ Prêt !' : 'Min. 2 par équipe'}</span>
                                    : 'Choisissez votre équipe →'}
                            </div>
                        </div>
                    ) : lobby.gameType === 'skyjow' ? (
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm lg:col-span-2 flex flex-col items-center justify-center text-center gap-4">
                            <div className="text-6xl">🂠</div>
                            <h2 className="text-xl font-bold">Skyjow</h2>
                            <div className="text-sm text-gray-500 space-y-2 max-w-sm">
                                <p>Chaque joueur reçoit <strong>12 cartes</strong> face cachée en grille 3×4. Retournez-en <strong>2 au choix</strong> pour commencer.</p>
                                <p>À votre tour : piochez ou prenez la défausse, puis échangez avec une de vos cartes — ou jetez la carte piochée et <strong>retournez une carte cachée</strong>.</p>
                                <p>Si vous avez <strong>3 cartes identiques dans une colonne</strong>, elle est éliminée du plateau !{lobby.skyjowOptions?.eliminateRows ? ' Idem pour les lignes (4 identiques) !' : ''}</p>
                                <p>Dès qu'un joueur retourne toutes ses cartes, tout le monde joue <strong>un dernier tour</strong>. Si le déclencheur n'a pas le score le plus bas, son score est <strong>doublé</strong>.</p>
                                <p className="font-semibold text-gray-700 dark:text-gray-200">Le jeu s'arrête quand un joueur atteint <strong>100 pts</strong>. Le moins de points gagne ! 🏆</p>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center text-xs mt-1">
                                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-semibold">🟢 -2 pts (×5)</span>
                                <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full font-semibold">🔵 -1 pt (×10)</span>
                                <span className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full font-semibold">⚪ 0 pt (×15)</span>
                                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-semibold">🟡 1–12 pts (×10)</span>
                            </div>
                            <div className="mt-1 text-xs text-gray-400">
                                2 à 8 joueurs ·{' '}
                                {playerCount >= 2
                                    ? <span className="text-green-500 font-semibold">✅ {playerCount} joueurs — prêt à jouer !</span>
                                    : <span className="text-orange-400">⏳ {playerCount}/2 — min. 2 joueurs</span>}
                            </div>
                        </div>
                    ) : lobby.gameType === 'yahtzee' ? (
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm lg:col-span-2 flex flex-col items-center justify-center text-center gap-4">
                            <div className="text-6xl">🎲</div>
                            <h2 className="text-xl font-bold">Yahtzee</h2>
                            <div className="text-sm text-gray-500 space-y-2 max-w-sm">
                                <p>Chaque joueur lance <strong>5 dés</strong> jusqu'à 3 fois par tour. Gardez les dés de votre choix entre chaque lancer.</p>
                                <p>Remplissez votre feuille de score en choisissant une <strong>catégorie</strong> après chaque série de lancers.</p>
                                <p>La partie dure <strong>13 tours</strong> par joueur. Le joueur avec le <strong>score le plus élevé</strong> gagne ! 🏆</p>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center text-xs mt-2">
                                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold">🎯 Yahtzee = 50 pts</span>
                                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">📈 Bonus +35 si ≥63</span>
                                <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-semibold">🔥 Bonus Yahtzee +100</span>
                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">🎰 13 catégories</span>
                            </div>
                            <div className="mt-1 text-xs text-gray-400">
                                2 à 8 joueurs ·{' '}
                                {playerCount >= 2
                                    ? <span className="text-green-500 font-semibold">✅ {playerCount} joueurs — prêt à jouer !</span>
                                    : <span className="text-orange-400">⏳ {playerCount}/2 — min. 2 joueurs</span>}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm lg:col-span-2 flex flex-col items-center justify-center text-center gap-4">
                            <div className="text-6xl">{is2v2 ? '👥' : '🃏'}</div>
                            <h2 className="text-xl font-bold">UNO {is2v2 ? '— Mode 2v2' : ''}</h2>
                            {is2v2 ? (
                                <div className="text-sm text-gray-500 space-y-2 max-w-xs">
                                    <p>4 joueurs en <strong>2 équipes</strong> de 2.</p>
                                    <p>{lobby.unoOptions.teamWinMode === 'one' ? "L'équipe gagne dès qu'un coéquipier vide sa main." : "L'équipe gagne quand les 2 ont vidé leur main."}</p>
                                    <div className="flex justify-center gap-3 mt-2">
                                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">🔵 Équipe Bleue</span>
                                        <span className="text-gray-400 self-center">vs</span>
                                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">🔴 Équipe Rouge</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-gray-500 space-y-1 max-w-xs">
                                    <p>7 cartes chacun. Pose une carte qui correspond à la couleur ou au chiffre du dessus.</p>
                                    <p>Le premier à vider sa main gagne. N'oublie pas de crier <strong>UNO !</strong></p>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2 justify-center text-xs text-gray-400 mt-2">
                                <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full">+2</span>
                                <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full">🔄 Inverser</span>
                                <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full">🚫 Passer</span>
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">🌈 Joker</span>
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">+4 Wild</span>
                                {lobby.unoOptions?.stackable && <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">✅ Empilables</span>}
                                {lobby.unoOptions?.jumpIn && !is2v2 && <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">✅ Jump-in</span>}
                            </div>
                        </div>
                    )}

                    {/* ── Chat ── */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm">
                        <h2 className="font-bold text-lg mb-3">Chat</h2>
                        <div className="h-64 overflow-auto border rounded-lg p-3 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                            {messages.map((m, i) => <div key={i} className="mb-2"><b>{m.username}</b>: {m.text}</div>)}
                            {messages.length === 0 && <div className="text-sm opacity-60">Aucun message…</div>}
                        </div>
                        <div className="mt-3 flex flex-col gap-2">
                            <input value={chatText} onChange={e => setChatText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendChat(); }} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white" placeholder="Écrire un message…" />
                            <button onClick={sendChat} className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Envoyer</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
