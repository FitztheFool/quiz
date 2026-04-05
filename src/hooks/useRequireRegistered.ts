// hooks/useRequireRegistered.ts
'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function useRequireRegistered() {
    const { data: session } = useSession();
    const router = useRouter();

    const isAnonymous = session?.user?.isAnonymous ?? true;

    /**
     * Wrapper autour des appels API réservés aux inscrits.
     * Si anonyme → redirige sans appel réseau.
     * Si le serveur répond 403 quand même → redirige aussi.
     */
    const guardedFetch = useCallback(
        async (input: RequestInfo, init?: RequestInit): Promise<Response | null> => {
            if (isAnonymous) {
                router.push('/dashboard?error=members_only');
                return null;
            }

            const res = await fetch(input, init);

            if (res.status === 403) {
                const body = await res.json().catch(() => ({}));
                if (body.error === 'ANONYMOUS_FORBIDDEN') {
                    router.push('/dashboard?error=members_only');
                    return null;
                }
            }

            return res;
        },
        [isAnonymous, router]
    );

    return { isAnonymous, guardedFetch };
}
