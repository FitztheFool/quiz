export const UNO_REWARDS: Record<number, number> = {
    1: 8,
    2: 5,
    3: 3,
};

export const UNO_DEFAULT_REWARD = 1;

export function computeUnoScore(rank: number): number {
    return UNO_REWARDS[rank] ?? UNO_DEFAULT_REWARD;
}
