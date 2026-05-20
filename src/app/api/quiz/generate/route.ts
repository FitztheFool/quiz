// src/app/api/quiz/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getClientForModel } from '@/lib/openai';
import { AI_MODELS, DEFAULT_MODEL_ID, ModelId } from '@/lib/aiModels';
import { buildPrompt, pointsFor } from '@/lib/prompt';
import { requireRegistered } from '@/lib/authGuard';

function validateQuizJSON(json: any): string | null {
    if (!json.title || typeof json.title !== 'string') return 'Champ "title" manquant';
    if (!Array.isArray(json.questions) || json.questions.length === 0) return 'Champ "questions" manquant ou vide';
    if (json.questions.length > 15) return 'Un quiz ne peut pas dépasser 15 questions';

    const VALID_TYPES = ['MCQ', 'MCQ_UNIQUE', 'TRUE_FALSE', 'TEXT'];

    for (const [i, q] of json.questions.entries()) {
        if (!q.text) return `Question ${i + 1} : champ "text" manquant`;
        if (!VALID_TYPES.includes(q.type)) return `Question ${i + 1} : type "${q.type}" invalide`;
        if (!Array.isArray(q.answers) || q.answers.length === 0) return `Question ${i + 1} : aucune réponse`;

        const correctCount = q.answers.filter((a: any) => a.isCorrect).length;
        if (correctCount === 0) return `Question ${i + 1} : aucune réponse correcte`;

        // Only single-answer types must have exactly 1 correct answer
        if (['MCQ_UNIQUE', 'TRUE_FALSE', 'TEXT'].includes(q.type) && correctCount > 1)
            return `Question ${i + 1} : plusieurs réponses correctes (interdit pour ${q.type})`;

        if (q.type === 'MCQ' && q.answers.length !== 4)
            return `Question ${i + 1} : MCQ doit avoir exactement 4 réponses (reçu ${q.answers.length})`;
        if (q.type === 'MCQ_UNIQUE' && q.answers.length !== 4)  // ← new
            return `Question ${i + 1} : MCQ_UNIQUE doit avoir exactement 4 réponses (reçu ${q.answers.length})`;
        if (q.type === 'TRUE_FALSE' && q.answers.length !== 2)
            return `Question ${i + 1} : TRUE_FALSE doit avoir exactement 2 réponses`;
    }

    return null;
}

const UNSPLASH_HOSTS = new Set(['images.unsplash.com', 'plus.unsplash.com']);

function isUnsplashUrl(url: unknown): url is string {
    if (typeof url !== 'string') return false;
    try {
        const u = new URL(url);
        return u.protocol === 'https:' && UNSPLASH_HOSTS.has(u.hostname);
    } catch {
        return false;
    }
}

export const DEFAULT_QUIZ_COVER = '/quiz/default-cover.svg';

async function fetchCoverImage(query: string): Promise<string | null> {
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) return null;
    try {
        const res = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
            { headers: { Authorization: `Client-ID ${key}` }, cache: 'no-store' }
        );
        if (!res.ok) {
            console.error(`[Unsplash] ${res.status} pour "${query}":`, await res.text());
            return null;
        }
        const data = await res.json();
        const candidate = data.results?.[0]?.urls?.regular;
        return isUnsplashUrl(candidate) ? candidate : null;
    } catch (e) {
        console.error('[Unsplash] fetch error:', e);
        return null;
    }
}

export async function POST(req: NextRequest) {
    const { error } = await requireRegistered();
    if (error) return error;

    const { subject, questionCount = 5, difficulty = 'normal', model: modelParam } = await req.json();

    if (questionCount > 15) {
        return NextResponse.json({ error: 'Un quiz ne peut pas dépasser 15 questions.' }, { status: 400 });
    }

    if (!subject?.trim()) {
        return NextResponse.json({ error: 'Sujet requis' }, { status: 400 });
    }

    const validModelIds = AI_MODELS.map(m => m.id) as string[];
    const modelId: ModelId = validModelIds.includes(modelParam) ? modelParam : DEFAULT_MODEL_ID;
    const { client, modelId: resolvedModel } = getClientForModel(modelId);

    try {
        const [completion, imageUrl] = await Promise.all([
            client.chat.completions.create({
                model: resolvedModel,
                messages: [{ role: 'user', content: buildPrompt(subject, questionCount, difficulty, modelId) }],
                temperature: 0.7,
            }),
            fetchCoverImage(subject),
        ]);


        const raw = (completion.choices[0].message.content ?? '').trim()
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '');

        let json: any;
        try {
            json = JSON.parse(raw);
        } catch {
            console.error('JSON invalide reçu de Groq:', raw.slice(0, 300));
            return NextResponse.json({ error: 'Groq a retourné un JSON invalide, réessayez.' }, { status: 500 });
        }

        const validationError = validateQuizJSON(json);
        if (validationError) {
            console.error('Validation échouée:', validationError);
            return NextResponse.json({ error: `Données invalides : ${validationError}` }, { status: 500 });
        }

        // Enforce server-side points by difficulty/type — model often defaults to 10.
        for (const q of json.questions) {
            q.points = pointsFor(difficulty, q.type);
        }

        // Fetch images for questions that have an imageQuery
        const questionsWithIndex = json.questions
            .map((q: any, i: number) => ({ q, i }))
            .filter(({ q }: { q: any }) => typeof q.imageQuery === 'string' && q.imageQuery.trim());

        if (questionsWithIndex.length > 0) {
            const fetched = await Promise.all(
                questionsWithIndex.map(({ q, i }: { q: any; i: number }) =>
                    fetchCoverImage(q.imageQuery).then(url => ({ i, url }))
                )
            );
            for (const { i, url } of fetched) {
                delete json.questions[i].imageQuery;
                if (url) json.questions[i].imageUrl = url;
            }
        }

        const selectedModel = AI_MODELS.find(m => m.id === modelId)!;
        const finalImageUrl = imageUrl ?? DEFAULT_QUIZ_COVER;
        return NextResponse.json({ ...json, imageUrl: finalImageUrl, provider: selectedModel.provider, model: modelId });

    } catch (e: any) {
        console.error('Erreur génération Groq:', e?.message ?? e);
        return NextResponse.json({ error: 'Erreur lors de la génération' }, { status: 500 });
    }
}
