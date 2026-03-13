import { redirect } from 'next/navigation';
import LeaderboardView from '@/components/LeaderboardView';

type Game = 'uno' | 'skyjow' | 'taboo' | 'quiz' | 'yahtzee';
const VALID_GAMES: Game[] = ['uno', 'skyjow', 'taboo', 'quiz', 'yahtzee'];

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
