import { auth } from '@/lib/auth';
import { SignJWT } from 'jose';
import { NextResponse } from 'next/server';

const secretValue = process.env.SOCKET_USER_SECRET ?? process.env.INTERNAL_API_KEY;
const secret = new TextEncoder().encode(secretValue!);

export async function GET() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!secretValue) {
        return NextResponse.json({ error: 'Socket auth is not configured' }, { status: 500 });
    }

    const socketToken = await new SignJWT({
        username: session.user.username,
        tokenUse: 'socket:user',
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setAudience('kwizar-socket-user')
        .setSubject(session.user.id)
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(secret);

    return NextResponse.json({ token: socketToken });
}
