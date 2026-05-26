interface Props {
    team: '0' | '1' | 0 | 1;
    className?: string;
}

export default function TeamDot({ team, className = 'w-3 h-3' }: Props) {
    const isTeam0 = String(team) === '0';
    return <span className={`inline-block rounded-full ${className} ${isTeam0 ? 'bg-primary-500' : 'bg-felt-600'} align-middle`} />;
}
