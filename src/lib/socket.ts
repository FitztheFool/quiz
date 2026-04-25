// src/lib/socket.ts
import { io, Socket } from "socket.io-client";

// ── Token cache ───────────────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenFetchedAt = 0;
const TOKEN_TTL_MS = 12 * 60 * 1000; // refresh 3 min before the 15 min server expiry

async function getSocketToken(): Promise<string> {
    const now = Date.now();
    if (cachedToken && now - tokenFetchedAt < TOKEN_TTL_MS) return cachedToken;
    try {
        const res = await fetch('/api/socket-token');
        if (res.status === 401) return '';
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        cachedToken = data.token as string;
        tokenFetchedAt = now;
        return cachedToken;
    } catch (err) {
        console.error('❌ socket-token fetch failed:', err);
        return '';
    }
}

// ── Socket factory ────────────────────────────────────────────────────────────

let lobbySocket: Socket | null = null;
let quizSocket: Socket | null = null;
let unoSocket: Socket | null = null;
let tabooSocket: Socket | null = null;
let skyjowSocket: Socket | null = null;
let yahtzeeSocket: Socket | null = null;
let puissance4Socket: Socket | null = null;
let justOneSocket: Socket | null = null;
let impostorSocket: Socket | null = null;
let diamantSocket: Socket | null = null;
let battleshipSocket: Socket | null = null;

function createSocket(url: string, name: string): Socket {
    const socket = io(url, {
        transports: ["websocket"],
        withCredentials: true,
        autoConnect: false,
        auth: (cb) => {
            getSocketToken().then((token) => cb({ token }));
        },
    });
    socket.on("connect", () => console.log(`✅ ${name} connecté`, socket.id));
    socket.on("connect_error", (err) => {
        if ((err as { message?: string }).message === 'auth_required') return;
        console.error(`❌ ${name} error:`, err);
    });
    return socket;
}

function connectIfAuth(socket: Socket): void {
    getSocketToken().then(token => {
        if (token && !socket.connected) socket.connect();
    });
}

export function getLobbySocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (!lobbySocket) lobbySocket = createSocket(process.env.NEXT_PUBLIC_LOBBY_SERVER_URL ?? "http://localhost:10000", "Lobby Socket");
    connectIfAuth(lobbySocket);
    return lobbySocket;
}

export function getUnoSocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (!unoSocket) unoSocket = createSocket(process.env.NEXT_PUBLIC_UNO_SERVER_URL ?? "http://localhost:10001", "UNO Socket");
    connectIfAuth(unoSocket);
    return unoSocket;
}

export function getQuizSocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (!quizSocket) quizSocket = createSocket(process.env.NEXT_PUBLIC_QUIZ_SERVER_URL ?? "http://localhost:10002", "Quiz Socket");
    connectIfAuth(quizSocket);
    return quizSocket;
}

export function getTabooSocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (!tabooSocket) tabooSocket = createSocket(process.env.NEXT_PUBLIC_TABOO_SERVER_URL ?? "http://localhost:10003", "Taboo Socket");
    connectIfAuth(tabooSocket);
    return tabooSocket;
}

export function getSkyjowSocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (!skyjowSocket) skyjowSocket = createSocket(process.env.NEXT_PUBLIC_SKYJOW_SERVER_URL ?? "http://localhost:10004", "Skyjow Socket");
    connectIfAuth(skyjowSocket);
    return skyjowSocket;
}

export function getYahtzeeSocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (!yahtzeeSocket) yahtzeeSocket = createSocket(process.env.NEXT_PUBLIC_YAHTZEE_SERVER_URL ?? "http://localhost:10005", "Yahtzee Socket");
    connectIfAuth(yahtzeeSocket);
    return yahtzeeSocket;
}

export function getPuissance4Socket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (!puissance4Socket) puissance4Socket = createSocket(process.env.NEXT_PUBLIC_P4_SERVER_URL ?? "http://localhost:10006", "Puissance 4 Socket");
    connectIfAuth(puissance4Socket);
    return puissance4Socket;
}

export function getJustOneSocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (!justOneSocket) justOneSocket = createSocket(process.env.NEXT_PUBLIC_JUSTONE_SERVER_URL ?? "http://localhost:10007", "Just One Socket");
    connectIfAuth(justOneSocket);
    return justOneSocket;
}

export function getBattleshipSocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (!battleshipSocket) battleshipSocket = createSocket(process.env.NEXT_PUBLIC_BATTLESHIP_SERVER_URL ?? "http://localhost:10008", "Battleship Socket");
    connectIfAuth(battleshipSocket);
    return battleshipSocket;
}

export function getDiamantSocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (!diamantSocket) diamantSocket = createSocket(process.env.NEXT_PUBLIC_DIAMANT_SERVER_URL ?? "http://localhost:10009", "Diamant Socket");
    connectIfAuth(diamantSocket);
    return diamantSocket;
}

export function getImpostorSocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (!impostorSocket) impostorSocket = createSocket(process.env.NEXT_PUBLIC_IMPOSTOR_SERVER_URL ?? "http://localhost:10010", "Impostor Socket");
    connectIfAuth(impostorSocket);
    return impostorSocket;
}
