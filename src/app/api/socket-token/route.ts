import { auth } from '@/lib/auth';
import { SignJWT } from 'jose';
import { NextResponse } from 'next/server';

const secret = new TextEncoder().encode(process.env.INTERNAL_API_KEY!);

export async function GET() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const socketToken = await new SignJWT({
        username: session.user.username,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(session.user.id)
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(secret);

    return NextResponse.json({ token: socketToken });
}
