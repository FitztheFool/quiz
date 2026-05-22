'use client';

import Card from './Card';
import type { CardState, PlayerPublic } from '@/hooks/useSkyjow';

interface Props {
    player: PlayerPublic;
    myCards?: CardState[];
    isMe: boolean;
    isCurrent: boolean;
    selectableIndices?: number[];
    onCardClick?: (index: number) => void;
    compact?: boolean;
}

export default function PlayerGrid({ player, myCards, isMe, selectableIndices, onCardClick, compact }: Props) {
    const cards = isMe && myCards ? myCards : player.cards;
    const size = compact ? 'sm' : isMe ? 'lg' : 'md';

    return (
        <div className={`grid grid-cols-4 ${compact ? 'gap-1' : isMe ? 'gap-3' : 'gap-2'}`}>
            {cards.map((card, idx) => (
                <Card
                    key={idx}
                    card={card}
                    size={size}
                    selectable={selectableIndices?.includes(idx)}
                    onClick={() => onCardClick?.(idx)}
                />
            ))}
        </div>
    );
}
