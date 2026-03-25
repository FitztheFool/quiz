import { NextRequest, NextResponse } from 'next/server';
import { getPending } from '@/lib/oauthPendingStore';

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    const entry = await getPending(token);
    if (!entry) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
    return NextResponse.json({ baseName: entry.baseName, suggestions: entry.suggestions });
}
