import BotBadge from './BotBadge';
import AfkCountdown from '@/components/AfkCountdown';

interface Props {
    username: string;
    active: boolean;
    isBot?: boolean;
    bgClass: string;
    dotExtraClass?: string;
    inactivityEndsAt?: number | null;
}

export default function PlayerLabel({ username, active, isBot, bgClass, dotExtraClass, inactivityEndsAt }: Props) {
    return (
        <span className={`flex items-center gap-1.5 transition-all ${active ? 'font-bold' : 'font-normal opacity-60'}`}>
            <span className={`inline-block w-3 h-3 rounded-full ${bgClass} ${dotExtraClass ?? 'align-middle'}`} />
            {username}
            {isBot && <BotBadge />}
            {inactivityEndsAt != null && <AfkCountdown endsAt={inactivityEndsAt} />}
        </span>
    );
}
