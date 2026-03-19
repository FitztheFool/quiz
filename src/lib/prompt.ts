// src/lib/prompt.ts
const POINTS_BY_DIFFICULTY: Record<string, { mcq: number; true_false: number; text: number }> = {
    facile: { mcq: 1, true_false: 1, text: 2 },
    normal: { mcq: 2, true_false: 1, text: 3 },
    difficile: { mcq: 3, true_false: 2, text: 5 },
};

export function buildPrompt(subject: string, questionCount: number, difficulty: string): string {
    const pts = POINTS_BY_DIFFICULTY[difficulty] ?? POINTS_BY_DIFFICULTY.normal;

    // Calcul de la répartition des types
    const tfCount = Math.max(1, Math.floor(questionCount * 0.2));   // ~20% vrai/faux
    const textCount = Math.max(1, Math.floor(questionCount * 0.15)); // ~15% texte libre
    const mcqCount = questionCount - tfCount - textCount;           // reste en MCQ

    return `Tu es un expert en création de quiz pédagogiques.

Génère un quiz de niveau "${difficulty}" sur : "${subject}".
Le quiz doit contenir EXACTEMENT ${questionCount} questions réparties ainsi :
- ${mcqCount} questions MCQ (4 réponses exactement, une seule correcte)
- ${tfCount} questions TRUE_FALSE (2 réponses : "Vrai" et "Faux")
- ${textCount} questions TEXT (1 seule réponse correcte, mot ou courte phrase)

Règles strictes :
- MCQ : toujours exactement 4 réponses, une seule isCorrect: true
- TRUE_FALSE : toujours exactement 2 réponses ("Vrai" / "Faux")
- TEXT : toujours exactement 1 réponse, en minuscules sans accents
- Points par question : MCQ=${pts.mcq}, TRUE_FALSE=${pts.true_false}, TEXT=${pts.text}
- Niveau "${difficulty}" : ${difficulty === 'facile' ? 'questions accessibles à tous, vocabulaire simple' :
            difficulty === 'difficile' ? 'questions pointues pour experts, détails précis' :
                'questions de niveau intermédiaire, culture générale solide'
        }

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans commentaire, sans texte avant ou après.

Format attendu :
{"title":"...","description":"...","isPublic":true,"questions":[{"text":"...","type":"MCQ","points":${pts.mcq},"answers":[{"text":"...","isCorrect":false},{"text":"...","isCorrect":true},{"text":"...","isCorrect":false},{"text":"...","isCorrect":false}]},{"text":"...","type":"TRUE_FALSE","points":${pts.true_false},"answers":[{"text":"Vrai","isCorrect":true},{"text":"Faux","isCorrect":false}]},{"text":"...","type":"TEXT","points":${pts.text},"answers":[{"text":"réponse","isCorrect":true}]}]}`;
}
