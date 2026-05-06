// src/lib/prompt.ts
import { ModelId } from './aiModels';

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
  difficulty: string,
  modelId?: ModelId   // ← Nouveau paramètre
): string {
  const pts = POINTS_BY_DIFFICULTY[difficulty] ?? POINTS_BY_DIFFICULTY.normal;

  const tfCount = Math.max(1, Math.floor(questionCount * 0.2));
  const textCount = Math.max(1, Math.floor(questionCount * 0.15));
  const mcqUniqueCount = Math.max(1, Math.floor(questionCount * 0.25));
  const mcqCount = questionCount - tfCount - textCount - mcqUniqueCount;

  const isGemini = modelId?.startsWith('gemini');

  const levelDescription = difficulty === 'facile'
    ? 'niveau débutant : notions simples, vocabulaire courant'
    : difficulty === 'difficile'
      ? 'niveau expert : questions pointues, précises, avec pièges subtils'
      : 'niveau intermédiaire : bonne culture générale et réflexion requises';

  const jsonInstruction = isGemini
    ? '**Réponds EXCLUSIVEMENT avec un JSON valide.**'
    : '**MODE STRICT JSON** : Réponds **EXCLUSIVEMENT** avec un JSON valide et parfaitement formé. Aucun texte avant ou après.';

  return `Tu es un expert mondial de création de quiz pédagogiques d'excellence.

${jsonInstruction}

**Sujet** : "${subject}"
**Difficulté** : ${difficulty} → ${levelDescription}
**Nombre total de questions** : EXACTEMENT ${questionCount}

**Répartition obligatoire** :
- MCQ         : ${mcqCount}
- MCQ_UNIQUE  : ${mcqUniqueCount}
- TRUE_FALSE  : ${tfCount}
- TEXT        : ${textCount}

**RÈGLES TRÈS STRICTES** :

**MCQ**:
- Exactement 4 réponses
- 1 ou 2 réponses correctes maximum

**MCQ_UNIQUE**:
- Exactement 4 réponses
- Exactement 1 seule réponse correcte

**TRUE_FALSE**:
- Toujours ["Vrai", "Faux"] dans cet ordre
- Exactement une seule correcte

**TEXT**:
- Toujours **une seule réponse correcte**
- Réponse courte : un seul mot ou expression nominale (ex: "Jeanne d'Arc", "Côte d'Ivoire", "Photosynthèse")
- **Interdit** : plusieurs éléments séparés par des virgules

**Règle importante** :
Si une question nécessite plusieurs réponses (ex: "noms des 3 amis"), utilise un **MCQ** avec plusieurs "isCorrect": true, ou reformule la question pour qu'elle ne demande qu'une seule réponse.

**CRITÈRES DE QUALITÉ OBLIGATOIRES** :
- Questions claires, variées et bien rédigées
- Aucune redondance entre les questions
- Distracteurs plausibles et intelligents
- Orthographe et grammaire parfaites
- Difficulté parfaitement adaptée

**Images** :
Ajoute "imageQuery" (2-5 mots en anglais) sur 25% à 40% des questions lorsqu'une image apporte une vraie valeur pédagogique.

**SCHÉMA JSON À RESPECTER EXACTEMENT** :

{
  "title": string,
  "description": string,
  "isPublic": true,
  "questions": [
    {
      "text": string,
      "type": "MCQ" | "MCQ_UNIQUE" | "TRUE_FALSE" | "TEXT",
      "points": number,
      "imageQuery"?: string,
      "answers": Array<{ "text": string, "isCorrect": boolean }>
    }
  ]
}

Pense étape par étape puis retourne **uniquement** le JSON.`;
}
