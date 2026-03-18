'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getLobbySocket } from '@/lib/socket';
import Chat from '@/components/Chat';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useChat } from '@/context/ChatContext';
import {
    GAME_CONFIG,
    GAME_OPTIONS,
    MAX_PLAYERS_BY_GAME,
    MIN_PLAYERS,
    EXACT_PLAYERS,
    NO_OPTIONS_GAMES,
    GAME_ROUTES,
    type GameType,
} from '@/lib/gameConfig';

type Player = { userId: string; username: string };

type LobbyMeta = {
    title?: string;
    description?: string;
    maxPlayers?: number;
    isPublic?: boolean;
    gameType?: GameType;
    unoOptions?: { stackable: boolean; jumpIn: boolean; teamMode: string; teamWinMode: string };
    tabooOptions?: { turnDuration: number; totalRounds: number; trapWordCount: number; maxAttempts: number; trapDuration: number };
    quizOptions?: { timeMode: string; timePerQuestion: number };
    skyjowOptions?: { eliminateRows: boolean };
};

type LobbyState = {
    hostId: string | null;
    players: Player[];
    status: string;
    gameType: GameType;
    maxPlayers?: number;
    title?: string | null;
    description?: string | null;
    isPublic?: boolean;
    unoOptions?: { stackable: boolean; jumpIn: boolean; teamMode: string; teamWinMode: string };
    tabooOptions?: { turnDuration: number; totalRounds: number; trapWordCount: number; maxAttempts: number; trapDuration: number };
    skyjowOptions?: { eliminateRows: boolean };
    timeMode?: string;
    timePerQuestion?: number;
    quizId?: string | null;
    teams?: Record<string, 0 | 1> | null;
};

function useDebounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number): T {
    const timer = useRef<NodeJS.Timeout | null>(null);
    return ((...args: Parameters<T>) => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => fn(...args), delay);
    }) as T;
}

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-700 dark:text-slate-300">{label}</span>
            <div className="flex-shrink-0">{children}</div>
        </div>
    );
}

function OptionSelect({ value, onChange, options, disabled }: {
    value: number | string;
    onChange: (v: string) => void;
    options: { v: string | number; label: string }[];
    disabled?: boolean;
}) {
    return (
        <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
            className="bg-gray-100 dark:bg-slate-700/60 border border-gray-300 dark:border-slate-600/50 rounded-lg px-3 py-1.5 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/60 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            {options.map(o => <option key={o.v} value={o.v} className="bg-white dark:bg-slate-800">{o.label}</option>)}
        </select>
    );
}

function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-700 dark:text-slate-300">{label}</span>
            <button type="button" onClick={() => !disabled && onChange(!checked)} disabled={disabled}
                className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-slate-600'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
            </button>
        </div>
    );
}

