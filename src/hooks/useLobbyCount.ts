'use client';
import { useEffect, useState } from 'react';
import { useLobbySocket } from '@/hooks/useSocket';

interface LobbyEntry {
    id: string;
    currentPlayers: number;
    maxPlayers: number;
    status: 'waiting' | 'in-progress';
}

export function useLobbyCount(): number {
    const { socket, connected } = useLobbySocket();
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!socket || !connected) return;
        socket.emit('get:lobbies');
        const onLobbies = (data: LobbyEntry[]) => {
            const joinable = data.filter(l => l.status === 'waiting' && l.currentPlayers < l.maxPlayers).length;
            setCount(joinable);
        };
        socket.on('lobbies', onLobbies);
        const interval = setInterval(() => {
            if (socket.connected) socket.emit('get:lobbies');
        }, 30_000);
        return () => {
            socket.off('lobbies', onLobbies);
            clearInterval(interval);
        };
    }, [socket, connected]);

    return count;
}
