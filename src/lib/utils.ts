// src/lib/utils.ts
export const plural = (count: number, singular: string, pluriel: string) =>
    count <= 1 ? singular : pluriel;

export function normalizeWord(str: string): string {
    return str.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export const normalizeAnswer = (s: string) =>
    s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
