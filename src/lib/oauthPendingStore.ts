// src/lib/oauthPendingStore.ts
type PendingEntry = {
    userId: string;
    baseName: string;
    suggestions: string[];
    expiresAt: number;
};

const store = new Map<string, PendingEntry>();

export function createPending(userId: string, baseName: string, suggestions: string[]): string {
    const token = crypto.randomUUID();
    store.set(token, { userId, baseName, suggestions, expiresAt: Date.now() + 10 * 60 * 1000 });
    return token;
}

export function getPending(token: string): PendingEntry | null {
    const entry = store.get(token);
    if (!entry || entry.expiresAt < Date.now()) { store.delete(token); return null; }
    return entry;
}

export function deletePending(token: string) {
    store.delete(token);
}
