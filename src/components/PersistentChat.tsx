// src/components/PersistentChat.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getLobbySocket } from '@/lib/socket';
import Chat from '@/components/Chat';

type ChatMessage = {
    userId: string;
    username: string;
    text: string;
    sentAt: number;
};

export default function PersistentChat({ lobbyId }: { lobbyId: string }) {
    const { data: session } = useSession();
    const socket = useMemo(() => getLobbySocket(), []);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [teamMessages, setTeamMessages] = useState<ChatMessage[]>([]);
    const [myTeam, setMyTeam] = useState<0 | 1 | undefined>(undefined);
    const [hasTeamChat, setHasTeamChat] = useState(false);

    // Écoute les updates d'équipe depuis le lobby state
    useEffect(() => {
        if (!socket || !session?.user?.id) return;

        const onState = (state: { teams?: Record<string, 0 | 1> | null; gameType?: string; unoOptions?: { teamMode: string } }) => {
            const userId = session.user.id;
            const t = state.teams?.[userId];
            const team = t === 0 || t === 1 ? t : undefined;
            setMyTeam(team);

            const isTeamGame = state.gameType === 'taboo' || (state.gameType === 'uno' && state.unoOptions?.teamMode === '2v2');
            setHasTeamChat(isTeamGame);

            if (team !== undefined) {
                socket.emit('chat:joinTeam', { team });
            }
        };

        socket.on('lobby:state', onState);
        return () => { socket.off('lobby:state', onState); };
    }, [socket, session?.user?.id]);

    // Listeners chat
    useEffect(() => {
        if (!socket) return;

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

        socket.on('chat:message', onChatMessage);
        socket.on('chat:message:team', onTeamChatMessage);

        return () => {
            socket.off('chat:message', onChatMessage);
            socket.off('chat:message:team', onTeamChatMessage);
        };
    }, [socket]);

    const sendChat = (text: string, tab: 'lobby' | 'team') => {
        socket?.emit('chat:send', {
            lobbyId,
            text,
            team: tab === 'team' ? myTeam : undefined,
        });
    };

    return (
        <Chat
            messages={messages}
            teamMessages={hasTeamChat ? teamMessages : undefined}
            onSend={sendChat}
            currentUserId={session?.user?.id}
            teamColor={hasTeamChat ? myTeam : undefined}
        />
    );
}
