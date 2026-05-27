// Les mots de Sutom proviennent des groupes de mots en base (table Word),
// servis par /api/sutom/word. Ici on ne garde que la normalisation.

/** Strip accents, uppercase, keep A–Z only. */
export function normalizeWord(s: string): string {
    return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().replace(/[^A-Z]/g, '');
}

/** A guessable single-token word: no spaces/hyphens/apostrophes, 6–9 letters once normalized. */
export function isSutomWord(raw: string): boolean {
    if (/[\s\-'’]/.test(raw)) return false;
    const n = normalizeWord(raw);
    return n.length >= 6 && n.length <= 9;
}
