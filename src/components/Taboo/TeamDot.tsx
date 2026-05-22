interface Props {
    team: '0' | '1' | 0 | 1;
    className?: string;
}

export default function TeamDot({ team, className = 'w-3 h-3' }: Props) {
    const isBlue = String(team) === '0';
    return <span className={`inline-block rounded-full ${className} ${isBlue ? 'bg-blue-500' : 'bg-red-500'} align-middle`} />;
}
