export const AI_MODELS = [
    {
        id: 'llama-3.3-70b-versatile',
        label: 'Llama 3.3 70B',
        provider: 'groq' as const,
        badge: 'Groq',
        desc: 'Meilleure qualité',
    },
    {
        id: 'llama-3.1-8b-instant',
        label: 'Llama 3.1 8B',
        provider: 'groq' as const,
        badge: 'Groq',
        desc: 'Ultra rapide',
    },
    {
        id: 'gemini-2.5-flash',
        label: 'Gemini 2.5 Flash',
        provider: 'gemini' as const,
        badge: 'Google',
        desc: 'Créatif',
    },
] as const;

export type ModelId = typeof AI_MODELS[number]['id'];
export const DEFAULT_MODEL_ID: ModelId = 'llama-3.3-70b-versatile';
