import { io, Socket } from "socket.io-client";

let lobbySocket: Socket | null = null;
let quizSocket: Socket | null = null;
let unoSocket: Socket | null = null;
let tabooSocket: Socket | null = null;
let skyjowSocket: Socket | null = null;
let yahtzeeSocket: Socket | null = null;

function createSocket(url: string, name: string): Socket {
    const socket = io(url, {
        transports: ["websocket"],
        withCredentials: true,
        autoConnect: false,
    });
    socket.on("connect", () => console.log(`✅ ${name} connecté`, socket.id));
    socket.on("connect_error", (err) => console.error(`❌ ${name} error:`, err));
    return socket;
}

export function getLobbySocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (!lobbySocket) lobbySocket = createSocket(process.env.NEXT_PUBLIC_LOBBY_SOCKET_URL ?? "http://localhost:10000", "Lobby Socket");
    if (!lobbySocket.connected) lobbySocket.connect();
    return lobbySocket;
}

export function getUnoSocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (!unoSocket) unoSocket = createSocket(process.env.NEXT_PUBLIC_UNO_SOCKET_URL ?? "http://localhost:10001", "UNO Socket");
    if (!unoSocket.connected) unoSocket.connect();
    return unoSocket;
}

export function getQuizSocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (!quizSocket) quizSocket = createSocket(process.env.NEXT_PUBLIC_QUIZ_SOCKET_URL ?? "http://localhost:10002", "Quiz Socket");
    if (!quizSocket.connected) quizSocket.connect();
    return quizSocket;
}

export function getTabooSocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (!tabooSocket) tabooSocket = createSocket(process.env.NEXT_PUBLIC_TABOO_SOCKET_URL ?? "http://localhost:10003", "Taboo Socket");
    if (!tabooSocket.connected) tabooSocket.connect();
    return tabooSocket;
}

export function getSkyjowSocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (!skyjowSocket) skyjowSocket = createSocket(process.env.NEXT_PUBLIC_SKYJOW_SERVER_URL ?? "http://localhost:10004", "Skyjow Socket");
    if (!skyjowSocket.connected) skyjowSocket.connect();
    return skyjowSocket;
}


export function getYahtzeeSocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (!yahtzeeSocket) yahtzeeSocket = createSocket(process.env.NEXT_PUBLIC_YAHTZEE_SERVER_URL ?? "http://localhost:10005", "Yahtzee Socket");
    if (!yahtzeeSocket.connected) yahtzeeSocket.connect();
    return yahtzeeSocket;
}
