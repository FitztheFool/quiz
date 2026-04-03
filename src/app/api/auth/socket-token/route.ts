import { getToken } from 'next-auth/jwt';
import { SignJWT } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

const secret = new TextEncoder().encode(process.env.INTERNAL_API_KEY!);

export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET! });
    if (!token?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const socketToken = await new SignJWT({
        username: token.username as string,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(token.id as string)
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(secret);

    return NextResponse.json({ token: socketToken });
}
