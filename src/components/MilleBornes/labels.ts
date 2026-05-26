import type { MBCard, MBPlayerView, HazardType, RemedyType, SafetyType, BattleTop } from '@/hooks/useMilleBornes';

export const HAZARD_LABEL: Record<HazardType, string> = {
    stop: 'Feu rouge',
    speedLimit: 'Limite 50',
    accident: 'Accident',
    outOfGas: "Panne d'essence",
    flatTire: 'Crevaison',
};

export const REMEDY_LABEL: Record<RemedyType, string> = {
    go: 'Feu vert',
    endLimit: 'Fin de limite',
    repairs: 'Réparations',
    gas: 'Essence',
    spareTire: 'Roue de secours',
};

export const SAFETY_LABEL: Record<SafetyType, string> = {
    rightOfWay: 'Prioritaire',
    drivingAce: 'As du volant',
    fuelTank: 'Citerne',
    punctureProof: 'Increvable',
};

/** What each safety (botte) does — shown as a hover tooltip. */
export const SAFETY_DESC: Record<SafetyType, string> = {
    rightOfWay: 'Prioritaire : immunise contre le Feu rouge et la Limite de vitesse (vous gardez toujours la priorité).',
    drivingAce: "As du volant : immunise contre les Accidents.",
    fuelTank: "Citerne : immunise contre les Pannes d'essence.",
    punctureProof: 'Increvable : immunise contre les Crevaisons.',
};

/** Hazard each safety neutralises (for coup fourré messaging). */
export const SAFETY_HAZARD: Record<SafetyType, HazardType[]> = {
    rightOfWay: ['stop', 'speedLimit'],
    drivingAce: ['accident'],
    fuelTank: ['outOfGas'],
    punctureProof: ['flatTire'],
};

export function cardTitle(card: MBCard): string {
    switch (card.kind) {
        case 'distance': return `${card.km}`;
        case 'hazard': return HAZARD_LABEL[card.hazard!];
        case 'remedy': return REMEDY_LABEL[card.remedy!];
        case 'safety': return SAFETY_LABEL[card.safety!];
    }
}

/** Short human-readable driving status for a player. */
export function drivingStatus(p: MBPlayerView): { label: string; tone: 'go' | 'stop' | 'warn' } {
    const bt: BattleTop = p.battleTop;
    if (p.finished) return { label: 'Arrivé', tone: 'go' };
    if (bt === 'stop') return { label: 'Feu rouge', tone: 'stop' };
    if (bt === 'accident') return { label: 'Accident', tone: 'stop' };
    if (bt === 'outOfGas') return { label: "Panne d'essence", tone: 'stop' };
    if (bt === 'flatTire') return { label: 'Crevaison', tone: 'stop' };
    if (p.canRoll) return { label: p.speedLimited ? 'En route · limité 50' : 'En route', tone: p.speedLimited ? 'warn' : 'go' };
    // Hazard remedied but no green light yet (repairs/gas/spareTire/null).
    return { label: 'Feu vert requis', tone: 'warn' };
}

/** Whether `hazard` can be played on `target` (mirrors the server's canAttack). */
export function canAttackTarget(target: MBPlayerView, hazard: HazardType): boolean {
    if (!target.alive || target.finished) return false;
    const immune: Record<HazardType, SafetyType> = {
        stop: 'rightOfWay', speedLimit: 'rightOfWay', accident: 'drivingAce',
        outOfGas: 'fuelTank', flatTire: 'punctureProof',
    };
    if (target.safeties.includes(immune[hazard])) return false;
    if (hazard === 'speedLimit') return !target.speedLimited;
    // Battle hazards: the target must have a green light.
    return target.canRoll;
}

/** Whether `remedy` would help `target` (used to allow helping a teammate in 2v2). */
export function canRemedyHelp(target: MBPlayerView, remedy: RemedyType): boolean {
    if (!target.alive || target.finished) return false;
    const bt = target.battleTop;
    if (remedy === 'go') return bt !== 'go' && bt !== 'accident' && bt !== 'outOfGas' && bt !== 'flatTire';
    if (remedy === 'endLimit') return target.speedLimited;
    if (remedy === 'repairs') return bt === 'accident';
    if (remedy === 'gas') return bt === 'outOfGas';
    if (remedy === 'spareTire') return bt === 'flatTire';
    return false;
}

/** Client-side guess of whether a non-targeted card is playable now (server is authoritative). */
export function canPlayNow(card: MBCard, me: MBPlayerView, target: number): boolean {
    switch (card.kind) {
        case 'safety': return true;
        case 'distance': {
            if (!me.canRoll) return false;
            const km = card.km!;
            if (me.speedLimited && km > 50) return false;
            if (me.distance + km > target) return false;
            return true;
        }
        case 'remedy': {
            const r = card.remedy!;
            if (r === 'go') return me.battleTop !== 'go' && me.battleTop !== 'accident' && me.battleTop !== 'outOfGas' && me.battleTop !== 'flatTire';
            if (r === 'endLimit') return me.speedLimited;
            if (r === 'repairs') return me.battleTop === 'accident';
            if (r === 'gas') return me.battleTop === 'outOfGas';
            if (r === 'spareTire') return me.battleTop === 'flatTire';
            return false;
        }
        case 'hazard': return true; // needs a target, handled by the UI
    }
}
