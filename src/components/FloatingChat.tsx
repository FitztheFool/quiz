// src/components/FloatingChat.tsx
// components/FloatingChat.tsx
'use client';

import { useChat } from '@/context/ChatContext';
import Chat from '@/components/Chat';

export default function FloatingChat() {
    const { lobbyId, messages, teamMessages, myTeam, hasTeamChat, sendChat } = useChat();
    if (!lobbyId) return null;

    return (
        <Chat
            messages={messages}
            teamMessages={hasTeamChat ? teamMessages : undefined}
            onSend={sendChat}
            teamColor={hasTeamChat ? myTeam : undefined}
        />
    );
}
