import { createSoloSubmitHandler } from '@/lib/soloSubmitHandler';

export const POST = createSoloSubmitHandler({
    gameType: 'PLUMBER',
    maxScore: 1_000_000,
    minDurationMs: 3_000,
});
