import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ENV_KEYS = [
    'NEXT_PUBLIC_LOBBY_SERVER_URL',
    'NEXT_PUBLIC_UNO_SERVER_URL',
    'NEXT_PUBLIC_QUIZ_SERVER_URL',
    'NEXT_PUBLIC_TABOO_SERVER_URL',
    'NEXT_PUBLIC_SKYJOW_SERVER_URL',
    'NEXT_PUBLIC_YAHTZEE_SERVER_URL',
    'NEXT_PUBLIC_P4_SERVER_URL',
    'NEXT_PUBLIC_JUSTONE_SERVER_URL',
    'NEXT_PUBLIC_BATTLESHIP_SERVER_URL',
    'NEXT_PUBLIC_DIAMANT_SERVER_URL',
    'NEXT_PUBLIC_IMPOSTOR_SERVER_URL',
    'NEXT_PUBLIC_LUDO_SERVER_URL',
    'NEXT_PUBLIC_PERUDO_SERVER_URL',
    'NEXT_PUBLIC_CANT_STOP_SERVER_URL',
    'NEXT_PUBLIC_MILLE_BORNES_SERVER_URL',
    'NEXT_PUBLIC_SPYFALL_SERVER_URL',
];

function allowedUpstreams(): Set<string> {
    const urls = new Set<string>();
    for (const key of ALLOWED_ENV_KEYS) {
        const v = process.env[key];
        if (v) urls.add(v.replace(/\/+$/, ''));
    }
    return urls;
}

export async function GET(req: NextRequest) {
    const target = req.nextUrl.searchParams.get('url');
    if (!target) return NextResponse.json({ error: 'missing url' }, { status: 400 });

    const normalized = target.replace(/\/+$/, '');
    if (!allowedUpstreams().has(normalized)) {
        return NextResponse.json({ error: 'forbidden upstream' }, { status: 403 });
    }

    try {
        const upstream = await fetch(`${normalized}/health`, {
            signal: AbortSignal.timeout(8_000),
            cache: 'no-store',
        });
        if (upstream.ok) return new NextResponse('ok', { status: 200 });
        return new NextResponse('upstream not ready', { status: 502 });
    } catch {
        return new NextResponse('upstream unreachable', { status: 504 });
    }
}
