import { io, Socket } from "socket.io-client";

let lobbySocket: Socket | null = null;
let quizSocket: Socket | null = null;
let unoSocket: Socket | null = null;

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
    if (!lobbySocket) lobbySocket = createSocket(process.env.NEXT_PUBLIC_LOBBY_SOCKET_URL ?? "", "Lobby Socket");
    if (!lobbySocket.connected) lobbySocket.connect();
    return lobbySocket;
}

export function getQuizSocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (!quizSocket) quizSocket = createSocket(process.env.NEXT_PUBLIC_QUIZ_SOCKET_URL ?? "", "Quiz Socket");
    if (!quizSocket.connected) quizSocket.connect();
    return quizSocket;
}

export function getUnoSocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (!unoSocket) unoSocket = createSocket(process.env.NEXT_PUBLIC_UNO_SOCKET_URL ?? "", "UNO Socket");
    if (!unoSocket.connected) unoSocket.connect();
    return unoSocket;
}
