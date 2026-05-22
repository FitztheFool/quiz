// src/app/lobby/create/[code]/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { SOLO_GAMES, BOTH_GAMES, MULTI_GAMES, BOT_SUPPORTED_GAMES } from '@/lib/gameConfig';
import { getLobbySocket } from '@/lib/socket';
import LoadingSpinner from '@/components/LoadingSpinner';
import ServerWarmupLoader from '@/components/ServerWarmupLoader';
import { useServerWarmup } from '@/hooks/useServerWarmup';
import { useChat } from '@/context/ChatContext';
import { Badge } from '@/components/SoloBadge';
import GameIcon from '@/components/GameIcon';
import { StarIcon, UserIcon, GlobeAltIcon, LockClosedIcon, ArrowsRightLeftIcon, CheckIcon, ExclamationTriangleIcon, CpuChipIcon, XMarkIcon, ShieldCheckIcon, PlayIcon, ClockIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

import {
    GAME_CONFIG,
    LOBBY_GAME_OPTIONS,
    MAX_PLAYERS_BY_GAME,
    MIN_PLAYERS,
    NO_OPTIONS_GAMES,
    GAME_ROUTES,
    type GameType,
} from '@/lib/gameConfig';

const GAME_SERVER_URL_BY_TYPE: Partial<Record<GameType, string | undefined>> = {
    uno:        process.env.NEXT_PUBLIC_UNO_SERVER_URL,
    quiz:       process.env.NEXT_PUBLIC_QUIZ_SERVER_URL,
    taboo:      process.env.NEXT_PUBLIC_TABOO_SERVER_URL,
    skyjow:     process.env.NEXT_PUBLIC_SKYJOW_SERVER_URL,
    yahtzee:    process.env.NEXT_PUBLIC_YAHTZEE_SERVER_URL,
    puissance4: process.env.NEXT_PUBLIC_P4_SERVER_URL,
    just_one:   process.env.NEXT_PUBLIC_JUSTONE_SERVER_URL,
    battleship: process.env.NEXT_PUBLIC_BATTLESHIP_SERVER_URL,
    diamant:    process.env.NEXT_PUBLIC_DIAMANT_SERVER_URL,
    impostor:   process.env.NEXT_PUBLIC_IMPOSTOR_SERVER_URL,
    ludo:       process.env.NEXT_PUBLIC_LUDO_SERVER_URL,
    perudo:     process.env.NEXT_PUBLIC_PERUDO_SERVER_URL,
    cant_stop:  process.env.NEXT_PUBLIC_CANT_STOP_SERVER_URL,
};

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
    impostorOptions?: { rounds: number; timePerRound: number; misterWhite?: boolean };
    ludoOptions?: { pawnExit: '6' | '6_or_1' | 'any'; bonusOn6: 'unlimited' | 'triple_lose' | 'none'; winMode: 'first_done' | 'full_ranking'; teamMode: 'none' | '2v2' };
    perudoOptions?: { initialDice: number };
    cantStopOptions?: { columnsToWin: number };
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
    impostorOptions?: { rounds: number; timePerRound: number; misterWhite?: boolean };
    ludoOptions?: { pawnExit: '6' | '6_or_1' | 'any'; bonusOn6: 'unlimited' | 'triple_lose' | 'none'; winMode: 'first_done' | 'full_ranking'; teamMode: 'none' | '2v2' };
    perudoOptions?: { initialDice: number };
    cantStopOptions?: { columnsToWin: number };
    timeMode?: string;
    timePerQuestion?: number;
    quizId?: string | null;
    gameId?: string | null;
    teams?: Record<string, 0 | 1> | null;
    bots?: number;
    botSlots?: Array<{ userId: string; username: string }>;
};

function useDebounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number): T {
    const timer = useRef<NodeJS.Timeout | null>(null);
    return ((...args: Parameters<T>) => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => fn(...args), delay);
    }) as T;
}

import UnoOptions from '@/components/Lobby/Options/UnoOptions';
import BattleshipOptions from '@/components/Lobby/Options/BattleshipOptions';
import TabooOptions from '@/components/Lobby/Options/TabooOptions';
import QuizOptions from '@/components/Lobby/Options/QuizOptions';
import SkyjowOptions from '@/components/Lobby/Options/SkyjowOptions';
import ImpostorOptions from '@/components/Lobby/Options/ImpostorOptions';
import LudoOptions from '@/components/Lobby/Options/LudoOptions';
import PerudoOptions from '@/components/Lobby/Options/PerudoOptions';
import CantStopOptions from '@/components/Lobby/Options/CantStopOptions';

