import { createSoloSubmitHandler } from '@/lib/soloSubmitHandler';

export const POST = createSoloSubmitHandler({
    gameType: 'FLAPPY_BIRD',
    maxScore: 100_000,
    // Flappy Bird deaths happen in seconds — keep just enough to deter trivial replay.
    minDurationMs: 1_500,
});
