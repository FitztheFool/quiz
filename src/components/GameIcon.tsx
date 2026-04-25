'use client';

import {
    RectangleStackIcon,
    Squares2X2Icon,
    ChatBubbleLeftRightIcon,
    QuestionMarkCircleIcon,
    CubeIcon,
    CircleStackIcon,
    LanguageIcon,
    ViewfinderCircleIcon,
    SparklesIcon,
    EyeSlashIcon,
    RectangleGroupIcon,
} from '@heroicons/react/24/outline';

function PacmanIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" opacity="0"/>
            <path d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2zm0 2l8.66 5-8.66 5V4zm0 8l8.66 5A10 10 0 0 1 3 17.5z" opacity="0"/>
            <path d="M13.5 12 22 7.27A10 10 0 0 0 2 12a10 10 0 0 0 20 0 10 10 0 0 0-.09-1.27z" opacity="0"/>
            <circle cx="12" cy="12" r="10" opacity="0"/>
            <path d="M12 2a10 10 0 0 0-10 10 10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2zm5.66 5.86L12 12 17.66 18.14A8 8 0 0 1 4 12a8 8 0 0 1 13.66-4.14z"/>
        </svg>
    );
}

function SnakeIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M3 18 Q3 21 7 21 L17 21 Q21 21 21 17 Q21 13 17 13 L7 13 Q3 13 3 9 Q3 5 7 5 L17 5" />
            <circle cx="17" cy="5" r="2.5" fill="currentColor" stroke="none" />
        </svg>
    );
}

const GAME_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    UNO:        RectangleStackIcon,
    SKYJOW:     Squares2X2Icon,
    TABOO:      ChatBubbleLeftRightIcon,
    QUIZ:       QuestionMarkCircleIcon,
    YAHTZEE:    CubeIcon,
    PUISSANCE4: CircleStackIcon,
    JUST_ONE:   LanguageIcon,
    BATTLESHIP: ViewfinderCircleIcon,
    DIAMANT:    SparklesIcon,
    IMPOSTOR:   EyeSlashIcon,
    SNAKE:      SnakeIcon,
    PACMAN:     PacmanIcon,
    // lowercase keys for gameConfig key-based lookups
    uno:        RectangleStackIcon,
    skyjow:     Squares2X2Icon,
    taboo:      ChatBubbleLeftRightIcon,
    quiz:       QuestionMarkCircleIcon,
    yahtzee:    CubeIcon,
    puissance4: CircleStackIcon,
    just_one:   LanguageIcon,
    battleship: ViewfinderCircleIcon,
    diamant:    SparklesIcon,
    impostor:   EyeSlashIcon,
    snake:      SnakeIcon,
    pacman:     PacmanIcon,
};

interface Props {
    gameType: string;
    className?: string;
}

export default function GameIcon({ gameType, className = 'w-5 h-5' }: Props) {
    const Icon = GAME_ICON_MAP[gameType] ?? RectangleGroupIcon;
    return <Icon className={className} />;
}
