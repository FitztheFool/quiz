import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
    if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
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
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