export default function LobbyCodePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams<{ code: string }>();
    const searchParams = useSearchParams();
    const lobbyId = params?.code ?? '';

    const { status: warmupStatus } = useServerWarmup(process.env.NEXT_PUBLIC_LOBBY_SERVER_URL);
    const socket = useMemo(() => getLobbySocket(), []);
    const joinedRef = useRef(false);
    const playersRef = useRef<Player[]>([]);
    const reconnectConfigRef = useRef({ gameType: 'uno' as GameType, maxPlayers: 8, isPublic: false, meta: null as LobbyMeta | null });

    const [meta, setMeta] = useState<LobbyMeta | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    useEffect(() => { playersRef.current = players; }, [players]);
    const [hostId, setHostId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [canStart, setCanStart] = useState(false);
    const [tabooOk, setTabooOk] = useState(false);
    const [isLaunching, setIsLaunching] = useState(false);
    const [isWarming, setIsWarming] = useState(false);
    const [activeGameId, setActiveGameId] = useState<string | null>(null);
    const [activeGameType, setActiveGameType] = useState<GameType | null>(null);

    const [gameType, setGameTypeState] = useState<GameType>(() => {
        const g = searchParams.get('game');
        return (g && g in GAME_CONFIG) ? g as GameType : 'uno';
    });
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
    const [tabooTurnDuration, setTabooTurnDuration] = useState(120);
    const [tabooTotalRounds, setTabooTotalRounds] = useState(3);
    const [tabooTrapWordCount, setTabooTrapWordCount] = useState(5);
    const [tabooMaxAttempts, setTabooMaxAttempts] = useState(10);
    const [tabooTrapDuration, setTabooTrapDuration] = useState(90);
    const [quizTimeMode, setQuizTimeMode] = useState<'per_question' | 'total' | 'none'>('none');
    const [quizTimePerQuestion, setQuizTimePerQuestion] = useState(15);
    const [skyjowEliminateRows, setSkyjowEliminateRows] = useState(false);
    const [teams, setTeams] = useState<Record<string, 0 | 1> | null>(null);
    const [gridSize, setGridSize] = useState(10);
    const [turnTime, setTurnTime] = useState(30);
    const [impostorRounds, setImpostorRounds] = useState(1);
    const [impostorTime, setImpostorTime] = useState(60);
    const [impostorMisterWhite, setImpostorMisterWhite] = useState(false);
    const [ludoPawnExit, setLudoPawnExit] = useState<'6' | '6_or_1' | 'any'>('6');
    const [ludoBonusOn6, setLudoBonusOn6] = useState<'unlimited' | 'triple_lose' | 'none'>('unlimited');
    const [ludoWinMode, setLudoWinMode] = useState<'first_done' | 'full_ranking'>('first_done');
    const [ludoTeamMode, setLudoTeamMode] = useState<'none' | '2v2'>('none');
    const [perudoInitialDice, setPerudoInitialDice] = useState<number>(5);
    const [cantStopColumnsToWin, setCantStopColumnsToWin] = useState<number>(3);
    const [botCount, setBotCount] = useState(0);
    const [botSlots, setBotSlots] = useState<Array<{ userId: string; username: string }>>([]);
    const { setLobbyId } = useChat();

    useEffect(() => {
        setLobbyId(lobbyId);
        return () => setLobbyId(null);
    }, [lobbyId]);

    useEffect(() => {
        fetch('/api/categories').then(r => r.ok ? r.json() : []).then(setCategories).catch(() => { });
    }, []);

    // Keep reconnect config ref in sync so the reconnect handler always has fresh values
    useEffect(() => {
        reconnectConfigRef.current = { gameType, maxPlayers, isPublic, meta };
    }, [gameType, maxPlayers, isPublic, meta]);

    // While waiting for a game server to wake up, poll its /health via our /api/warmup
    // proxy (same-origin) so client-side adblockers don't filter onrender.com requests.
    useEffect(() => {
        if (!isWarming) return;
        const gameServerUrl = GAME_SERVER_URL_BY_TYPE[gameType];
        if (!gameServerUrl) return;
        const notifyReady = () => socket?.emit('lobby:gameServerReady', { gameType });
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/warmup?url=${encodeURIComponent(gameServerUrl)}`, {
                    signal: AbortSignal.timeout(10_000),
                });
                if (res.ok) { clearInterval(interval); notifyReady(); }
            } catch { /* timeout / réseau — on réessaie au prochain tick */ }
        }, 3_000);
        return () => clearInterval(interval);
    }, [isWarming, gameType, socket]);

    useEffect(() => {
        if (!selectedQuizId || selectedQuizTitle) return;
        fetch(`/api/quiz/${selectedQuizId}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.title) setSelectedQuizTitle(data.title);
                if (data?.category?.id) setSelectedQuizCategoryId(data.category.id);
                const qCount = data?._count?.questions ?? (Array.isArray(data?.questions) ? data.questions.length : undefined);
                if (qCount !== undefined) setSelectedQuizQuestionCount(qCount);
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
                ludoOptions: state.ludoOptions ?? prev?.ludoOptions,
                perudoOptions: (state as { perudoOptions?: { initialDice: number } }).perudoOptions ?? prev?.perudoOptions,
                cantStopOptions: (state as { cantStopOptions?: { columnsToWin: number } }).cantStopOptions ?? prev?.cantStopOptions,
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
                setTabooTurnDuration(state.tabooOptions.turnDuration ?? 120);
                setTabooTotalRounds(state.tabooOptions.totalRounds ?? 3);
                setTabooTrapWordCount(state.tabooOptions.trapWordCount ?? 5);
                setTabooMaxAttempts(state.tabooOptions.maxAttempts ?? 10);
                setTabooTrapDuration(state.tabooOptions.trapDuration ?? 90);
            }
            if (state.timeMode) setQuizTimeMode(state.timeMode as 'per_question' | 'total' | 'none');
            if (state.timePerQuestion) setQuizTimePerQuestion(state.timePerQuestion);
            if (state.skyjowOptions) setSkyjowEliminateRows(state.skyjowOptions.eliminateRows ?? false);
            if (state.battleshipOptions) {
                setGridSize(state.battleshipOptions.gridSize ?? 10);
                setTurnTime(state.battleshipOptions.turnTime ?? 30);
            }
            if (state.impostorOptions) { setImpostorRounds(state.impostorOptions.rounds ?? 1); setImpostorTime(state.impostorOptions.timePerRound ?? 60); setImpostorMisterWhite(state.impostorOptions.misterWhite ?? false); }
            if (state.ludoOptions) {
                setLudoPawnExit(state.ludoOptions.pawnExit ?? '6');
                setLudoBonusOn6(state.ludoOptions.bonusOn6 ?? 'unlimited');
                setLudoWinMode(state.ludoOptions.winMode ?? 'first_done');
                setLudoTeamMode(state.ludoOptions.teamMode ?? 'none');
            }
            if ((state as { perudoOptions?: { initialDice?: number } }).perudoOptions) {
                const opt = (state as { perudoOptions?: { initialDice?: number } }).perudoOptions!;
                setPerudoInitialDice(opt.initialDice ?? 5);
            }
            if ((state as { cantStopOptions?: { columnsToWin?: number } }).cantStopOptions) {
                const opt = (state as { cantStopOptions?: { columnsToWin?: number } }).cantStopOptions!;
                setCantStopColumnsToWin(opt.columnsToWin ?? 3);
            }
            setBotCount(state.bots ?? 0);
            setBotSlots(Array.isArray(state.botSlots) ? state.botSlots : []);

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
            const count = (state.players?.length ?? 0) + (state.bots ?? 0);
            const g = state.gameType;
            const hasQuiz = g === 'quiz' ? !!state.quizId : true;
            const min = MIN_PLAYERS[g] ?? 2;
            const maxList = MAX_PLAYERS_BY_GAME[g];
            const maxOk = maxList ? count <= Math.max(...maxList) : true;
            const countOk = count >= min && maxOk;
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
            const ludoTeamModeVal = state.ludoOptions?.teamMode ?? 'none';
            const ludoIs2v2 = g === 'ludo' && ludoTeamModeVal === '2v2';
            const ludoTeamsOk = !ludoIs2v2 || (t0 === 2 && t1 === 2);
            const ludoOk = g !== 'ludo' || ludoTeamsOk;
            setCanStart(countOk && hasQuiz && tabooOk && unoOk && ludoOk && state.hostId === meUserId);
        };

        socket.on('lobby:state', onState);
        socket.on('lobby:kicked', () => { alert('Vous avez été expulsé.'); router.push('/lobby/all'); });
        socket.on('lobby:server_warming', () => { setIsWarming(true); });
        socket.on('lobby:server_error', () => { setIsWarming(false); setIsLaunching(false); alert('Le serveur de jeu n\'a pas pu démarrer. Réessaie dans quelques secondes.'); });

        // ── game:start via GAME_ROUTES ────────────────────────────────────
        socket.on('game:start', (payload: { gameType: GameType; gameId?: string; quizId?: string; timeMode?: string; timePerQuestion?: number }) => {
            setIsWarming(false);
            setIsLaunching(true);
            setActiveGameId(null);
            setActiveGameType(null);
            startTransition(() => {
                if (payload.gameType === 'quiz') {
                    sessionStorage.setItem(`lobby_timeMode_${lobbyId}`, payload.timeMode ?? 'none');
                    sessionStorage.setItem(`lobby_timePerQuestion_${lobbyId}`, String(payload.timePerQuestion ?? 15));
                    router.push(`/quiz/${lobbyId}/${payload.quizId}`);
                } else {
                    const routeFn = GAME_ROUTES[payload.gameType];
                    if (routeFn) {
                        sessionStorage.setItem(`lobby_players_${lobbyId}`, JSON.stringify(playersRef.current));
                        router.push(routeFn(lobbyId, payload.gameId));
                    }
                }
            });
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
                if (m.battleshipOptions) { setGridSize(m.battleshipOptions.gridSize); setTurnTime(m.battleshipOptions.turnTime); }
                if (m.impostorOptions) { setImpostorRounds(m.impostorOptions.rounds ?? 1); setImpostorTime(m.impostorOptions.timePerRound ?? 60); setImpostorMisterWhite(m.impostorOptions.misterWhite ?? false); }
                if (m.ludoOptions) { setLudoPawnExit(m.ludoOptions.pawnExit); setLudoBonusOn6(m.ludoOptions.bonusOn6); setLudoWinMode(m.ludoOptions.winMode); setLudoTeamMode(m.ludoOptions.teamMode); }
                if (m.perudoOptions) setPerudoInitialDice(m.perudoOptions.initialDice ?? 5);
                if (m.cantStopOptions) setCantStopColumnsToWin(m.cantStopOptions.columnsToWin ?? 3);
            }
            socket.emit('lobby:join', { lobbyId, userId: meUserId, username: meUsername, title: m?.title, description: m?.description, maxPlayers: m?.maxPlayers, isPublic: m?.isPublic });
            const gameFromUrl = searchParams.get('game');
            const initialGameType = m?.gameType ?? (gameFromUrl && gameFromUrl in GAME_CONFIG ? gameFromUrl as GameType : null);
            if (initialGameType && initialGameType !== 'quiz') setTimeout(() => socket.emit('lobby:setGameType', { gameType: initialGameType }), 300);
            if (m?.unoOptions) setTimeout(() => socket.emit('lobby:setUnoOptions', m!.unoOptions), 400);
            if (m?.tabooOptions) setTimeout(() => socket.emit('lobby:setTabooOptions', m!.tabooOptions), 400);
            if (m?.skyjowOptions) setTimeout(() => socket.emit('lobby:setSkyjowOptions', m!.skyjowOptions), 400);
            if (m?.battleshipOptions) setTimeout(() => socket.emit('lobby:setBattleshipOptions', m!.battleshipOptions), 400);
            if (m?.impostorOptions) setTimeout(() => socket.emit('lobby:setImpostorOptions', m!.impostorOptions), 400);
            if (m?.ludoOptions) setTimeout(() => socket.emit('lobby:setLudoOptions', m!.ludoOptions), 400);
            if (m?.perudoOptions) setTimeout(() => socket.emit('lobby:setPerudoOptions', m!.perudoOptions), 400);
            if (m?.cantStopOptions) setTimeout(() => socket.emit('lobby:setCantStopOptions', m!.cantStopOptions), 400);
            if (m?.quizOptions) setTimeout(() => socket.emit('lobby:setQuizOptions', m!.quizOptions), 400);
        }

        // Re-join after lobby-server restart (server memory cleared on redeploy/wake)
        const handleReconnect = () => {
            if (!joinedRef.current) return;
            const cfg = reconnectConfigRef.current;
            socket.emit('lobby:join', {
                lobbyId,
                userId: meUserId,
                username: meUsername,
                title: cfg.meta?.title,
                description: cfg.meta?.description,
                maxPlayers: cfg.maxPlayers,
                isPublic: cfg.isPublic,
                gameType: cfg.gameType,
            });
        };
        socket.io.on('reconnect', handleReconnect);

        return () => {
            socket.off('lobby:state', onState);
            socket.off('lobby:kicked');
            socket.off('lobby:server_warming');
            socket.off('lobby:server_error');
            socket.off('game:start');
            socket.io.off('reconnect', handleReconnect);
            socket.emit('lobby:leave');
            joinedRef.current = false;
        };
    }, [socket, lobbyId, status, session?.user?.id, session?.user?.username, session?.user?.email]);

    if (warmupStatus === 'warming' || warmupStatus === 'checking') return <ServerWarmupLoader />;
    if (warmupStatus === 'error') return <ServerWarmupLoader error />;
    if (status === 'loading') return <LoadingSpinner message="Vérification de la session..." />;
    if (status !== 'authenticated' || !session?.user?.id) return null;

    const me = session.user.id;
    const isAdmin = session.user.role === 'ADMIN';
    const isHost = hostId === me;
    const selectedGame = LOBBY_GAME_OPTIONS.find(g => g.value === gameType);
    const isMaxLocked = gameType === 'puissance4' || (gameType === 'uno' && unoTeamMode === '2v2') || (gameType === 'ludo' && ludoTeamMode === '2v2');
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

    const handleLudoTeamMode = (mode: 'none' | '2v2') => {
        setLudoTeamMode(mode);
        if (mode === '2v2') {
            setMaxPlayersState(4);
            socket?.emit('lobby:setMeta', { maxPlayers: 4 });
        }
        socket?.emit('lobby:setLudoOptions', { teamMode: mode });
    };

    return (
        <main className="bg-gray-50 dark:bg-gray-950 pb-8">

            {/* Server warm-up overlay */}
            {isWarming && (
                <div className="fixed inset-0 z-50 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
                        <div className="mb-4 flex items-center justify-center"><svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg></div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Démarrage du serveur</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Le serveur de jeu se réveille…<br />Environ 45–90 secondes</p>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div className="h-2 bg-blue-500 rounded-full" style={{ width: '0%', animation: 'warmup 90s linear forwards' }} />
                        </div>
                        <style>{`@keyframes warmup { from { width: 0% } to { width: 95% } }`}</style>
                    </div>
                </div>
            )}

            {/* Sticky header */}
            <div className="sticky top-0 z-20 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 lg:px-8 py-3">
                <div className="max-w-6xl mx-auto flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 flex-shrink-0 text-white">
                        <GameIcon gameType={selectedGame?.value ?? ''} className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight truncate leading-tight">
                            {meta?.title || 'Lobby'}
                        </h1>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isHost ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' : 'bg-gray-200 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400'}`}>
                                {isHost ? <><StarIcon className="w-3.5 h-3.5 inline mr-0.5" />Hôte</> : <><UserIcon className="w-3.5 h-3.5 inline mr-0.5" />Participant</>}
                            </span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPublic ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' : 'bg-gray-200 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400'}`}>
                                {isPublic ? <><GlobeAltIcon className="w-3.5 h-3.5 inline mr-0.5" />Public</> : <><LockClosedIcon className="w-3.5 h-3.5 inline mr-0.5" />Privé</>}
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
                        <div className="bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5 space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Titre du lobby</label>
                                {isHost ? (
                                    <input type="text" value={meta?.title ?? ''} maxLength={60}
                                        onChange={e => { setMeta(prev => ({ ...prev, title: e.target.value })); emitTitle(e.target.value.trim()); }}
                                        placeholder="Nom de la partie…"
                                        className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                                ) : (
                                    <div className="w-full bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/30 rounded-xl px-4 py-2.5 text-gray-700 dark:text-gray-300 text-sm">{meta?.title || '—'}</div>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Description <span className="font-normal normal-case">(optionnel)</span>
                                </label>
                                {isHost ? (
                                    <textarea value={meta?.description ?? ''} maxLength={200} rows={2}
                                        onChange={e => { setMeta(prev => ({ ...prev, description: e.target.value })); emitDescription(e.target.value.trim()); }}
                                        placeholder="Décrivez votre partie…"
                                        className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none" />
                                ) : (
                                    meta?.description
                                        ? <div className="w-full bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/30 rounded-xl px-4 py-2.5 text-gray-700 dark:text-gray-300 text-sm">{meta.description}</div>
                                        : <div className="text-gray-400 dark:text-gray-600 text-xs italic">Aucune description</div>
                                )}
                            </div>
                        </div>

                        {/* Sélecteur de jeu */}
                        <div className="bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Jeu</label>
                                {(() => {
                                    const minP = MIN_PLAYERS[gameType] ?? 2;
                                    const missing = minP - players.length - botCount;
                                    return missing > 0 ? (
                                        <span className="text-xs text-orange-500 dark:text-orange-400">
                                            (En attente de {missing} participant{missing > 1 ? 's' : ''})
                                        </span>
                                    ) : null;
                                })()}
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                {LOBBY_GAME_OPTIONS.map(g => {
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
                                                        ? 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 text-gray-300 dark:text-gray-700 cursor-not-allowed'
                                                        : 'border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer'}`}>
                                            <span className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                                                {(SOLO_GAMES[g.value] ?? BOTH_GAMES[g.value] ?? MULTI_GAMES[g.value]) && (
                                                    <Badge
                                                        text={(SOLO_GAMES[g.value] ?? BOTH_GAMES[g.value] ?? MULTI_GAMES[g.value]).text}
                                                        color={(SOLO_GAMES[g.value] ?? BOTH_GAMES[g.value] ?? MULTI_GAMES[g.value]).color}
                                                    />
                                                )}
                                            </span>
                                            <GameIcon gameType={g.value} className="w-6 h-6" />
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
                            <UnoOptions isHost={isHost} socket={socket} unoTeamMode={unoTeamMode} setUnoTeamMode={setUnoTeamMode} handleUnoTeamMode={handleUnoTeamMode}
                                unoTeamWinMode={unoTeamWinMode} setUnoTeamWinMode={setUnoTeamWinMode}
                                unoStackable={unoStackable} setUnoStackable={setUnoStackable}
                                unoJumpIn={unoJumpIn} setUnoJumpIn={setUnoJumpIn} />
                        )}

                        {gameType === 'battleship' && (
                            <BattleshipOptions isHost={isHost} socket={socket}
                                gridSize={gridSize} setGridSize={setGridSize}
                                turnTime={turnTime} setTurnTime={setTurnTime} />
                        )}

                        {gameType === 'taboo' && (
                            <TabooOptions isHost={isHost} socket={socket}
                                tabooTurnDuration={tabooTurnDuration} setTabooTurnDuration={setTabooTurnDuration}
                                tabooTotalRounds={tabooTotalRounds} setTabooTotalRounds={setTabooTotalRounds}
                                tabooTrapWordCount={tabooTrapWordCount} setTabooTrapWordCount={setTabooTrapWordCount}
                                tabooTrapDuration={tabooTrapDuration} setTabooTrapDuration={setTabooTrapDuration}
                                tabooMaxAttempts={tabooMaxAttempts} setTabooMaxAttempts={setTabooMaxAttempts} />
                        )}

                        {gameType === 'quiz' && (
                            <QuizOptions isHost={isHost} socket={socket}
                                selectedQuizId={selectedQuizId} selectedQuizTitle={selectedQuizTitle} selectedQuizQuestionCount={selectedQuizQuestionCount}
                                setSelectedQuizId={setSelectedQuizId} setSelectedQuizTitle={setSelectedQuizTitle} setSelectedQuizQuestionCount={setSelectedQuizQuestionCount}
                                categories={categories} selectedQuizCategoryId={selectedQuizCategoryId} setSelectedQuizCategoryId={setSelectedQuizCategoryId}
                                quizTimeMode={quizTimeMode} setQuizTimeMode={setQuizTimeMode}
                                quizTimePerQuestion={quizTimePerQuestion} setQuizTimePerQuestion={setQuizTimePerQuestion} />
                        )}

                        {gameType === 'skyjow' && (
                            <SkyjowOptions isHost={isHost} socket={socket}
                                skyjowEliminateRows={skyjowEliminateRows} setSkyjowEliminateRows={setSkyjowEliminateRows} />
                        )}

                        {gameType === 'impostor' && (
                            <ImpostorOptions isHost={isHost} socket={socket}
                                impostorRounds={impostorRounds} setImpostorRounds={setImpostorRounds}
                                impostorTime={impostorTime} setImpostorTime={setImpostorTime}
                                impostorMisterWhite={impostorMisterWhite} setImpostorMisterWhite={setImpostorMisterWhite} />
                        )}

                        {gameType === 'ludo' && (
                            <LudoOptions isHost={isHost} socket={socket}
                                ludoTeamMode={ludoTeamMode} handleLudoTeamMode={handleLudoTeamMode}
                                ludoPawnExit={ludoPawnExit} setLudoPawnExit={setLudoPawnExit}
                                ludoBonusOn6={ludoBonusOn6} setLudoBonusOn6={setLudoBonusOn6}
                                ludoWinMode={ludoWinMode} setLudoWinMode={setLudoWinMode} />
                        )}

                        {gameType === 'perudo' && (
                            <PerudoOptions isHost={isHost} socket={socket}
                                perudoInitialDice={perudoInitialDice} setPerudoInitialDice={setPerudoInitialDice} />
                        )}

                        {gameType === 'cant_stop' && (
                            <CantStopOptions isHost={isHost} socket={socket}
                                cantStopColumnsToWin={cantStopColumnsToWin} setCantStopColumnsToWin={setCantStopColumnsToWin} />
                        )}

                        {NO_OPTIONS_GAMES[gameType] && (
                            <div className="bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-4 text-center">
                                <p className="text-xs text-gray-400 dark:text-gray-500 italic">{NO_OPTIONS_GAMES[gameType]}</p>
                            </div>
                        )}

                        {/* Joueurs max + Visibilité */}
                        <div className="bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Joueurs max</label>
                                    {isHost ? (
                                        <select value={maxPlayers} onChange={e => { setMaxPlayersState(Number(e.target.value)); socket?.emit('lobby:setMeta', { maxPlayers: Number(e.target.value) }); }} disabled={isMaxLocked}
                                            className="font-sans w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer disabled:opacity-50">
                                            {MAX_PLAYERS_BY_GAME[gameType].map(n => <option key={n} value={n} className="bg-white dark:bg-gray-800">{n} joueurs</option>)}
                                        </select>
                                    ) : (
                                        <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/30 rounded-xl px-4 py-2.5 text-gray-700 dark:text-gray-300 text-sm">{maxPlayers} joueurs</div>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Visibilité</label>
                                    {isHost ? (
                                        <div className="flex rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden h-[42px]">
                                            <button onClick={() => { setIsPublicState(true); socket?.emit('lobby:setMeta', { isPublic: true }); }}
                                                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold transition-all ${isPublic ? 'bg-blue-600 text-white' : 'bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                                <GlobeAltIcon className="w-4 h-4" /> Public
                                            </button>
                                            <button onClick={() => { setIsPublicState(false); socket?.emit('lobby:setMeta', { isPublic: false }); }}
                                                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold transition-all border-l border-gray-200 dark:border-gray-700/50 ${!isPublic ? 'bg-indigo-600 text-white' : 'bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                                <LockClosedIcon className="w-4 h-4" /> Privé
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/30 rounded-xl px-4 py-2.5 text-gray-700 dark:text-gray-300 text-sm inline-flex items-center gap-1.5">{isPublic ? (<><GlobeAltIcon className="w-4 h-4" /> Public</>) : (<><LockClosedIcon className="w-4 h-4" /> Privé</>)}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Équipes */}
                        {(gameType === 'taboo' || (gameType === 'uno' && unoTeamMode === '2v2') || (gameType === 'ludo' && ludoTeamMode === '2v2')) && (
                            <div className="bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Équipes</h2>
                                    {isHost && (
                                        <button onClick={() => socket?.emit('lobby:shuffleTeams')}
                                            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors underline">
                                            <ArrowsRightLeftIcon className="w-3.5 h-3.5 inline mr-1" />Mélanger
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[0, 1].map(team => {
                                        const teamPlayers = players.filter(p => teams?.[p.userId] === team);
                                        const teamBots = botSlots.filter(b => teams?.[b.userId] === team);
                                        const myTeamLocal = session?.user?.id ? teams?.[session.user.id] : undefined;
                                        return (
                                            <div key={team} className={`rounded-xl border p-3 space-y-2 ${team === 0 ? 'border-blue-500/30 bg-blue-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-xs font-semibold ${team === 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        <span className={`w-2 h-2 rounded-full inline-block mr-1 ${team === 0 ? 'bg-blue-500' : 'bg-red-500'}`} />{team === 0 ? 'Équipe Bleue' : 'Équipe Rouge'}
                                                    </span>
                                                    <button onClick={() => socket?.emit('lobby:setTeam', { team })}
                                                        className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-all ${myTeamLocal === team
                                                            ? (team === 0 ? 'bg-blue-500 text-white' : 'bg-red-500 text-white')
                                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                                                        {myTeamLocal === team ? <><CheckIcon className="w-3 h-3 inline mr-0.5" />Rejoint</> : 'Rejoindre'}
                                                    </button>
                                                </div>
                                                <div className="space-y-1">
                                                    {teamPlayers.map(p => (
                                                        <div key={p.userId} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                                                            <span className={`w-1.5 h-1.5 rounded-full ${team === 0 ? 'bg-blue-400' : 'bg-red-400'}`} />
                                                            {p.username}
                                                            {p.userId === hostId && <StarIcon className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                                                        </div>
                                                    ))}
                                                    {teamBots.map(b => (
                                                        <div key={b.userId} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 italic">
                                                            <span className={`w-1.5 h-1.5 rounded-full ${team === 0 ? 'bg-blue-400' : 'bg-red-400'}`} />
                                                            {b.username}
                                                        </div>
                                                    ))}
                                                    {teamPlayers.length === 0 && teamBots.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-600 italic">Aucun joueur</p>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {gameType === 'taboo' && (() => {
                                    const t0 = players.filter(p => teams?.[p.userId] === 0).length;
                                    const t1 = players.filter(p => teams?.[p.userId] === 1).length;
                                    return t0 >= 2 && t1 >= 2
                                        ? <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1"><CheckCircleIcon className="w-3.5 h-3.5" />Équipes prêtes !</p>
                                        : <p className="text-xs text-orange-500 dark:text-orange-400 mt-2 flex items-center gap-1"><ExclamationTriangleIcon className="w-3.5 h-3.5" />Minimum 2 joueurs par équipe</p>;
                                })()}
                            </div>
                        )}
                    </div>

                    {/* ── Right column : players + actions ── */}
                    <div className="space-y-4 lg:sticky lg:top-[76px]">

                        {/* Lien d'invitation */}
                        <div className="bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Lien d'invitation</label>
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 rounded-xl px-3 py-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400 flex-1 truncate font-mono">
                                    {typeof window !== 'undefined' ? `${window.location.origin}/lobby/create/${lobbyId}` : `/lobby/create/${lobbyId}`}
                                </span>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/lobby/create/${lobbyId}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                                    className="flex-shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 whitespace-nowrap">
                                    {copied ? <><CheckIcon className="w-3.5 h-3.5 inline mr-0.5" />Copié !</> : 'Copier'}
                                </button>
                            </div>
                        </div>

                        {/* Participants */}
                        <div className="bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Participants</h2>
                                <div className="flex items-center gap-2">
                                    {isHost && BOT_SUPPORTED_GAMES.has(gameType) && players.length + botCount < maxPlayers && (
                                        <button
                                            onClick={() => socket?.emit('lobby:addBot')}
                                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors px-2 py-0.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 whitespace-nowrap">
                                            <CpuChipIcon className="w-3.5 h-3.5 inline mr-1" />Ajouter un bot
                                        </button>
                                    )}
                                    <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-0.5">
                                        {players.length + botCount}{maxPlayers ? `/${maxPlayers}` : ''}
                                    </span>
                                </div>
                            </div>

                            {maxPlayers > 0 && (
                                <div className="mb-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(((players.length + botCount) / maxPlayers) * 100, 100)}%` }} />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                {players.map(p => (
                                    <div key={p.userId} className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/40 rounded-xl px-3 py-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                                        <span className="text-sm text-gray-900 dark:text-white font-medium flex-1 truncate">{p.username}</span>
                                        {p.userId === hostId && <StarIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                                        {p.userId === me && <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">(moi)</span>}
                                        {isAdmin && !isHost && p.userId === me && (
                                            <button onClick={() => socket?.emit('lobby:claimHost')} title="Prendre le contrôle (admin)"
                                                className="text-xs px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors flex-shrink-0">
                                                <ShieldCheckIcon className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        {isHost && p.userId !== me && (
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <button onClick={() => socket?.emit('lobby:transferHost', { targetUserId: p.userId })} title="Transférer le statut d'hôte"
                                                    className="text-xs px-1.5 py-0.5 rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20 transition-colors">
                                                    <StarIcon className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => socket?.emit('lobby:kick', { targetUserId: p.userId })} title="Expulser"
                                                    className="text-xs px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-500/20 transition-colors">
                                                    <XMarkIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {Array.from({ length: botCount }).map((_, i) => (
                                    <div key={`bot-${i}`} className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/40 rounded-xl px-3 py-2">
                                        <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                                        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium flex-1 truncate flex items-center gap-1.5"><CpuChipIcon className="w-4 h-4 flex-shrink-0" />Bot {i + 1}</span>
                                        {isHost && (
                                            <button onClick={() => socket?.emit('lobby:removeBot')} title="Retirer le bot"
                                                className="text-xs px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-500/20 transition-colors flex-shrink-0">
                                                <XMarkIcon className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {players.length === 0 && botCount === 0 && (
                                    <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">En attente de joueurs…</div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        {activeGameId && activeGameType && (
                            <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/50 text-sm">
                                <span className="text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1"><ExclamationTriangleIcon className="w-4 h-4" />Partie en cours</span>
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
                                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700/50 text-gray-500 dark:text-gray-400 text-sm font-semibold hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition-all bg-white dark:bg-gray-900/80">
                                Quitter
                            </button>
                            {isHost ? (
                                <button onClick={() => { setIsLaunching(true); socket?.emit('lobby:start'); }} disabled={!canStart || isLaunching || isWarming}
                                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-200 dark:disabled:from-gray-800 disabled:to-gray-200 dark:disabled:to-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-lg shadow-green-500/20 disabled:shadow-none">
                                    {isWarming
                                        ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Serveur en démarrage…</span>
                                        : isLaunching
                                            ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Lancement…</span>
                                            : canStart
                                                ? <span className="flex items-center justify-center gap-1.5"><PlayIcon className="w-4 h-4" />Lancer {selectedGame?.label ?? 'la partie'} !</span>
                                                : gameType === 'quiz' && !selectedQuizId && players.length >= 2
                                                    ? <span className="flex items-center justify-center gap-1.5"><QuestionMarkCircleIcon className="w-4 h-4" />Choix du quiz…</span>
                                                    : (gameType === 'taboo' || (gameType === 'uno' && unoTeamMode === '2v2') || (gameType === 'ludo' && ludoTeamMode === '2v2')) && !tabooOk
                                                        ? <span className="flex items-center justify-center gap-1.5"><ClockIcon className="w-4 h-4" />En attente des équipes…</span>
                                                        : <span className="flex items-center justify-center gap-1.5"><ClockIcon className="w-4 h-4" />En attente de joueurs…</span>}
                                </button>
                            ) : (
                                <div className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 text-gray-400 dark:text-gray-500 text-sm font-semibold text-center">
                                    {isWarming
                                        ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Serveur en démarrage…</span>
                                        : isLaunching
                                            ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Lancement…</span>
                                            : <span className="flex items-center justify-center gap-1.5"><ClockIcon className="w-4 h-4" />En attente du host…</span>}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </main>
    );
}
