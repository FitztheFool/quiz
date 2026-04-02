// src/app/lobby/create/[code]/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getLobbySocket } from '@/lib/socket';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useChat } from '@/context/ChatContext';
import {
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
    battleshipOptions?: { gridSize: number; turnTime: number };
    impostorOptions?: { rounds: number; timePerRound: number };
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
    battleshipOptions?: { gridSize: number; turnTime: number };
    impostorOptions?: { rounds: number; timePerRound: number };
    timeMode?: string;
    timePerQuestion?: number;
    quizId?: string | null;
    gameId?: string | null;
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
            className="font-sans bg-gray-100 dark:bg-slate-700/60 border border-gray-300 dark:border-slate-600/50 rounded-lg px-3 py-1.5 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/60 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
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

function QuizSearch({ isHost, onSelect, selectedId, selectedTitle, selectedQuestionCount, categories, categoryId, onCategoryChange }: {
    isHost: boolean;
    onSelect: (id: string, title: string, questionCount?: number) => void;
    selectedId?: string;
    selectedTitle?: string;
    selectedQuestionCount?: number;
    categories: { id: string; name: string; _count: { quizzes: number } }[];
    categoryId: string;
    onCategoryChange: (catId: string) => void;
}) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ id: string; title: string; _count: { questions: number } }[]>([]);
    const [open, setOpen] = useState(false);
    const [catOpen, setCatOpen] = useState(false);
    const searchTimer = useRef<NodeJS.Timeout | null>(null);
    const catContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedCategory = categories.find(c => c.id === categoryId) ?? null;

    useEffect(() => {
        if (!catOpen) return;
        const handler = (e: MouseEvent) => {
            if (catContainerRef.current && !catContainerRef.current.contains(e.target as Node)) {
                setCatOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [catOpen]);

    const search = (q: string, catId?: string) => {
        setQuery(q);
        setOpen(true);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        const activeCatId = catId !== undefined ? catId : categoryId;
        if (!q.trim() && !activeCatId) { setResults([]); return; }
        searchTimer.current = setTimeout(async () => {
            const params = new URLSearchParams({ page: '1', pageSize: '12' });
            if (q.trim()) params.set('search', q);
            if (activeCatId) params.set('categoryId', activeCatId);
            const res = await fetch(`/api/quiz?${params}`);
            if (!res.ok) return;
            const data = await res.json();
            setResults(Array.isArray(data) ? data : (data.quizzes ?? []));
        }, 300);
    };

    const handleCategoryChange = (catId: string) => {
        onCategoryChange(catId);
        setCatOpen(false);
        if (selectedId) onSelect('', '');
        search(query, catId);
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const displayValue = selectedId && selectedTitle ? selectedTitle : query;
    const isSelected = !!(selectedId && selectedTitle);

    return (
        <div className="w-full space-y-2">
            {/* Category custom dropdown */}
            {categories.length > 0 && (
                <div className="relative" ref={catContainerRef}>
                    <button
                        type="button"
                        onClick={() => isHost && setCatOpen(v => !v)}
                        className="font-sans w-full flex items-center justify-between bg-gray-100 dark:bg-slate-700/60 border border-gray-300 dark:border-slate-600/50 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60">
                        <span className={selectedCategory ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-500'}>
                            {selectedCategory ? selectedCategory.name : 'Toutes les catégories'}
                        </span>
                        <span className="text-gray-400 dark:text-slate-500 flex-shrink-0 ml-2">
                            {selectedCategory ? `(${selectedCategory._count.quizzes})` : '▾'}
                        </span>
                    </button>
                    {catOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600/50 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto font-sans">
                            <button onMouseDown={() => handleCategoryChange('')}
                                className={`w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${!categoryId ? 'bg-blue-600/20 text-blue-600 dark:text-blue-300' : 'text-gray-800 dark:text-slate-200'}`}>
                                <span>Toutes les catégories</span>
                            </button>
                            {categories.map(c => (
                                <button key={c.id} onMouseDown={() => handleCategoryChange(c.id)}
                                    className={`w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${categoryId === c.id ? 'bg-blue-600/20 text-blue-600 dark:text-blue-300' : 'text-gray-800 dark:text-slate-200'}`}>
                                    <span className="truncate">{c.name}</span>
                                    <span className="text-gray-400 dark:text-slate-500 flex-shrink-0 ml-2">({c._count.quizzes})</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Quiz search input */}
            <div className="relative">
                <input
                    type="text"
                    ref={inputRef}
                    value={displayValue}
                    onChange={e => { if (selectedId) onSelect('', ''); search(e.target.value); }}
                    onFocus={() => { if (query || categoryId) { search(query); setOpen(true); } }}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    placeholder="Rechercher un quiz…"
                    readOnly={!isHost}
                    className={`font-sans w-full bg-gray-100 dark:bg-slate-700/60 border rounded-lg px-3 py-2 text-gray-900 dark:text-white text-xs placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 ${isSelected ? 'border-green-500/60 pr-16' : 'border-gray-300 dark:border-slate-600/50'}`}
                />
                {isSelected && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none flex items-center gap-1">
                        {selectedQuestionCount !== undefined && <span className="text-gray-400 dark:text-slate-500">({selectedQuestionCount})</span>}
                        <span>✅</span>
                    </span>
                )}
                {open && results.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600/50 rounded-lg shadow-xl overflow-y-auto max-h-64 font-sans">
                        {results.map(q => (
                            <button key={q.id} onMouseDown={() => { onSelect(q.id, q.title, q._count.questions); setQuery(''); setOpen(false); }}
                                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${selectedId === q.id ? 'bg-blue-600/20 text-blue-600 dark:text-blue-300' : 'text-gray-800 dark:text-slate-200'}`}>
                                <span className="font-medium truncate">{q.title}</span>
                                <span className="text-gray-400 dark:text-slate-500 flex-shrink-0 ml-2">{q._count.questions}q</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
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
    const [tabooOk, setTabooOk] = useState(false);
    const [isLaunching, setIsLaunching] = useState(false);
    const [activeGameId, setActiveGameId] = useState<string | null>(null);
    const [activeGameType, setActiveGameType] = useState<GameType | null>(null);

    const [gameType, setGameTypeState] = useState<GameType>('uno');
    const [maxPlayers, setMaxPlayersState] = useState(8);
    const [isPublic, setIsPublicState] = useState(false);
    const [selectedQuizId, setSelectedQuizId] = useState<string | undefined>();
    const [selectedQuizTitle, setSelectedQuizTitle] = useState('');
    const [selectedQuizQuestionCount, setSelectedQuizQuestionCount] = useState<number | undefined>();
    const [selectedQuizCategoryId, setSelectedQuizCategoryId] = useState('');
    const [categories, setCategories] = useState<{ id: string; name: string; _count: { quizzes: number } }[]>([]);
    const [unoTeamMode, setUnoTeamMode] = useState<'none' | '2v2'>('none');
    const [unoTeamWinMode, setUnoTeamWinMode] = useState<'one' | 'both'>('one');
    const [unoStackable, setUnoStackable] = useState(false);
    const [unoJumpIn, setUnoJumpIn] = useState(false);
    const [tabooTurnDuration, setTabooTurnDuration] = useState(60);
    const [tabooTotalRounds, setTabooTotalRounds] = useState(3);
    const [tabooTrapWordCount, setTabooTrapWordCount] = useState(5);
    const [tabooMaxAttempts, setTabooMaxAttempts] = useState(10);
    const [tabooTrapDuration, setTabooTrapDuration] = useState(60);
    const [quizTimeMode, setQuizTimeMode] = useState<'quiz:per_question' | 'total' | 'none'>('quiz:per_question');
    const [quizTimePerQuestion, setQuizTimePerQuestion] = useState(15);
    const [skyjowEliminateRows, setSkyjowEliminateRows] = useState(false);
    const [teams, setTeams] = useState<Record<string, 0 | 1> | null>(null);
    const [gridSize, setGridSize] = useState(10);
    const [turnTime, setTurnTime] = useState(30);
    const [autoPlace, setAutoPlace] = useState(true);
    const [impostorRounds, setImpostorRounds] = useState(1);
    const [impostorTime, setImpostorTime] = useState(60);
    const { setLobbyId } = useChat();

    useEffect(() => {
        setLobbyId(lobbyId);
        return () => setLobbyId(null);
    }, [lobbyId]);

    useEffect(() => {
        fetch('/api/categories').then(r => r.ok ? r.json() : []).then(setCategories).catch(() => { });
    }, []);

    useEffect(() => {
        if (!selectedQuizId || selectedQuizTitle) return;
        fetch(`/api/quiz/${selectedQuizId}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.title) setSelectedQuizTitle(data.title);
                if (data?.category?.id) setSelectedQuizCategoryId(data.category.id);
                if (data?._count?.questions !== undefined) setSelectedQuizQuestionCount(data._count.questions);
            })
            .catch(() => { });
    }, [selectedQuizId]);

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
                battleshipOptions: state.battleshipOptions ?? prev?.battleshipOptions,
                quizOptions: state.timeMode
                    ? { timeMode: state.timeMode, timePerQuestion: state.timePerQuestion ?? 15 }
                    : prev?.quizOptions,
            }));
            setGameTypeState(state.gameType ?? 'quiz');
            setMaxPlayersState(state.maxPlayers ?? 8);
            setTeams(state.teams ?? null);
            setIsPublicState(state.isPublic ?? false);
            if (state.quizId) {
                setSelectedQuizId(prev => { if (prev !== state.quizId) { setSelectedQuizTitle(''); setSelectedQuizCategoryId(''); } return state.quizId!; });
            }
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
            if (state.timeMode) setQuizTimeMode(state.timeMode as 'quiz:per_question' | 'total' | 'none');
            if (state.timePerQuestion) setQuizTimePerQuestion(state.timePerQuestion);
            if (state.skyjowOptions) setSkyjowEliminateRows(state.skyjowOptions.eliminateRows ?? false);
            if (state.battleshipOptions) {
                setGridSize(state.battleshipOptions.gridSize ?? 10);
                setTurnTime(state.battleshipOptions.turnTime ?? 30);
            }
            if (state.impostorOptions) { setImpostorRounds(state.impostorOptions.rounds ?? 1); setImpostorTime(state.impostorOptions.timePerRound ?? 60); }

            // ── Partie en cours : afficher un bandeau, ne pas auto-rediriger ─
            if (state.status === 'PLAYING') {
                // For quiz, the second URL segment is the quizId, not the gameId UUID
                setActiveGameId(state.gameType === 'quiz' ? (state.quizId ?? null) : (state.gameId ?? null));
                setActiveGameType(state.gameType ?? null);
            } else {
                setActiveGameId(null);
                setActiveGameType(null);
            }

            // ── canStart via GAME_CONFIG ──────────────────────────────────
            const count = state.players?.length ?? 0;
            const g = state.gameType;
            const hasQuiz = g === 'quiz' ? !!state.quizId : true;
            const exact = EXACT_PLAYERS[g];
            const min = MIN_PLAYERS[g] ?? 2;
            const maxList = MAX_PLAYERS_BY_GAME[g];
            const maxOk = maxList ? count <= Math.max(...maxList) : true;
            const countOk = exact ? count === exact : count >= min && maxOk;
            // Taboo / UNO 2v2: both teams must have >= 2 players
            const teams = state.teams ? Object.values(state.teams) : [];
            const unoIs2v2 = g === 'uno' && (state.unoOptions?.teamMode ?? 'none') === '2v2';
            const teamExact = unoIs2v2 ? 2 : 2; // taboo >= 2, uno 2v2 === 2
            const t0 = teams.filter((t: number) => t === 0).length;
            const t1 = teams.filter((t: number) => t === 1).length;
            const teamsOk = unoIs2v2
                ? t0 === 2 && t1 === 2
                : t0 >= teamExact && t1 >= teamExact;
            const tabooTeamsOk = teamsOk;
            setTabooOk(tabooTeamsOk);
            const tabooOk = g !== 'taboo' || teamsOk;
            const unoTeamModeVal = state.unoOptions?.teamMode ?? 'none';
            const unoOk = g !== 'uno' || unoTeamModeVal !== '2v2' || teamsOk;
            setCanStart(countOk && hasQuiz && tabooOk && unoOk && state.hostId === meUserId);
        };

        socket.on('lobby:state', onState);
        socket.on('lobby:kicked', () => { alert('Vous avez été expulsé.'); router.push('/lobby/all'); });

        // ── game:start via GAME_ROUTES ────────────────────────────────────
        socket.on('game:start', (payload: { gameType: GameType; gameId?: string; quizId?: string; timeMode?: string; timePerQuestion?: number }) => {
            setIsLaunching(true);
            setActiveGameId(null);
            setActiveGameType(null);
            if (payload.gameType === 'quiz') {
                sessionStorage.setItem(`lobby_timeMode_${lobbyId}`, payload.timeMode ?? 'none');
                sessionStorage.setItem(`lobby_timePerQuestion_${lobbyId}`, String(payload.timePerQuestion ?? 15));
                router.push(`/quiz/${lobbyId}/${payload.quizId}`);
            } else {
                const routeFn = GAME_ROUTES[payload.gameType];
                if (routeFn) router.push(routeFn(lobbyId, payload.gameId));
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
                if (m.quizOptions) { setQuizTimeMode(m.quizOptions.timeMode as 'quiz:per_question' | 'total' | 'none'); setQuizTimePerQuestion(m.quizOptions.timePerQuestion); }
                if (m.skyjowOptions) setSkyjowEliminateRows(m.skyjowOptions.eliminateRows);
                if (m.battleshipOptions) { setGridSize(m.battleshipOptions.gridSize); setTurnTime(m.battleshipOptions.turnTime); }
                if (m.impostorOptions) { setImpostorRounds(m.impostorOptions.rounds ?? 1); setImpostorTime(m.impostorOptions.timePerRound ?? 60); }
            }
            socket.emit('lobby:join', { lobbyId, userId: meUserId, username: meUsername, title: m?.title, description: m?.description, maxPlayers: m?.maxPlayers, isPublic: m?.isPublic });
            if (m?.gameType && m.gameType !== 'quiz') setTimeout(() => socket.emit('lobby:setGameType', { gameType: m!.gameType }), 300);
            if (m?.unoOptions) setTimeout(() => socket.emit('lobby:setUnoOptions', m!.unoOptions), 400);
            if (m?.tabooOptions) setTimeout(() => socket.emit('lobby:setTabooOptions', m!.tabooOptions), 400);
            if (m?.skyjowOptions) setTimeout(() => socket.emit('lobby:setSkyjowOptions', m!.skyjowOptions), 400);
            if (m?.battleshipOptions) setTimeout(() => socket.emit('lobby:setBattleshipOptions', m!.battleshipOptions), 400);
            if (m?.impostorOptions) setTimeout(() => socket.emit('lobby:setImpostorOptions', m!.impostorOptions), 400);
            if (m?.quizOptions) setTimeout(() => socket.emit('lobby:setQuizOptions', m!.quizOptions), 400);
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
    const isAdmin = session.user.role === 'ADMIN';
    const isHost = hostId === me;
    const selectedGame = GAME_OPTIONS.find(g => g.value === gameType);
    const isMaxLocked = gameType === 'puissance4' || (gameType === 'uno' && unoTeamMode === '2v2');
    const formatTime = (t: number) => t < 60 ? `${t}s` : `${Math.floor(t / 60)} min${t % 60 ? ` ${t % 60}s` : ''}`;

    const handleGameTypeChange = (g: GameType) => {
        setGameTypeState(g);
        setCanStart(false);
        socket?.emit('lobby:setGameType', { gameType: g });
        if (g === 'quiz' && selectedQuizId) {
            socket?.emit('lobby:setQuiz', { quizId: selectedQuizId });
        }
        const newMax = Math.max(...MAX_PLAYERS_BY_GAME[g]);
        setMaxPlayersState(newMax);
        socket?.emit('lobby:setMeta', { maxPlayers: newMax });
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
        <main className="bg-gray-50 dark:bg-slate-950 pb-8">

            {/* Sticky header */}
            <div className="sticky top-0 z-20 bg-gray-50/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-gray-200 dark:border-slate-800 px-4 md:px-6 lg:px-8 py-3">
                <div className="max-w-6xl mx-auto flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 text-xl flex-shrink-0">
                        {selectedGame?.icon ?? '🎮'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight truncate leading-tight">
                            {meta?.title || 'Lobby'}
                        </h1>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isHost ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' : 'bg-gray-200 dark:bg-slate-700/60 text-gray-500 dark:text-slate-400'}`}>
                                {isHost ? '👑 Hôte' : '👤 Participant'}
                            </span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPublic ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' : 'bg-gray-200 dark:bg-slate-700/60 text-gray-500 dark:text-slate-400'}`}>
                                {isPublic ? '🌍 Public' : '🔒 Privé'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6 pb-28">

                {/* Two-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 lg:gap-6 items-start">

                    {/* ── Left column : settings ── */}
                    <div className="space-y-4">

                        {/* Titre + Description */}
                        <div className="bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700/50 rounded-2xl p-5 space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Titre du lobby</label>
                                {isHost ? (
                                    <input type="text" value={meta?.title ?? ''} maxLength={60}
                                        onChange={e => { setMeta(prev => ({ ...prev, title: e.target.value })); emitTitle(e.target.value.trim()); }}
                                        placeholder="Nom de la partie…"
                                        className="w-full bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/50 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                                ) : (
                                    <div className="w-full bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700/30 rounded-xl px-4 py-2.5 text-gray-700 dark:text-slate-300 text-sm">{meta?.title || '—'}</div>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                    Description <span className="font-normal normal-case">(optionnel)</span>
                                </label>
                                {isHost ? (
                                    <textarea value={meta?.description ?? ''} maxLength={200} rows={2}
                                        onChange={e => { setMeta(prev => ({ ...prev, description: e.target.value })); emitDescription(e.target.value.trim()); }}
                                        placeholder="Décrivez votre partie…"
                                        className="w-full bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/50 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none" />
                                ) : (
                                    meta?.description
                                        ? <div className="w-full bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700/30 rounded-xl px-4 py-2.5 text-gray-700 dark:text-slate-300 text-sm">{meta.description}</div>
                                        : <div className="text-gray-400 dark:text-slate-600 text-xs italic">Aucune description</div>
                                )}
                            </div>
                        </div>

                        {/* Sélecteur de jeu */}
                        <div className="bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700/50 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Jeu</label>
                                {(() => {
                                    const minP = EXACT_PLAYERS[gameType] ?? (MIN_PLAYERS[gameType] ?? 2);
                                    const missing = minP - players.length;
                                    return missing > 0 ? (
                                        <span className="text-xs text-orange-500 dark:text-orange-400">
                                            (En attente de {missing} participant{missing > 1 ? 's' : ''})
                                        </span>
                                    ) : null;
                                })()}
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                {GAME_OPTIONS.map(g => {
                                    const maxForGame = Math.max(...MAX_PLAYERS_BY_GAME[g.value]);
                                    const minForGame = MIN_PLAYERS[g.value] ?? 2;
                                    const tooManyPlayers = isHost && gameType !== g.value && maxForGame < players.length;
                                    const notEnoughPlayers = isHost && gameType !== g.value && !tooManyPlayers && players.length < minForGame;
                                    const disabled = gameType !== g.value && (!isHost || tooManyPlayers);
                                    const title = tooManyPlayers
                                        ? `Trop de joueurs (max ${maxForGame})`
                                        : notEnoughPlayers
                                            ? `Il manque des joueurs (min ${minForGame})`
                                            : !isHost && gameType !== g.value
                                                ? 'Seul l\'hôte peut changer de jeu'
                                                : g.label;
                                    return (
                                        <button key={g.value}
                                            onClick={() => isHost && !tooManyPlayers && handleGameTypeChange(g.value)}
                                            title={title}
                                            className={`relative flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border-2 font-semibold text-[11px] transition-all
                                                ${gameType === g.value
                                                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-300 shadow-sm'
                                                    : disabled
                                                        ? 'border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/30 text-gray-300 dark:text-slate-700 cursor-not-allowed'
                                                        : 'border-gray-100 dark:border-slate-700/60 bg-gray-50 dark:bg-slate-800/40 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600 hover:text-gray-700 dark:hover:text-slate-200 cursor-pointer'}`}>
                                            <span className="text-2xl">{g.icon}</span>
                                            <span className="leading-tight text-center">{g.label}</span>
                                            {notEnoughPlayers && (
                                                <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-amber-400 text-white rounded-full w-4 h-4 flex items-center justify-center leading-none">
                                                    !
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Options du jeu sélectionné */}
                        {gameType === 'uno' && (
                            <div className={`bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700/50 rounded-2xl p-5 space-y-3 ${!isHost ? 'opacity-60 pointer-events-none' : ''}`}>
                                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Options UNO</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {([{ v: 'none', label: '👤 Solo', desc: '2–8 joueurs' }, { v: '2v2', label: '👥 2v2', desc: '4 joueurs' }] as const).map(opt => (
                                        <button key={opt.v} onClick={() => isHost && handleUnoTeamMode(opt.v)}
                                            className={`py-2.5 px-3 rounded-xl border-2 text-xs font-semibold transition-all flex flex-col items-center gap-0.5
                                                ${unoTeamMode === opt.v
                                                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-300'
                                                    : 'border-gray-100 dark:border-slate-700/60 bg-gray-50 dark:bg-slate-800/40 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-500'}`}>
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

                        {gameType === 'battleship' && (
                            <div className={`bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700/50 rounded-2xl p-5 space-y-3 ${!isHost ? 'opacity-60 pointer-events-none' : ''}`}>
                                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Options Bataille Navale</p>
                                <OptionRow label="Taille de la grille">
                                    <OptionSelect value={gridSize} onChange={v => { const g = Number(v); setGridSize(g); socket?.emit('lobby:setBattleshipOptions', { gridSize: g, turnTime }); }}
                                        options={[8, 10, 12].map(n => ({ v: n, label: `${n}×${n}` }))} disabled={!isHost} />
                                </OptionRow>
                                <OptionRow label="Temps par tour">
                                    <OptionSelect value={turnTime} onChange={v => { const t = Number(v); setTurnTime(t); socket?.emit('lobby:setBattleshipOptions', { gridSize, turnTime: t }); }}
                                        options={[10, 20, 30, 60, 90, 120].map(t => ({ v: t, label: `${t}s` }))} disabled={!isHost} />
                                </OptionRow>
                            </div>
                        )}

                        {gameType === 'taboo' && (
                            <div className={`bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700/50 rounded-2xl p-5 space-y-3 ${!isHost ? 'opacity-60 pointer-events-none' : ''}`}>
                                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Options Taboo</p>
                                <OptionRow label="Durée d'un tour"><OptionSelect value={tabooTurnDuration} onChange={v => { setTabooTurnDuration(Number(v)); socket?.emit('lobby:setTabooOptions', { turnDuration: Number(v) }); }} options={[15, 30, 45, 60, 90, 120, 180, 240, 300].map(t => ({ v: t, label: formatTime(t) }))} disabled={!isHost} /></OptionRow>
                                <OptionRow label="Rounds"><OptionSelect value={tabooTotalRounds} onChange={v => { setTabooTotalRounds(Number(v)); socket?.emit('lobby:setTabooOptions', { totalRounds: Number(v) }); }} options={[1, 2, 3, 4, 5, 7, 10].map(r => ({ v: r, label: `${r}` }))} disabled={!isHost} /></OptionRow>
                                <OptionRow label="Mots piégés"><OptionSelect value={tabooTrapWordCount} onChange={v => { setTabooTrapWordCount(Number(v)); socket?.emit('lobby:setTabooOptions', { trapWordCount: Number(v) }); }} options={[2, 3, 4, 5, 6, 7, 8, 10].map(n => ({ v: n, label: `${n}` }))} disabled={!isHost} /></OptionRow>
                                <OptionRow label="Temps mots piégés"><OptionSelect value={tabooTrapDuration} onChange={v => { setTabooTrapDuration(Number(v)); socket?.emit('lobby:setTabooOptions', { trapDuration: Number(v) }); }} options={[15, 30, 45, 60, 90, 120, 180].map(t => ({ v: t, label: formatTime(t) }))} disabled={!isHost} /></OptionRow>
                                <OptionRow label="Tentatives max"><OptionSelect value={tabooMaxAttempts} onChange={v => { setTabooMaxAttempts(Number(v)); socket?.emit('lobby:setTabooOptions', { maxAttempts: Number(v) }); }} options={[3, 5, 7, 10, 15, 20, 30].map(n => ({ v: n, label: `${n}` }))} disabled={!isHost} /></OptionRow>
                            </div>
                        )}

                        {gameType === 'quiz' && (
                            <div className={`bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700/50 rounded-2xl p-5 space-y-3 ${!isHost ? 'opacity-60 pointer-events-none' : ''}`}>
                                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Options Quiz</p>
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-500 dark:text-slate-400">Quiz</p>
                                    <QuizSearch isHost={isHost} selectedId={selectedQuizId} selectedTitle={selectedQuizTitle} selectedQuestionCount={selectedQuizQuestionCount}
                                        categories={categories} categoryId={selectedQuizCategoryId}
                                        onCategoryChange={catId => setSelectedQuizCategoryId(catId)}
                                        onSelect={(id, title, questionCount) => { setSelectedQuizId(id || undefined); setSelectedQuizTitle(title); setSelectedQuizQuestionCount(questionCount); if (id) socket?.emit('lobby:setQuiz', { quizId: id }); }} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-500 dark:text-slate-400">Mode de temps</p>
                                    <select value={quizTimeMode}
                                        onChange={e => { setQuizTimeMode(e.target.value as typeof quizTimeMode); socket?.emit('lobby:setQuizOptions', { timeMode: e.target.value, timePerQuestion: quizTimePerQuestion }); }}
                                        className="font-sans w-full bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/50 rounded-xl px-3 py-2 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                                        <option value="quiz:per_question">Par question</option>
                                        <option value="total">Temps total</option>
                                        <option value="none">Sans limite</option>
                                    </select>
                                </div>
                                {quizTimeMode !== 'none' && (
                                    <div className="space-y-1">
                                        <p className="text-xs text-gray-500 dark:text-slate-400">{quizTimeMode === 'total' ? 'Temps total' : 'Temps / question'}</p>
                                        <select value={quizTimePerQuestion}
                                            onChange={e => { setQuizTimePerQuestion(Number(e.target.value)); socket?.emit('lobby:setQuizOptions', { timeMode: quizTimeMode, timePerQuestion: Number(e.target.value) }); }}
                                            className="font-sans w-full bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/50 rounded-xl px-3 py-2 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                                            {(quizTimeMode === 'total' ? [60, 120, 180, 300, 600, 900, 1200, 1800, 3600] : [5, 10, 15, 20, 30, 45, 60, 90, 120]).map(t => (
                                                <option key={t} value={t}>{formatTime(t)}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        {gameType === 'skyjow' && (
                            <div className={`bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700/50 rounded-2xl p-5 space-y-3 ${!isHost ? 'opacity-60 pointer-events-none' : ''}`}>
                                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Options Skyjow</p>
                                <Toggle checked={skyjowEliminateRows} onChange={v => { setSkyjowEliminateRows(v); socket?.emit('lobby:setSkyjowOptions', { eliminateRows: v }); }} label="Éliminer les lignes (4 identiques)" disabled={!isHost} />
                            </div>
                        )}

                        {gameType === 'impostor' && (
                            <div className={`bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700/50 rounded-2xl p-5 space-y-3 ${!isHost ? 'opacity-60 pointer-events-none' : ''}`}>
                                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Options Imposteur</p>
                                <OptionRow label="Rounds">
                                    <OptionSelect value={impostorRounds} onChange={v => { setImpostorRounds(Number(v)); socket?.emit('lobby:setImpostorOptions', { rounds: Number(v), timePerRound: impostorTime }); }}
                                        options={[1, 2, 3, 4, 5].map(r => ({ v: r, label: `${r}` }))} disabled={!isHost} />
                                </OptionRow>
                                <OptionRow label="Temps par round">
                                    <OptionSelect value={impostorTime} onChange={v => { setImpostorTime(Number(v)); socket?.emit('lobby:setImpostorOptions', { rounds: impostorRounds, timePerRound: Number(v) }); }}
                                        options={[30, 45, 60, 90, 120].map(t => ({ v: t, label: formatTime(t) }))} disabled={!isHost} />
                                </OptionRow>
                            </div>
                        )}

                        {NO_OPTIONS_GAMES[gameType] && (
                            <div className="bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700/50 rounded-2xl p-4 text-center">
                                <p className="text-xs text-gray-400 dark:text-slate-500 italic">{NO_OPTIONS_GAMES[gameType]}</p>
                            </div>
                        )}

                        {/* Joueurs max + Visibilité */}
                        <div className="bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700/50 rounded-2xl p-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Joueurs max</label>
                                    {isHost ? (
                                        <select value={maxPlayers} onChange={e => { setMaxPlayersState(Number(e.target.value)); socket?.emit('lobby:setMeta', { maxPlayers: Number(e.target.value) }); }} disabled={isMaxLocked}
                                            className="font-sans w-full bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/50 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer disabled:opacity-50">
                                            {MAX_PLAYERS_BY_GAME[gameType].map(n => <option key={n} value={n} className="bg-white dark:bg-slate-800">{n} joueurs</option>)}
                                        </select>
                                    ) : (
                                        <div className="bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700/30 rounded-xl px-4 py-2.5 text-gray-700 dark:text-slate-300 text-sm">{maxPlayers} joueurs</div>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Visibilité</label>
                                    {isHost ? (
                                        <div className="flex rounded-xl border border-gray-200 dark:border-slate-700/50 overflow-hidden h-[42px]">
                                            <button onClick={() => { setIsPublicState(true); socket?.emit('lobby:setMeta', { isPublic: true }); }}
                                                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold transition-all ${isPublic ? 'bg-blue-600 text-white' : 'bg-gray-50 dark:bg-slate-800/60 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'}`}>
                                                🌍 Public
                                            </button>
                                            <button onClick={() => { setIsPublicState(false); socket?.emit('lobby:setMeta', { isPublic: false }); }}
                                                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold transition-all border-l border-gray-200 dark:border-slate-700/50 ${!isPublic ? 'bg-indigo-600 text-white' : 'bg-gray-50 dark:bg-slate-800/60 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'}`}>
                                                🔒 Privé
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700/30 rounded-xl px-4 py-2.5 text-gray-700 dark:text-slate-300 text-sm">{isPublic ? '🌍 Public' : '🔒 Privé'}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Équipes */}
                        {(gameType === 'taboo' || (gameType === 'uno' && unoTeamMode === '2v2')) && (
                            <div className="bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700/50 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Équipes</h2>
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
                                                    <button onClick={() => socket?.emit('lobby:setTeam', { team })}
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
                                                            {p.userId === hostId && <span className="text-yellow-500">👑</span>}
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
                    </div>

                    {/* ── Right column : players + actions ── */}
                    <div className="space-y-4 lg:sticky lg:top-6">

                        {/* Lien d'invitation */}
                        <div className="bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700/50 rounded-2xl p-5">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Lien d'invitation</label>
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/50 rounded-xl px-3 py-2">
                                <span className="text-xs text-gray-500 dark:text-slate-400 flex-1 truncate font-mono">
                                    {typeof window !== 'undefined' ? `${window.location.origin}/lobby/create/${lobbyId}` : `/lobby/create/${lobbyId}`}
                                </span>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/lobby/create/${lobbyId}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                                    className="flex-shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 whitespace-nowrap">
                                    {copied ? '✅ Copié !' : '⧉ Copier'}
                                </button>
                            </div>
                        </div>

                        {/* Participants */}
                        <div className="bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700/50 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Participants</h2>
                                <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800 rounded-full px-2 py-0.5">
                                    {players.length}{maxPlayers ? `/${maxPlayers}` : ''}
                                </span>
                            </div>

                            {maxPlayers > 0 && (
                                <div className="mb-3 w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5">
                                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min((players.length / maxPlayers) * 100, 100)}%` }} />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                {players.map(p => (
                                    <div key={p.userId} className="flex items-center gap-2.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/40 rounded-xl px-3 py-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                                        <span className="text-sm text-gray-900 dark:text-white font-medium flex-1 truncate">{p.username}</span>
                                        {p.userId === hostId && <span className="text-sm">👑</span>}
                                        {p.userId === me && <span className="text-xs text-gray-400 dark:text-slate-500 flex-shrink-0">(moi)</span>}
                                        {isAdmin && !isHost && p.userId === me && (
                                            <button onClick={() => socket?.emit('lobby:claimHost')} title="Prendre le contrôle (admin)"
                                                className="text-xs px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors flex-shrink-0">
                                                🛡️
                                            </button>
                                        )}
                                        {isHost && p.userId !== me && (
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <button onClick={() => socket?.emit('lobby:transferHost', { targetUserId: p.userId })} title="Transférer le statut d'hôte"
                                                    className="text-xs px-1.5 py-0.5 rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20 transition-colors">
                                                    👑
                                                </button>
                                                <button onClick={() => socket?.emit('lobby:kick', { targetUserId: p.userId })} title="Expulser"
                                                    className="text-xs px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-500/20 transition-colors">
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {players.length === 0 && (
                                    <div className="text-center py-6 text-gray-400 dark:text-slate-500 text-sm">En attente de joueurs…</div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        {activeGameId && activeGameType && (
                            <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/50 text-sm">
                                <span className="text-amber-700 dark:text-amber-300 font-medium">⚠️ Partie en cours</span>
                                <button
                                    onClick={() => { const fn = GAME_ROUTES[activeGameType]; if (fn) router.push(fn(lobbyId, activeGameId)); }}
                                    className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-semibold text-xs transition-all"
                                >
                                    Rejoindre
                                </button>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button onClick={() => { socket?.emit('lobby:leave'); router.push('/'); }}
                                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700/50 text-gray-500 dark:text-slate-400 text-sm font-semibold hover:border-gray-300 dark:hover:border-slate-600 hover:text-gray-700 dark:hover:text-slate-300 transition-all bg-white dark:bg-slate-900/80">
                                Quitter
                            </button>
                            {isHost ? (
                                <button onClick={() => { setIsLaunching(true); socket?.emit('lobby:start'); }} disabled={!canStart || isLaunching}
                                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-200 dark:disabled:from-slate-800 disabled:to-gray-200 dark:disabled:to-slate-800 disabled:text-gray-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-lg shadow-green-500/20 disabled:shadow-none">
                                    {isLaunching
                                        ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Lancement…</span>
                                        : canStart
                                            ? `🚀 Lancer ${selectedGame?.label ?? 'la partie'} !`
                                            : gameType === 'quiz' && !selectedQuizId && players.length >= 2
                                                ? '🎯 Choix du quiz…'
                                                : (gameType === 'taboo' || (gameType === 'uno' && unoTeamMode === '2v2')) && !tabooOk
                                                    ? '⏳ En attente des équipes…'
                                                    : '⏳ En attente de joueurs…'}
                                </button>
                            ) : (
                                <div className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/50 text-gray-400 dark:text-slate-500 text-sm font-semibold text-center">
                                    {isLaunching
                                        ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Lancement…</span>
                                        : '⏳ En attente du host…'}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </main>
    );
}
