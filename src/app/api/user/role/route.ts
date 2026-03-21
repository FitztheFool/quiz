import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const auth = req.headers.get('authorization');
    const secret = process.env.INTERNAL_API_KEY;
    if (!secret || auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    return NextResponse.json({ role: user.role });
}
