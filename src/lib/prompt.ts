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

    return `Tu es un expert en création de quiz pédagogiques. Tu génères uniquement du JSON valide, sans markdown, sans texte avant ou après.

Génère un quiz de niveau "${difficulty}" sur : "${subject}".
Le quiz doit contenir EXACTEMENT ${questionCount} questions :
- ${mcqCount} questions de type MCQ
- ${tfCount} questions de type TRUE_FALSE
- ${textCount} questions de type TEXT

Contraintes absolues par type :
- MCQ : exactement 4 réponses, une seule avec isCorrect: true, les 3 autres avec isCorrect: false
- TRUE_FALSE : exactement 2 réponses, textes "Vrai" et "Faux" (dans cet ordre), une seule correcte
- TEXT : exactement 1 réponse avec isCorrect: true, en minuscules, sans accents, sans ponctuation
- Ne jamais mettre deux isCorrect: true dans la même question

Points : MCQ=${pts.mcq}, TRUE_FALSE=${pts.true_false}, TEXT=${pts.text}

Niveau "${difficulty}" : ${difficulty === 'facile' ? 'questions accessibles à tous, vocabulaire simple, notions de base' :
            difficulty === 'difficile' ? 'questions pointues pour experts, détails précis, pièges possibles' :
                'questions intermédiaires, culture générale solide requise'
        }

Les questions doivent être variées, sans répétition, et couvrir différents aspects du sujet.

Format JSON attendu (respecte-le à la lettre) :
{"title":"...","description":"...","isPublic":true,"questions":[{"text":"...","type":"MCQ","points":${pts.mcq},"answers":[{"text":"...","isCorrect":false},{"text":"...","isCorrect":true},{"text":"...","isCorrect":false},{"text":"...","isCorrect":false}]},{"text":"...","type":"TRUE_FALSE","points":${pts.true_false},"answers":[{"text":"Vrai","isCorrect":true},{"text":"Faux","isCorrect":false}]},{"text":"...","type":"TEXT","points":${pts.text},"answers":[{"text":"réponse","isCorrect":true}]}]}`;
}
