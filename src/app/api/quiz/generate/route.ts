// src/app/api/quiz/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { groqClient, GROQ_MODEL } from '@/lib/openai';
import { buildPrompt } from '@/lib/prompt';
import { requireRegistered } from '@/lib/authGuard';

function validateQuizJSON(json: any): string | null {
    if (!json.title || typeof json.title !== 'string') return 'Champ "title" manquant';
    if (!Array.isArray(json.questions) || json.questions.length === 0) return 'Champ "questions" manquant ou vide';
    if (json.questions.length > 15) return 'Un quiz ne peut pas dépasser 15 questions';

    for (const [i, q] of json.questions.entries()) {
        if (!q.text) return `Question ${i + 1} : champ "text" manquant`;
        if (!['MCQ', 'TRUE_FALSE', 'TEXT'].includes(q.type)) return `Question ${i + 1} : type "${q.type}" invalide`;
        if (!Array.isArray(q.answers) || q.answers.length === 0) return `Question ${i + 1} : aucune réponse`;

        const correctCount = q.answers.filter((a: any) => a.isCorrect).length;
        if (correctCount === 0) return `Question ${i + 1} : aucune réponse correcte`;
        if (q.type !== 'TEXT' && correctCount > 1) return `Question ${i + 1} : plusieurs réponses correctes`;

        if (q.type === 'MCQ' && q.answers.length !== 4)
            return `Question ${i + 1} : MCQ doit avoir exactement 4 réponses (reçu ${q.answers.length})`;
        if (q.type === 'TRUE_FALSE' && q.answers.length !== 2)
            return `Question ${i + 1} : TRUE_FALSE doit avoir exactement 2 réponses`;
    }

    return null;
}

export async function POST(req: NextRequest) {
    const { session, error } = await requireRegistered();
    if (error) return error;

    const { subject, questionCount = 5, difficulty = 'normal' } = await req.json();

    if (questionCount > 15) {
        return NextResponse.json({ error: 'Un quiz ne peut pas dépasser 15 questions.' }, { status: 400 });
    }

    if (!subject?.trim()) {
        return NextResponse.json({ error: 'Sujet requis' }, { status: 400 });
    }

    try {
        const startTime = Date.now();

        const completion = await groqClient.chat.completions.create({
            model: GROQ_MODEL,
            messages: [{ role: 'user', content: buildPrompt(subject, questionCount, difficulty) }],
            temperature: 0.7,
        });

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

        return NextResponse.json({ ...json, provider: 'groq' });

    } catch (e: any) {
        console.error('Erreur génération Groq:', e.message);
        return NextResponse.json({ error: 'Erreur lors de la génération : ' + e.message }, { status: 500 });
    }
}
