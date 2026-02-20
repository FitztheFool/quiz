import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getClient, getModel } from '@/lib/openai';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: `Non autorisé` }, { status: 401 });
    }

    const { categoryId, questionCount = 5, difficulty = `medium`, provider = `groq` } = await req.json();

    if (!categoryId) {
        return NextResponse.json({ error: `Catégorie requise` }, { status: 400 });
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
        return NextResponse.json({ error: `Catégorie introuvable` }, { status: 404 });
    }

    const client = getClient(provider);
    const model = getModel(provider);
    const seed = Math.floor(Math.random() * 100000);

    // Récupérer toutes les questions existantes de cette catégorie
    const existingQuizzes = await prisma.quiz.findMany({
        where: { categoryId },
        select: { questions: { select: { content: true } } },
    });

    const existingContents = new Set(
        existingQuizzes.flatMap(q => q.questions.map(qu => qu.content.toLowerCase().trim()))
    );

    const existingQuestions = [...existingContents].join(`\n- `);

    const prompt = `Génère un quiz UNIQUE (seed: ${seed}) de ${questionCount} questions sur le thème "${category.name}" avec une difficulté ${difficulty}.
Varie les questions, ne répète pas les mêmes thématiques.
${existingQuestions ? `Évite absolument ces questions déjà posées :\n- ${existingQuestions}` : ``}
Réponds UNIQUEMENT avec un JSON valide dans ce format exact :
{
  "title": "Titre du quiz",
  "description": "Description courte",
  "questions": [
    {
      "content": "Question ?",
      "type": "MCQ",
      "points": 1,
      "answers": [
        { "content": "Réponse A", "isCorrect": true },
        { "content": "Réponse B", "isCorrect": false },
        { "content": "Réponse C", "isCorrect": false },
        { "content": "Réponse D", "isCorrect": false }
      ]
    }
  ]
}
Utilise uniquement le type MCQ ou TRUE_FALSE. Pour TRUE_FALSE, mets exactement 2 answers : "Vrai" et "Faux".`;

    let completion;
    try {
        completion = await client.chat.completions.create({
            model,
            messages: [{ role: `user`, content: prompt }],
            ...(provider === `groq` ? { response_format: { type: `json_object` } } : {}),
        });
    } catch (err: any) {
        if (err?.status === 429) {
            return NextResponse.json(
                { error: `⚠️ Quota atteint pour ${provider === `groq` ? `Groq` : `Gemini`}. Essayez un autre modèle IA ou réessayez plus tard.` },
                { status: 429 }
            );
        }
        return NextResponse.json(
            { error: `Erreur lors de la génération : ${err?.message ?? `inconnue`}` },
            { status: 500 }
        );
    }

    const generated = JSON.parse(completion.choices[0].message.content!);

    // Filtrer les questions déjà existantes en BDD
    const filteredQuestions = generated.questions.filter(
        (q: any) => !existingContents.has(q.content.toLowerCase().trim())
    );

    if (filteredQuestions.length === 0) {
        return NextResponse.json(
            { error: `Toutes les questions générées existent déjà. Réessayez pour obtenir de nouvelles questions.` },
            { status: 409 }
        );
    }

    const botUser = await prisma.user.findUnique({ where: { username: `Aléatoire` } });

    const quiz = await prisma.quiz.create({
        data: {
            title: generated.title,
            description: generated.description,
            creatorId: botUser?.id ?? session.user.id,
            categoryId,
            isPublic: true,
            randomizeQuestions: true,
            questions: {
                create: filteredQuestions.map((q: any) => ({
                    content: q.content,
                    type: q.type,
                    points: q.points ?? 1,
                    answers: { create: q.answers },
                })),
            },
        },
        include: { questions: { include: { answers: true } } },
    });

    return NextResponse.json({ quiz });
}
