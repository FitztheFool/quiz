import { createSoloSubmitHandler } from '@/lib/soloSubmitHandler';

export const POST = createSoloSubmitHandler({ gameType: 'SPACE_INVADERS', maxScore: 1_000_000 });
