// src/lib/prompt.ts
const POINTS_BY_DIFFICULTY: Record<
    string,
    { mcq: number; mcq_unique: number; true_false: number; text: number }
> = {
    facile: { mcq: 1, mcq_unique: 1, true_false: 1, text: 2 },
    normal: { mcq: 2, mcq_unique: 2, true_false: 1, text: 3 },
    difficile: { mcq: 3, mcq_unique: 3, true_false: 2, text: 5 },
};

export function buildPrompt(
    subject: string,
    questionCount: number,
    difficulty: string
): string {
    const pts = POINTS_BY_DIFFICULTY[difficulty] ?? POINTS_BY_DIFFICULTY.normal;

    // Répartition des types
    const tfCount = Math.max(1, Math.floor(questionCount * 0.2));      // ~20%
    const textCount = Math.max(1, Math.floor(questionCount * 0.15));   // ~15%
    const mcqUniqueCount = Math.max(1, Math.floor(questionCount * 0.25)); // ~25%
    const mcqCount = questionCount - tfCount - textCount - mcqUniqueCount;

    return `Tu es un expert en création de quiz pédagogiques. Tu génères uniquement du JSON valide, sans markdown, sans texte avant ou après.

Génère un quiz de niveau "${difficulty}" sur : "${subject}".

Le quiz doit contenir EXACTEMENT ${questionCount} questions :
- ${mcqCount} questions de type MCQ
- ${mcqUniqueCount} questions de type MCQ_UNIQUE
- ${tfCount} questions de type TRUE_FALSE
- ${textCount} questions de type TEXT

Contraintes absolues par type :

MCQ :
- exactement 4 réponses
- AU MOINS une réponse avec isCorrect: true
- plusieurs réponses correctes possibles
- au moins une réponse avec isCorrect: false

MCQ_UNIQUE :
- exactement 4 réponses
- UNE SEULE réponse avec isCorrect: true
- les 3 autres avec isCorrect: false

TRUE_FALSE :
- exactement 2 réponses
- textes "Vrai" et "Faux" (dans cet ordre)
- une seule correcte

TEXT :
- exactement 1 réponse avec isCorrect: true
- texte en minuscules, sans accents, sans ponctuation

Règles globales :
- Ne jamais mettre zéro bonne réponse
- Ne jamais mettre toutes les réponses correctes
- Respecter strictement les types demandés
- Les questions doivent être variées, sans répétition, et couvrir différents aspects du sujet

Points :
- MCQ=${pts.mcq}
- MCQ_UNIQUE=${pts.mcq_unique}
- TRUE_FALSE=${pts.true_false}
- TEXT=${pts.text}

Niveau "${difficulty}" : ${difficulty === 'facile'
            ? 'questions accessibles à tous, vocabulaire simple, notions de base'
            : difficulty === 'difficile'
                ? 'questions pointues pour experts, détails précis, pièges possibles'
                : 'questions intermédiaires, culture générale solide requise'
        }

Format JSON attendu (respecte-le à la lettre) :
{"title":"...","description":"...","isPublic":true,"questions":[
{"text":"...","type":"MCQ","points":${pts.mcq},"answers":[{"text":"...","isCorrect":false},{"text":"...","isCorrect":true},{"text":"...","isCorrect":false},{"text":"...","isCorrect":true}]},
{"text":"...","type":"MCQ_UNIQUE","points":${pts.mcq_unique},"answers":[{"text":"...","isCorrect":false},{"text":"...","isCorrect":true},{"text":"...","isCorrect":false},{"text":"...","isCorrect":false}]},
{"text":"...","type":"TRUE_FALSE","points":${pts.true_false},"answers":[{"text":"Vrai","isCorrect":true},{"text":"Faux","isCorrect":false}]},
{"text":"...","type":"TEXT","points":${pts.text},"answers":[{"text":"reponse","isCorrect":true}]}
]}`;
}
