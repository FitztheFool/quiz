import { createSoloSubmitHandler } from '@/lib/soloSubmitHandler';
import { MAX_SUTOM_SCORE } from '@/lib/sutom/engine';

export const POST = createSoloSubmitHandler({ gameType: 'SUTOM', maxScore: MAX_SUTOM_SCORE });
