import Link from 'next/link';

interface QuizCardProps {
  quiz: {
    id: string;
    title: string;
    description: string | null;
    isPublic: boolean;
    createdAt?: string;
    _count: {
      questions: number;
    };
    creatorId?: string;
    category?: {
      name: string;
    } | null;
  };
  currentUserId?: string;
  score?: number;
  totalPoints?: number;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function QuizCard({
  quiz,
  currentUserId,
  score,
  totalPoints,
  showActions = false,
  onEdit,
  onDelete,
}: QuizCardProps) {
  const isMyQuiz = quiz.creatorId === currentUserId;
  const isLocked = !quiz.isPublic && !isMyQuiz;

  const isPerfect =
    score !== undefined &&
    totalPoints !== undefined &&
    totalPoints > 0 &&
    score === totalPoints;

  const hasPlayed =
    score !== undefined &&
    totalPoints !== undefined &&
    totalPoints > 0;

  const formattedDate = quiz.createdAt
    ? new Date(quiz.createdAt).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    : null;

  return (
    <div
      className={`bg-gray-50 rounded-xl p-6 border-2 transition-all relative flex flex-col h-full ${isLocked
        ? 'border-gray-200 opacity-70'
        : 'border-gray-200 hover:border-blue-400 hover:shadow-xl'
        }`}
    >
      {/* Badges */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
        {isMyQuiz && (
          <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
            👤 Créé par moi
          </span>
        )}
        {!quiz.isPublic && (
          <span className="bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
            🔒 Privé
          </span>
        )}
        {isPerfect && (
          <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
            ✓ Complété
          </span>
        )}
      </div>

      {/* Contenu — flex-1 pousse le bouton en bas */}
      <div className="flex-1">
        <h3 className="text-xl font-bold text-gray-900 mb-3 pr-32">
          {quiz.title}
        </h3>

        <p className="text-gray-600 mb-4 text-sm line-clamp-2">
          {quiz.description || 'Aucune description'}
        </p>

        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          <span className="flex items-center gap-1">
            📝 {quiz._count.questions} questions
          </span>
          {quiz.category && (
            <span className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
              🏷️ {quiz.category.name}
            </span>
          )}
          {hasPlayed && (
            <span className={`flex items-center gap-1 font-semibold ${isPerfect ? 'text-green-600' : 'text-orange-500'}`}>
              🏆 {score}/{totalPoints} pts
            </span>
          )}
        </div>

        {formattedDate && (
          <p className="text-xs text-gray-400 mb-4">
            🕐 Créé le {formattedDate}
          </p>
        )}
      </div>

      {/* Bouton toujours en bas */}
      {showActions ? (
        <div className="flex gap-3">
          <button
            onClick={onEdit}
            className="flex-1 text-center py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            Modifier
          </button>
          <button
            onClick={onDelete}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            Supprimer
          </button>
        </div>
      ) : isLocked ? (
        <button
          type="button"
          disabled
          className="block w-full text-center py-3 rounded-lg font-semibold shadow-md bg-gray-400 cursor-not-allowed text-white"
          title="Ce quiz est privé"
        >
          Quiz privé 🔒
        </button>
      ) : (
        <Link
          href={`/quiz/${quiz.id}`}
          className={`block w-full text-center py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg ${isPerfect
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
        >
          {isPerfect ? 'Rejouer' : 'Jouer'}
        </Link>
      )}
    </div>
  );
}
