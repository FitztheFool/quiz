import TeamDot from './TeamDot';

interface Props {
    scores: Record<string, number>;
    myTeam: 0 | 1 | null;
    currentTeam: 0 | 1 | null;
}

export default function ScoreBar({ scores, myTeam, currentTeam }: Props) {
    const myT = myTeam !== null ? String(myTeam) : '0';
    const advT = myTeam !== null ? String(1 - myTeam) : '1';
    const myActive = String(currentTeam) === myT;
    const advActive = String(currentTeam) === advT;

    return (
        <div className="flex items-center gap-2 justify-center">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">vous</span>
            <TeamDot team={myT as '0' | '1'} className="w-4 h-4" />
            <span className={`text-2xl font-bold leading-none transition-colors ${myActive ? (myT === '0' ? 'text-primary-500' : 'text-felt-600') : 'text-gray-900 dark:text-white'}`}>
                {scores[myT] ?? 0}
            </span>
            <span className="text-gray-400 dark:text-gray-500 font-bold text-sm">–</span>
            <span className={`text-2xl font-bold leading-none transition-colors ${advActive ? (advT === '0' ? 'text-primary-500' : 'text-felt-600') : 'text-gray-900 dark:text-white'}`}>
                {scores[advT] ?? 0}
            </span>
            <TeamDot team={advT as '0' | '1'} className="w-4 h-4" />
            <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">adv</span>
        </div>
    );
}