function QuizSearch({ isHost, onSelect, selectedId, selectedTitle }: {
    isHost: boolean;
    onSelect: (id: string, title: string) => void;
    selectedId?: string;
    selectedTitle?: string;
}) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ id: string; title: string; _count: { questions: number } }[]>([]);
    const [open, setOpen] = useState(false);
    const searchTimer = useRef<NodeJS.Timeout | null>(null);

    const search = (q: string) => {
        setQuery(q);
        setOpen(true);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (!q.trim()) { setResults([]); return; }
        searchTimer.current = setTimeout(async () => {
            const res = await fetch(`/api/quiz?search=${encodeURIComponent(q)}&page=1&pageSize=6`);
            if (!res.ok) return;
            const data = await res.json();
            setResults(Array.isArray(data) ? data : data.quizzes ?? []);
        }, 300);
    };

    const displayValue = selectedId && selectedTitle ? selectedTitle : query;

    return (
        <div className="relative w-full">
            <input
                type="text"
                value={displayValue}
                onChange={e => { if (selectedId) onSelect('', ''); search(e.target.value); }}
                onFocus={() => { if (query) setOpen(true); }}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                placeholder="Rechercher un quiz…"
                disabled={!isHost}
                className="w-full bg-gray-100 dark:bg-slate-700/60 border border-gray-300 dark:border-slate-600/50 rounded-lg px-3 py-1.5 text-gray-900 dark:text-white text-xs placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {open && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600/50 rounded-lg shadow-xl overflow-hidden">
                    {results.map(q => (
                        <button key={q.id} onMouseDown={() => { onSelect(q.id, q.title); setQuery(''); setOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${selectedId === q.id ? 'bg-blue-600/20 text-blue-600 dark:text-blue-300' : 'text-gray-800 dark:text-slate-200'}`}>
                            <span className="font-medium truncate">{q.title}</span>
                            <span className="text-gray-400 dark:text-slate-500 flex-shrink-0 ml-2">{q._count.questions}q</span>
                        </button>
                    ))}
                </div>
            )}
            {selectedId && selectedTitle && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">✅ {selectedTitle}</p>
            )}
        </div>
    );
}

export default function LobbyCodePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams<{ code: string }>();
    const lobbyId = params?.code ?? '';

    const socket = useMemo(() => getLobbySocket(), []);
    const joinedRef = useRef(false);

    const [meta, setMeta] = useState<LobbyMeta | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [hostId, setHostId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [canStart, setCanStart] = useState(false);

    const [gameType, setGameTypeState] = useState<GameType>('quiz');
    const [maxPlayers, setMaxPlayersState] = useState(8);
    const [isPublic, setIsPublicState] = useState(false);
    const [selectedQuizId, setSelectedQuizId] = useState<string | undefined>();
    const [selectedQuizTitle, setSelectedQuizTitle] = useState('');
    const [unoTeamMode, setUnoTeamMode] = useState<'none' | '2v2'>('none');
    const [unoTeamWinMode, setUnoTeamWinMode] = useState<'one' | 'both'>('one');
    const [unoStackable, setUnoStackable] = useState(false);
    const [unoJumpIn, setUnoJumpIn] = useState(false);
    const [tabooTurnDuration, setTabooTurnDuration] = useState(60);
    const [tabooTotalRounds, setTabooTotalRounds] = useState(3);
    const [tabooTrapWordCount, setTabooTrapWordCount] = useState(5);
    const [tabooMaxAttempts, setTabooMaxAttempts] = useState(10);
    const [tabooTrapDuration, setTabooTrapDuration] = useState(60);
    const [quizTimeMode, setQuizTimeMode] = useState<'per_question' | 'total' | 'none'>('per_question');
    const [quizTimePerQuestion, setQuizTimePerQuestion] = useState(15);
    const [skyjowEliminateRows, setSkyjowEliminateRows] = useState(false);
    const [teams, setTeams] = useState<Record<string, 0 | 1> | null>(null);
    const [gridSize, setGridSize] = useState(10);
    const [turnTime, setTurnTime] = useState(30);
    const [autoPlace, setAutoPlace] = useState(true);
    const { setLobbyId } = useChat();

    useEffect(() => {
        setLobbyId(lobbyId);
        return () => setLobbyId(null);
    }, [lobbyId]);

    const myTeam: 0 | 1 | undefined = useMemo(() => {
        if (!teams || !session?.user?.id) return undefined;
        const t = teams[session.user.id];
        return t === 0 || t === 1 ? t : undefined;
    }, [teams, session?.user?.id]);

    useEffect(() => {
        if (!socket || !lobbyId) return;
        socket.emit('chat:joinTeam', { team: myTeam });
    }, [socket, lobbyId, myTeam]);

    const emitTitle = useDebounce((title: string) => socket?.emit('lobby:setMeta', { title }), 500);
    const emitDescription = useDebounce((description: string) => socket?.emit('lobby:setMeta', { description }), 500);

    useEffect(() => {
        if (!lobbyId) return;
        if (status === 'unauthenticated') router.replace(`/login?callbackUrl=${encodeURIComponent(`/lobby/create/${lobbyId}`)}`);
    }, [status, router, lobbyId]);

    useEffect(() => {
        if (!socket || !lobbyId || status !== 'authenticated' || !session?.user?.id) return;
        const meUserId = session.user.id;
        const meUsername = session.user.username ?? session.user.email ?? 'User';

        const onState = (state: LobbyState) => {
            setPlayers(state.players ?? []);
            setHostId(state.hostId);
            setMeta(prev => ({
                title: state.title ?? prev?.title,
                description: state.description ?? prev?.description,
                maxPlayers: state.maxPlayers ?? prev?.maxPlayers,
                isPublic: state.isPublic ?? prev?.isPublic,
                gameType: state.gameType ?? prev?.gameType,
                unoOptions: state.unoOptions ?? prev?.unoOptions,
                tabooOptions: state.tabooOptions ?? prev?.tabooOptions,
                skyjowOptions: state.skyjowOptions ?? prev?.skyjowOptions,
                quizOptions: state.timeMode
                    ? { timeMode: state.timeMode, timePerQuestion: state.timePerQuestion ?? 15 }
                    : prev?.quizOptions,
            }));
            setGameTypeState(state.gameType ?? 'quiz');
            setMaxPlayersState(state.maxPlayers ?? 8);
            setTeams(state.teams ?? null);
            setIsPublicState(state.isPublic ?? false);
            if (state.quizId) setSelectedQuizId(state.quizId);
            if (state.unoOptions) {
                setUnoTeamMode((state.unoOptions.teamMode as 'none' | '2v2') ?? 'none');
                setUnoTeamWinMode((state.unoOptions.teamWinMode as 'one' | 'both') ?? 'one');
                setUnoStackable(state.unoOptions.stackable ?? false);
                setUnoJumpIn(state.unoOptions.jumpIn ?? false);
            }
            if (state.tabooOptions) {
                setTabooTurnDuration(state.tabooOptions.turnDuration ?? 60);
                setTabooTotalRounds(state.tabooOptions.totalRounds ?? 3);
                setTabooTrapWordCount(state.tabooOptions.trapWordCount ?? 5);
                setTabooMaxAttempts(state.tabooOptions.maxAttempts ?? 10);
                setTabooTrapDuration(state.tabooOptions.trapDuration ?? 60);
            }
            if (state.timeMode) setQuizTimeMode(state.timeMode as 'per_question' | 'total' | 'none');
            if (state.timePerQuestion) setQuizTimePerQuestion(state.timePerQuestion);
            if (state.skyjowOptions) setSkyjowEliminateRows(state.skyjowOptions.eliminateRows ?? false);

            // ── canStart via GAME_CONFIG ──────────────────────────────────
            const count = state.players?.length ?? 0;
            const g = state.gameType;
            const hasQuiz = g === 'quiz' ? !!state.quizId : true;
            const exact = EXACT_PLAYERS[g];
            const min = MIN_PLAYERS[g] ?? 2;
            const ok = exact ? count === exact : count >= min && hasQuiz;
            setCanStart(ok && state.hostId === meUserId);
        };

        socket.on('lobby:state', onState);
        socket.on('lobby:kicked', () => { alert('Vous avez été expulsé.'); router.push('/lobby/all'); });

        // ── game:start via GAME_ROUTES ────────────────────────────────────
        socket.on('game:start', (payload: { gameType: GameType; quizId?: string; timeMode?: string; timePerQuestion?: number }) => {
            const routeFn = GAME_ROUTES[payload.gameType];
            if (routeFn) {
                router.push(routeFn(lobbyId));
            } else {
                // quiz
                sessionStorage.setItem(`lobby_timeMode_${lobbyId}`, payload.timeMode ?? 'none');
                sessionStorage.setItem(`lobby_timePerQuestion_${lobbyId}`, String(payload.timePerQuestion ?? 15));
                router.push(`/quiz/${payload.quizId}?lobby=${lobbyId}`);
            }
        });

        if (!joinedRef.current) {
            joinedRef.current = true;
            const raw = sessionStorage.getItem(`lobby_meta_${lobbyId}`);
            let m: LobbyMeta | null = null;
            if (raw) { try { m = JSON.parse(raw); sessionStorage.removeItem(`lobby_meta_${lobbyId}`); } catch { /* ignore */ } }
            if (m) {
                setMeta(m);
                setGameTypeState(m.gameType ?? 'quiz');
                setMaxPlayersState(m.maxPlayers ?? 8);
                setIsPublicState(m.isPublic ?? false);
                if (m.unoOptions) { setUnoTeamMode(m.unoOptions.teamMode as 'none' | '2v2'); setUnoTeamWinMode(m.unoOptions.teamWinMode as 'one' | 'both'); setUnoStackable(m.unoOptions.stackable); setUnoJumpIn(m.unoOptions.jumpIn); }
                if (m.tabooOptions) { setTabooTurnDuration(m.tabooOptions.turnDuration); setTabooTotalRounds(m.tabooOptions.totalRounds); setTabooTrapWordCount(m.tabooOptions.trapWordCount); setTabooMaxAttempts(m.tabooOptions.maxAttempts); setTabooTrapDuration(m.tabooOptions.trapDuration); }
                if (m.quizOptions) { setQuizTimeMode(m.quizOptions.timeMode as 'per_question' | 'total' | 'none'); setQuizTimePerQuestion(m.quizOptions.timePerQuestion); }
                if (m.skyjowOptions) setSkyjowEliminateRows(m.skyjowOptions.eliminateRows);
            }
            socket.emit('lobby:join', { lobbyId, userId: meUserId, username: meUsername, title: m?.title, description: m?.description, maxPlayers: m?.maxPlayers, isPublic: m?.isPublic });
            if (m?.gameType && m.gameType !== 'quiz') setTimeout(() => socket.emit('lobby:setGameType', { gameType: m!.gameType }), 300);
            if (m?.unoOptions) setTimeout(() => socket.emit('lobby:setUnoOptions', m!.unoOptions), 400);
            if (m?.tabooOptions) setTimeout(() => socket.emit('lobby:setTabooOptions', m!.tabooOptions), 400);
            if (m?.skyjowOptions) setTimeout(() => socket.emit('lobby:setSkyjowOptions', m!.skyjowOptions), 400);
            if (m?.quizOptions) { const qo = m.quizOptions; setTimeout(() => { socket.emit('lobby:setTimeMode', { timeMode: qo.timeMode }); socket.emit('lobby:setTimePerQuestion', { timePerQuestion: qo.timePerQuestion }); }, 400); }
        }

        return () => {
            socket.off('lobby:state', onState);
            socket.off('lobby:kicked');
            socket.off('game:start');
            socket.emit('lobby:leave');
            joinedRef.current = false;
        };
    }, [socket, lobbyId, status, session?.user?.id, session?.user?.username, session?.user?.email]);

    if (status === 'loading') return <LoadingSpinner />;
    if (status !== 'authenticated' || !session?.user?.id) return null;

    const me = session.user.id;
    const isHost = hostId === me;
    const selectedGame = GAME_OPTIONS.find(g => g.value === gameType);
    const isMaxLocked = gameType === 'puissance4' || (gameType === 'uno' && unoTeamMode === '2v2');
    const formatTime = (t: number) => t < 60 ? `${t}s` : `${Math.floor(t / 60)} min${t % 60 ? ` ${t % 60}s` : ''}`;

    const handleGameTypeChange = (g: GameType) => {
        setGameTypeState(g);
        socket?.emit('lobby:setGameType', { gameType: g });
    };

    const handleUnoTeamMode = (mode: 'none' | '2v2') => {
        setUnoTeamMode(mode);
        if (mode === '2v2') {
            setMaxPlayersState(4);
            socket?.emit('lobby:setMeta', { maxPlayers: 4 });
        }
        socket?.emit('lobby:setUnoOptions', { teamMode: mode });
    };

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg py-8">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 mb-4 text-3xl">🎮</div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{meta?.title || 'Lobby'}</h1>
                    <div className="flex items-center justify-center gap-2 mt-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isHost ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' : 'bg-gray-200 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400'}`}>
                            {isHost ? '👑 Host' : '👤 Participant'}
                        </span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 rounded-2xl shadow-2xl p-6 space-y-6">

                    {/* Titre */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Titre du lobby</label>
                        {isHost ? (
                            <input type="text" value={meta?.title ?? ''} maxLength={60}
                                onChange={e => { setMeta(prev => ({ ...prev, title: e.target.value })); emitTitle(e.target.value.trim()); }}
                                className="w-full bg-gray-100 dark:bg-slate-800/60 border border-gray-300 dark:border-slate-600/50 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition-all" />
                        ) : (
                            <div className="w-full bg-gray-100 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700/30 rounded-xl px-4 py-3 text-gray-700 dark:text-slate-300 text-sm">{meta?.title || '—'}</div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                            Description <span className="text-gray-400 dark:text-slate-600 font-normal normal-case">(optionnel)</span>
                        </label>
                        {isHost ? (
                            <textarea value={meta?.description ?? ''} maxLength={200} rows={2}
                                onChange={e => { setMeta(prev => ({ ...prev, description: e.target.value })); emitDescription(e.target.value.trim()); }}
                                placeholder="Décrivez votre partie…"
                                className="w-full bg-gray-100 dark:bg-slate-800/60 border border-gray-300 dark:border-slate-600/50 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition-all resize-none" />
                        ) : (
                            meta?.description
                                ? <div className="w-full bg-gray-100 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700/30 rounded-xl px-4 py-3 text-gray-700 dark:text-slate-300 text-sm">{meta.description}</div>
                                : <div className="text-gray-400 dark:text-slate-600 text-xs italic">Aucune description</div>
                        )}
                    </div>

                    <div className="border-t border-gray-200 dark:border-slate-700/50" />

                    {/* Code d'invitation */}
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700/30 rounded-xl px-4 py-3">
                        <span className="text-xs text-gray-500 dark:text-slate-400 flex-1 truncate">
                            Code lobby : <span className="font-bold text-gray-900 dark:text-white tracking-widest">{lobbyId}</span>
                        </span>
                        <div className="relative flex-shrink-0">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/lobby/create/${lobbyId}`);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                }}
                                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20">
                                {copied ? '✅ Copié !' : '⧉ Copier le lien'}
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-slate-700/50" />

                    {/* Jeu — dérivé de GAME_OPTIONS */}
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Jeu</label>
                        <div className="grid grid-cols-3 gap-2">
                            {GAME_OPTIONS.map(g => (
                                <button key={g.value} onClick={() => isHost && handleGameTypeChange(g.value)}
                                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 font-semibold text-xs transition-all
                                        ${gameType === g.value
                                            ? 'border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-300'
                                            : 'border-gray-200 dark:border-slate-700/50 bg-gray-100 dark:bg-slate-800/40 text-gray-500 dark:text-slate-400'}
                                        ${isHost && gameType !== g.value ? 'hover:border-gray-300 dark:hover:border-slate-600 hover:text-gray-700 dark:hover:text-slate-300 cursor-pointer' : 'cursor-default'}`}>
                                    <span className="text-xl">{g.icon}</span>
                                    <span>{g.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Options UNO */}
                    {gameType === 'uno' && (
                        <div className={`bg-gray-50 dark:bg-slate-800/40 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-slate-700/30 ${!isHost ? 'opacity-60 pointer-events-none' : ''}`}>
                            <p className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Options UNO</p>
                            <div className="grid grid-cols-2 gap-2">
                                {([{ v: 'none', label: '👤 Solo', desc: '2–8' }, { v: '2v2', label: '👥 2v2', desc: '4 joueurs' }] as const).map(opt => (
                                    <button key={opt.v} onClick={() => isHost && handleUnoTeamMode(opt.v)}
                                        className={`py-2 px-3 rounded-lg border-2 text-xs font-semibold transition-all flex flex-col items-center
                                            ${unoTeamMode === opt.v
                                                ? 'border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-300'
                                                : 'border-gray-200 dark:border-slate-600/50 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-500'}`}>
                                        <span>{opt.label}</span><span className="opacity-60 font-normal">{opt.desc}</span>
                                    </button>
                                ))}
                            </div>
                            {unoTeamMode === '2v2' && (
                                <OptionRow label="Condition de victoire">
                                    <OptionSelect value={unoTeamWinMode} onChange={v => { setUnoTeamWinMode(v as 'one' | 'both'); socket?.emit('lobby:setUnoOptions', { teamWinMode: v }); }}
                                        options={[{ v: 'one', label: 'Un vide sa main' }, { v: 'both', label: 'Les 2 vident' }]} disabled={!isHost} />
                                </OptionRow>
                            )}
                            <Toggle checked={unoStackable} onChange={v => { setUnoStackable(v); socket?.emit('lobby:setUnoOptions', { stackable: v }); }} label="Cartes empilables (+2/+4)" disabled={!isHost} />
                            {unoTeamMode !== '2v2' && <Toggle checked={unoJumpIn} onChange={v => { setUnoJumpIn(v); socket?.emit('lobby:setUnoOptions', { jumpIn: v }); }} label="Jump-in" disabled={!isHost} />}
                        </div>
                    )}

                    {/* Options Bataille Navale */}
                    {gameType === 'battleship' && (
                        <div className="bg-gray-50 dark:bg-slate-800/40 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-slate-700/30">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Options Bataille Navale</p>
                            <OptionRow label="Taille de la grille">
                                <OptionSelect
                                    value={gridSize}
                                    onChange={v => { setGridSize(Number(v)); socket?.emit('lobby:setBattleshipOptions', { gridSize: Number(v) }); }}
                                    options={[8, 10, 12].map(n => ({ v: n, label: `${n}×${n}` }))}
                                />
                            </OptionRow>
                            <OptionRow label="Temps par tour">
                                <OptionSelect
                                    value={turnTime}
                                    onChange={v => { setTurnTime(Number(v)); socket?.emit('lobby:setBattleshipOptions', { turnTime: Number(v) }); }}
                                    options={[10, 20, 30, 60, 90, 120].map(t => ({ v: t, label: `${t}s` }))}
                                />
                            </OptionRow>
                            <Toggle checked={autoPlace} onChange={v => { setAutoPlace(v); socket?.emit('lobby:setBattleshipOptions', { autoPlace: v }); }} label="Placement automatique" />
                        </div>
                    )}

                    {/* Options Taboo */}
                    {gameType === 'taboo' && (
                        <div className={`bg-gray-50 dark:bg-slate-800/40 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-slate-700/30 ${!isHost ? 'opacity-60 pointer-events-none' : ''}`}>
                            <p className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Options Taboo</p>
                            <OptionRow label="Durée d'un tour"><OptionSelect value={tabooTurnDuration} onChange={v => { setTabooTurnDuration(Number(v)); socket?.emit('lobby:setTabooOptions', { turnDuration: Number(v) }); }} options={[15, 30, 45, 60, 90, 120, 180, 240, 300].map(t => ({ v: t, label: `${t}s` }))} disabled={!isHost} /></OptionRow>
                            <OptionRow label="Rounds"><OptionSelect value={tabooTotalRounds} onChange={v => { setTabooTotalRounds(Number(v)); socket?.emit('lobby:setTabooOptions', { totalRounds: Number(v) }); }} options={[1, 2, 3, 4, 5, 7, 10].map(r => ({ v: r, label: `${r}` }))} disabled={!isHost} /></OptionRow>
                            <OptionRow label="Mots piégés"><OptionSelect value={tabooTrapWordCount} onChange={v => { setTabooTrapWordCount(Number(v)); socket?.emit('lobby:setTabooOptions', { trapWordCount: Number(v) }); }} options={[2, 3, 4, 5, 6, 7, 8, 10].map(n => ({ v: n, label: `${n}` }))} disabled={!isHost} /></OptionRow>
                            <OptionRow label="Temps mots piégés"><OptionSelect value={tabooTrapDuration} onChange={v => { setTabooTrapDuration(Number(v)); socket?.emit('lobby:setTabooOptions', { trapDuration: Number(v) }); }} options={[15, 30, 45, 60, 90, 120, 180].map(t => ({ v: t, label: `${t}s` }))} disabled={!isHost} /></OptionRow>
                            <OptionRow label="Tentatives max"><OptionSelect value={tabooMaxAttempts} onChange={v => { setTabooMaxAttempts(Number(v)); socket?.emit('lobby:setTabooOptions', { maxAttempts: Number(v) }); }} options={[3, 5, 7, 10, 15, 20, 30].map(n => ({ v: n, label: `${n}` }))} disabled={!isHost} /></OptionRow>
                        </div>
                    )}

                    {/* Options Quiz */}
                    {gameType === 'quiz' && (
                        <div className={`bg-gray-50 dark:bg-slate-800/40 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-slate-700/30 ${!isHost ? 'opacity-60 pointer-events-none' : ''}`}>
                            <p className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Options Quiz</p>
                            <OptionRow label="Quiz">
                                <QuizSearch isHost={isHost} selectedId={selectedQuizId} selectedTitle={selectedQuizTitle}
                                    onSelect={(id, title) => {
                                        setSelectedQuizId(id || undefined);
                                        setSelectedQuizTitle(title);
                                        if (id) socket?.emit('lobby:setQuiz', { quizId: id });
                                    }} />
                            </OptionRow>
                            <OptionRow label="Mode de temps">
                                <OptionSelect value={quizTimeMode} onChange={v => { setQuizTimeMode(v as typeof quizTimeMode); socket?.emit('lobby:setTimeMode', { timeMode: v }); }}
                                    options={[{ v: 'per_question', label: 'Par question' }, { v: 'total', label: 'Temps total' }, { v: 'none', label: 'Sans limite' }]} disabled={!isHost} />
                            </OptionRow>
                            {quizTimeMode !== 'none' && (
                                <OptionRow label={quizTimeMode === 'total' ? 'Temps total' : 'Temps / question'}>
                                    <OptionSelect value={quizTimePerQuestion} onChange={v => { setQuizTimePerQuestion(Number(v)); socket?.emit('lobby:setTimePerQuestion', { timePerQuestion: Number(v) }); }}
                                        options={(quizTimeMode === 'total' ? [60, 120, 180, 300, 600, 900, 1200, 1800, 3600] : [5, 10, 15, 20, 30, 45, 60, 90, 120]).map(t => ({ v: t, label: formatTime(t) }))} disabled={!isHost} />
                                </OptionRow>
                            )}
                        </div>
                    )}

                    {/* Options Skyjow */}
                    {gameType === 'skyjow' && (
                        <div className={`bg-gray-50 dark:bg-slate-800/40 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-slate-700/30 ${!isHost ? 'opacity-60 pointer-events-none' : ''}`}>
                            <p className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Options Skyjow</p>
                            <Toggle checked={skyjowEliminateRows} onChange={v => { setSkyjowEliminateRows(v); socket?.emit('lobby:setSkyjowOptions', { eliminateRows: v }); }} label="Éliminer les lignes (4 identiques)" disabled={!isHost} />
                        </div>
                    )}

                    {/* Pas d'options — dérivé de NO_OPTIONS_GAMES */}
                    {NO_OPTIONS_GAMES[gameType] && (
                        <div className="bg-gray-50 dark:bg-slate-800/40 rounded-xl p-3 border border-gray-200 dark:border-slate-700/30 text-center">
                            <p className="text-xs text-gray-400 dark:text-slate-500 italic">{NO_OPTIONS_GAMES[gameType]}</p>
                        </div>
                    )}

                    <div className="border-t border-gray-200 dark:border-slate-700/50" />

                    {/* Joueurs max + Visibilité — dérivé de MAX_PLAYERS_BY_GAME */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Joueurs max</label>
                            {isHost ? (
                                <select value={maxPlayers} onChange={e => { setMaxPlayersState(Number(e.target.value)); socket?.emit('lobby:setMeta', { maxPlayers: Number(e.target.value) }); }} disabled={isMaxLocked}
                                    className="w-full bg-gray-100 dark:bg-slate-800/60 border border-gray-300 dark:border-slate-600/50 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition-all appearance-none cursor-pointer disabled:opacity-50">
                                    {MAX_PLAYERS_BY_GAME[gameType].map(n => <option key={n} value={n} className="bg-white dark:bg-slate-800">{n} joueurs</option>)}
                                </select>
                            ) : (
                                <div className="bg-gray-100 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700/30 rounded-xl px-4 py-3 text-gray-700 dark:text-slate-300 text-sm">{maxPlayers} joueurs</div>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Visibilité</label>
                            {isHost ? (
                                <div className="flex rounded-xl border border-gray-300 dark:border-slate-600/50 overflow-hidden h-[46px]">
                                    <button onClick={() => { setIsPublicState(true); socket?.emit('lobby:setMeta', { isPublic: true }); }}
                                        className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold transition-all ${isPublic ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-800/60 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'}`}>
                                        🌍 <span>Public</span>
                                    </button>
                                    <button onClick={() => { setIsPublicState(false); socket?.emit('lobby:setMeta', { isPublic: false }); }}
                                        className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold transition-all border-l border-gray-300 dark:border-slate-600/50 ${!isPublic ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-800/60 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'}`}>
                                        🔒 <span>Privé</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-gray-100 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700/30 rounded-xl px-4 py-3 text-gray-700 dark:text-slate-300 text-sm">{isPublic ? '🌍 Public' : '🔒 Privé'}</div>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-slate-700/50" />

                    {/* Équipes — Taboo ou UNO 2v2 */}
                    {(gameType === 'taboo' || (gameType === 'uno' && unoTeamMode === '2v2')) && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Équipes</h2>
                                {isHost && (
                                    <button onClick={() => socket?.emit('lobby:shuffleTeams')}
                                        className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors underline">
                                        🔀 Mélanger
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[0, 1].map(team => {
                                    const teamPlayers = players.filter(p => teams?.[p.userId] === team);
                                    const myTeamLocal = session?.user?.id ? teams?.[session.user.id] : undefined;
                                    return (
                                        <div key={team} className={`rounded-xl border p-3 space-y-2 ${team === 0 ? 'border-blue-500/30 bg-blue-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                                            <div className="flex items-center justify-between">
                                                <span className={`text-xs font-semibold ${team === 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {team === 0 ? '🔵 Équipe Bleue' : '🔴 Équipe Rouge'}
                                                </span>
                                                <button
                                                    onClick={() => socket?.emit('lobby:setTeam', { team })}
                                                    className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-all ${myTeamLocal === team
                                                        ? (team === 0 ? 'bg-blue-500 text-white' : 'bg-red-500 text-white')
                                                        : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-300 dark:hover:bg-slate-600'}`}>
                                                    {myTeamLocal === team ? '✓ Rejoint' : 'Rejoindre'}
                                                </button>
                                            </div>
                                            <div className="space-y-1">
                                                {teamPlayers.map(p => (
                                                    <div key={p.userId} className="flex items-center gap-2 text-xs text-gray-700 dark:text-slate-300">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${team === 0 ? 'bg-blue-400' : 'bg-red-400'}`} />
                                                        {p.username}
                                                        {p.userId === hostId && <span className="text-yellow-500 dark:text-yellow-400">👑</span>}
                                                    </div>
                                                ))}
                                                {teamPlayers.length === 0 && <p className="text-xs text-gray-400 dark:text-slate-600 italic">Aucun joueur</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {gameType === 'taboo' && (() => {
                                const t0 = players.filter(p => teams?.[p.userId] === 0).length;
                                const t1 = players.filter(p => teams?.[p.userId] === 1).length;
                                return t0 >= 2 && t1 >= 2
                                    ? <p className="text-xs text-green-600 dark:text-green-400 mt-2">✅ Équipes prêtes !</p>
                                    : <p className="text-xs text-orange-500 dark:text-orange-400 mt-2">⚠️ Minimum 2 joueurs par équipe</p>;
                            })()}
                        </div>
                    )}

                    {/* Participants live */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Participants</h2>
                            <span className="text-xs text-gray-400 dark:text-slate-500">{players.length}{maxPlayers ? `/${maxPlayers}` : ''}</span>
                        </div>
                        <div className="space-y-2">
                            {players.map(p => (
                                <div key={p.userId} className="flex items-center gap-3 bg-gray-100 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700/30 rounded-xl px-3 py-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                                    <span className="text-sm text-gray-900 dark:text-white font-medium flex-1">{p.username}</span>
                                    {p.userId === hostId && <span className="text-xs text-yellow-500 dark:text-yellow-400">👑 Host</span>}
                                    {p.userId === me && <span className="text-xs text-gray-400 dark:text-slate-500">(moi)</span>}
                                </div>
                            ))}
                            {players.length === 0 && <div className="text-center py-4 text-gray-400 dark:text-slate-500 text-sm">En attente de joueurs…</div>}
                        </div>
                        {maxPlayers > 0 && (
                            <div className="mt-3 w-full bg-gray-200 dark:bg-slate-700/50 rounded-full h-1.5">
                                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min((players.length / maxPlayers) * 100, 100)}%` }} />
                            </div>
                        )}
                    </div>

                    <div className="border-t border-gray-200 dark:border-slate-700/50" />

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button onClick={() => { socket?.emit('lobby:leave'); router.push('/'); }}
                            className="px-5 py-3 rounded-xl border border-gray-300 dark:border-slate-600/50 text-gray-500 dark:text-slate-400 text-sm font-semibold hover:border-gray-400 dark:hover:border-slate-500 hover:text-gray-700 dark:hover:text-slate-300 transition-all">
                            Quitter
                        </button>
                        {isHost ? (
                            <button onClick={() => socket?.emit('lobby:start')} disabled={!canStart}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-300 dark:disabled:from-slate-700 disabled:to-gray-300 dark:disabled:to-slate-700 disabled:text-gray-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-lg shadow-green-500/20 disabled:shadow-none">
                                {canStart ? `🚀 Lancer ${selectedGame?.label ?? 'la partie'} !` : '⏳ En attente de joueurs…'}
                            </button>
                        ) : (
                            <div className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/50 text-gray-400 dark:text-slate-500 text-sm font-semibold text-center">
                                ⏳ En attente du host…
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
