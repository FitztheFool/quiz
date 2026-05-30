// Deterministic per-user palette so the same person shows the same avatar color
// in the sidebar, profile, waiting screen, leaderboards, etc.

const PALETTE = [
    'from-red-500 to-red-700',
    'from-orange-500 to-orange-700',
    'from-amber-500 to-amber-700',
    'from-emerald-500 to-emerald-700',
    'from-teal-500 to-teal-700',
    'from-cyan-500 to-cyan-700',
    'from-sky-500 to-sky-700',
    'from-blue-500 to-blue-700',
    'from-indigo-500 to-indigo-700',
    'from-violet-500 to-violet-700',
    'from-purple-500 to-purple-700',
    'from-pink-500 to-pink-700',
];

function hash(seed: string): number {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** Stable tailwind `bg-gradient-to-br <from> <to>` class string for a user. */
export function userColorClass(seed: string | null | undefined): string {
    const key = seed && seed.length > 0 ? seed : '?';
    return PALETTE[hash(key) % PALETTE.length];
}

export function userInitials(name: string | null | undefined): string {
    const n = (name ?? '').trim();
    if (!n) return '?';
    const parts = n.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n[0].toUpperCase();
}
