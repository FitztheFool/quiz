import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.SOCKET_USER_SECRET ?? process.env.NEXTAUTH_SECRET!;
const AUD = 'solo';

export function createSoloToken(userId: string, gameType: string): string {
    const payload = Buffer.from(JSON.stringify({
        sub: userId,
        game: gameType,
        iat: Date.now(),
        aud: AUD,
    })).toString('base64url');
    const sig = createHmac('sha256', SECRET).update(payload).digest('base64url');
    return `${payload}.${sig}`;
}

export type TokenError = 'invalid' | 'expired' | 'too_fast' | 'wrong_user' | 'wrong_game';

export function verifySoloToken(
    token: string,
    userId: string,
    gameType: string,
    minDurationMs: number,
): { ok: true } | { ok: false; error: TokenError } {
    if (typeof token !== 'string' || token.length === 0) return { ok: false, error: 'invalid' };
    const [payloadB64, sig, ...rest] = token.split('.');
    if (!payloadB64 || !sig || rest.length) return { ok: false, error: 'invalid' };

    const expectedSig = createHmac('sha256', SECRET).update(payloadB64).digest('base64url');

    if (sig.length !== expectedSig.length) return { ok: false, error: 'invalid' };
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return { ok: false, error: 'invalid' };

    let payload: { sub: string; game: string; iat: number; aud?: string };
    try {
        payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    } catch {
        return { ok: false, error: 'invalid' };
    }

    if (payload.aud !== AUD) return { ok: false, error: 'invalid' };
    if (payload.sub !== userId) return { ok: false, error: 'wrong_user' };
    if (payload.game !== gameType) return { ok: false, error: 'wrong_game' };

    const age = Date.now() - payload.iat;
    if (age > 2 * 60 * 60 * 1000) return { ok: false, error: 'expired' };
    if (age < minDurationMs) return { ok: false, error: 'too_fast' };

    return { ok: true };
}
