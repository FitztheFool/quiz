'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

/**
 * TrapPhase
 *
 * Le serveur émet désormais trapsByPlayer sous la forme :
 *   Record<userId, { value: string; updatedAt: number }[]>
 *
 * Ce format permet de savoir avec certitude qui a écrit quoi et quand,
 * ce qui permet des badges fiables et un "last write wins" correct.
 *
 * Rétrocompatibilité : si trapsByPlayer contient encore des string[],
 * on fonctionne sans badges (mode legacy).
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type TrapSlotData = {
    value: string;
    ownerId: string | null;
    ownerUsername: string | null;
    updatedAt: number;
};

// Format riche envoyé par le serveur patché
type RichSlot = { value: string; updatedAt: number };

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
    team0Slots: TrapSlotData[];
    team1Slots: TrapSlotData[];
    team0Traps: string[];
    team1Traps: string[];
    // Peut être string[] (ancien serveur) ou { value, updatedAt }[] (nouveau)
    trapsByPlayer: Record<string, (string | RichSlot)[]>;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSlotValue(entry: string | RichSlot | undefined): string {
    if (!entry) return '';
    if (typeof entry === 'string') return entry;
    return entry.value ?? '';
}

function getSlotTimestamp(entry: string | RichSlot | undefined): number {
    if (!entry || typeof entry === 'string') return 0;
    return entry.updatedAt ?? 0;
}

function isRichFormat(trapsByPlayer: TabooState['trapsByPlayer']): boolean {
    for (const slots of Object.values(trapsByPlayer)) {
        for (const s of slots) {
            if (s && typeof s === 'object') return true;
        }
    }
    return false;
}

// ── Reconstruction des slots depuis trapsByPlayer ─────────────────────────────

function buildSlotsFromTrapsByPlayer(
    trapsByPlayer: TabooState['trapsByPlayer'],
    teamTraps: string[],
    writers: { userId: string; username: string }[],
    trapWordCount: number,
    myId: string,
    rich: boolean,
): TrapSlotData[] {
    return Array.from({ length: trapWordCount }, (_, i) => {
        const value = (teamTraps[i] ?? '').trim();

        if (!value) {
            return { value: '', ownerId: null, ownerUsername: null, updatedAt: 0 };
        }

        if (rich) {
            // Format riche : on prend le joueur avec le updatedAt le plus récent
            // dont la valeur correspond à teamTraps[i]
            let bestOwner: { userId: string; username: string } | null = null;
            let bestTs = -1;

            for (const writer of writers) {
                const entry = trapsByPlayer[writer.userId]?.[i];
                const v = getSlotValue(entry).trim().toUpperCase();
                const ts = getSlotTimestamp(entry);
                if (v === value.toUpperCase() && ts > bestTs) {
                    bestTs = ts;
                    bestOwner = writer;
                }
            }

            return {
                value,
                ownerId: bestOwner?.userId ?? null,
                ownerUsername: bestOwner?.username ?? null,
                updatedAt: bestTs > 0 ? bestTs : 1,
            };
        }

        // Format legacy (string[]) : pas de timestamp → pas de badge fiable
        return { value, ownerId: null, ownerUsername: null, updatedAt: 1 };
    });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

function useTrapInputs({ game, myId, myTeam, lobbyId, socketRef }: TrapPhaseProps) {
    const [localDraft, setLocalDraft] = useState<Record<number, string>>({});

    const prevRoundRef = useRef<number | null>(null);
    useEffect(() => {
        if (game.round !== prevRoundRef.current) {
            prevRoundRef.current = game.round ?? null;
            setLocalDraft({});
        }
    }, [game.round, game.phase]);

    const serverHasSlots = useMemo(() =>
        [...(game.team0Slots ?? []), ...(game.team1Slots ?? [])]
            .some(s => s.ownerId !== null || s.value !== ''),
    [game.team0Slots, game.team1Slots]);

    const rich = useMemo(() => isRichFormat(game.trapsByPlayer ?? {}), [game.trapsByPlayer]);

    const teammates = game.players.filter(p => p.team === myTeam && p.userId !== myId);
    const teammateColorMap: Record<string, number> = Object.fromEntries(
        teammates.map((tm, idx) => [tm.userId, idx % TEAMMATE_COLORS.length])
    );

    const myTeamWriters = game.players.filter(p => p.team === myTeam);

    const mySlots: TrapSlotData[] = useMemo(() => {
        if (myTeam === null) return [];

        if (serverHasSlots) {
            return myTeam === 0 ? (game.team1Slots ?? []) : (game.team0Slots ?? []);
        }

        const teamTraps = myTeam === 0 ? (game.team1Traps ?? []) : (game.team0Traps ?? []);

        return buildSlotsFromTrapsByPlayer(
            game.trapsByPlayer ?? {},
            teamTraps,
            myTeamWriters,
            game.trapWordCount,
            myId,
            rich,
        );
    }, [serverHasSlots, myTeam, game.team0Slots, game.team1Slots,
        game.team0Traps, game.team1Traps, game.trapsByPlayer,
        game.trapWordCount, myId, rich]);

    // Vider draft — mode A
    useEffect(() => {
        if (!serverHasSlots) return;
        setLocalDraft(prev => {
            const next = { ...prev };
            let changed = false;
            for (const idxStr of Object.keys(next)) {
                const i = Number(idxStr);
                const slot = mySlots[i];
                if (slot?.ownerId === myId && slot.value === next[i]) {
                    delete next[i]; changed = true;
                }
            }
            return changed ? next : prev;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game.team0Slots, game.team1Slots]);

    // Vider draft — mode B
    useEffect(() => {
        if (serverHasSlots) return;
        const teamTraps = myTeam === 0 ? (game.team1Traps ?? []) : (game.team0Traps ?? []);
        setLocalDraft(prev => {
            const next = { ...prev };
            let changed = false;
            for (const idxStr of Object.keys(next)) {
                const i = Number(idxStr);
                if ((teamTraps[i] ?? '') === next[i]) { delete next[i]; changed = true; }
            }
            return changed ? next : prev;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game.team0Traps, game.team1Traps]);

    const getDisplayValue = useCallback((i: number) =>
        i in localDraft ? localDraft[i] : (mySlots[i]?.value ?? ''),
    [localDraft, mySlots]);

    const getOwnerInfo = useCallback((i: number) => {
        if (i in localDraft && localDraft[i])
            return { ownerUsername: null, ownerColor: null, isMe: true };
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

    return { mySlots, getDisplayValue, getOwnerInfo, handleChange, teammates, rich };
}

// ── Composant principal ───────────────────────────────────────────────────────

export function TrapPhase({ game, myId, myTeam, lobbyId, socketRef }: TrapPhaseProps) {
    const { getDisplayValue, getOwnerInfo, handleChange, teammates, rich } =
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

            {myTeam !== null && (
                <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-white/30">
                            ✏️ Pièges de l'équipe
                            {!rich && <span className="ml-1 text-white/20">(badges disponibles après mise à jour serveur)</span>}
                        </p>
                        {rich && teammates.length > 0 && (
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
                            ownerInfo={rich ? getOwnerInfo(i) : { ownerUsername: null, ownerColor: null, isMe: false }}
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
