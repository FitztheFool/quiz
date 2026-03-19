// src/lib/openai.ts
import OpenAI from 'openai';

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) throw new Error('GROQ_API_KEY manquante');

export const groqClient = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
});

export const GROQ_MODEL = 'llama-3.3-70b-versatile';
