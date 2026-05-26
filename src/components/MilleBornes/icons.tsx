// Card iconography — Heroicons re-exports + a custom speed-limit gauge.
export {
    HandRaisedIcon,
    ExclamationTriangleIcon,
    FireIcon,
    WrenchScrewdriverIcon,
    PlayIcon,
    ArrowTrendingUpIcon,
    BeakerIcon,
    LifebuoyIcon,
    ShieldCheckIcon,
    StarIcon,
    BoltIcon,
} from '@heroicons/react/24/solid';

export function GaugeIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M4 18a8 8 0 1 1 16 0" />
            <path d="M12 14l4-4" />
            <circle cx="12" cy="14" r="1.4" fill="currentColor" stroke="none" />
        </svg>
    );
}
