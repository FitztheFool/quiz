import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get('token');
    if (!token) return NextResponse.redirect(new URL('/login?error=InvalidToken', req.url));

    const record = await prisma.verificationToken.findUnique({ where: { token } });
    if (!record || record.expires < new Date()) {
        if (record) await prisma.verificationToken.delete({ where: { token } });
        return NextResponse.redirect(new URL('/login?error=TokenExpired', req.url));
    }

    await Promise.all([
        prisma.user.updateMany({
            where: { email: record.identifier, status: 'PENDING' },
            data: { status: 'ACTIVE', role: 'USER', isAnonymous: false },
        }),
        prisma.verificationToken.delete({ where: { token } }),
    ]);

    return NextResponse.redirect(new URL('/login?verified=1', req.url));
}
