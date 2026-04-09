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

    const tfCount = Math.max(1, Math.floor(questionCount * 0.2));
    const textCount = Math.max(1, Math.floor(questionCount * 0.15));
    const mcqUniqueCount = Math.max(1, Math.floor(questionCount * 0.25));
    const mcqCount = questionCount - tfCount - textCount - mcqUniqueCount;

    const levelDescription = difficulty === 'facile'
        ? 'questions accessibles à tous, vocabulaire simple, notions de base'
        : difficulty === 'difficile'
            ? 'questions pointues pour experts, détails précis, pièges subtils possibles'
            : 'questions intermédiaires, culture générale solide requise';

    return `Tu es un expert en création de quiz pédagogiques de haute qualité.

**IMPORTANT** : Tu dois répondre **EXCLUSIVEMENT** avec un JSON valide.
Aucun texte avant, après, aucun markdown, aucune explication, aucun commentaire.

**Sujet** : "${subject}"
**Niveau** : "${difficulty}" → ${levelDescription}
**Nombre total de questions** : EXACTEMENT ${questionCount}

**Répartition exacte** :
- MCQ : ${mcqCount}
- MCQ_UNIQUE : ${mcqUniqueCount}
- TRUE_FALSE : ${tfCount}
- TEXT : ${textCount}

**Contraintes strictes par type** :

MCQ :
- Exactement 4 réponses
- Au moins 1 isCorrect: true et au moins 1 isCorrect: false
- Plusieurs réponses correctes possibles

MCQ_UNIQUE :
- Exactement 4 réponses
- Exactement 1 isCorrect: true, les 3 autres false

TRUE_FALSE :
- Exactement 2 réponses dans l'ordre : "Vrai", "Faux"
- Exactement une seule correcte

TEXT :
- Exactement 1 réponse avec isCorrect: true
- La réponse doit être **un seul mot ou un mot composé** (jamais une phrase)
- Majuscules et accents autorisés et corrects
- Ponctuation interdite sauf quand nécessaire pour les noms propres (ex: apostrophe)
- Exemples valides : "Paris", "Léonard de Vinci", "Jeanne d'Arc", "Côte d'Ivoire", "États-Unis", "Marie Curie"

**Règles globales** :
- Questions variées et sans répétition
- Distracteurs plausibles
- Points : MCQ=${pts.mcq} | MCQ_UNIQUE=${pts.mcq_unique} | TRUE_FALSE=${pts.true_false} | TEXT=${pts.text}

Retourne uniquement ce JSON (respecte exactement la structure) :

{
  "title": "Titre attractif du quiz",
  "description": "Description courte (1-2 phrases)",
  "isPublic": true,
  "questions": [
    {
      "text": "Question ?",
      "type": "MCQ",
      "points": ${pts.mcq},
      "answers": [
        {"text": "...", "isCorrect": false},
        {"text": "...", "isCorrect": true},
        ...
      ]
    }
    // ... respecte exactement la répartition des types
  ]
}

Commence directement par { et termine par }.`;
}
