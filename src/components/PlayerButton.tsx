// src/components/PlayerButton.tsx

interface Player {
    username: string;
    score: number;
    placement: number | null;
}

interface PlayerButtonProps {
    players: Player[];
    onClick: () => void;
}

export default function PlayerButton({ players, onClick }: PlayerButtonProps) {
    if (players.length === 0) return <span className="text-gray-300 dark:text-gray-600">—</span>;

    return (
        <button
            onClick={onClick}
            className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
            👥 {players.length}
        </button>
    );
}
