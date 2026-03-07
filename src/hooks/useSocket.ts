// hooks/useSocket.ts
import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { getLobbySocket, getQuizSocket, getUnoSocket } from "@/lib/socket";

export function useLobbySocket() {
    return useSocketInstance(getLobbySocket);
}

export function useQuizSocket() {
    return useSocketInstance(getQuizSocket);
}

export function useUnoSocket() {
    return useSocketInstance(getUnoSocket);
}

function useSocketInstance(getter: () => Socket | null) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const s = getter();
        if (!s) return;

        setSocket(s);
        setConnected(s.connected);

        const onConnect = () => setConnected(true);
        const onDisconnect = () => setConnected(false);

        s.on("connect", onConnect);
        s.on("disconnect", onDisconnect);

        return () => {
            s.off("connect", onConnect);
            s.off("disconnect", onDisconnect);
        };
    }, []);

    return { socket, connected };
}
