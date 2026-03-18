import { redirect } from 'next/navigation';
import LeaderboardView from '@/components/LeaderboardView';

type Game = 'uno' | 'skyjow' | 'taboo' | 'quiz' | 'yahtzee' | 'puissance4' | 'just-one' | 'battleship';
const VALID_GAMES: Game[] = ['uno', 'skyjow', 'taboo', 'quiz', 'yahtzee', 'puissance4', 'just-one', 'battleship'];

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
