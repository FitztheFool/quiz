'use client';
import LoadingSpinner from '@/components/LoadingSpinner';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getUnoSocket } from '@/lib/socket';

type CardColor = 'red' | 'green' | 'blue' | 'yellow' | 'wild';
type Card = { id: string; color: CardColor; value: string };

type PlayerInfo = {
    userId: string;
    username: string;
    cardCount: number;
    saidUno: boolean;
    team: 0 | 1 | null;
};

type UnoOptions = {
    stackable: boolean;
    jumpIn: boolean;
    teamMode: 'none' | '2v2';
    teamWinMode: 'one' | 'both';
};

type FinalScore = {
    userId: string;
    username: string;
    cardsLeft: number;
    pointsInHand: number;
    score: number;
    rank: number;
    kicked: boolean;
    team: 0 | 1 | null;
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
    gameId?: string;
    teams: Record<string, 0 | 1> | null;
    teammateHand: Card[] | null;
    teammateId: string | null;
    myTeam: 0 | 1 | null;
};

type LobbyState = {
    hostId: string;
    status: string;
    players: { userId: string; username: string }[];
    options: UnoOptions;
    teams: Record<string, 0 | 1> | null;
};

const COLOR_MAP: Record<string, string> = {
    red: 'bg-red-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-400',
    wild: 'bg-gray-800',
};

const COLOR_TEXT: Record<string, string> = {
    red: '🔴', green: '🟢', blue: '🔵', yellow: '🟡',
};

const VALUE_LABEL: Record<string, string> = {
    skip: '🚫', reverse: '🔄', draw2: '+2', wild: '🌈', wild4: '+4',
};

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

// Couleurs des équipes
const TEAM_COLORS: Record<number, { ring: string; bg: string; text: string; badge: string }> = {
    0: { ring: 'ring-blue-400', bg: 'bg-blue-500/20', text: 'text-blue-300', badge: 'bg-blue-500 text-white' },
    1: { ring: 'ring-red-400', bg: 'bg-red-500/20', text: 'text-red-300', badge: 'bg-red-500 text-white' },
};
const TEAM_NAMES: Record<number, string> = { 0: 'Équipe Bleue', 1: 'Équipe Rouge' };

function UnoCard({ card, playable, selected, onClick, small }: {
    card: Card; playable?: boolean; selected?: boolean; onClick?: () => void; small?: boolean;
}) {
    const label = VALUE_LABEL[card.value] ?? card.value;
    const bg = COLOR_MAP[card.color] ?? 'bg-gray-400';
    if (small) {
        return (
            <div className={`w-9 h-14 ${bg} rounded-lg border-2 border-white/50 shadow
                flex items-center justify-center font-bold text-white text-sm select-none opacity-80`}>
                {label}
            </div>
        );
    }
    return (
        <div onClick={onClick} className={`
            w-16 h-24 ${bg} rounded-xl border-4 border-white shadow-md
            flex items-center justify-center font-bold text-white text-2xl
            select-none transition-all duration-150
            ${playable ? 'cursor-pointer hover:-translate-y-3 hover:shadow-xl ring-2 ring-white' : 'opacity-60 cursor-default'}
            ${selected ? '-translate-y-4 ring-4 ring-yellow-300 shadow-2xl' : ''}
        `}>
            {label}
        </div>
    );
}

