// src/context/ChatContext.tsx
// context/ChatContext.tsx
'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getLobbySocket } from '@/lib/socket';

type ChatMessage = { userId: string; username: string; text: string; sentAt: number };

type ChatContextType = {
    lobbyId: string | null;
    setLobbyId: (id: string | null) => void;
    messages: ChatMessage[];
    teamMessages: ChatMessage[];
    myTeam: 0 | 1 | undefined;
    hasTeamChat: boolean;
    sendChat: (text: string, tab: 'lobby' | 'team') => void;
};

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const socket = useMemo(() => getLobbySocket(), []);

    const [lobbyId, setLobbyId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [teamMessages, setTeamMessages] = useState<ChatMessage[]>([]);
    const [myTeam, setMyTeam] = useState<0 | 1 | undefined>(undefined);
    const [hasTeamChat, setHasTeamChat] = useState(false);

    useEffect(() => {
        if (!socket || !session?.user?.id) return;

        const onState = (state: any) => {
            const t = state.teams?.[session.user.id];
            const team = t === 0 || t === 1 ? t : undefined;
            setMyTeam(team);
            const isTeamGame = state.gameType === 'taboo' || (state.gameType === 'uno' && state.unoOptions?.teamMode === '2v2');
            setHasTeamChat(isTeamGame);
            if (team !== undefined) socket.emit('chat:joinTeam', { team });
        };

        const onChatMessage = (msg: ChatMessage) => {
            setMessages(prev => {
                if (prev.some(m => m.sentAt === msg.sentAt && m.userId === msg.userId)) return prev;
                return [...prev, msg];
            });
        };

        const onTeamChatMessage = (msg: ChatMessage) => {
            setTeamMessages(prev => {
                if (prev.some(m => m.sentAt === msg.sentAt && m.userId === msg.userId)) return prev;
                return [...prev, msg];
            });
        };

        socket.on('lobby:state', onState);
        socket.on('chat:message', onChatMessage);
        socket.on('chat:message:team', onTeamChatMessage);

        return () => {
            socket.off('lobby:state', onState);
            socket.off('chat:message', onChatMessage);
            socket.off('chat:message:team', onTeamChatMessage);
        };
    }, [socket, session?.user?.id]);

    const sendChat = (text: string, tab: 'lobby' | 'team') => {
        if (!lobbyId) return;
        socket?.emit('chat:send', {
            lobbyId,
            text,
            team: tab === 'team' ? myTeam : undefined,
        });
    };

    return (
        <ChatContext.Provider value={{ lobbyId, setLobbyId, messages, teamMessages, myTeam, hasTeamChat, sendChat }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const ctx = useContext(ChatContext);
    if (!ctx) throw new Error('useChat must be used within ChatProvider');
    return ctx;
}
