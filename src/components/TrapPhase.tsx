'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

/**
 * TrapPhase
 *
 * MODE A — serveur patché (team0Slots / team1Slots renseignés) :
 *   Slots avec timestamp, last write wins côté serveur.
 *
 * MODE B — serveur non patché :
 *   Source de vérité des VALEURS  → team0Traps / team1Traps
 *     (c'est ce que le serveur a fusionné et ce qui sera utilisé en jeu)
 *   Source de vérité des BADGES   → trapsByPlayer
 *     (pour savoir qui a écrit quoi, affiché uniquement à titre indicatif)
 *
 *   Règle badge par slot : le joueur dont la valeur dans trapsByPlayer[i]
 *   correspond à teamXTraps[i] est affiché comme auteur.
 *   Si plusieurs correspondent, on prend le premier trouvé.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type TrapSlotData = {
    value: string;
    ownerId: string | null;
    ownerUsername: string | null;
    updatedAt: number;
};

type TrapPhaseProps = {
    game: TabooState;
    myId: string;
    myTeam: 0 | 1 | null;
    lobbyId: string;
    socketRef: React.RefObject<{ emit: (event: string, data: unknown) => void }>;
};

export type TabooState = {
    phase: string;
    round?: number;
    trapWordCount: number;
    trapTimeLeft: number | null;
    trapDuration: number;
    trapStarted: boolean;
    team0Word: string | null;
    team1Word: string | null;
    // Mode A
    team0Slots: TrapSlotData[];
    team1Slots: TrapSlotData[];
    // Mode B
    team0Traps: string[];
    team1Traps: string[];
    trapsByPlayer: Record<string, string[]>;
    players: { userId: string; username: string; team: 0 | 1 | null }[];
    scores: Record<string, number>;
    currentTeam: 0 | 1 | null;
    teams?: Record<string, 0 | 1> | null;
};

// ── Couleurs coéquipiers ──────────────────────────────────────────────────────

const TEAMMATE_COLORS = [
    { border: 'border-purple-500/40', bg: 'bg-purple-500/10', badge: 'bg-purple-500/20 text-purple-300' },
    { border: 'border-cyan-500/40',   bg: 'bg-cyan-500/10',   badge: 'bg-cyan-500/20 text-cyan-300'   },
    { border: 'border-pink-500/40',   bg: 'bg-pink-500/10',   badge: 'bg-pink-500/20 text-pink-300'   },
];

// ── Reconstruction des slots en mode B ────────────────────────────────────────
//
// Les valeurs viennent de teamXTraps (source de vérité serveur).
// Les badges viennent de trapsByPlayer (qui a écrit cette valeur ?).

function buildSlotsFromLegacy(
    teamTraps: string[],           // team0Traps ou team1Traps — valeurs fusionnées par le serveur
    trapsByPlayer: Record<string, string[]>,
    writers: { userId: string; username: string }[],  // joueurs de l'équipe qui écrit
    trapWordCount: number,
): TrapSlotData[] {
    return Array.from({ length: trapWordCount }, (_, i) => {
        const value = (teamTraps[i] ?? '').trim();

        if (!value) {
            return { value: '', ownerId: null, ownerUsername: null, updatedAt: 0 };
        }

        // Trouver quel joueur a écrit cette valeur exacte dans trapsByPlayer
        const author = writers.find(
            w => (trapsByPlayer[w.userId]?.[i] ?? '').trim().toUpperCase() === value.toUpperCase()
        );

        return {
            value,
            ownerId: author?.userId ?? null,
            ownerUsername: author?.username ?? null,
            updatedAt: 1,
        };
    });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

function useTrapInputs({ game, myId, myTeam, lobbyId, socketRef }: TrapPhaseProps) {
    const [localDraft, setLocalDraft] = useState<Record<number, string>>({});

    // Reset à chaque nouveau round
    const prevRoundRef = useRef<number | null>(null);
    useEffect(() => {
        if (game.round !== prevRoundRef.current) {
            prevRoundRef.current = game.round ?? null;
            setLocalDraft({});
        }
    }, [game.round, game.phase]);

    // Mode A détecté si le serveur envoie des slots avec données
    const serverHasSlots = useMemo(() => {
        return [...(game.team0Slots ?? []), ...(game.team1Slots ?? [])]
            .some(s => s.ownerId !== null || s.value !== '');
    }, [game.team0Slots, game.team1Slots]);

    const teammates = game.players.filter(p => p.team === myTeam && p.userId !== myId);
    const teammateColorMap: Record<string, number> = Object.fromEntries(
        teammates.map((tm, idx) => [tm.userId, idx % TEAMMATE_COLORS.length])
    );

    // Tous les writers de mon équipe (moi inclus) pour la résolution des badges
    const myTeamWriters = game.players.filter(p => p.team === myTeam);

    // Slots effectifs
    const mySlots: TrapSlotData[] = useMemo(() => {
        if (myTeam === null) return [];

        if (serverHasSlots) {
            // Mode A : slots directs
            return myTeam === 0
                ? (game.team1Slots ?? [])
                : (game.team0Slots ?? []);
        }

        // Mode B : valeurs depuis teamXTraps, badges depuis trapsByPlayer
        // Mon équipe (myTeam) pose les pièges sur l'équipe adverse
        // → les pièges que je vois sont ceux posés SUR l'équipe adverse
        // → team1Traps si je suis équipe 0, team0Traps si je suis équipe 1
        const teamTraps = myTeam === 0
            ? (game.team1Traps ?? [])
            : (game.team0Traps ?? []);

        return buildSlotsFromLegacy(
            teamTraps,
            game.trapsByPlayer ?? {},
            myTeamWriters,
            game.trapWordCount,
        );
    }, [
        serverHasSlots, myTeam,
        game.team0Slots, game.team1Slots,
        game.team0Traps, game.team1Traps,
        game.trapsByPlayer, game.trapWordCount,
        // myTeamWriters est recalculé à chaque render mais c'est ok,
        // useMemo se base sur les dépendances primitives ci-dessus
    ]);

    // Mode A : vider draft quand serveur confirme via slots
    useEffect(() => {
        if (!serverHasSlots) return;
        setLocalDraft(prev => {
            const next = { ...prev };
            let changed = false;
            for (const idxStr of Object.keys(next)) {
                const i = Number(idxStr);
                const slot = mySlots[i];
                if (slot?.ownerId === myId && slot.value === next[i]) {
                    delete next[i];
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game.team0Slots, game.team1Slots]);

    // Mode B : vider draft quand teamXTraps confirme la valeur
    useEffect(() => {
        if (serverHasSlots) return;
        const teamTraps = myTeam === 0
            ? (game.team1Traps ?? [])
            : (game.team0Traps ?? []);
        setLocalDraft(prev => {
            const next = { ...prev };
            let changed = false;
            for (const idxStr of Object.keys(next)) {
                const i = Number(idxStr);
                if ((teamTraps[i] ?? '') === next[i]) {
                    delete next[i];
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game.team0Traps, game.team1Traps]);

    const getDisplayValue = useCallback((i: number): string => {
        if (i in localDraft) return localDraft[i];
        return mySlots[i]?.value ?? '';
    }, [localDraft, mySlots]);

    const getOwnerInfo = useCallback((i: number) => {
        // Si je suis en train de taper → badge "moi"
        if (i in localDraft && localDraft[i]) {
            return { ownerUsername: null, ownerColor: null, isMe: true };
        }
        const slot = mySlots[i];
        if (!slot?.ownerId) return { ownerUsername: null, ownerColor: null, isMe: false };
        if (slot.ownerId === myId) return { ownerUsername: null, ownerColor: null, isMe: true };
        return {
            ownerUsername: slot.ownerUsername,
            ownerColor: teammateColorMap[slot.ownerId] ?? 0,
            isMe: false,
        };
    }, [localDraft, mySlots, myId, teammateColorMap]);

    const handleChange = useCallback((i: number, raw: string) => {
        const value = raw.toUpperCase();
        setLocalDraft(prev => ({ ...prev, [i]: value }));
        socketRef.current?.emit('taboo:submitTraps', { lobbyId, index: i, value });
    }, [lobbyId, socketRef]);

    return { mySlots, getDisplayValue, getOwnerInfo, handleChange, teammates };
}

// ── Composant principal ───────────────────────────────────────────────────────

export function TrapPhase({ game, myId, myTeam, lobbyId, socketRef }: TrapPhaseProps) {
    const { getDisplayValue, getOwnerInfo, handleChange, teammates } =
        useTrapInputs({ game, myId, myTeam, lobbyId, socketRef });

    const wordToPiege = myTeam === 0 ? game.team1Word : myTeam === 1 ? game.team0Word : null;

    const trapPct = game.trapTimeLeft !== null && game.trapDuration > 0
        ? (game.trapTimeLeft / game.trapDuration) * 100 : 100;
    const trapColor = (game.trapTimeLeft ?? 999) <= 10 ? '#ef4444'
        : (game.trapTimeLeft ?? 999) <= 20 ? '#f97316' : '#f59e0b';

    const teamBorder = myTeam === 0 ? 'bg-blue-500/10 border-blue-500/20'
        : myTeam === 1 ? 'bg-red-500/10 border-red-500/20'
        : 'bg-white/5 border-white/10';

    return (
        <div className={`border rounded-2xl p-6 max-w-md w-full ${teamBorder}`}>

            {/* Timer */}
            <div className="flex items-center justify-between mb-2">
                <p className="text-orange-400 font-bold text-sm">⏳ Phase des pièges</p>
                {game.trapStarted && game.trapTimeLeft !== null ? (
                    <span className={`text-sm font-bold tabular-nums ${game.trapTimeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white/60'}`}>
                        {game.trapTimeLeft}s
                    </span>
                ) : (
                    <span className="text-white/30 text-xs">Démarrage…</span>
                )}
            </div>

            <div className="w-full h-1.5 bg-white/10 rounded-full mb-5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${trapPct}%`, backgroundColor: trapColor }} />
            </div>

            {/* Mot à piéger */}
            {myTeam !== null && wordToPiege ? (
                <div className="mb-5 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-xs text-white/40 uppercase tracking-widest mb-1">
                        Mot à piéger — équipe {myTeam === 0 ? '🔴 Rouge' : '🔵 Bleue'}
                    </p>
                    <p style={{ fontFamily: "'Bebas Neue', cursive" }}
                        className="text-4xl tracking-widest text-yellow-400">
                        {wordToPiege}
                    </p>
                </div>
            ) : myTeam !== null ? (
                <div className="mb-5 p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                    <p className="text-white/30 text-sm animate-pulse">Chargement du mot…</p>
                </div>
            ) : null}

            {/* Inputs */}
            {myTeam !== null && (
                <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-white/30">✏️ Pièges de l'équipe</p>
                        {teammates.length > 0 && (
                            <div className="flex gap-1.5">
                                {teammates.map((tm, idx) => {
                                    const colors = TEAMMATE_COLORS[idx % TEAMMATE_COLORS.length];
                                    return (
                                        <span key={tm.userId}
                                            className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                                            {tm.username}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {Array.from({ length: game.trapWordCount }).map((_, i) => (
                        <TrapSlotInput
                            key={i}
                            index={i}
                            value={getDisplayValue(i)}
                            ownerInfo={getOwnerInfo(i)}
                            onChange={handleChange}
                        />
                    ))}
                </div>
            )}

            <p className="text-white/20 text-xs mt-4 text-center">
                La partie démarre automatiquement à la fin du chrono…
            </p>
        </div>
    );
}

// ── Slot input ────────────────────────────────────────────────────────────────

function TrapSlotInput({ index, value, ownerInfo, onChange }: {
    index: number;
    value: string;
    ownerInfo: { ownerUsername: string | null; ownerColor: number | null; isMe: boolean };
    onChange: (i: number, val: string) => void;
}) {
    const { ownerUsername, ownerColor, isMe } = ownerInfo;
    const colors = ownerColor !== null ? TEAMMATE_COLORS[ownerColor] : null;

    const borderClass = ownerUsername && colors
        ? `${colors.border} ${colors.bg}`
        : isMe && value
        ? 'border-orange-500/40 bg-orange-500/5'
        : 'border-white/10 bg-white/5';

    return (
        <div className="relative">
            <input
                value={value}
                onChange={e => onChange(index, e.target.value)}
                placeholder={`Mot piégé ${index + 1}`}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm pr-24
                    focus:outline-none placeholder:text-white/20 transition-colors duration-150
                    ${borderClass}
                    ${ownerUsername ? 'text-white/50' : 'text-white focus:border-orange-400/70'}`}
            />
            {ownerUsername && colors && (
                <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-0.5
                    rounded-full pointer-events-none ${colors.badge}`}>
                    {ownerUsername}
                </span>
            )}
            {isMe && value && !ownerUsername && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-0.5
                    rounded-full pointer-events-none bg-orange-500/15 text-orange-300/70">
                    moi
                </span>
            )}
        </div>
    );
}
