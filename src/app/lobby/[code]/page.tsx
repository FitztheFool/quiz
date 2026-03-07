'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getLobbySocket } from '@/lib/socket';

type Player = { userId: string; username: string };
type GameType = 'quiz' | 'uno';

type LobbyState = {
    hostId: string | null;
    quizId: string | null;
    status: 'WAITING' | 'PLAYING' | string;
    timePerQuestion: number;
    timeMode: 'per_question' | 'total' | 'none';
    players: Player[];
    gameType: GameType;
    unoOptions: { stackable: boolean; jumpIn: boolean };
};

type ChatMessage = {
    userId: string;
    username: string;
    text: string;
    sentAt: number;
};

export default function LobbyPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams<{ code: string }>();
    const lobbyId = params?.code ?? '';

    const socket = useMemo(() => getLobbySocket(), []);
    const joinedRef = useRef(false);

    const [lobby, setLobby] = useState<LobbyState>({
        hostId: null,
        quizId: null,
        status: 'WAITING',
        timePerQuestion: 15,
        timeMode: 'per_question',
        players: [],
        gameType: 'quiz',
        unoOptions: { stackable: false, jumpIn: false },
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
        if (status === 'unauthenticated') {
            router.replace(`/login?callbackUrl=${encodeURIComponent(`/lobby/${lobbyId}`)}`);
        }
    }, [status, router, lobbyId]);

    useEffect(() => {
        fetch('/api/categories')
            .then(r => r.ok ? r.json() : [])
            .then(setCategories);
    }, []);

    useEffect(() => {
        if (!socket) return;
        if (!lobbyId || status !== 'authenticated' || !session?.user?.id) return;

        const meUserId = session.user.id;
        const meUsername = session.user.username ?? session.user.email ?? 'User';

        const onState = (state: LobbyState) => setLobby({
            ...state,
            unoOptions: state.unoOptions ?? { stackable: false, jumpIn: false },
        });
        const onChatNew = (m: ChatMessage) => setMessages((prev) => [...prev, m]);
        const onGameStart = (payload: {
            gameType: GameType;
            quizId?: string;
            timeMode?: string;
            timePerQuestion?: number;
            lobbyId?: string;
        }) => {
            if (payload.gameType === 'uno') {
                // URL propre — les options et le nombre de joueurs sont gérés côté serveur
                router.push(`/uno/${lobbyId}`);
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
            joinedRef.current = false;
        };
    }, [socket, lobbyId, status, session?.user?.id, session?.user?.username, session?.user?.email]);

    if (status === 'loading') {
        return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
    }
    if (status !== 'authenticated' || !session?.user?.id) return null;

    const me = {
        userId: session.user.id,
        username: session.user.username ?? session.user.email ?? 'User',
    };
    const isHost = lobby.hostId === me.userId;

    const sendChat = () => {
        const text = chatText.trim();
        if (!text || !socket) return;
        socket.emit('chat:send', { text });
        setChatText('');
    };

    const setTime = (t: number) => socket?.emit('lobby:setTimePerQuestion', { timePerQuestion: t });
    const setGameType = (gameType: GameType) => socket?.emit('lobby:setGameType', { gameType });
    const setUnoOption = (key: 'stackable' | 'jumpIn', value: boolean) =>
        socket?.emit('lobby:setUnoOptions', { [key]: value });

    const DEFAULT_TIME: Record<string, number> = { total: 300, per_question: 15 };
    const TIME_OPTIONS_TOTAL = [60, 120, 180, 300, 600, 900, 1200, 1800, 3600];
    const TIME_OPTIONS_PER_QUESTION = [5, 10, 15, 20, 30, 45, 60, 90, 120];
    const formatTotalTime = (t: number) => {
        if (t < 60) return `${t}s`;
        const min = Math.floor(t / 60);
        const sec = t % 60;
        return sec === 0 ? `${min} min` : `${min} min ${sec}s`;
    };

    const playerCount = lobby.players.length;
    const canStart = lobby.gameType === 'uno'
        ? playerCount >= 2 && playerCount <= 8
        : playerCount >= 2 && !!lobby.quizId;

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">

                <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                            Lobby <span className="font-mono">{lobbyId}</span>
                            <div className="relative">
                                <button onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/lobby/${lobbyId}`);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                }}>⧉</button>
                                {copied && (
                                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs bg-black text-white px-2 py-1 rounded whitespace-nowrap">
                                        Copié !
                                    </span>
                                )}
                            </div>
                        </h1>
                        <p className="text-sm opacity-70">
                            {isHost ? '👑 Vous êtes Host' : lobby.hostId ? 'En attente du host…' : 'Connexion…'}
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
                    >
                        Quitter
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">

                    <div className="bg-white rounded-xl p-4 shadow-sm space-y-5">

                        <div>
                            <h2 className="font-bold text-lg mb-3">
                                Participants
                                {lobby.gameType === 'uno' && (
                                    <span className={`ml-2 text-xs font-normal ${playerCount > 8 ? 'text-red-500' : 'text-gray-400'}`}>
                                        ({playerCount}/8)
                                    </span>
                                )}
                            </h2>
                            <div className="space-y-2">
                                {lobby.players.map((p) => (
                                    <div key={p.userId} className="flex items-center gap-2 border rounded-lg p-2">
                                        <span className="font-semibold">{p.username}</span>
                                        {p.userId === lobby.hostId && <span title="Host">👑</span>}
                                        {p.userId === me.userId && <span className="text-xs opacity-60">(moi)</span>}
                                    </div>
                                ))}
                                {lobby.players.length === 0 && (
                                    <div className="text-sm opacity-60">Personne pour l'instant…</div>
                                )}
                            </div>
                        </div>

                        <div>
                            <h2 className="font-bold text-sm text-gray-500 uppercase mb-2">Jeu</h2>
                            <div className="grid grid-cols-2 gap-2">
                                {(['quiz', 'uno'] as GameType[]).map((g) => (
                                    <button
                                        key={g}
                                        onClick={() => isHost && setGameType(g)}
                                        disabled={!isHost}
                                        className={`py-2 rounded-lg border-2 font-semibold text-sm transition-all
                                            ${lobby.gameType === g
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 text-gray-500 hover:border-gray-300'}
                                            ${!isHost ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
                                    >
                                        {g === 'quiz' ? '🎯 Quiz' : '🃏 UNO'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {lobby.gameType === 'quiz' && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Mode de temps</label>
                                    <select
                                        value={lobby.timeMode}
                                        onChange={(e) => {
                                            const newMode = e.target.value;
                                            socket?.emit('lobby:setTimeMode', { timeMode: newMode });
                                            if (newMode !== 'none') {
                                                socket?.emit('lobby:setTimePerQuestion', {
                                                    timePerQuestion: DEFAULT_TIME[newMode] ?? 15,
                                                });
                                            }
                                        }}
                                        disabled={!isHost}
                                        className="w-full border rounded-lg px-3 py-2 bg-white disabled:opacity-60"
                                    >
                                        <option value="total">Questionnaire</option>
                                        <option value="per_question">Temps par question</option>
                                        <option value="none">Pas de temps</option>
                                    </select>
                                </div>

                                {lobby.timeMode !== 'none' && (
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">
                                            {lobby.timeMode === 'total' ? 'Temps total' : 'Temps par question'}
                                        </label>
                                        <select
                                            value={Number(lobby.timePerQuestion)}
                                            onChange={(e) => setTime(Number(e.target.value))}
                                            disabled={!isHost}
                                            className="w-full border rounded-lg px-3 py-2 bg-white disabled:opacity-60"
                                        >
                                            {lobby.timeMode === 'total'
                                                ? TIME_OPTIONS_TOTAL.map((t) => (
                                                    <option key={t} value={t}>{formatTotalTime(t)}</option>
                                                ))
                                                : TIME_OPTIONS_PER_QUESTION.map((t) => (
                                                    <option key={t} value={t}>{t}s</option>
                                                ))}
                                        </select>
                                    </div>
                                )}
                            </>
                        )}

                        {lobby.gameType === 'uno' && (
                            <div className="space-y-2">
                                <h2 className="text-sm font-semibold text-gray-500 uppercase">Options UNO</h2>
                                <label className={`flex items-center justify-between border rounded-lg px-3 py-2 ${isHost ? 'cursor-pointer' : 'opacity-60'}`}>
                                    <span className="text-sm">Cartes empilables (+2/+4)</span>
                                    <input
                                        type="checkbox"
                                        checked={lobby.unoOptions.stackable}
                                        onChange={e => isHost && setUnoOption('stackable', e.target.checked)}
                                        disabled={!isHost}
                                        className="w-4 h-4"
                                    />
                                </label>
                                <label className={`flex items-center justify-between border rounded-lg px-3 py-2 ${isHost ? 'cursor-pointer' : 'opacity-60'}`}>
                                    <span className="text-sm">Jump-in (même carte)</span>
                                    <input
                                        type="checkbox"
                                        checked={lobby.unoOptions.jumpIn}
                                        onChange={e => isHost && setUnoOption('jumpIn', e.target.checked)}
                                        disabled={!isHost}
                                        className="w-4 h-4"
                                    />
                                </label>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold mb-2">Statut</label>
                            <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border bg-yellow-50 text-yellow-700 border-yellow-200">
                                ⏳ En attente
                            </span>
                        </div>

                        <button
                            disabled={!isHost || !canStart}
                            onClick={() => socket?.emit('lobby:start')}
                            className={`w-full py-3 rounded-lg font-bold transition-all ${isHost && canStart
                                ? 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >
                            {!isHost
                                ? 'En attente du host…'
                                : canStart
                                    ? `🚀 Lancer ${lobby.gameType === 'uno' ? 'UNO' : 'le quiz'} !`
                                    : lobby.gameType === 'uno'
                                        ? playerCount < 2 ? '⏳ Min. 2 joueurs' : '⛔ Max. 8 joueurs'
                                        : playerCount < 2 ? '⏳ Min. 2 joueurs' : '🎯 Choisir un quiz'}
                        </button>
                    </div>

                    {lobby.gameType === 'quiz' ? (
                        <div className="bg-white rounded-xl p-4 shadow-sm lg:col-span-2">
                            <h2 className="font-bold text-lg mb-3">Quiz</h2>
                            <div className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    value={quizSearch}
                                    onChange={(e) => { setQuizSearch(e.target.value); fetchQuizList(1); }}
                                    placeholder="Rechercher un quiz..."
                                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                                />
                                <select
                                    value={quizCategory}
                                    onChange={(e) => { setQuizCategory(e.target.value); fetchQuizList(1); }}
                                    className="border rounded-lg px-3 py-2 text-sm text-gray-600"
                                >
                                    <option value="">Toutes les catégories</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {quizList.map((q) => (
                                    <div
                                        key={q.id}
                                        onClick={() => isHost && socket?.emit('lobby:setQuiz', { quizId: lobby.quizId === q.id ? null : q.id })}
                                        className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${lobby.quizId === q.id
                                            ? 'border-green-500 bg-green-50 cursor-pointer'
                                            : isHost
                                                ? 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 cursor-pointer'
                                                : 'border-gray-200 cursor-default'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${lobby.quizId === q.id ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                                                {lobby.quizId === q.id && (
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span className={`font-medium text-sm ${lobby.quizId === q.id ? 'text-green-700' : 'text-gray-800'}`}>
                                                {q.title}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-400">{q._count.questions} questions</span>
                                    </div>
                                ))}
                                {quizList.length === 0 && <p className="text-sm text-gray-400">Aucun quiz disponible.</p>}
                            </div>
                            {quizTotalPages > 1 && (
                                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                                    <button onClick={() => fetchQuizList(quizPage - 1)} disabled={quizPage === 1}
                                        className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                                        ← Précédent
                                    </button>
                                    <span className="text-xs text-gray-400">{quizPage} / {quizTotalPages}</span>
                                    <button onClick={() => fetchQuizList(quizPage + 1)} disabled={quizPage === quizTotalPages}
                                        className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                                        Suivant →
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl p-6 shadow-sm lg:col-span-2 flex flex-col items-center justify-center text-center gap-4">
                            <div className="text-6xl">🃏</div>
                            <h2 className="text-xl font-bold">UNO</h2>
                            <div className="text-sm text-gray-500 space-y-1 max-w-xs">
                                <p>Chaque joueur reçoit 7 cartes. Pose une carte qui correspond à la couleur ou au chiffre du dessus.</p>
                                <p>Le premier à vider sa main gagne. N'oublie pas de crier <strong>UNO !</strong> quand il t'en reste une.</p>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center text-xs text-gray-400 mt-2">
                                <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full">+2 Piocher</span>
                                <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full">🔄 Inverser</span>
                                <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full">🚫 Passer</span>
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">🌈 Joker</span>
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">+4 Wild</span>
                                {lobby.unoOptions?.stackable && <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">✅ Empilables</span>}
                                {lobby.unoOptions?.jumpIn && <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">✅ Jump-in</span>}
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <h2 className="font-bold text-lg mb-3">Chat</h2>
                        <div className="h-64 overflow-auto border rounded-lg p-3 bg-gray-50">
                            {messages.map((m, i) => (
                                <div key={i} className="mb-2">
                                    <b>{m.username}</b>: {m.text}
                                </div>
                            ))}
                            {messages.length === 0 && <div className="text-sm opacity-60">Aucun message…</div>}
                        </div>
                        <div className="mt-3 flex flex-col gap-2">
                            <input
                                value={chatText}
                                onChange={(e) => setChatText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }}
                                className="w-full border rounded-lg px-3 py-2"
                                placeholder="Écrire un message…"
                            />
                            <button onClick={sendChat} className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                                Envoyer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
