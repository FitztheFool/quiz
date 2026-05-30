// src/lib/openai.ts
import OpenAI from 'openai';
import { AI_MODELS, ModelId, ModelProvider } from './aiModels';

const groqKey = process.env.GROQ_API_KEY;
const geminiKey = process.env.GEMINI_KEY;

if (!groqKey) throw new Error('GROQ_API_KEY manquante');

export const groqClient = new OpenAI({
    apiKey: groqKey,
    baseURL: 'https://api.groq.com/openai/v1',
});

export const geminiClient = new OpenAI({
    apiKey: geminiKey,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/',
});

/** Retourne le bon client + model id pour un modèle donné */
export function getClientForModel(modelId: ModelId) {
    const model = AI_MODELS.find(m => m.id === modelId);
    if (!model) throw new Error(`Modèle inconnu : ${modelId}`);

    const clients: Record<ModelProvider, OpenAI> = {
        groq: groqClient,
        gemini: geminiClient,
    };

    return {
        client: clients[model.provider],
        modelId: model.id,
    };
}
