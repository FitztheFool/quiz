// src/app/lobby/all/page.tsx
'use client';
import ServerWarmupLoader from '@/components/ServerWarmupLoader';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLobbySocket } from '@/hooks/useSocket';
import { useServerWarmup } from '@/hooks/useServerWarmup';
import { GAME_CONFIG, LOBBY_GAME_OPTIONS } from '@/lib/gameConfig';
import PlayerModal from '@/components/PlayerModal';
import LobbyCard from '@/components/LobbyCard';
import { RectangleGroupIcon, MagnifyingGlassIcon, FlagIcon, PlusIcon } from '@heroicons/react/24/outline';

interface Lobby {
    id: string;
    title: string;
    description: string;
    gameType: string;
    maxPlayers: number;
    currentPlayers: number;
    status: 'waiting' | 'in-progress';
    host: string;
    playerNames?: string[];
}

const gameTypes = ['all', ...LOBBY_GAME_OPTIONS.map(g => g.value)];


function LobbiesPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { status: warmupStatus } = useServerWarmup(process.env.NEXT_PUBLIC_LOBBY_SERVER_URL);
    const { socket, connected } = useLobbySocket();
    const [lobbies, setLobbies] = useState<Lobby[]>([]);

    const [selectedGameType, setSelectedGameType] = useState(() => {
        const g = searchParams.get('game');
        return g && gameTypes.includes(g) ? g : 'all';
    });
    const [showFull, setShowFull] = useState(false);
    const [sortBy, setSortBy] = useState('newest');
    const [lobbyPlayerModal, setLobbyPlayerModal] = useState<{ gameId: string; players: { username: string; score: number; placement: number | null }[] } | null>(null);


    useEffect(() => {
        if (socket && connected) {
            // Request lobbies from server
            socket.emit('get:lobbies');

            // Listen for lobbies update (optional, since we have mock data)
            socket.on('lobbies', (data: Lobby[]) => {
                setLobbies(data);
            });

            return () => {
                socket.off('lobbies');
            };
        }
    }, [socket, connected]);

    const filteredLobbies = lobbies.filter(lobby => {

        if (selectedGameType !== 'all' && lobby.gameType !== selectedGameType) return false;
        if (!showFull && lobby.currentPlayers >= lobby.maxPlayers) return false;
        if (lobby.status === 'in-progress') return false;
        return true;
    }).sort((a, b) => {
        switch (sortBy) {
            case 'players':
                return b.currentPlayers - a.currentPlayers;
            case 'capacity':
                return (b.currentPlayers / b.maxPlayers) - (a.currentPlayers / a.maxPlayers);
            case 'newest':
            default:
                // Assuming no date, sort by id or something
                return b.id.localeCompare(a.id);
        }
    });

    const joinLobby = (lobbyId: string) => {
        router.push(`/lobby/create/${lobbyId}`);
    };

    if (warmupStatus === 'warming' || warmupStatus === 'checking') return <ServerWarmupLoader />;
    if (warmupStatus === 'error') return <ServerWarmupLoader error />;

    return (
        <main className="flex-1">
            <div className="max-w-7xl mx-auto px-4 py-6 sm:py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Voir les lobbies</h1>
                </div>

                {/* Filters */}
                <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <MagnifyingGlassIcon className="w-5 h-5" />
                            Filtres et Tri
                        </h2>
                        <div className="text-right">
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{filteredLobbies.length}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">lobbies trouvés</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type de jeu</label>
                            <select
                                value={selectedGameType}
                                onChange={(e) => setSelectedGameType(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            >
                                {gameTypes.map(type => (
                                    <option key={type} value={type} className="bg-white dark:bg-gray-700">
                                        {type === 'all' ? 'Tous' : (GAME_CONFIG[type as keyof typeof GAME_CONFIG]?.label ?? type)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Trier par</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            >
                                <option value="newest" className="bg-white dark:bg-gray-700">Plus récent</option>
                                <option value="players" className="bg-white dark:bg-gray-700">Nombre de joueurs</option>
                                <option value="capacity" className="bg-white dark:bg-gray-700">Capacité</option>
                                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Filtres</label>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex items-center cursor-pointer">
                                    <input type="checkbox" checked={showFull} onChange={(e) => setShowFull(e.target.checked)}
                                        className="mr-3 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1"><FlagIcon className="w-4 h-4" />Lobbies complets</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Lobby Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredLobbies.map(lobby => (
                        <LobbyCard
                            key={lobby.id}
                            lobby={lobby}
                            onJoin={joinLobby}
                            onPlayersClick={(id, playerNames) => setLobbyPlayerModal({
                                gameId: id,
                                players: playerNames.map(username => ({ username, score: 0, placement: null }))
                            })}
                        />
                    ))}
                </div>

                {lobbyPlayerModal && (
                    <PlayerModal
                        gameId={lobbyPlayerModal.gameId}
                        players={lobbyPlayerModal.players}
                        onClose={() => setLobbyPlayerModal(null)}
                    />
                )}

                {filteredLobbies.length === 0 && (
                    <div className="text-center py-16">
                        <div className="mb-4"><RectangleGroupIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" /></div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Aucun lobby trouvé</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Essayez de modifier vos filtres pour voir plus de lobbies.</p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => {
                                    setSelectedGameType('all');
                                    setShowFull(false);
                                    setSortBy('newest');
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                            >
                                Réinitialiser les filtres
                            </button>
                            <button
                                onClick={() => router.push(`/lobby/create/${crypto.randomUUID()}`)}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                            >
                                <PlusIcon className="w-4 h-4 inline mr-1" />Créer un lobby
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}

export default function LobbiesPage() {
    return (
        <Suspense>
            <LobbiesPageInner />
        </Suspense>
    );
}
