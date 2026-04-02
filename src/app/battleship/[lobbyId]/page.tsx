'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function GameRedirect() {
    const params = useParams<{ lobbyId: string }>();
    const router = useRouter();
    useEffect(() => {
        router.replace(`/lobby/create/${params.lobbyId ?? ''}`);
    }, [params.lobbyId, router]);
    return null;
}
