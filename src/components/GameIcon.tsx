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

function LudoIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" />
            <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
        </svg>
    );
}

function PerudoIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect x="3" y="9" width="11" height="11" rx="2" />
            <circle cx="6.5" cy="12.5" r="1" fill="currentColor" stroke="none" />
            <circle cx="10.5" cy="16.5" r="1" fill="currentColor" stroke="none" />
            <rect x="10" y="3" width="11" height="11" rx="2" />
            <circle cx="13.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
            <circle cx="13.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
            <circle cx="17.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
        </svg>
    );
}

function CantStopIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M12 3 L21 21 L3 21 Z" />
            <path d="M7 17 L12 9 L17 17" />
            <circle cx="12" cy="9" r="1.2" fill="currentColor" stroke="none" />
        </svg>
    );
}

function MilleBornesIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
            {/* Milestone / borne kilométrique */}
            <path d="M7 20h10" />
            <rect x="9" y="4" width="6" height="14" rx="1.2" />
            <path d="M9 8h6" />
            <circle cx="12" cy="6" r="0.9" fill="currentColor" stroke="none" />
            <path d="M10.4 11.5h3.2M10.4 14h3.2" />
        </svg>
    );
}

function BreakoutIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
            <rect x="2" y="4" width="5" height="3" rx="0.5" opacity="0.9" />
            <rect x="9" y="4" width="5" height="3" rx="0.5" opacity="0.9" />
            <rect x="16" y="4" width="5" height="3" rx="0.5" opacity="0.9" />
            <rect x="2" y="9" width="5" height="3" rx="0.5" opacity="0.7" />
            <rect x="9" y="9" width="5" height="3" rx="0.5" opacity="0.7" />
            <rect x="16" y="9" width="5" height="3" rx="0.5" opacity="0.7" />
            <circle cx="12" cy="16" r="1.5" />
            <rect x="7" y="20" width="10" height="2.5" rx="1.25" />
        </svg>
    );
}

function SutomIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
            <rect x="2.5" y="6.5" width="6" height="6" rx="1.2" fill="currentColor" stroke="none" />
            <rect x="9.5" y="6.5" width="6" height="6" rx="1.2" />
            <rect x="16.5" y="6.5" width="5" height="6" rx="1.2" />
            <rect x="2.5" y="14" width="6" height="6" rx="1.2" />
            <rect x="9.5" y="14" width="6" height="6" rx="1.2" fill="currentColor" stroke="none" />
            <rect x="16.5" y="14" width="5" height="6" rx="1.2" />
        </svg>
    );
}

function SpaceInvadersIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
            {/* Classic invader silhouette */}
            <path d="M8 3h2v2H8V3zm6 0h2v2h-2V3zM6 5h2v2H6V5zm10 0h2v2h-2V5zM5 7h14v2H5V7zM4 9h2v2H4V9zm14 0h2v2h-2V9zM5 9h14v2H5V9zm-1 2h16v2H4v-2zm2 2h2v2H6v-2zm10 0h2v2h-2v-2zM8 15h2v2H8v-2zm6 0h2v2h-2v-2z" />
        </svg>
    );
}

function Twenty48Icon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
            <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="1.5" fill="currentColor" stroke="none" />
            <rect x="13" y="2.5" width="8.5" height="8.5" rx="1.5" />
            <rect x="2.5" y="13" width="8.5" height="8.5" rx="1.5" />
            <rect x="13" y="13" width="8.5" height="8.5" rx="1.5" fill="currentColor" stroke="none" />
        </svg>
    );
}

function PlumberIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
            {/* Jumping plumber silhouette: cap, body arched, legs raised */}
            <path d="M9 2h5v2h1v2h1v2h-2V6h-1v2h-3V6h-1V4h1V2h-1z" />
            <path d="M8 8h8v2h1v2h-2v-1h-1v2H10v-2H9v1H7v-2h1V8z" />
            <path d="M9 14h6v2h2v2h-2v-1h-1v3h-2v-3h-2v3h-2v-3H8v1H6v-2h2v-2h1z" />
        </svg>
    );
}

function SpyfallIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
            {/* Spy: fedora hat + face + sunglasses */}
            <path d="M5 9c0-1 3-4 7-4s7 3 7 4c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1z" />
            <path d="M4 10.5h16c.6 0 1 .4 1 1s-.4 1-1 1H4c-.6 0-1-.4-1-1s.4-1 1-1z" />
            <path d="M8 14a4 4 0 0 0 8 0v-.5H8z" opacity="0.55" />
            <rect x="7.5" y="13.5" width="4" height="2.5" rx="1.25" />
            <rect x="12.5" y="13.5" width="4" height="2.5" rx="1.25" />
            <rect x="11.3" y="14" width="1.4" height="1" />
        </svg>
    );
}

function FlappyBirdIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
            {/* Bird body */}
            <ellipse cx="11" cy="13" rx="6.5" ry="5" fill="currentColor" stroke="none" />
            {/* Eye */}
            <circle cx="14" cy="11.5" r="1.2" fill="white" stroke="none" />
            <circle cx="14.4" cy="11.5" r="0.5" fill="black" stroke="none" />
            {/* Beak */}
            <path d="M16.5 13l3 0.5-3 1.5z" fill="currentColor" stroke="none" />
            {/* Wing */}
            <path d="M8 13c1.5-2 4-2 5.5-0.5" />
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
    SPYFALL:    SpyfallIcon,
    LUDO:       LudoIcon,
    PERUDO:     PerudoIcon,
    CANT_STOP:  CantStopIcon,
    MILLE_BORNES: MilleBornesIcon,
    SNAKE:      SnakeIcon,
    PACMAN:     PacmanIcon,
    BREAKOUT:   BreakoutIcon,
    SUTOM:      SutomIcon,
    SPACE_INVADERS: SpaceInvadersIcon,
    GAME_2048: Twenty48Icon,
    FLAPPY_BIRD: FlappyBirdIcon,
    PLUMBER:    PlumberIcon,
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
    spyfall:    SpyfallIcon,
    ludo:       LudoIcon,
    perudo:     PerudoIcon,
    cant_stop:  CantStopIcon,
    mille_bornes: MilleBornesIcon,
    snake:      SnakeIcon,
    pacman:     PacmanIcon,
    breakout:   BreakoutIcon,
    sutom:      SutomIcon,
    space_invaders: SpaceInvadersIcon,
    '2048':     Twenty48Icon,
    flappy_bird: FlappyBirdIcon,
    plumber:    PlumberIcon,
};

interface Props {
    gameType: string;
    className?: string;
}

export default function GameIcon({ gameType, className = 'w-5 h-5' }: Props) {
    const Icon = GAME_ICON_MAP[gameType] ?? RectangleGroupIcon;
    return <Icon className={className} />;
}