export default function UnoPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams<{ code: string }>();
    const lobbyId = params?.code ?? '';

    const joinedRef = useRef(false);
    const resultSavedRef = useRef(false);
    const socket = useMemo(() => getUnoSocket(), []);

    const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);

    const [inactivitySeconds, setInactivitySeconds] = useState<number | null>(null);
    const [inactivityUserId, setInactivityUserId] = useState<string | null>(null);
    const inactivityIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const [unoReady, setUnoReady] = useState(false);

    const me = useMemo(() => ({
        userId: session?.user?.id ?? '',
        username: session?.user?.username ?? session?.user?.email ?? 'Joueur',
    }), [session]);

    const saveResult = useCallback(async (finalScores: FinalScore[], gameId?: string) => {
        if (resultSavedRef.current || !me.userId) return;
        resultSavedRef.current = true;
        try {
            await fetch('/api/uno/result', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ finalScores, gameId }),
            });
        } catch (err) {
            console.error('[UNO] saveResult failed:', err);
            resultSavedRef.current = false;
        }
    }, [me.userId]);

    useEffect(() => {
        if (!socket) return;
        if (status !== 'authenticated' || !me.userId || !lobbyId) return;

        const onLobbyState = (s: LobbyState) => setLobbyState(s);
        const onGameState = (s: GameState) => {
            setGameState(s);
            setUnoReady(prev => {
                // Reset seulement si on n'est plus en situation UNO (main > 1 carte)
                if (s.hand.length !== 1) return false;
                return prev;
            });
            setInactivitySeconds(null);
            setInactivityUserId(null);
            if (inactivityIntervalRef.current) {
                clearInterval(inactivityIntervalRef.current);
                inactivityIntervalRef.current = null;
            }
            if (s.status === 'FINISHED' && s.finalScores && !s.spectator) {
                saveResult(s.finalScores, s.gameId);
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

        const onPlayerKicked = () => {
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
            socket.emit('uno:join', { lobbyId, userId: me.userId, username: me.username });
        }

        return () => {
            socket.off('uno:lobbyState', onLobbyState);
            socket.off('uno:state', onGameState);
            socket.off('uno:inactivityWarning', onInactivityWarning);
            socket.off('uno:playerKicked', onPlayerKicked);
            if (inactivityIntervalRef.current) clearInterval(inactivityIntervalRef.current);
        };
    }, [socket, status, me.userId, lobbyId, saveResult]);

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
            socket?.emit('uno:playCard', { cardId: card.id, sayUno: gameState.hand.length - 1 === 1 ? unoReady : false });
            setSelectedCard(null);
            setUnoReady(false);
        }
    };

    const handleColorChoice = (color: string) => {
        if (!selectedCard) return;
        socket?.emit('uno:playCard', { cardId: selectedCard.id, chosenColor: color, sayUno: (gameState?.hand.length ?? 1) - 1 === 1 ? unoReady : false });
        setSelectedCard(null);
        setShowColorPicker(false);
        setUnoReady(false);
    };

    if (status === 'loading') {
        return <LoadingSpinner />;
    }

    const is2v2 = gameState?.options?.teamMode === '2v2';

    // ── Fin de partie ──────────────────────────────────────────────────────────
    if (gameState?.status === 'FINISHED') {
        const scores = gameState.finalScores ?? [];
        const winnerTeam = gameState.teams && gameState.winner
            ? gameState.teams[gameState.winner.userId]
            : null;

        // Grouper par équipe en 2v2
        const renderScores = () => {
            if (!is2v2 || winnerTeam === null || winnerTeam === undefined) {
                return scores.map(s => renderScoreRow(s));
            }

            const team0 = scores.filter(s => s.team === 0);
            const team1 = scores.filter(s => s.team === 1);

            return (
                <>
                    {[0, 1].map(teamIdx => {
                        const teamScores = teamIdx === 0 ? team0 : team1;
                        const isWinner = winnerTeam === teamIdx;
                        const tc = TEAM_COLORS[teamIdx];
                        return (
                            <div key={teamIdx} className={`rounded-xl border p-3 mb-3 ${isWinner ? `${tc.bg} border-${teamIdx === 0 ? 'blue' : 'red'}-500/50` : 'bg-gray-700/50 border-gray-600'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tc.badge}`}>
                                        {TEAM_NAMES[teamIdx]}
                                    </span>
                                    {isWinner && <span className="text-yellow-400 text-sm font-bold">🏆 Vainqueurs</span>}
                                </div>
                                <div className="space-y-2">
                                    {teamScores.map(s => renderScoreRow(s, true))}
                                </div>
                            </div>
                        );
                    })}
                </>
            );
        };

        const renderScoreRow = (s: FinalScore, inTeam = false) => (
            <div key={s.userId} className={`flex items-center justify-between rounded-lg px-4 py-3
                ${!inTeam && s.rank === 1 ? 'bg-yellow-500/20 border border-yellow-500/50' : inTeam ? '' : 'bg-gray-700'}
                ${s.kicked ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-3">
                    <span className="text-xl w-7 text-center">
                        {RANK_MEDAL[s.rank] ?? `#${s.rank}`}
                    </span>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{s.username}</span>
                            {s.userId === me.userId && !gameState.spectator && (
                                <span className="text-gray-400 text-xs">(moi)</span>
                            )}
                            {s.kicked && (
                                <span className="text-xs bg-red-500/30 text-red-400 px-1.5 py-0.5 rounded">AFK</span>
                            )}
                        </div>
                        <span className="text-xs text-gray-400">
                            {s.cardsLeft === 0
                                ? '0 carte restante'
                                : `${s.cardsLeft} carte${s.cardsLeft > 1 ? 's' : ''} — ${s.pointsInHand} pts en main`}
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <span className={`font-bold text-lg ${s.score > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                        {s.score > 0 ? `+${s.score}` : '0'}
                    </span>
                    <div className="text-xs text-gray-500 dark:text-gray-400">pts</div>
                </div>
            </div>
        );

        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md text-white text-center">
                    <div className="text-6xl mb-2">🏆</div>
                    {is2v2 && winnerTeam !== null && winnerTeam !== undefined ? (
                        <>
                            <h1 className="text-2xl font-bold mb-1">
                                <span className={TEAM_COLORS[winnerTeam].text}>{TEAM_NAMES[winnerTeam]}</span> a gagné !
                            </h1>
                            <p className="text-gray-400 text-sm mb-6">Mode 2v2 · Classement final</p>
                        </>
                    ) : (
                        <>
                            <h1 className="text-2xl font-bold mb-1">{gameState.winner?.username} a gagné !</h1>
                            <p className="text-gray-400 text-sm mb-6">
                                {gameState.spectator ? 'Vous avez observé cette partie' : 'Classement final'}
                            </p>
                        </>
                    )}

                    <div className="text-left">{renderScores()}</div>

                    <div className="mt-4 text-xs text-gray-500 text-left space-y-0.5">
                        <p>0–9 = valeur faciale · Skip/Reverse/+2 = 20 pts · Wild/+4 = 50 pts</p>
                    </div>

                    <button onClick={() => router.push(`/lobby/${lobbyId}`)}
                        className="mt-5 w-full py-3 rounded-xl bg-yellow-400 text-gray-900 font-bold hover:bg-yellow-300 transition">
                        🔄 Retour au lobby
                    </button>
                    <button onClick={() => router.push('/dashboard')}
                        className="mt-3 w-full py-3 rounded-xl bg-gray-700 text-gray-300 font-bold hover:bg-gray-600 transition">
                        🏠 Retour au dashboard
                    </button>
                </div>
            </div>
        );
    }

    // ── Attente ────────────────────────────────────────────────────────────────
    if (!gameState || gameState.status === 'WAITING') {
        const joined = lobbyState?.players.length ?? 0;
        const required = lobbyState?.options?.teamMode === '2v2' ? 4 : 2;
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md text-white text-center">
                    <div className="text-5xl mb-4 animate-pulse">🃏</div>
                    <h1 className="text-xl font-bold mb-1">Démarrage de la partie…</h1>
                    {lobbyState?.options?.teamMode === '2v2' && (
                        <p className="text-blue-400 text-xs font-semibold mb-2">Mode 2v2 · {joined}/{required} joueurs</p>
                    )}
                    <p className="text-gray-400 text-sm mb-6">
                        {joined} joueur{joined > 1 ? 's' : ''} connecté{joined > 1 ? 's' : ''}…
                    </p>
                    <div className="space-y-2 text-left mb-6">
                        {lobbyState?.players.map(p => (
                            <div key={p.userId} className="bg-gray-700 rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                                <span className="text-green-400">✓</span>
                                <span>{p.username}</span>
                                {p.userId === lobbyState.hostId && <span className="text-yellow-400 text-xs">👑</span>}
                                {p.userId === me.userId && <span className="text-gray-500 text-xs">(moi)</span>}
                            </div>
                        ))}
                    </div>
                    <button onClick={() => router.push(`/lobby/${lobbyId}`)}
                        className="w-full py-3 rounded-xl bg-yellow-400 text-gray-900 font-bold hover:bg-yellow-300 transition">
                        🔄 Retour au lobby
                    </button>
                    <button onClick={() => router.push('/dashboard')}
                        className="mt-3 w-full py-3 rounded-xl bg-gray-700 text-gray-300 font-bold hover:bg-gray-600 transition">
                        🏠 Retour au dashboard
                    </button>
                </div>
            </div>
        );
    }

    // ── Jeu en cours ───────────────────────────────────────────────────────────
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const isMeInactive = inactivityUserId === me.userId;
    const myTeam = gameState.myTeam;
    const myTeamColor = myTeam !== null && myTeam !== undefined ? TEAM_COLORS[myTeam] : null;

    // Séparer coéquipiers et adversaires pour l'affichage 2v2
    const otherPlayers = gameState.spectator
        ? gameState.players
        : gameState.players.filter(p => p.userId !== me.userId);

    const teammates = is2v2 ? otherPlayers.filter(p => gameState.teams && gameState.teams[p.userId] === myTeam) : [];
    const opponents = is2v2 ? otherPlayers.filter(p => gameState.teams && gameState.teams[p.userId] !== myTeam) : otherPlayers;

    const renderPlayer = (p: PlayerInfo) => {
        const isActive = gameState.players[gameState.currentPlayerIndex]?.userId === p.userId;
        const isInactive = inactivityUserId === p.userId && inactivitySeconds !== null;
        const pTeam = gameState.teams?.[p.userId];
        const tc = pTeam !== undefined && pTeam !== null ? TEAM_COLORS[pTeam] : null;

        return (
            <div key={p.userId} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all
                ${isActive ? 'bg-yellow-500/20 ring-2 ring-yellow-400' : tc ? `${tc.bg} ring-1 ${tc.ring}` : 'bg-gray-800'}
                ${isInactive ? 'ring-2 ring-orange-400' : ''}`}>
                <div className="flex items-center gap-1.5">
                    {tc && is2v2 && (
                        <span className={`w-2 h-2 rounded-full ${pTeam === 0 ? 'bg-blue-400' : 'bg-red-400'}`} />
                    )}
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
                    <span className="text-xs text-gray-400">{p.cardCount} carte{p.cardCount > 1 ? 's' : ''}</span>
                    {p.cardCount === 1 && !p.saidUno && !gameState.spectator && (
                        <button onClick={() => socket?.emit('uno:callUno', { targetId: p.userId })}
                            className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded font-bold hover:bg-red-400 transition">
                            UNO !
                        </button>
                    )}
                    {p.saidUno && <span className="text-xs text-yellow-400 font-bold">UNO!</span>}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col select-none">

            {showColorPicker && !gameState.spectator && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
                    <div className="bg-gray-800 rounded-2xl p-6 text-center">
                        <h2 className="font-bold text-lg mb-4">Choisir une couleur</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {['red', 'green', 'blue', 'yellow'].map(c => (
                                <button key={c} onClick={() => handleColorChoice(c)}
                                    className={`w-20 h-20 rounded-xl ${COLOR_MAP[c]} text-3xl hover:scale-110 transition-transform`}>
                                    {COLOR_TEXT[c]}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
                <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">🃏 UNO</span>
                    <span className="text-gray-400 font-mono text-sm">{lobbyId}</span>
                    {is2v2 && myTeamColor && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${myTeamColor.badge}`}>
                            {TEAM_NAMES[myTeam!]}
                        </span>
                    )}
                    {gameState.spectator && (
                        <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                            👁 Spectateur
                        </span>
                    )}
                    {gameState.drawStack > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                            Stack +{gameState.drawStack}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>{gameState.direction === 1 ? '↻' : '↺'}</span>
                    <span>Couleur :</span>
                    <span className={`w-5 h-5 rounded-full ${COLOR_MAP[gameState.currentColor]}`} />
                </div>
            </div>

            {/* Joueurs — affichage différent en 2v2 */}
            {is2v2 && !gameState.spectator ? (
                <div className="px-4 py-3 space-y-2">
                    {/* Adversaires */}
                    <div className="flex justify-center gap-3 flex-wrap">
                        <span className="text-xs text-red-400 font-semibold self-center">⚔️ Adversaires</span>
                        {opponents.map(renderPlayer)}
                    </div>
                    {/* Coéquipiers */}
                    {teammates.length > 0 && (
                        <div className="flex justify-center gap-3 flex-wrap">
                            <span className="text-xs text-blue-400 font-semibold self-center">🤝 Équipe</span>
                            {teammates.map(renderPlayer)}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex justify-center gap-4 px-4 py-3 flex-wrap">
                    {otherPlayers.map(renderPlayer)}
                </div>
            )}

            {/* Zone centrale */}
            <div className="flex-1 flex items-center justify-center gap-8">
                <div className="flex flex-col items-center gap-2">
                    <div
                        onClick={!gameState.spectator && gameState.isMyTurn ? () => socket?.emit('uno:drawCard') : undefined}
                        className={`w-16 h-24 bg-red-700 rounded-xl border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-2xl
                            ${!gameState.spectator && gameState.isMyTurn ? 'cursor-pointer hover:bg-red-600 hover:scale-105 transition-all' : 'opacity-60 cursor-default'}`}>
                        🃏
                    </div>
                    <span className="text-xs text-gray-400">
                        {gameState.drawStack > 0 ? `Piocher +${gameState.drawStack}` : 'Piocher'}
                    </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    {gameState.topCard && <UnoCard card={gameState.topCard} />}
                    <div className={`w-4 h-4 rounded-full ${COLOR_MAP[gameState.currentColor]} border-2 border-white`} />
                </div>
            </div>

            {/* Indicateur de tour */}
            <div className="text-center py-2">
                {!gameState.spectator && gameState.isMyTurn ? (
                    <span className={`font-bold ${isMeInactive ? 'text-orange-400 animate-pulse' : 'text-yellow-400 animate-pulse'}`}>
                        {isMeInactive
                            ? `⚠️ Joue vite ! exclusion dans ${inactivitySeconds}s`
                            : '✨ À toi de jouer !'}
                    </span>
                ) : (
                    <span className="text-gray-400 text-sm">
                        Tour de <span className="text-white font-semibold">{currentPlayer?.username}</span>
                        {inactivityUserId === currentPlayer?.userId && inactivitySeconds !== null && (
                            <span className={`ml-2 text-xs font-bold px-1.5 py-0.5 rounded
                                ${inactivitySeconds <= 10 ? 'bg-red-500 text-white animate-pulse' : 'bg-orange-500 text-white'}`}>
                                ⏰ {inactivitySeconds}s
                            </span>
                        )}
                    </span>
                )}
            </div>

            {/* Main du joueur + cartes coéquipier en 2v2 */}
            {!gameState.spectator && (
                <div className="bg-gray-800 border-t border-gray-700 px-4 py-4">

                    {/* Cartes du coéquipier */}
                    {is2v2 && gameState.teammateHand && gameState.teammateHand.length > 0 && (
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs font-semibold ${myTeamColor?.text ?? 'text-gray-400'}`}>
                                    🤝 Main de ton coéquipier ({gameState.teammateHand.length} cartes)
                                </span>
                            </div>
                            <div className="flex gap-1.5 overflow-x-auto pb-1 flex-wrap">
                                {gameState.teammateHand.map((card, i) => (
                                    <UnoCard key={`${card.id}-${i}`} card={card} small />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Ma main */}
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Ma main ({gameState.hand.length} cartes)</span>
                        {gameState.hand.length === 2 && gameState.isMyTurn && (
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <span className="text-xs text-gray-400">UNO</span>
                                <div
                                    onClick={() => setUnoReady(r => !r)}
                                    className={`relative w-10 h-6 rounded-full transition-colors duration-200
                    ${unoReady ? 'bg-yellow-400' : 'bg-gray-600'}`}>
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200
                    ${unoReady ? 'translate-x-5' : 'translate-x-1'}`} />
                                </div>
                            </label>
                        )}
                        {gameState.hand.length === 1 && gameState.isMyTurn &&
                            !gameState.players.find(p => p.userId === me.userId)?.saidUno && (
                                <span className={`text-xs px-3 py-1 rounded-full font-bold
            ${unoReady ? 'bg-yellow-400 text-gray-900 animate-bounce' : 'bg-red-500 text-white animate-pulse'}
`}>
                                    {unoReady ? '✅ UNO déclaré' : '⚠️ UNO non déclaré !'}
                                </span>
                            )}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 justify-center flex-wrap">
                        {gameState.hand.map(card => (
                            <UnoCard key={card.id} card={card}
                                playable={isPlayable(card)}
                                selected={selectedCard?.id === card.id}
                                onClick={() => handleCardClick(card)} />
                        ))}
                        {gameState.hand.length === 0 && <p className="text-gray-400 text-sm py-4">Aucune carte 🎉</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
