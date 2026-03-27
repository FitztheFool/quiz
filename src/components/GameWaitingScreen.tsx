'use client';

import { useRouter } from 'next/navigation';

interface Player {
    userId: string;
    username: string;
}

interface GameWaitingScreenProps {
    icon: string;
    gameName: string;
    lobbyId: string;
    players: Player[];
    myUserId: string;
    hostId?: string;
}

export default function GameWaitingScreen({ icon, gameName, lobbyId, players, myUserId, hostId }: GameWaitingScreenProps) {
    const router = useRouter();

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
            <header className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center gap-4">
                <div className="w-48 shrink-0">
                    <span className="font-bold">{icon} {gameName}</span>
                </div>
                <div className="flex-1 flex justify-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">En attente de joueurs…</span>
                </div>
                <div className="w-48 shrink-0 flex justify-end" />
            </header>

            <main className="flex-1 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 w-full max-w-md text-center">
                    <div className="text-5xl mb-4 animate-pulse">{icon}</div>
                    <h1 className="text-xl font-bold mb-1">Démarrage de la partie…</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                        {players.length} joueur{players.length > 1 ? 's' : ''} connecté{players.length > 1 ? 's' : ''}…
                    </p>
                    {players.length > 0 && (
                        <div className="space-y-2 text-left mb-6">
                            {players.map(p => (
                                <div key={p.userId} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                                    <span className="text-green-500 dark:text-green-400">✓</span>
                                    <span>{p.username}</span>
                                    {hostId && p.userId === hostId && <span className="text-yellow-500 dark:text-yellow-400 text-xs">👑</span>}
                                    {p.userId === myUserId && <span className="text-gray-400 dark:text-gray-500 text-xs">(moi)</span>}
                                </div>
                            ))}
                        </div>
                    )}
                    <button
                        onClick={() => router.push(`/lobby/create/${lobbyId}`)}
                        className="w-full py-3 rounded-xl bg-yellow-400 text-gray-900 font-bold hover:bg-yellow-300 transition"
                    >
                        Retour au lobby
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="mt-3 w-full py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                        Quitter
                    </button>
                </div>
            </main>
        </div>
    );
}
