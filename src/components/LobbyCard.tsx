// src/components/LobbyCard.tsx
import { GAME_CONFIG } from '@/lib/gameConfig';

const gameTypeEmojis: Record<string, string> = {
    all: '🎮',
    ...Object.fromEntries(Object.entries(GAME_CONFIG).map(([key, val]) => [key, val.icon])),
};

interface LobbyCardProps {
    lobby: {
        id: string;
        title: string;
        description: string;
        gameType: string;
        maxPlayers: number;
        currentPlayers: number;
        status: 'waiting' | 'in-progress';
        host: string;
        playerNames?: string[];
    };
    onJoin: (lobbyId: string) => void;
    onPlayersClick: (lobbyId: string, playerNames: string[]) => void;
}

export default function LobbyCard({ lobby, onJoin, onPlayersClick }: LobbyCardProps) {
    const isFull = lobby.currentPlayers >= lobby.maxPlayers;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:shadow-xl transition-all relative flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{lobby.title}</h3>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${lobby.status === 'waiting'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                    {lobby.status === 'waiting' ? '🟢 En attente' : '🔵 En cours'}
                </span>
            </div>

            <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-2 tracking-wider mb-1">
                Code : {lobby.id}
            </span>

            <p className="text-gray-600 dark:text-gray-300 mb-6 line-clamp-2">{lobby.description}</p>

            <div className="space-y-3 mb-6 flex-1">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">🎮 Jeu:</span>
                    <span className="font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {gameTypeEmojis[lobby.gameType] || '🎮'} {lobby.gameType.charAt(0).toUpperCase() + lobby.gameType.slice(1)}
                    </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">👥 Joueurs:</span>
                    <button
                        onClick={() => onPlayersClick(lobby.id, lobby.playerNames ?? [])}
                        className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        {lobby.currentPlayers}/{lobby.maxPlayers}
                    </button>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">👑 Hôte:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{lobby.host}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(lobby.currentPlayers / lobby.maxPlayers) * 100}%` }}
                    />
                </div>
            </div>

            <button
                onClick={() => onJoin(lobby.id)}
                disabled={isFull && lobby.status === 'waiting'}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 hover:scale-105 active:scale-95"
            >
                {isFull && lobby.status === 'waiting' ? '🏁 Complet' : '🚀 Rejoindre'}
            </button>
        </div>
    );
}
