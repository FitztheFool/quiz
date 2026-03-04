'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getSocket } from '@/lib/socket';

type Player = { userId: string; username: string };

type LobbyState = {
    hostId: string | null;
    quizId: string | null;
    status: 'WAITING' | 'PLAYING' | string;
    timePerQuestion: number;
    timeMode: 'per_question' | 'total' | 'none';
    players: Player[];
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

    const socket = useMemo(() => getSocket(), []);
    const joinedRef = useRef(false);

    const [lobby, setLobby] = useState<LobbyState>({
        hostId: null,
        quizId: null,
        status: 'WAITING',
        timePerQuestion: 15,
        timeMode: 'per_question',
        players: [],
    });

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatText, setChatText] = useState('');
    const [quizList, setQuizList] = useState<{ id: string; title: string; _count: { questions: number } }[]>([]);
    const [quizSearch, setQuizSearch] = useState('');
    const [quizCategory, setQuizCategory] = useState('');
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [quizPage, setQuizPage] = useState(1);
    const [quizTotalPages, setQuizTotalPages] = useState(1);
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
        if (!lobbyId) return;
        if (status !== 'authenticated') return;
        if (!session?.user?.id) return;

        const meUserId = session.user.id;
        const meUsername = session.user.username ?? session.user.email ?? 'User';

        const onState = (state: LobbyState) => setLobby(state);
        const onChatNew = (m: ChatMessage) => setMessages((prev) => [...prev, m]);
        const onGameStart = ({ quizId, timeMode, timePerQuestion }: {
            quizId: string;
            timeMode: string;
            timePerQuestion: number;
        }) => {
            sessionStorage.setItem(`lobby_timeMode_${lobbyId}`, timeMode);
            sessionStorage.setItem(`lobby_timePerQuestion_${lobbyId}`, String(timePerQuestion));
            router.push(`/quiz/${quizId}?lobby=${lobbyId}`);
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

    if (status !== 'authenticated' || !session?.user?.id) {
        return null;
    }

    const me = {
        userId: session.user.id,
        username: session.user.username ?? session.user.email ?? 'User',
    };

    const isHost = lobby.hostId === me.userId;

    const sendChat = () => {
        const text = chatText.trim();
        if (!text) return;
        socket.emit('chat:send', { text });
        setChatText('');
    };

    const setTime = (t: number) => {
        socket.emit('lobby:setTimePerQuestion', { timePerQuestion: t });
    };

    // ✅ Valeurs par défaut cohérentes selon le mode
    const DEFAULT_TIME: Record<string, number> = {
        total: 300,
        per_question: 15,
    };

    // ✅ Options de temps selon le mode
    const TIME_OPTIONS_TOTAL = [60, 120, 180, 300, 600, 900, 1200, 1800, 3600];
    const TIME_OPTIONS_PER_QUESTION = [5, 10, 15, 20, 30, 45, 60, 90, 120];

    const formatTotalTime = (t: number) => {
        if (t < 60) return `${t}s`;
        const min = Math.floor(t / 60);
        const sec = t % 60;
        return sec === 0 ? `${min} min` : `${min} min ${sec}s`;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold">
                            Lobby <span className="font-mono">{lobbyId}</span>
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
                    {/* Col gauche: joueurs + settings */}
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <h2 className="font-bold text-lg mb-3">Participants</h2>

                        <div className="space-y-2">
                            {lobby.players.map((p) => (
                                <div key={p.userId} className="flex items-center justify-between border rounded-lg p-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">{p.username}</span>
                                        {p.userId === lobby.hostId && <span title="Host">👑</span>}
                                        {p.userId === me.userId && <span className="text-xs opacity-60">(moi)</span>}
                                    </div>
                                </div>
                            ))}
                            {lobby.players.length === 0 && (
                                <div className="text-sm opacity-60">Personne pour l'instant…</div>
                            )}
                        </div>

                        {/* ✅ Select mode de temps — reset timePerQuestion quand le mode change */}
                        <div className="mt-4">
                            <label className="block text-sm font-semibold mb-2">Mode de temps</label>
                            <select
                                value={lobby.timeMode}
                                onChange={(e) => {
                                    const newMode = e.target.value;
                                    socket.emit('lobby:setTimeMode', { timeMode: newMode });
                                    if (newMode !== 'none') {
                                        socket.emit('lobby:setTimePerQuestion', {
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

                        {/* ✅ Select durée — options selon le mode actuel */}
                        {lobby.timeMode !== 'none' && (
                            <div className="mt-6">
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
                                        ))
                                    }
                                </select>
                            </div>
                        )}

                        <div className="mt-6">
                            <label className="block text-sm font-semibold mb-2">Statut</label>
                            <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border bg-yellow-50 text-yellow-700 border-yellow-200">
                                ⏳ En attente
                            </span>
                        </div>

                        <button
                            disabled={!isHost || !lobby.quizId}
                            onClick={() => socket.emit('lobby:start')}
                            className={`w-full mt-6 py-3 rounded-lg font-bold transition-all ${isHost && lobby.quizId
                                ? 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {!isHost ? '🎯 Choix du quiz' : lobby.quizId ? '🚀 Lancer !' : '🎯 Choix du quiz'}
                        </button>
                    </div>

                    {/* Centre: zone quiz */}
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
                                    onClick={() => isHost && socket.emit('lobby:setQuiz', { quizId: lobby.quizId === q.id ? null : q.id })}
                                    className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${lobby.quizId === q.id
                                        ? 'border-green-500 bg-green-50 cursor-pointer'
                                        : isHost
                                            ? 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 cursor-pointer'
                                            : 'border-gray-200 cursor-default'
                                        }`}
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
                            {quizList.length === 0 && (
                                <p className="text-sm text-gray-400">Aucun quiz disponible.</p>
                            )}
                        </div>

                        {quizTotalPages > 1 && (
                            <div className="flex items-center justify-between mt-3 pt-3 border-t">
                                <button
                                    onClick={() => fetchQuizList(quizPage - 1)}
                                    disabled={quizPage === 1}
                                    className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    ← Précédent
                                </button>
                                <span className="text-xs text-gray-400">{quizPage} / {quizTotalPages}</span>
                                <button
                                    onClick={() => fetchQuizList(quizPage + 1)}
                                    disabled={quizPage === quizTotalPages}
                                    className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Suivant →
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Droite: chat */}
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
                            <button
                                onClick={sendChat}
                                className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            >
                                Envoyer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
