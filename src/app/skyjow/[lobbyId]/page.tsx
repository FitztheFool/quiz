// src/app/skyjow/[lobbyId]/page.tsx
'use client';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';
import TurnTimer from '@/components/TurnTimer';
import GameOverModal from '@/components/GameOverModal';
import GameScoreLeaderboard from '@/components/GameScoreLeaderboard';

import { useCallback, useEffect, useRef, useState } from 'react';
import { notFound } from 'next/navigation';
import { getSkyjowSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';
import { useGamePage } from '@/hooks/useGamePage';

// ── Types ────────────────────────────────────────────────────────────────────

type CardState = { value: number | null; revealed: boolean; removed: boolean };
type PlayerPublic = {
    userId: string;
    username: string;
    cards: CardState[];
    score: number;
    liveScore?: number;
};
type ScoreEntry = { userId: string; username: string; roundScore: number; totalScore: number; abandon?: boolean };

type Phase = 'waiting' | 'flip2' | 'playing' | 'last_round' | 'ended' | 'round_end' | 'game_end';

type GameState = {
    phase: Phase;
    round: number;
    currentPlayerIndex: number;
    discardTop: number | null;
    players: PlayerPublic[];
    scores: ScoreEntry[];
    lastRoundStarterIndex: number | null;
};

// ── Helpers visuels ───────────────────────────────────────────────────────────

function cardColor(value: number | null, revealed: boolean, removed: boolean): string {
    if (removed) return 'bg-transparent border-transparent';
    if (!revealed) return 'bg-slate-400 dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:bg-slate-500 dark:hover:bg-slate-600 cursor-pointer text-slate-200 dark:text-slate-400';
    if (value === null) return 'bg-slate-400 dark:bg-slate-700 border-slate-300 dark:border-slate-600';
    if (value === -2) return 'bg-blue-400 dark:bg-blue-900 border-blue-300 dark:border-blue-800 text-white';
    if (value === -1) return 'bg-blue-500 dark:bg-blue-600 border-blue-400 dark:border-blue-500 text-white';
    if (value === 0) return 'bg-cyan-400 border-cyan-300 text-slate-900';
    if (value <= 3) return 'bg-emerald-400 border-emerald-300 text-slate-900';
    if (value <= 6) return 'bg-yellow-300 border-yellow-200 text-slate-900';
    if (value <= 9) return 'bg-orange-400 border-orange-300 text-slate-900';
    return 'bg-red-500 border-red-400 text-white';
}

function cardLabel(value: number | null, revealed: boolean, removed: boolean): string {
    if (removed) return '';
    if (!revealed) return '?';
    if (value === null) return '?';
    return String(value);
}


// ── Composant carte ───────────────────────────────────────────────────────────

type CardProps = {
    card: CardState;
    onClick?: () => void;
    highlight?: boolean;
    selectable?: boolean;
    size?: 'sm' | 'md' | 'lg';
};

function Card({ card, onClick, highlight, selectable, size = 'md' }: CardProps) {
    const sizeClass = size === 'sm'
        ? 'w-8 h-11 text-xs rounded'
        : size === 'lg'
            ? 'w-14 h-20 text-xl rounded-lg'
            : 'w-11 h-16 text-sm rounded-md';

    if (card.removed) {
        return <div className={`${sizeClass} opacity-0 pointer-events-none`} />;
    }

    return (
        <div
            onClick={selectable ? onClick : undefined}
            className={[
                sizeClass,
                'border-2 flex items-center justify-center font-bold transition-all duration-200 select-none',
                cardColor(card.value, card.revealed, card.removed),
                selectable && !card.revealed ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-white dark:ring-offset-slate-900 scale-105' : '',
                highlight ? 'ring-2 ring-gray-400 dark:ring-white ring-offset-1 ring-offset-white dark:ring-offset-slate-900' : '',
                selectable && !card.removed ? 'cursor-pointer hover:scale-110 active:scale-95' : '',
            ].join(' ')}
        >
            {card.revealed ? cardLabel(card.value, card.revealed, card.removed) : (
                <svg className="w-4 h-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )}
        </div>
    );
}

// ── Grid 3x4 d'un joueur ──────────────────────────────────────────────────────

type PlayerGridProps = {
    player: PlayerPublic;
    myCards?: CardState[];
    isMe: boolean;
    isCurrent: boolean;
    selectableIndices?: number[];
    onCardClick?: (index: number) => void;
    compact?: boolean;
};

function PlayerGrid({ player, myCards, isMe, isCurrent, selectableIndices, onCardClick, compact }: PlayerGridProps) {
    const cards = isMe && myCards ? myCards : player.cards;
    const size = compact ? 'sm' : isMe ? 'lg' : 'md';

    return (
        <div className={`grid grid-cols-4 ${compact ? 'gap-1' : isMe ? 'gap-3' : 'gap-2'}`}>
            {cards.map((card, idx) => (
                <Card
                    key={idx}
                    card={card}
                    size={size}
                    selectable={selectableIndices?.includes(idx)}
                    onClick={() => onCardClick?.(idx)}
                />
            ))}
        </div>
    );
}

const isPlayingPhase = (p: Phase) => p === 'playing' || p === 'last_round';

// ── Page principale ───────────────────────────────────────────────────────────

export default function skyjowGamePage() {
    const { session, status, router, me: meInfo, lobbyId, isNotFound, setIsNotFound, modalDismissed, setModalDismissed } = useGamePage();

    const skyjowRef = useRef<Socket | null>(null);
    const joinedRef = useRef(false);

    const [gameState, setGameState] = useState<GameState | null>(null);
    const [myCards, setMyCards] = useState<CardState[]>([]);
    const [phase, setPhase] = useState<Phase>('waiting');
    const [round, setRound] = useState(1);
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
    const [discardTop, setDiscardTop] = useState<number | null>(null);
    const [drawnCard, setDrawnCard] = useState<{ value: number; from: 'deck' | 'discard'; mustSwap?: boolean } | null>(null);
    const [players, setPlayers] = useState<PlayerPublic[]>([]);
    const [scores, setScores] = useState<ScoreEntry[]>([]);
    const [notification, setNotification] = useState<string | null>(null);
    const [roundEndData, setRoundEndData] = useState<{ scores: ScoreEntry[]; players: { userId: string; username: string; cards: CardState[] }[] } | null>(null);
    const [gameEndData, setGameEndData] = useState<{ scores: ScoreEntry[]; winnerId: string; winnerUsername: string } | null>(null);
    const [surrenderedPlayers, setSurrenderedPlayers] = useState<{ userId: string; username: string; cards: CardState[] }[]>([]);
    const [drawnAction, setDrawnAction] = useState<'swap' | 'discard_flip' | null>(null);
    const [readyCount, setReadyCount] = useState(0);
    const [flip2Count, setFlip2Count] = useState(0);

    const [inactivityEndsAt, setInactivityEndsAt] = useState<number | null>(null);
    const [inactivityUserId, setInactivityUserId] = useState<string | null>(null);

    const userId = meInfo.userId;
    const username = meInfo.username;

    const isCurrent = players[currentPlayerIndex]?.userId === userId;

    const notify = useCallback((msg: string, duration = 3000) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), duration);
    }, []);

    // ── Connexion socket ───────────────────────────────────────────────────────

    useEffect(() => {
        if (!lobbyId || status !== 'authenticated' || !userId) return;
        const sock = getSkyjowSocket();
        if (!sock) return;
        skyjowRef.current = sock;

        if (!joinedRef.current) {
            joinedRef.current = true;
            sock.emit('skyjow:join', { lobbyId, userId, username });
        }

        sock.on('notFound', () => setIsNotFound(true));

        sock.on('skyjow:game_started', (data: {
            players: PlayerPublic[];
            discardTop: number;
            phase: Phase;
            round: number;
        }) => {
            setPlayers(data.players);
            setDiscardTop(data.discardTop);
            setPhase(data.phase);
            setRound(data.round);
            setMyCards(Array(12).fill({ value: null, revealed: false, removed: false }));
            setDrawnCard(null);
            setRoundEndData(null);
            setGameEndData(null);
            setFlip2Count(0);
            setSurrenderedPlayers([]);
        });

        sock.on('skyjow:my_cards', ({ cards }: { cards: CardState[] }) => {
            setMyCards(cards);
            setFlip2Count(cards.filter(c => c.revealed).length);
        });

        sock.on('skyjow:state', (state: GameState) => {
            setGameState(state);
            setPlayers(state.players);
            setDiscardTop(state.discardTop);
            setPhase(state.phase);
            setRound(state.round);
            setCurrentPlayerIndex(state.currentPlayerIndex);
            setScores(state.scores);
        });

        sock.on('skyjow:turn', ({ currentUserId }: { currentPlayerIndex: number; currentUserId: string }) => {
            setInactivityEndsAt(null);
            setInactivityUserId(null);
            if (currentUserId === userId) notify('🎯 C\'est ton tour !');
        });

        sock.on('skyjow:drawn_card', (data: { value: number; from: 'deck' | 'discard'; mustSwap?: boolean }) => {
            setDrawnCard(data);
            setDrawnAction(data.from === 'discard' ? 'swap' : null);
        });

        sock.on('skyjow:last_round', ({ triggerUsername }: { triggerUserId: string; triggerUsername: string }) => {
            notify(`⚡ ${triggerUsername} a retourné toutes ses cartes ! Dernier tour pour tous !`, 5000);
            setPhase('last_round');
        });

        sock.on('skyjow:columns_removed', ({ username: uname, columns }: { userId: string; username: string; columns: { col: number; value: number }[] }) => {
            notify(`🗑️ ${uname} a éliminé une colonne de ${columns[0]?.value} !`);
        });

        sock.on('skyjow:round_end', (data: { scores: ScoreEntry[]; players: { userId: string; username: string; cards: CardState[] }[] }) => {
            setRoundEndData(data);
            setScores(data.scores);
            setPhase('round_end');
        });

        sock.on('skyjow:finished', (data: { scores: ScoreEntry[]; winnerId: string; winnerUsername: string }) => {
            setGameEndData(data);
            setScores(data.scores);
            setPhase('game_end');
        });

        sock.on('skyjow:playerSurrendered', ({ userId: uid, username: uname, cards }: { userId: string; username: string; cards: CardState[] }) => {
            setSurrenderedPlayers(prev => [...prev, { userId: uid, username: uname, cards }]);
        });

        sock.on('skyjow:inactivityWarning', ({ userId: uid, secondsLeft }: { userId: string; secondsLeft: number }) => {
            setInactivityUserId(uid);
            setInactivityEndsAt(Date.now() + secondsLeft * 1000);
        });

        sock.on('skyjow:playerKicked', () => {
            setInactivityEndsAt(null);
            setInactivityUserId(null);
        });

        sock.on('skyjow:waiting_next_round', ({ scores: s }: { scores: ScoreEntry[] }) => {
            setScores(s);
            setReadyCount(0);
        });

        sock.on('skyjow:ready_count', ({ ready, total }: { ready: number; total: number }) => {
            setReadyCount(ready);
            notify(`${ready}/${total} joueurs prêts…`);
        });

        sock.on('skyjow:new_round', (data: {
            round: number;
            phase: Phase;
            discardTop: number;
            players: PlayerPublic[];
            scores: ScoreEntry[];
        }) => {
            setRound(data.round);
            setPhase(data.phase);
            setDiscardTop(data.discardTop);
            setPlayers(data.players);
            setScores(data.scores);
            setDrawnCard(null);
            setRoundEndData(null);
            setFlip2Count(0);
            setSurrenderedPlayers([]);
            notify(`🔄 Manche ${data.round} !`);
        });

        return () => {
            sock.off('notFound');
            sock.off('skyjow:game_started');
            sock.off('skyjow:my_cards');
            sock.off('skyjow:state');
            sock.off('skyjow:turn');
            sock.off('skyjow:drawn_card');
            sock.off('skyjow:last_round');
            sock.off('skyjow:columns_removed');
            sock.off('skyjow:round_end');
            sock.off('skyjow:finished');
            sock.off('skyjow:playerSurrendered');
            sock.off('skyjow:inactivityWarning');
            sock.off('skyjow:playerKicked');
            sock.off('skyjow:waiting_next_round');
            sock.off('skyjow:ready_count');
            sock.off('skyjow:new_round');
        };
    }, [lobbyId, status, userId, username, notify]);

    // ── Actions ────────────────────────────────────────────────────────────────

    const flipInitial = useCallback((cardIndex: number) => {
        if (phase !== 'flip2') return;
        if (flip2Count >= 2) return;
        skyjowRef.current?.emit('skyjow:flip_initial', { cardIndex });
    }, [phase, flip2Count]);

    const drawDeck = useCallback(() => {
        if (!isCurrent || !isPlayingPhase(phase) || drawnCard !== null) return;
        skyjowRef.current?.emit('skyjow:draw_deck');
    }, [isCurrent, phase, drawnCard]);

    const takeDiscard = useCallback(() => {
        if (!isCurrent || !isPlayingPhase(phase) || drawnCard !== null) return;
        skyjowRef.current?.emit('skyjow:take_discard');
    }, [isCurrent, phase, drawnCard]);

    const handleCardClick = useCallback((cardIndex: number) => {
        if (phase === 'flip2') {
            flipInitial(cardIndex);
            return;
        }
        if (!isCurrent || drawnCard === null || drawnAction === null) return;
        if (!isPlayingPhase(phase)) return;

        const card = myCards[cardIndex];
        if (!card || card.removed) return;

        if (drawnAction === 'swap') {
            skyjowRef.current?.emit('skyjow:swap_card', { cardIndex });
            setDrawnCard(null);
            setDrawnAction(null);
        } else if (drawnAction === 'discard_flip') {
            if (card.revealed) return; // discard_flip only on hidden cards
            skyjowRef.current?.emit('skyjow:discard_and_flip', { cardIndex });
            setDrawnCard(null);
            setDrawnAction(null);
        }
    }, [phase, isCurrent, drawnCard, drawnAction, myCards, flipInitial]);

    const readyNextRound = useCallback(() => {
        skyjowRef.current?.emit('skyjow:ready_next_round');
    }, []);

    // ── Computed ───────────────────────────────────────────────────────────────

    const myPlayer = players.find(p => p.userId === userId);
    const myScore = myPlayer?.liveScore ?? scores.find(s => s.userId === userId)?.totalScore ?? 0;

    const selectableIndices: number[] = [];
    if (phase === 'flip2') {
        if (flip2Count < 2) {
            myCards.forEach((c, i) => { if (!c.revealed && !c.removed) selectableIndices.push(i); });
        }
    } else if (isCurrent && drawnCard !== null) {
        myCards.forEach((c, i) => {
            if (!c.removed) selectableIndices.push(i);
        });
    }

    const otherPlayers = players.filter(p => p.userId !== userId);
    const currentPlayerId = players[currentPlayerIndex]?.userId;
    const isMeInactive = inactivityUserId === userId;

    // ── Render guards ──────────────────────────────────────────────────────────

    if (status === 'loading') return <LoadingSpinner />;
    if (isNotFound) notFound();


    // ── Écran fin de manche ────────────────────────────────────────────────────

    if (phase === 'round_end' && roundEndData) {
        const sortedScores = [...roundEndData.scores].sort((a, b) => a.totalScore - b.totalScore);
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 max-w-lg w-full">
                    <div className="text-center mb-6">
                        <div className="text-5xl mb-3">📊</div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fin de la manche {round}</h1>
                        {scores.some(s => s.totalScore >= 100) && (
                            <p className="text-red-400 text-sm mt-1">⚠️ Un joueur a atteint 100 points — fin de partie !</p>
                        )}
                    </div>

                    <div className="space-y-2 mb-6">
                        {sortedScores.map((s, i) => (
                            <div key={s.userId}
                                className={`flex justify-between items-center px-4 py-3 rounded-lg ${s.userId === userId ? 'bg-sky-900/40 border border-sky-500/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                <span className="text-gray-800 dark:text-gray-200 font-medium">
                                    {i === 0 ? '🥇' : `${i + 1}.`} {s.username}
                                </span>
                                <div className="text-right">
                                    <span className={`text-sm font-semibold ${s.roundScore > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                                        {s.roundScore > 0 ? '+' : ''}{s.roundScore}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">= {s.totalScore} pts</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button onClick={readyNextRound}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors">
                        ▶ Manche suivante
                        {readyCount > 0 && <span className="ml-2 text-sm opacity-70">({readyCount}/{players.length})</span>}
                    </button>
                </div>
            </div>
        );
    }

    // ── Écran d'attente ────────────────────────────────────────────────────────

    if (phase === 'waiting' || players.length === 0) return (
        <GameWaitingScreen icon="🂠" gameName="Skyjow" lobbyId={lobbyId} players={players} myUserId={userId} />
    );

    // ── Interface principale ───────────────────────────────────────────────────

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

            {/* ── Notification ── */}
            {notification && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200">
                    {notification}
                </div>
            )}

            {/* ── Header ── */}
            <header className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center gap-4">
                {/* Left */}
                <div className="w-48 lg:w-72 shrink-0 flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white">🃏 Skyjow</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Manche {round}</span>
                </div>

                <div className="flex-1" />

                {/* Right */}
                <div className="w-48 shrink-0 flex justify-end items-center gap-2">
                    <div className="hidden sm:flex gap-2">
                        {[...scores].sort((a, b) => a.totalScore - b.totalScore).map(s => (
                            <div key={s.userId}
                                className={`px-2 py-1 rounded-lg text-xs font-semibold ${s.userId === userId ? 'bg-sky-100 dark:bg-sky-700 text-sky-700 dark:text-sky-100' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                                {s.username.split(' ')[0]}: {s.totalScore}
                            </div>
                        ))}
                    </div>
                    {phase !== 'ended' && phase !== 'game_end' && (
                        <button
                            onClick={() => { if (confirm('Abandonner la partie ?')) skyjowRef.current?.emit('skyjow:surrender'); }}
                            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 px-3 py-1.5 rounded-lg transition-all"
                        >
                            🏳️ Abandonner
                        </button>
                    )}
                </div>
            </header>

            {/* ── Corps principal ── */}
            <main className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">

                {/* ── Zone adversaires ── */}
                <div className="lg:w-72 bg-white dark:bg-gray-900 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-800 p-3 overflow-y-auto">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-3 tracking-wider">Adversaires</p>
                    <div className="space-y-4">
                        {otherPlayers.map((p) => {
                            const isTurn = p.userId === currentPlayerId;
                            const pScore = p.liveScore ?? scores.find(s => s.userId === p.userId)?.totalScore ?? 0;
                            return (
                                <div key={p.userId}
                                    className={`rounded-xl p-3 border transition-all ${isTurn ? 'bg-gray-50 dark:bg-gray-800 border-green-500 dark:border-green-600 shadow-lg shadow-green-900/10' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {isTurn && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                                            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{p.username}</span>
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pScore >= 80 ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' : pScore >= 50 ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                                            {pScore} pts
                                        </span>
                                    </div>
                                    <PlayerGrid
                                        player={p}
                                        isMe={false}
                                        isCurrent={isTurn}
                                        compact={true}
                                    />
                                </div>
                            );
                        })}
                        {surrenderedPlayers.map((p) => (
                            <div key={p.userId} className="rounded-xl p-3 border border-gray-200 dark:border-gray-700 opacity-50">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs">🚫</span>
                                        <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 line-through">{p.username}</span>
                                    </div>
                                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">Abandon</span>
                                </div>
                                <div className="grid grid-cols-4 gap-1">
                                    {p.cards.map((card, idx) => (
                                        <Card key={idx} card={{ ...card, revealed: true }} size="sm" />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Zone centrale ── */}
                <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6">

                    {/* ── Badge tour ── */}
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                        phase === 'flip2'
                            ? 'bg-amber-100 dark:bg-amber-900/50 border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-300'
                            : inactivityEndsAt !== null
                                ? 'bg-orange-400 border-orange-500 text-white'
                                : phase === 'last_round'
                                    ? 'bg-red-100 dark:bg-red-900/50 border-red-400 dark:border-red-600 text-red-700 dark:text-red-300'
                                    : 'bg-green-100 dark:bg-emerald-900/50 border-green-400 dark:border-emerald-600 text-green-700 dark:text-emerald-300'
                    }`}>
                        {phase === 'flip2'
                            ? `↩ Retourne 2 cartes (${flip2Count}/2)`
                            : phase === 'last_round'
                                ? '⚡ Dernier tour !'
                                : isCurrent
                                    ? isMeInactive
                                        ? '⚠️ Joue vite ! exclusion imminente'
                                        : '⭐ Ton tour'
                                    : inactivityUserId === currentPlayerId && inactivityEndsAt !== null
                                        ? `⏰ ${players[currentPlayerIndex]?.username ?? '…'} — inactivité`
                                        : `Tour: ${players[currentPlayerIndex]?.username ?? '…'}`}
                    </div>

                    {/* ── Timer inactivité ── */}
                    {inactivityEndsAt !== null && (
                        <div className="w-full max-w-xs mx-auto">
                            <TurnTimer endsAt={inactivityEndsAt} duration={30} />
                        </div>
                    )}

                    {/* ── Zone de jeu centrale ── */}
                    {isPlayingPhase(phase) && (
                        <div className="flex items-center gap-8">
                            {/* Pioche */}
                            <div className="flex flex-col items-center gap-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pioche</p>
                                <button
                                    onClick={drawDeck}
                                    disabled={!isCurrent || drawnCard !== null}
                                    className={[
                                        'w-14 h-20 rounded-lg border-2 flex items-center justify-center font-bold text-xl transition-all',
                                        isCurrent && drawnCard === null
                                            ? 'bg-gray-100 dark:bg-gray-800 border-sky-500 hover:border-sky-300 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer shadow-lg shadow-sky-900/20 hover:scale-105 active:scale-95'
                                            : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-50',
                                    ].join(' ')}
                                >
                                    🂠
                                </button>
                            </div>

                            {/* Carte piochée (si du deck) */}
                            {drawnCard && drawnCard.from === 'deck' && (
                                <div className="flex flex-col items-center gap-2">
                                    <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold animate-pulse">En main</p>
                                    <div className={[
                                        'w-14 h-20 rounded-lg border-2 flex items-center justify-center font-bold text-xl',
                                        cardColor(drawnCard.value, true, false),
                                        'ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
                                    ].join(' ')}>
                                        {drawnCard.value}
                                    </div>
                                    <div className="flex gap-2 text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">← Échange ou retourne →</span>
                                    </div>
                                </div>
                            )}

                            {!drawnCard && (
                                <div className="text-gray-400 dark:text-gray-600 text-2xl">⇄</div>
                            )}

                            {/* Défausse */}
                            <div className="flex flex-col items-center gap-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Défausse</p>
                                <button
                                    onClick={takeDiscard}
                                    disabled={!isCurrent || drawnCard !== null || discardTop === null}
                                    className={[
                                        'w-14 h-20 rounded-lg border-2 flex items-center justify-center font-bold text-xl transition-all',
                                        discardTop !== null ? cardColor(discardTop, true, false) : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
                                        isCurrent && drawnCard === null && discardTop !== null
                                            ? 'hover:scale-105 active:scale-95 cursor-pointer ring-1 ring-white/20 hover:ring-white/60'
                                            : 'cursor-not-allowed opacity-60',
                                    ].join(' ')}
                                >
                                    {discardTop !== null ? discardTop : '—'}
                                </button>
                            </div>

                            {/* Carte piochée (si de la défausse) */}
                            {drawnCard && drawnCard.from === 'discard' && (
                                <div className="flex flex-col items-center gap-2">
                                    <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold animate-pulse">À échanger</p>
                                    <div className={[
                                        'w-14 h-20 rounded-lg border-2 flex items-center justify-center font-bold text-xl',
                                        cardColor(drawnCard.value, true, false),
                                        'ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
                                    ].join(' ')}>
                                        {drawnCard.value}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Instructions contextuelles ── */}
                    <div className="text-center max-w-sm">
                        {phase === 'flip2' && (
                            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700/50 rounded-xl px-5 py-3">
                                <p className="text-amber-700 dark:text-amber-300 font-semibold">Retourne 2 cartes de ton plateau</p>
                                <p className="text-amber-600 dark:text-amber-500 text-sm mt-1">{flip2Count}/2 cartes retournées</p>
                            </div>
                        )}
                        {isPlayingPhase(phase) && isCurrent && drawnCard === null && (
                            <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700/50 rounded-xl px-5 py-3">
                                <p className="text-emerald-700 dark:text-emerald-300 font-semibold">C'est ton tour !</p>
                                <p className="text-emerald-600 dark:text-emerald-500 text-sm mt-1">Pioche dans la pioche ou prends la carte de la défausse</p>
                            </div>
                        )}
                        {isPlayingPhase(phase) && isCurrent && drawnCard !== null && drawnCard.from === 'deck' && (
                            <div className="bg-sky-50 dark:bg-sky-900/30 border border-sky-300 dark:border-sky-700/50 rounded-xl px-5 py-3">
                                <p className="text-sky-700 dark:text-sky-300 font-semibold mb-3">Carte piochée : <span className="text-gray-900 dark:text-white font-bold">{drawnCard.value}</span></p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setDrawnAction('swap')}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${drawnAction === 'swap' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-emerald-500'}`}
                                    >
                                        ↔ Échanger
                                    </button>
                                    <button
                                        onClick={() => setDrawnAction('discard_flip')}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${drawnAction === 'discard_flip' ? 'bg-amber-600 border-amber-400 text-white' : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-amber-500'}`}
                                    >
                                        🗑 Jeter & retourner
                                    </button>
                                </div>
                                {drawnAction === 'swap' && <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-2">Clique sur n'importe quelle carte pour l'échanger</p>}
                                {drawnAction === 'discard_flip' && <p className="text-amber-600 dark:text-amber-400 text-xs mt-2">Clique sur une carte cachée pour la retourner</p>}
                                {drawnAction === null && <p className="text-gray-500 dark:text-gray-400 text-xs mt-2">Choisis une action ci-dessus</p>}
                            </div>
                        )}
                        {isPlayingPhase(phase) && isCurrent && drawnCard !== null && drawnCard.from === 'discard' && (
                            <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700/50 rounded-xl px-5 py-3">
                                <p className="text-purple-700 dark:text-purple-300 font-semibold">Carte de la défausse : <span className="text-gray-900 dark:text-white">{drawnCard.value}</span></p>
                                <p className="text-purple-600 dark:text-purple-500 text-sm mt-1">Tu dois l'échanger avec une de tes cartes</p>
                            </div>
                        )}
                        {isPlayingPhase(phase) && !isCurrent && (
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Tour de <span className="text-gray-700 dark:text-gray-300 font-semibold">{players[currentPlayerIndex]?.username}</span>…</p>
                        )}
                        {phase === 'last_round' && isCurrent && (
                            <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700/50 rounded-xl px-5 py-3 mt-2">
                                <p className="text-red-700 dark:text-red-300 font-bold">⚡ Dernier tour !</p>
                                <p className="text-red-600 dark:text-red-400 text-sm mt-1">C'est encore ton tour — joue normalement</p>
                            </div>
                        )}
                    </div>

                    {/* ── Mon plateau ── */}
                    <div className={`rounded-2xl p-5 border-2 transition-all ${isCurrent ? 'border-green-500 dark:border-green-600 bg-white dark:bg-gray-900 shadow-xl shadow-green-900/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'}`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                {isCurrent && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                                <span className="font-bold text-gray-800 dark:text-gray-200">{username} <span className="text-gray-500 dark:text-gray-400 font-normal text-sm">(moi)</span></span>
                            </div>
                            <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${myScore >= 80 ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' : myScore >= 50 ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400' : 'bg-gray-100 dark:bg-gray-800 text-emerald-600 dark:text-emerald-500'}`}>
                                {myScore} pts
                            </span>
                        </div>

                        <PlayerGrid
                            player={myPlayer ?? { userId, username, cards: myCards, score: myScore }}
                            myCards={myCards}
                            isMe={true}
                            isCurrent={isCurrent}
                            selectableIndices={selectableIndices}
                            onCardClick={handleCardClick}
                        />

                        {/* Légende des couleurs */}
                        <div className="flex gap-2 mt-3 flex-wrap justify-center">
                            {[[-2, 'bg-blue-900'], [-1, 'bg-blue-600'], [0, 'bg-cyan-400'], ['1-3', 'bg-emerald-400'], ['4-6', 'bg-yellow-300'], ['7-9', 'bg-orange-400'], ['10-12', 'bg-red-500']].map(([v, cls]) => (
                                <div key={String(v)} className="flex items-center gap-1">
                                    <div className={`w-3 h-3 rounded ${cls}`} />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {phase === 'game_end' && gameEndData && !modalDismissed && (() => {
                const sortedScores = [...gameEndData.scores].sort((a, b) => {
                    if (a.abandon && !b.abandon) return 1;
                    if (!a.abandon && b.abandon) return -1;
                    return a.totalScore - b.totalScore;
                });
                return (
                    <GameOverModal
                        title="Fin de partie !"
                        subtitle={`${gameEndData.winnerUsername} remporte la victoire !`}
                        onLobby={() => router.push(`/lobby/create/${lobbyId}`)}
                        onLeave={() => router.push('/')}
                        onClose={() => setModalDismissed(true)}
                        asModal
                    >
                        <GameScoreLeaderboard
                            myUserId={userId}
                            entries={sortedScores.map((s) => ({
                                userId: s.userId,
                                username: s.username,
                                score: `${s.totalScore} pts`,
                                badges: s.abandon ? ['Abandon'] : undefined,
                                disqualified: s.abandon,
                            }))}
                        />
                    </GameOverModal>
                );
            })()}
        </div>
    );
}
