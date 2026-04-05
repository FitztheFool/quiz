// components/MembersOnlyBanner.tsx
'use client';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function MembersOnlyBanner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (searchParams.get('error') === 'members_only') {
            setVisible(true);

            // Nettoie le query param sans recharger la page
            const params = new URLSearchParams(searchParams.toString());
            params.delete('error');
            const clean = params.size ? `${pathname}?${params}` : pathname;
            router.replace(clean, { scroll: false });

            // Disparaît après 5 s
            const t = setTimeout(() => setVisible(false), 5000);
            return () => clearTimeout(t);
        }
    }, [searchParams]);

    if (!visible) return null;

    return (
        <div
            role="alert"
            className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-800 shadow-sm"
        >
            <span className="text-lg">🔒</span>
            <p className="text-sm font-medium">
                Seuls les membres inscrits peuvent créer ou générer un quiz.
            </p>
            <button
                onClick={() => setVisible(false)}
                className="ml-auto text-amber-500 hover:text-amber-700 transition"
                aria-label="Fermer"
            >
                ✕
            </button>
        </div>
    );
}
