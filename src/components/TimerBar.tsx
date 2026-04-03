import TurnTimer from './TurnTimer';

export default function TimerBar({ endsAt, duration, label }: {
    endsAt: number | null | undefined;
    duration: number;
    label?: string;
}) {
    if (!endsAt) return null;
    return (
        <div className="shrink-0 px-4 py-1 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <TurnTimer endsAt={endsAt} duration={duration} label={label} />
        </div>
    );
}
