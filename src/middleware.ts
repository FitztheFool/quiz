import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
    const token = await getToken({ req });
    if (
        token?.needsUsernameToken &&
        !req.nextUrl.pathname.startsWith('/auth/choose-username') &&
        !req.nextUrl.pathname.startsWith('/api/')
    ) {
        return NextResponse.redirect(
            new URL(`/auth/choose-username?token=${token.needsUsernameToken}`, req.url)
        );
    }
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
