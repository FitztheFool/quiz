import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const auth = req.headers.get('authorization') ?? '';
    const secret = process.env.CRON_SECRET;
    const expected = `Bearer ${secret}`;
    const authorized =
        secret &&
        auth.length === expected.length &&
        timingSafeEqual(Buffer.from(auth), Buffer.from(expected));
    if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const deleted = await prisma.user.deleteMany({
            where: {
                isAnonymous: true,
                role: 'GUEST',
            },
        });

        console.log(`✅ Cron OK — ${deleted.count} guests supprimés`);
        return NextResponse.json({ ok: true, deleted: deleted.count });

    } catch (err) {
        console.error('❌ Cron failed:', err);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
