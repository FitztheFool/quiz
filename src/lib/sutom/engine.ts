export type LetterState = 'correct' | 'present' | 'absent';

export const MAX_TRIES = 6;

/** Wordle/Sutom letter feedback (two-pass so duplicates are handled correctly). */
export function evaluateGuess(guess: string, answer: string): LetterState[] {
    const res: LetterState[] = new Array(guess.length).fill('absent');
    const counts: Record<string, number> = {};
    for (const c of answer) counts[c] = (counts[c] ?? 0) + 1;

    // Pass 1 — exact positions.
    for (let i = 0; i < guess.length; i++) {
        if (guess[i] === answer[i]) { res[i] = 'correct'; counts[guess[i]]--; }
    }
    // Pass 2 — present elsewhere.
    for (let i = 0; i < guess.length; i++) {
        if (res[i] === 'correct') continue;
        if ((counts[guess[i]] ?? 0) > 0) { res[i] = 'present'; counts[guess[i]]--; }
    }
    return res;
}

/** Score for a win: fewer tries and longer words score higher. */
export function scoreFor(tries: number, wordLength: number): number {
    return (MAX_TRIES + 1 - tries) * 100 + wordLength * 25;
}

export const MAX_SUTOM_SCORE = scoreFor(1, 12); // generous upper bound for server validation
