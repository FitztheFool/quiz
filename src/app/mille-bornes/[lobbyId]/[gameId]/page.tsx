'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { useGamePage } from '@/hooks/useGamePage';
import { useMilleBornes, isBot } from '@/hooks/useMilleBornes';
import GameOverModal from '@/components/GameOverModal';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameWaitingScreen from '@/components/GameWaitingScreen';
import GameIcon from '@/components/GameIcon';
import TimerBar from '@/components/TimerBar';
import GamePageHeader from '@/components/GamePageHeader';
import SurrenderButton from '@/components/SurrenderButton';
import Card from '@/components/MilleBornes/Card';
import PlayerBoard from '@/components/MilleBornes/PlayerBoard';
import { GameLogSidebar } from '@/components/GameLog';
import ScoreBreakdown from '@/components/MilleBornes/ScoreBreakdown';
import { canPlayNow, canAttackTarget, canRemedyHelp, cardTitle, HAZARD_LABEL, SAFETY_LABEL } from '@/components/MilleBornes/labels';
import { TrophyIcon, XCircleIcon, CpuChipIcon, BoltIcon } from '@heroicons/react/24/outline';

export default function MilleBornesPage() {
    const { status, router, me, lobbyId, isNotFound, setIsNotFound } = useGamePage();

    const {
        state, finished, me: myPlayer, isMyTurn, vsBot, coupFourreForMe, coupFlash,
        inactivityUserId, inactivityEndsAt,
        playCard, discard, acceptCoupFourre, declineCoupFourre, surrender,
    } = useMilleBornes({
        lobbyId,
        userId: me.userId,
        onNotFound: () => setIsNotFound(true),
    });

    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Drop selection when it's no longer actionable.
    useEffect(() => {
        if (!isMyTurn) { setSelectedId(null); return; }
        if (selectedId && !myPlayer?.hand?.some(c => c.id === selectedId)) setSelectedId(null);
    }, [isMyTurn, selectedId, myPlayer]);

    if (status === 'loading') return <LoadingSpinner message="Vérification de la session..." />;
    if (isNotFound) notFound();
    if (!state) return (
        <GameWaitingScreen gameType="mille_bornes" gameName="Mille Bornes" lobbyId={lobbyId} players={[]} myUserId={me.userId} />
    );

    const currentPlayer = state.players[state.currentPlayerIndex] ?? null;
    const currentIsBot = isBot(currentPlayer);
    const showSurrender = state.phase !== 'ended' && myPlayer?.alive === true;
    const opponents = state.players.filter(p => p.userId !== me.userId);
    const is2v2 = state.teamMode === '2v2';
    const myTeam = myPlayer?.team ?? null;

    // Team progress (2v2): shared mode → combined distance, individual → leading teammate.
    // Ordered with the viewer's team first, then the opposing team.
    const teamOrder: (0 | 1)[] = myTeam === 1 ? [1, 0] : [0, 1];
    const teamProgress = is2v2 ? teamOrder.map(t => {
        const members = state.players.filter(p => p.team === t);
        const sum = members.reduce((s, p) => s + p.distance, 0);
        const best = members.reduce((m, p) => Math.max(m, p.distance), 0);
        const value = state.teamDistance === 'shared' ? sum : best;
        return { team: t, value, mine: t === myTeam, pct: Math.min(100, Math.round((value / state.target) * 100)) };
    }) : [];

    const hand = myPlayer?.hand ?? [];
    const selectedCard = hand.find(c => c.id === selectedId) ?? null;
    const isHazardSelected = selectedCard?.kind === 'hazard';
    const isRemedySelected = selectedCard?.kind === 'remedy';
    // A remedy with a possible teammate to help → targeting mode (otherwise played on self).
    const remedyHelpAvailable = !!(isRemedySelected && is2v2 && isMyTurn && opponents.some(
        p => p.team === myTeam && myTeam != null && canRemedyHelp(p, selectedCard!.remedy!)));
    const canPlaySelected = !!selectedCard && selectedCard.kind !== 'hazard' && myPlayer
        ? canPlayNow(selectedCard!, myPlayer, state.target) : false;

    const handlePlaySelected = () => {
        if (!selectedCard || !isMyTurn) return;
        if (selectedCard.kind === 'hazard') return; // needs a target
        playCard(selectedCard.id);
        setSelectedId(null);
    };
    const handleTarget = (targetUserId: string) => {
        if (!selectedCard || !isMyTurn) return;
        playCard(selectedCard.id, targetUserId);
        setSelectedId(null);
    };
    const handleDiscard = () => {
        if (!selectedCard || !isMyTurn) return;
        discard(selectedCard.id);
        setSelectedId(null);
    };

    // Game over computation
    const sortedScores = finished ? [...finished.scores].sort((a, b) => b.total - a.total) : [];
    const winnerScore = finished ? sortedScores.find(s => s.userId === finished.winnerUserId) ?? sortedScores[0] ?? null : null;
    const winningTeam = finished?.winningTeam ?? null;
    const isWinner = is2v2 && winningTeam != null
        ? myTeam === winningTeam
        : winnerScore?.userId === me.userId;

    return (
        <div className="flex-1 flex flex-col wood-table text-gray-900 dark:text-white">
            <GamePageHeader
                left={
                    <>
                        <GameIcon gameType="mille_bornes" className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        <span className="font-bold">
                            Mille Bornes
                            {vsBot && <span className="ml-2 text-xs font-normal text-indigo-600 dark:text-indigo-400">vs Bot</span>}
                        </span>
                    </>
                }
                center={
                    <div className="flex items-center gap-2 text-xs flex-wrap justify-center">
                        <span className="text-gray-500 dark:text-gray-400">Objectif {state.target} km</span>
                        <span className="text-gray-400 dark:text-gray-600">·</span>
                        <span className="text-gray-500 dark:text-gray-400">Pioche {state.drawCount}</span>
                    </div>
                }
                right={showSurrender && <SurrenderButton onSurrender={surrender} />}
            />

            {state.phase === 'playing' && (
                <TimerBar
                    endsAt={state.turnStartedAt ? state.turnStartedAt + state.turnDuration * 1000 : null}
                    duration={state.turnDuration}
                    label={
                        isMyTurn ? 'À vous de jouer'
                            : currentIsBot ? 'Le bot réfléchit…'
                                : `Tour de ${currentPlayer?.username ?? '…'}`
                    }
                />
            )}

            <main className="flex-1 flex flex-col lg:flex-row gap-4 p-3 md:p-6">
              <div className="flex-1 flex flex-col items-center gap-4 min-w-0">
                {/* Team progress (2v2) */}
                {is2v2 && (
                    <div className="w-full max-w-5xl bg-white/70 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/50 rounded-2xl px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold">
                                Progression des équipes
                            </p>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                {state.teamDistance === 'shared' ? 'cumul · cible ' : 'meneur · cible '}{state.target} km
                            </span>
                        </div>
                        <div className="space-y-2">
                            {teamProgress.map(tp => (
                                <div key={tp.team} className="flex items-center gap-2">
                                    <span className={`flex items-center gap-1 w-28 shrink-0 text-xs font-bold ${tp.team === 0 ? 'text-primary-600 dark:text-primary-400' : 'text-felt-700 dark:text-felt-400'}`}>
                                        <span className={`w-2.5 h-2.5 rounded-full ${tp.team === 0 ? 'bg-primary-500' : 'bg-felt-600'}`} />
                                        {tp.team === 0 ? 'Ambre' : 'Verte'}
                                        {tp.mine && <span className="text-gray-400 dark:text-gray-500 font-normal">(vous)</span>}
                                    </span>
                                    <div className="flex-1 h-3 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                                        <div className={`h-full transition-[width] duration-700 ease-out ${tp.team === 0 ? 'bg-gradient-to-r from-primary-400 to-primary-600' : 'bg-gradient-to-r from-felt-400 to-felt-600'}`} style={{ width: `${tp.pct}%` }} />
                                    </div>
                                    <span className="w-20 shrink-0 text-right font-mono text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                                        {tp.value}<span className="text-[10px] text-gray-400 font-normal"> km</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Players' road state */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-5xl">
                    {myPlayer && (
                        <PlayerBoard
                            player={myPlayer}
                            target={state.target}
                            isCurrent={currentPlayer?.userId === me.userId}
                            isMe
                            inactivityEndsAt={inactivityUserId === me.userId ? inactivityEndsAt : null}
                        />
                    )}
                    {opponents.map(p => {
                        const isTeammate = is2v2 && myTeam != null && p.team === myTeam;
                        const canAttack = isHazardSelected && isMyTurn && !isTeammate && canAttackTarget(p, selectedCard!.hazard!);
                        const canHelp = isRemedySelected && isMyTurn && isTeammate && canRemedyHelp(p, selectedCard!.remedy!);
                        const targetable = canAttack || canHelp;
                        return (
                            <PlayerBoard
                                key={p.userId}
                                player={p}
                                target={state.target}
                                isCurrent={currentPlayer?.userId === p.userId}
                                isMe={false}
                                targetable={targetable}
                                targetMode={canHelp ? 'help' : 'attack'}
                                onTarget={() => handleTarget(p.userId)}
                                inactivityEndsAt={inactivityUserId === p.userId ? inactivityEndsAt : null}
                            />
                        );
                    })}
                </div>

                {/* Last discard */}
                {state.lastDiscard && (
                    <div className="flex items-center gap-2 text-xs text-gray-200/80">
                        <span className="uppercase tracking-widest font-bold">Défausse</span>
                        <span className="font-semibold">{cardTitle(state.lastDiscard)}</span>
                    </div>
                )}

                <div className="flex-1" />

                {/* My hand */}
                {myPlayer?.alive && hand.length > 0 && (
                    <div className="wood-tile rounded-2xl px-4 py-4 w-full max-w-4xl">
                        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                            <h2 className="font-extrabold text-lg text-gray-900">Votre main</h2>
                            {isMyTurn ? (
                                isHazardSelected
                                    ? <span className="text-xs font-bold text-red-700 animate-pulse">Choisissez un adversaire à attaquer ↑</span>
                                    : remedyHelpAvailable
                                        ? <span className="text-xs font-bold text-emerald-700 animate-pulse">Soignez un coéquipier ↑ ou jouez sur vous</span>
                                        : <span className="text-xs text-gray-700">Sélectionnez une carte à jouer ou défausser</span>
                            ) : (
                                <span className="text-xs text-gray-600">En attente de votre tour…</span>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2 justify-center">
                            {hand.map(card => (
                                <Card
                                    key={card.id}
                                    card={card}
                                    selected={selectedId === card.id}
                                    disabled={!isMyTurn}
                                    onClick={isMyTurn ? () => setSelectedId(id => id === card.id ? null : card.id) : undefined}
                                />
                            ))}
                        </div>

                        {isMyTurn && selectedCard && (
                            <div className="flex items-center justify-center gap-3 mt-4">
                                {selectedCard.kind === 'hazard' ? (
                                    <span className="text-sm font-semibold text-red-700">
                                        {HAZARD_LABEL[selectedCard.hazard!]} — cliquez la cible ci-dessus
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handlePlaySelected}
                                        disabled={!canPlaySelected}
                                        className="px-5 py-2 rounded-xl font-bold bg-emerald-600 text-white shadow hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Jouer {selectedCard.kind === 'distance' ? `${selectedCard.km} km` : cardTitle(selectedCard)}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleDiscard}
                                    className="px-5 py-2 rounded-xl font-bold bg-gray-700 text-white shadow hover:bg-gray-800 transition-colors"
                                >
                                    Défausser
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {myPlayer && !myPlayer.alive && state.phase !== 'ended' && (
                    <div className="wood-tile rounded-2xl px-5 py-4 text-sm text-gray-700">
                        Vous n&apos;êtes plus en course — observez la fin de la partie.
                    </div>
                )}
              </div>

              {/* History — right sidebar */}
              <GameLogSidebar entries={state.log} />
            </main>

            {/* Coup fourré celebration flash */}
            {coupFlash && coupFlash.userId !== me.userId && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-bounce">
                    <div className="flex items-center gap-2 bg-purple-600 text-white font-black px-5 py-2.5 rounded-full shadow-2xl ring-4 ring-purple-300/50">
                        <BoltIcon className="w-5 h-5" />
                        COUP FOURRÉ — {state.players.find(p => p.userId === coupFlash.userId)?.username ?? 'Adversaire'} !
                    </div>
                </div>
            )}

            {/* Coup fourré modal */}
            {coupFourreForMe && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
                        <BoltIcon className="w-10 h-10 text-purple-500 mx-auto mb-3" />
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1">Coup Fourré !</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                            Vous subissez <span className="font-bold">{HAZARD_LABEL[coupFourreForMe.hazard]}</span> mais détenez
                            la botte <span className="font-bold">{SAFETY_LABEL[coupFourreForMe.safety]}</span>. La jouer maintenant
                            annule l&apos;attaque, vous rapporte un bonus et vous fait rejouer.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                type="button"
                                onClick={acceptCoupFourre}
                                className="px-5 py-2 rounded-xl font-bold bg-purple-600 text-white shadow hover:bg-purple-700 transition-colors"
                            >
                                Coup Fourré !
                            </button>
                            <button
                                type="button"
                                onClick={declineCoupFourre}
                                className="px-5 py-2 rounded-xl font-bold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                Plus tard
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {finished && (
                <GameOverModal
                    icon={
                        isWinner ? <TrophyIcon className="w-8 h-8 text-amber-500" />
                            : (!is2v2 && isBot(winnerScore)) ? <CpuChipIcon className="w-8 h-8 text-indigo-400" />
                                : <XCircleIcon className="w-8 h-8 text-red-400" />
                    }
                    title={
                        is2v2 && winningTeam != null
                            ? (isWinner ? `Votre équipe (${winningTeam === 0 ? 'Ambre' : 'Verte'}) gagne !` : `L'équipe ${winningTeam === 0 ? 'Ambre' : 'Verte'} gagne !`)
                            : isWinner ? 'Vous avez gagné !'
                                : isBot(winnerScore) ? 'Le bot gagne !'
                                    : `${winnerScore?.username ?? 'Adversaire'} gagne !`
                    }
                    subtitle={isWinner ? `Arrivé à ${state.target} km` : undefined}
                    onLobby={() => router.push(`/lobby/create/${lobbyId}`)}
                    onLeave={() => router.push('/')}
                    asModal
                >
                    <ScoreBreakdown
                        scores={sortedScores}
                        myUserId={me.userId}
                        winnerUserId={finished.winnerUserId}
                        winningTeam={winningTeam}
                    />
                </GameOverModal>
            )}
        </div>
    );
}
