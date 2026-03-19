// src/lib/utils.ts
export const plural = (count: number, singular: string, pluriel: string) =>
    count <= 1 ? singular : pluriel;

export const generateCode = (length = 6) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
