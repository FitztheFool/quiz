// src/lib/adminAuth.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function requireAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) };
    }
    if (session.user.role !== 'ADMIN') {
        return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) };
    }
    return { session };
}
