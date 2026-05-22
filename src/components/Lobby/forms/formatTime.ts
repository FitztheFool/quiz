export function formatTime(t: number): string {
    return t < 60 ? `${t}s` : `${Math.floor(t / 60)} min${t % 60 ? ` ${t % 60}s` : ''}`;
}
