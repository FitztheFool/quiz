import { redirect } from 'next/navigation';
import LeaderboardView from '@/components/LeaderboardView';

const VALID_GAMES = ['uno', 'skyjow', 'taboo', 'quiz'] as const;
type Game = typeof VALID_GAMES[number];

interface Props {
    params: { game: string };
}

export function generateStaticParams() {
    return VALID_GAMES.map(game => ({ game }));
}

export default function LeaderboardPage({ params }: Props) {
    if (!VALID_GAMES.includes(params.game as Game)) {
        redirect('/leaderboard/uno');
    }

    return <LeaderboardView game={params.game as Game} />;
}
