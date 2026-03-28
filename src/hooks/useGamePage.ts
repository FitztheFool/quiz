'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useChat } from '@/context/ChatContext';

export function useGamePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams<{ lobbyId: string }>();
    const lobbyId = params?.lobbyId ?? '';
    const { setLobbyId } = useChat();

    const [isNotFound, setIsNotFound] = useState(false);
    const [modalDismissed, setModalDismissed] = useState(false);

    useEffect(() => {
        setLobbyId(lobbyId);
        return () => setLobbyId(null);
    }, [lobbyId, setLobbyId]);

    const me = useMemo(() => ({
        userId: session?.user?.id ?? '',
        username: session?.user?.username ?? session?.user?.email ?? 'Joueur',
    }), [session]);

    return { lobbyId, session, status, router, me, isNotFound, setIsNotFound, modalDismissed, setModalDismissed };
}
