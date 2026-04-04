import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { GAME_URL_SLUGS } from '@/lib/gameConfig';

const PROTECTED_PREFIXES = ['/dashboard', '/lobby', '/game'];

// Matches /[game]/[lobbyId] only when lobbyId looks like a UUID or cuid (not a filename)
const GAME_LOBBYID_RE = new RegExp(`^/(${GAME_URL_SLUGS.join('|')})/([a-zA-Z0-9_-]{8,})$`);

export async function proxy(req: NextRequest) {
    const token = await getToken({ req });
    const { pathname } = req.nextUrl;

    // /[game]/[lobbyId] (no gameId) → redirect to lobby
    const gameMatch = pathname.match(GAME_LOBBYID_RE);
    if (gameMatch) {
        return NextResponse.redirect(new URL(`/lobby/create/${gameMatch[2]}`, req.url));
    }

    if (
        token?.needsUsernameToken &&
        !pathname.startsWith('/auth/choose-username') &&
        !pathname.startsWith('/api/')
    ) {
        return NextResponse.redirect(
            new URL(`/auth/choose-username?token=${token.needsUsernameToken}`, req.url)
        );
    }

    const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p));
    if (isProtected && !token) {
        const callbackUrl = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search);
        return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
