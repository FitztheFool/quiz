// src/page.tsx
'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getUnoSocket } from '@/lib/socket';
import TimerBar from '@/components/TimerBar';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';
import GameIcon from '@/components/GameIcon';
import SurrenderButton from '@/components/SurrenderButton';
import RankBadge from '@/components/shared/RankBadge';
import UnoCard from '@/components/Uno/Card';
import ColorDot from '@/components/Uno/ColorDot';
import { COLOR_MAP } from '@/components/Uno/constants';
import { TrophyIcon, EyeIcon, ExclamationTriangleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { GameLogSidebar, type GameLogEntry } from '@/components/GameLog';

type CardColor = 'red' | 'green' | 'blue' | 'yellow' | 'wild';
type Card = { id: string; color: CardColor; value: string };

type PlayerInfo = {
    userId: string;
    username: string;
    cardCount: number;
    saidUno: boolean;
};

type UnoOptions = { stackable: boolean; jumpIn: boolean };

type FinalScore = {
    userId: string;
    username: string;
    cardsLeft: number;
    pointsInHand: number;
    score: number;
    rank: number;
    kicked: boolean;
    abandon?: boolean;
    afk?: boolean;
};

type GameState = {
    hand: Card[];
    currentColor: CardColor;
    topCard: Card | null;
    currentPlayerIndex: number;
    players: PlayerInfo[];
    direction: number;
    drawStack: number;
    status: 'WAITING' | 'PLAYING' | 'FINISHED';
    winner: { userId: string; username: string } | null;
    finalScores: FinalScore[] | null;
    options: UnoOptions;
    isMyTurn: boolean;
    spectator: boolean;
    turnEndsAt: number | null;
    turnDuration: number;
    log?: GameLogEntry[];
};

type LobbyState = {
    hostId: string;
    status: string;
    players: { userId: string; username: string }[];
    options: UnoOptions;
};


export default function UnoPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams<{ lobbyId: string; gameId: string }>();
    const lobbyId = params?.lobbyId ?? '';

    const joinedRef = useRef(false);
    const socket = useMemo(() => getUnoSocket(), []);

    const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const colorPickerRef = useFocusTrap<HTMLDivElement>(showColorPicker);

    const [inactivitySeconds, setInactivitySeconds] = useState<number | null>(null);
    const [inactivityUserId, setInactivityUserId] = useState<string | null>(null);
    const inactivityIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [kickedPlayers, setKickedPlayers] = useState<{ userId: string; username: string }[]>([]);

    const me = useMemo(() => ({
        userId: session?.user?.id ?? '',
        username: session?.user?.username ?? session?.user?.email ?? 'Joueur',
    }), [session]);

    useEffect(() => {
        if (!socket) return;
        if (status !== 'authenticated' || !me.userId || !lobbyId) return;

        const onLobbyState = (s: LobbyState) => setLobbyState(s);
        const onGameState = (s: GameState) => {
            setGameState(s);
            setInactivitySeconds(null);
            setInactivityUserId(null);
            if (inactivityIntervalRef.current) {
                clearInterval(inactivityIntervalRef.current);
                inactivityIntervalRef.current = null;
            }
        };

        const onInactivityWarning = ({ userId, secondsLeft }: { userId: string; secondsLeft: number }) => {
            if (inactivityIntervalRef.current) clearInterval(inactivityIntervalRef.current);
            setInactivityUserId(userId);
            setInactivitySeconds(secondsLeft);
            let remaining = secondsLeft;
            inactivityIntervalRef.current = setInterval(() => {
                remaining -= 1;
                setInactivitySeconds(remaining <= 0 ? 0 : remaining);
                if (remaining <= 0) {
                    clearInterval(inactivityIntervalRef.current!);
                    inactivityIntervalRef.current = null;
                }
            }, 1000);
        };

        const onPlayerKicked = ({ userId, username }: { userId: string; username: string }) => {
            setKickedPlayers(prev => prev.some(p => p.userId === userId) ? prev : [...prev, { userId, username }]);
            setInactivitySeconds(null);
            setInactivityUserId(null);
            if (inactivityIntervalRef.current) {
                clearInterval(inactivityIntervalRef.current);
                inactivityIntervalRef.current = null;
            }
        };

        socket.on('uno:lobbyState', onLobbyState);
        socket.on('uno:state', onGameState);
        socket.on('uno:inactivityWarning', onInactivityWarning);
        socket.on('uno:playerKicked', onPlayerKicked);

        if (!joinedRef.current) {
            joinedRef.current = true;
            if (socket.connected) {
                socket.emit('uno:join', { lobbyId, userId: me.userId, username: me.username });
            } else {
                socket.once('connect', () => {
                    socket.emit('uno:join', { lobbyId, userId: me.userId, username: me.username });
                });
            }
        }

        return () => {
            socket.off('uno:lobbyState', onLobbyState);
            socket.off('uno:state', onGameState);
            socket.off('uno:inactivityWarning', onInactivityWarning);
            socket.off('uno:playerKicked', onPlayerKicked);
            if (inactivityIntervalRef.current) clearInterval(inactivityIntervalRef.current);
        };
    }, [socket, status, me.userId, lobbyId]);

    const isPlayable = useCallback((card: Card): boolean => {
        if (!gameState || !gameState.isMyTurn || gameState.spectator) return false;
        const top = gameState.topCard;
        if (!top) return true;
        if (card.value === 'wild' || card.value === 'wild4') return true;
        if (gameState.drawStack > 0 && gameState.options.stackable) return card.value === 'draw2' || card.value === 'wild4';
        if (gameState.drawStack > 0 && !gameState.options.stackable) return false;
        return card.color === gameState.currentColor || card.value === top.value;
    }, [gameState]);

    const handleCardClick = (card: Card) => {
        if (!gameState || gameState.spectator) return;
        const top = gameState.topCard;
        const isJumpIn = gameState.options.jumpIn && !gameState.isMyTurn &&
            top && card.color === top.color && card.value === top.value && card.color !== 'wild';
        if (!isPlayable(card) && !isJumpIn) return;
        setSelectedCard(card);
        if (card.value === 'wild' || card.value === 'wild4') {
            setShowColorPicker(true);
        } else {
            socket?.emit('uno:playCard', { cardId: card.id, sayUno: gameState.hand.length - 1 === 1 });
            setSelectedCard(null);
        }
    };

    const handleColorChoice = (color: string) => {
        if (!selectedCard) return;
        socket?.emit('uno:playCard', { cardId: selectedCard.id, chosenColor: color, sayUno: (gameState?.hand.length ?? 1) - 1 === 1 });
        setSelectedCard(null);
        setShowColorPicker(false);
    };

    if (status === 'loading') return <LoadingSpinner message="Vérification de la session..." />;

    // ── Fin de partie ──────────────────────────────────────────────────────────
    if (gameState?.status === 'FINISHED') {
        const scores = gameState.finalScores ?? [];
        return (
            <div className="flex-1 casino-felt flex items-center justify-center p-4">
                <div className="casino-tile rounded-2xl p-8 w-full max-w-md text-gray-900 dark:text-white text-center shadow-lg">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 mb-2 mx-auto">
                        <TrophyIcon className="w-8 h-8 text-amber-500 dark:text-amber-400" />
                    </div>
                    <h1 className="text-2xl font-bold mb-1">{gameState.winner?.username} a gagné !</h1>
                    <p className="text-emerald-200 dark:text-emerald-300 text-sm mb-6">
                        {gameState.spectator ? 'Vous avez observé cette partie' : 'Classement final'}
                    </p>

                    <div className="space-y-2 text-left">
                        {scores.map(s => (
                            <div key={s.userId} className={`flex items-center justify-between rounded-lg px-4 py-3
                            ${s.rank === 1 ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-white/15 border border-white/20'}
                            ${s.kicked ? 'opacity-60' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <RankBadge rank={s.rank} size="sm" />
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold">{s.username}</span>
                                            {s.userId === me.userId && !gameState.spectator && (
                                                <span className="text-emerald-200 dark:text-emerald-300 text-xs">(moi)</span>
                                            )}
                                            {s.abandon && (
                                                <span className="text-xs bg-orange-500/25 text-orange-300 border border-orange-500/40 px-1.5 py-0.5 rounded">Abandon</span>
                                            )}
                                            {!s.abandon && s.kicked && (
                                                <span className="text-xs bg-red-500/30 text-red-400 px-1.5 py-0.5 rounded">AFK</span>
                                            )}
                                        </div>
                                        <span className="text-xs text-emerald-200 dark:text-emerald-300">
                                            {s.cardsLeft === 0
                                                ? '0 carte restante'
                                                : `${s.cardsLeft} carte${s.cardsLeft > 1 ? 's' : ''} — ${s.pointsInHand} pts en main`}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`font-bold text-lg ${s.score > 0 ? 'text-yellow-500 dark:text-yellow-400' : 'text-slate-300 dark:text-slate-400'}`}>
                                        {s.score > 0 ? `+${s.score}` : '0'}
                                    </span>
                                    <div className="text-xs text-slate-300 dark:text-slate-400">pts</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 text-xs text-slate-300 dark:text-slate-400 text-left space-y-0.5">
                        <p>0–9 = valeur faciale · Skip/Reverse/+2 = 20 pts · Wild/+4 = 50 pts</p>
                    </div>

                    <div className="flex gap-3 pt-2 mt-5">
                        <button
                            onClick={() => router.push(`/lobby/create/${lobbyId}`)}
                            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all"
                        >
                            Retour au lobby
                        </button>
                        <button
                            onClick={() => router.push('/')}
                            className="flex-1 py-3 rounded-xl border-2 border-white/50 text-white text-sm font-semibold hover:border-white/70 hover:bg-white/10 transition-all"
                        >
                            Quitter
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Attente ────────────────────────────────────────────────────────────────
    if (!gameState || gameState.status === 'WAITING') {
        return (
            <GameWaitingScreen gameType="uno" gameName="Uno" lobbyId={lobbyId}
                players={lobbyState?.players ?? []}
                myUserId={me.userId}
                hostId={lobbyState?.hostId ?? undefined} />
        );
    }

    // ── Jeu en cours ───────────────────────────────────────────────────────────
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const isMeInactive = inactivityUserId === me.userId;

    return (
        <div className="flex-1 casino-felt text-gray-900 dark:text-white flex flex-col select-none">

            {showColorPicker && !gameState.spectator && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
                    <div
                        ref={colorPickerRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Choisir une couleur"
                        className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center shadow-xl"
                    >
                        <h2 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Choisir une couleur</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {['red', 'green', 'blue', 'yellow'].map(c => (
                                <button key={c} onClick={() => handleColorChoice(c)}
                                    aria-label={`Choisir la couleur ${c}`}
                                    className={`w-20 h-20 rounded-xl ${COLOR_MAP[c]} hover:scale-110 transition-transform flex items-center justify-center`}>
                                    <ColorDot color={c} className="w-10 h-10 border-2 border-white/40" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 font-bold text-lg"><GameIcon gameType="uno" className="w-5 h-5" /> UNO</span>
                    {gameState.spectator && (
                        <span className="text-xs bg-purple-500/20 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                            <EyeIcon className="w-3.5 h-3.5 inline-block align-middle" /> Spectateur
                        </span>
                    )}
                    {gameState.drawStack > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                            Stack +{gameState.drawStack}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3 text-sm text-emerald-200 dark:text-emerald-300">
                    <span>{gameState.direction === 1 ? '↻' : '↺'}</span>
                    <span>Couleur :</span>
                    <span className={`w-5 h-5 rounded-full ${COLOR_MAP[gameState.currentColor]}`} />
                    {!gameState.spectator && <SurrenderButton onSurrender={() => socket?.emit('uno:surrender')} />}
                </div>
            </div>

            <TimerBar
                endsAt={gameState.turnEndsAt}
                duration={gameState.turnDuration}
                label={gameState.isMyTurn ? 'Ton tour' : `Tour de ${currentPlayer?.username}`}
            />

            {/* Joueurs */}
            <div className="flex justify-center gap-4 px-4 py-3 flex-wrap">
                {(gameState.spectator
                    ? gameState.players
                    : gameState.players.filter(p => p.userId !== me.userId)
                ).map(p => {
                    const isActive = gameState.players[gameState.currentPlayerIndex]?.userId === p.userId;
                    const isInactive = inactivityUserId === p.userId && inactivitySeconds !== null;
                    return (
                        <div key={p.userId} className={`casino-tile flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all
                            ${isActive ? 'ring-2 ring-yellow-400' : ''}
                            ${isInactive ? 'ring-2 ring-orange-400' : ''}`}>
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold">{p.username}</span>
                                {isInactive && (
                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded
                                        ${inactivitySeconds! <= 10 ? 'bg-red-500 text-white animate-pulse' : 'bg-orange-500 text-white'}`}>
                                        ⏰ {inactivitySeconds}s
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-0.5">
                                {Array.from({ length: Math.min(p.cardCount, 10) }).map((_, i) => (
                                    <div key={i} className="w-3 h-5 bg-red-600 rounded-sm border border-white/20" />
                                ))}
                                {p.cardCount > 10 && <span className="text-xs text-gray-400">+{p.cardCount - 10}</span>}
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-emerald-200 dark:text-emerald-300">{p.cardCount} carte{p.cardCount > 1 ? 's' : ''}</span>
                                {p.cardCount === 1 && !p.saidUno && !gameState.spectator && (
                                    <button onClick={() => socket?.emit('uno:callUno', { targetId: p.userId })}
                                        aria-label={`Appeler UNO sur ${p.username}`}
                                        className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded font-bold hover:bg-red-400 transition">
                                        UNO !
                                    </button>
                                )}
                                {p.saidUno && <span className="text-xs text-yellow-500 dark:text-yellow-400 font-bold">UNO!</span>}
                            </div>
                        </div>
                    );
                })}
                {kickedPlayers.filter(k => k.userId !== me.userId).map(p => (
                    <div key={p.userId} className="casino-tile flex flex-col items-center gap-1 px-3 py-2 rounded-xl opacity-50">
                        <span className="text-sm font-semibold line-through text-gray-400">{p.username}</span>
                    </div>
                ))}
            </div>

            {/* Zone centrale */}
            <div className="flex-1 flex flex-col lg:flex-row items-stretch gap-4 px-3">
              <div className="flex-1 flex items-center justify-center gap-8 min-w-0">
                <div className="flex flex-col items-center gap-2">
                    <div
                        onClick={!gameState.spectator && gameState.isMyTurn ? () => socket?.emit('uno:drawCard') : undefined}
                        className={`relative w-16 h-24 bg-gradient-to-br from-red-600 to-red-900 rounded-xl border-[3px] border-white shadow-2xl flex items-center justify-center text-white font-black text-3xl overflow-hidden
                            ${!gameState.spectator && gameState.isMyTurn ? 'cursor-pointer hover:scale-110 hover:-translate-y-1 transition-all ring-2 ring-white/40' : 'opacity-70 cursor-default'}`}>
                        <span className="absolute inset-2 rounded-full bg-white/10 -rotate-[20deg]" />
                        <span className="relative z-10 italic tracking-tight">UNO</span>
                    </div>
                    <span className="text-xs text-amber-100/90 font-semibold">
                        {gameState.drawStack > 0 ? `Piocher +${gameState.drawStack}` : 'Piocher'}
                    </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    {gameState.topCard && <UnoCard card={gameState.topCard} />}
                    <div className={`w-4 h-4 rounded-full ${COLOR_MAP[gameState.currentColor]} border-2 border-white`} />
                </div>
              </div>

              <GameLogSidebar entries={gameState.log ?? []} />
            </div>

            {/* Indicateur de tour */}
            <div className="text-center py-2">
                {!gameState.spectator && gameState.isMyTurn ? (
                    <span className={`font-bold ${isMeInactive ? 'text-orange-400 animate-pulse' : 'text-yellow-500 dark:text-yellow-400 animate-pulse'}`}>
                        {isMeInactive
                            ? (<><ExclamationTriangleIcon className="w-4 h-4 inline-block align-middle text-amber-500" /> Joue vite ! exclusion dans {inactivitySeconds}s</>)
                            : (<><SparklesIcon className="w-4 h-4 inline-block align-middle text-amber-400" /> À toi de jouer !</>)}
                    </span>
                ) : (
                    <span className="text-emerald-200 dark:text-emerald-300 text-sm">
                        Tour de <span className="text-gray-900 dark:text-white font-semibold">{currentPlayer?.username}</span>
                        {inactivityUserId === currentPlayer?.userId && inactivitySeconds !== null && (
                            <span className={`ml-2 text-xs font-bold px-1.5 py-0.5 rounded
                                ${inactivitySeconds <= 10 ? 'bg-red-500 text-white animate-pulse' : 'bg-orange-500 text-white'}`}>
                                ⏰ {inactivitySeconds}s
                            </span>
                        )}
                    </span>
                )}
            </div>

            {/* Main — masquée pour les spectateurs */}
            {!gameState.spectator && (
                <div className="casino-tile border-t border-amber-900/30 px-4 py-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-emerald-100 font-bold">Ma main ({gameState.hand.length} cartes)</span>
                        {gameState.hand.length === 1 && (
                            <button onClick={() => socket?.emit('uno:sayUno')}
                                className="text-xs bg-yellow-400 text-gray-900 px-3 py-1 rounded-full font-bold hover:bg-yellow-300 transition animate-bounce">
                                UNO !
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2 pt-4 pb-2 justify-center flex-wrap">
                        {gameState.hand.map(card => (
                            <UnoCard key={card.id} card={card}
                                playable={isPlayable(card)}
                                selected={selectedCard?.id === card.id}
                                onClick={() => handleCardClick(card)} />
                        ))}
                        {gameState.hand.length === 0 && <p className="text-gray-400 text-sm py-4">Aucune carte</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
