import OpenAI from 'openai';

export function getClient(provider: string) {
    if (provider === `groq`) {
        return new OpenAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: `https://api.groq.com/openai/v1`,
        });
    }
    if (provider === `gemini`) {
        return new OpenAI({
            apiKey: process.env.GEMINI_API_KEY,
            baseURL: `https://generativelanguage.googleapis.com/v1beta/openai`,
        });
    }
    throw new Error(`Provider inconnu : ${provider}`);
}

export function getModel(provider: string) {
    if (provider === `groq`) return `llama-3.3-70b-versatile`;
    if (provider === `gemini`) return `models/gemini-2.0-flash`; //`gemini-2.0-flash`;
    throw new Error(`Provider inconnu : ${provider}`);
}
