// src/app/leaderboard/[game]/page.tsx
import { redirect } from 'next/navigation';
import LeaderboardView from '@/components/LeaderboardView';
import { GameType as Game, GAME_OPTIONS } from '@/lib/gameConfig';

const VALID_GAMES = GAME_OPTIONS.map(g => g.value);

type Props = {
    params: Promise<{ game: string }>;
};

export default async function LeaderboardPage({ params }: Props) {
    const { game } = await params;

    if (!VALID_GAMES.includes(game as Game)) {
        redirect('/leaderboard/uno');
    }

    return <LeaderboardView game={game as Game} />;
}
