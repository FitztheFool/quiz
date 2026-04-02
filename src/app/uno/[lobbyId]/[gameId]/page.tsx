// src/app/uno/[code]/page.tsx
'use client';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';
import GameOverModal from '@/components/GameOverModal';

import { notFound } from 'next/navigation';
import { useGamePage } from '@/hooks/useGamePage';
import { useUno, Card, FinalScore, PlayerInfo } from '@/hooks/useUno';

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
    const { status, router, me, lobbyId, isNotFound, setIsNotFound } = useGamePage();

    const {
        lobbyState,
        gameState,
        selectedCard,
        showColorPicker,
        unoReady,
        setUnoReady,
        inactivitySeconds,
        inactivityUserId,
        isPlayable,
        playCard,
        chooseColor,
        drawCard,
        callUno,
        surrender,
    } = useUno({
        lobbyId,
        userId: me.userId,
        username: me.username ?? '',
        onNotFound: () => setIsNotFound(true),
    });

    if (status === 'loading') {
        return <LoadingSpinner />;
    }
    if (isNotFound) notFound();

    const is2v2 = gameState?.options?.teamMode === '2v2';


    // ── Attente ────────────────────────────────────────────────────────────────
    if (!gameState || gameState.status === 'WAITING') return (
        <GameWaitingScreen icon="🃏" gameName="UNO" lobbyId={lobbyId}
            players={lobbyState?.players ?? []}
            myUserId={me.userId}
            hostId={lobbyState?.hostId} />
    );

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
    if (gameState?.status === 'FINISHED') {
        const scores = gameState.finalScores ?? [];
        const winnerTeam = gameState.teams && gameState.winner
            ? gameState.teams[gameState.winner.userId]
            : null;
        const title = is2v2 && winnerTeam !== null && winnerTeam !== undefined
            ? `${TEAM_NAMES[winnerTeam]} a gagné !`
            : `${gameState.winner?.username ?? '?'} a gagné !`;
        const subtitle = is2v2 && winnerTeam !== null && winnerTeam !== undefined
            ? 'Mode 2v2 · Classement final'
            : gameState.spectator ? 'Vous avez observé cette partie' : 'Classement final';
        const ScoreRow = ({ s, inTeam = false }: { s: FinalScore; inTeam?: boolean }) => (
            <div className={`flex items-center justify-between rounded-lg px-4 py-3
            ${!inTeam && s.rank === 1 ? 'bg-yellow-500/20 border border-yellow-500/50' : inTeam ? '' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}
            ${s.kicked ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-3">
                    <span className="text-xl w-7 text-center">{RANK_MEDAL[s.rank] ?? `#${s.rank}`}</span>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-900 dark:text-white">{s.username}</span>
                            {s.userId === me.userId && !gameState.spectator && <span className="text-gray-400 dark:text-gray-500 text-xs">(moi)</span>}
                            {s.abandon && <span className="text-xs bg-orange-500/30 text-orange-500 dark:text-orange-400 px-1.5 py-0.5 rounded">Abandon</span>}
                            {!s.abandon && s.afk && <span className="text-xs bg-red-500/30 text-red-500 dark:text-red-400 px-1.5 py-0.5 rounded">AFK</span>}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {s.cardsLeft === 0 ? '0 carte restante' : `${s.cardsLeft} carte${s.cardsLeft > 1 ? 's' : ''} — ${s.pointsInHand} pts en main`}
                        </span>
                        {s.hand && s.hand.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                                {[...s.hand].sort((a, b) => {
                                    const order = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2', 'wild', 'wild4'];
                                    return order.indexOf(a.value) - order.indexOf(b.value);
                                }).map((card, i) => (
                                    <UnoCard key={`${card.id}-${i}`} card={card} small />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <span className={`font-bold text-lg ${s.score > 0 ? 'text-yellow-500 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'}`}>{s.score > 0 ? `+${s.score}` : '0'}</span>
                    <div className="text-xs text-gray-400 dark:text-gray-500">pts</div>
                </div>
            </div>
        );
        return (
            <GameOverModal
                title={title}
                subtitle={subtitle}
                onLobby={() => router.push(`/lobby/create/${lobbyId}`)}
                onLeave={() => router.push('/')}
            >
                {is2v2 && winnerTeam !== null && winnerTeam !== undefined ? (
                    <div className="space-y-3">
                        {[0, 1].map(teamIdx => {
                            const teamScores = scores.filter(s => s.team === teamIdx);
                            const isWinner = winnerTeam === teamIdx;
                            const tc = TEAM_COLORS[teamIdx];
                            return (
                                <div key={teamIdx} className={`rounded-xl border p-3 ${isWinner ? `${tc.bg} border-${teamIdx === 0 ? 'blue' : 'red'}-500/50` : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tc.badge}`}>{TEAM_NAMES[teamIdx]}</span>
                                        {isWinner && <span className="text-yellow-500 dark:text-yellow-400 text-sm font-bold">🏆 Vainqueurs</span>}
                                    </div>
                                    <div className="space-y-2">{teamScores.map(s => <ScoreRow key={s.userId} s={s} inTeam />)}</div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="space-y-2">{scores.map(s => <ScoreRow key={s.userId} s={s} />)}</div>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">0–9 = valeur faciale · Skip/Reverse/+2 = 20 pts · Wild/+4 = 50 pts</p>
            </GameOverModal>
        );
    }
    const renderPlayer = (p: PlayerInfo) => {
        const isActive = gameState.players[gameState.currentPlayerIndex]?.userId === p.userId;
        const isInactive = inactivityUserId === p.userId && inactivitySeconds !== null;
        const pTeam = gameState.teams?.[p.userId];
        const tc = pTeam !== undefined && pTeam !== null ? TEAM_COLORS[pTeam] : null;

        return (
            <div key={p.userId} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all
                ${isActive ? 'bg-yellow-500/20 ring-2 ring-yellow-400' : tc ? `${tc.bg} ring-1 ${tc.ring}` : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}
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
                    {p.cardCount > 10 && <span className="text-xs text-gray-500 dark:text-gray-400">+{p.cardCount - 10}</span>}
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{p.cardCount} carte{p.cardCount > 1 ? 's' : ''}</span>
                    {p.cardCount === 1 && !p.saidUno && !gameState.spectator && (
                        <button onClick={() => callUno(p.userId)}
                            className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded font-bold hover:bg-red-400 transition">
                            UNO !
                        </button>
                    )}
                    {p.saidUno && <span className="text-xs text-yellow-500 dark:text-yellow-400 font-bold">UNO!</span>}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white select-none">

            {showColorPicker && !gameState.spectator && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-center">
                        <h2 className="font-bold text-lg mb-4">Choisir une couleur</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {['red', 'green', 'blue', 'yellow'].map(c => (
                                <button key={c} onClick={() => chooseColor(c)}
                                    className={`w-20 h-20 rounded-xl ${COLOR_MAP[c]} text-3xl hover:scale-110 transition-transform`}>
                                    {COLOR_TEXT[c]}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Top bar */}
            <header className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center gap-4">
                {/* Left slot */}
                <div className="w-48 shrink-0 flex items-center gap-2">
                    <span className="font-bold">🃏 UNO</span>
                    {is2v2 && myTeamColor && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${myTeamColor.badge}`}>
                            {TEAM_NAMES[myTeam!]}
                        </span>
                    )}
                    {gameState.spectator && (
                        <span className="text-xs bg-purple-500/20 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                            👁 Spectateur
                        </span>
                    )}
                </div>

                {/* Center slot — turn indicator */}
                <div className="flex-1 flex justify-center items-center gap-2">
                    {gameState.drawStack > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                            Stack +{gameState.drawStack}
                        </span>
                    )}
                    {!gameState.spectator && gameState.isMyTurn ? (
                        <span className={`text-sm font-bold ${isMeInactive ? 'text-orange-500 animate-pulse' : 'text-yellow-500 dark:text-yellow-400 animate-pulse'}`}>
                            {isMeInactive
                                ? `⚠️ Joue vite ! exclusion dans ${inactivitySeconds}s`
                                : '✨ À toi de jouer !'}
                        </span>
                    ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            Tour de <span className="text-gray-900 dark:text-white font-bold">{currentPlayer?.username}</span>
                            {inactivityUserId === currentPlayer?.userId && inactivitySeconds !== null && (
                                <span className={`ml-2 text-xs font-bold px-1.5 py-0.5 rounded
                                    ${inactivitySeconds <= 10 ? 'bg-red-500 text-white animate-pulse' : 'bg-orange-500 text-white'}`}>
                                    ⏰ {inactivitySeconds}s
                                </span>
                            )}
                        </span>
                    )}
                </div>

                {/* Right slot — color dot + direction + abandon */}
                <div className="w-48 shrink-0 flex justify-end items-center gap-2">
                    <span className={`w-5 h-5 rounded-full ${COLOR_MAP[gameState.currentColor]} border-2 border-white dark:border-gray-800 shadow`} />
                    <span className="text-gray-500 dark:text-gray-400 text-lg">{gameState.direction === 1 ? '↻' : '↺'}</span>
                    {!gameState.spectator && (
                        <button
                            onClick={() => { if (confirm('Abandonner la partie ?')) surrender(); }}
                            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 px-3 py-1.5 rounded-lg transition-all"
                        >
                            🏳️ Abandonner
                        </button>
                    )}
                </div>
            </header>

            {/* Players zone */}
            <div className="shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2">
                {is2v2 && !gameState.spectator ? (
                    <div className="space-y-1.5">
                        <div className="flex justify-center gap-3 flex-wrap">
                            <span className="text-xs text-red-500 dark:text-red-400 font-semibold self-center">⚔️ Adversaires</span>
                            {opponents.map(renderPlayer)}
                        </div>
                        {teammates.length > 0 && (
                            <div className="flex justify-center gap-3 flex-wrap">
                                <span className="text-xs text-blue-500 dark:text-blue-400 font-semibold self-center">🤝 Équipe</span>
                                {teammates.map(renderPlayer)}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex justify-center gap-3 flex-wrap">
                        {otherPlayers.map(renderPlayer)}
                    </div>
                )}
            </div>

            {/* Main area — draw pile + top card */}
            <div className="flex-1 flex items-center justify-center gap-8">
                <div className="flex flex-col items-center gap-2">
                    <div
                        onClick={!gameState.spectator && gameState.isMyTurn ? drawCard : undefined}
                        className={`w-16 h-24 bg-red-700 rounded-xl border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-2xl
                            ${!gameState.spectator && gameState.isMyTurn ? 'cursor-pointer hover:bg-red-600 hover:scale-105 transition-all' : 'opacity-60 cursor-default'}`}>
                        🃏
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {gameState.drawStack > 0 ? `Piocher +${gameState.drawStack}` : 'Piocher'}
                    </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    {gameState.topCard && <UnoCard card={gameState.topCard} />}
                    <div className={`w-4 h-4 rounded-full ${COLOR_MAP[gameState.currentColor]} border-2 border-white dark:border-gray-800`} />
                </div>
            </div>

            {/* Hand zone */}
            {!gameState.spectator && (
                <div className="shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">

                    {/* Cartes du coéquipier */}
                    {is2v2 && gameState.teammateHand && gameState.teammateHand.length > 0 && (
                        <div className="mb-3">
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs font-semibold ${myTeamColor?.text ?? 'text-gray-500 dark:text-gray-400'}`}>
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
                        <span className="text-sm text-gray-500 dark:text-gray-400">Ma main ({gameState.hand.length} cartes)</span>
                        {gameState.hand.length === 2 && gameState.isMyTurn && (
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <span className="text-xs text-gray-500 dark:text-gray-400">UNO</span>
                                <div
                                    onClick={() => setUnoReady(r => !r)}
                                    className={`relative w-10 h-6 rounded-full transition-colors duration-200
                                        ${unoReady ? 'bg-yellow-400' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200
                                        ${unoReady ? 'translate-x-5' : 'translate-x-1'}`} />
                                </div>
                            </label>
                        )}
                        {gameState.hand.length === 1 && gameState.isMyTurn &&
                            !gameState.players.find(p => p.userId === me.userId)?.saidUno && (
                                <span className={`text-xs px-3 py-1 rounded-full font-bold
                                    ${unoReady ? 'bg-yellow-400 text-gray-900 animate-bounce' : 'bg-red-500 text-white animate-pulse'}`}>
                                    {unoReady ? '✅ UNO déclaré' : '⚠️ UNO non déclaré !'}
                                </span>
                            )}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 justify-center flex-wrap">
                        {gameState.hand.map(card => (
                            <UnoCard key={card.id} card={card}
                                playable={isPlayable(card)}
                                selected={selectedCard?.id === card.id}
                                onClick={() => playCard(card)} />
                        ))}
                        {gameState.hand.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm py-4">Aucune carte 🎉</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
