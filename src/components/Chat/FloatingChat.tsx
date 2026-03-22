// src/components/FloatingChat.tsx
// components/FloatingChat.tsx
'use client';

import { useChat } from '@/context/ChatContext';
import { useSession } from 'next-auth/react';
import Chat from '@/components/Chat/Chat';

export default function FloatingChat() {
    const { lobbyId, messages, teamMessages, myTeam, hasTeamChat, sendChat } = useChat();
    const { data: session } = useSession();
    if (!lobbyId) return null;

    return (
        <Chat
            messages={messages}
            teamMessages={hasTeamChat && myTeam !== undefined ? teamMessages : undefined}
            onSend={sendChat}
            teamColor={hasTeamChat && myTeam !== undefined ? myTeam : undefined}
            currentUserId={session?.user?.id}
        />
    );
}
