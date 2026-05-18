// src/components/QuizCard.tsx
import Link from 'next/link';
import { UserIcon, LockClosedIcon, CheckIcon, DocumentTextIcon, TagIcon, TrophyIcon, ClockIcon } from '@heroicons/react/24/outline';

interface QuizCardProps {
  quiz: {
    id: string;
    title: string;
    description: string | null;
    isPublic: boolean;
    createdAt?: string;
    imageUrl?: string | null;
    _count: {
      questions: number;
    };
    creator?: { id: string; username: string } | null;
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
  const isMyQuiz = currentUserId !== undefined && quiz.creator?.id === currentUserId;
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
      className={`bg-white dark:bg-gray-900 rounded-xl p-4 sm:p-6 border-2 transition-all relative flex flex-col h-full ${isLocked
        ? 'border-gray-200 dark:border-gray-700 opacity-70'
        : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:shadow-xl'
        }`}
    >
      {quiz.imageUrl && (
        <div className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-4 rounded-t-xl overflow-hidden">
          <img
            src={quiz.imageUrl}
            alt={quiz.title}
            className="w-full h-32 object-cover"
          />
        </div>
      )}

      {/* Badges */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
        {isMyQuiz && (
          <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md inline-flex items-center gap-1">
            <UserIcon className="w-3 h-3" />Créé par moi
          </span>
        )}
        {!quiz.isPublic && (
          <span className="bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md inline-flex items-center gap-1">
            <LockClosedIcon className="w-3 h-3" />Privé
          </span>
        )}
        {isPerfect && (
          <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md inline-flex items-center gap-1">
            <CheckIcon className="w-3 h-3" />Complété
          </span>
        )}
      </div>

      {/* Contenu — flex-1 pousse le bouton en bas */}
      <div className="flex-1">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 min-h-[3.5rem]">
          {quiz.title}
        </h3>

        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 min-h-[2.5rem]">
          {quiz.description || 'Aucune description'}
        </p>

        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mb-4">
          <span className="flex items-center gap-1">
            <DocumentTextIcon className="w-3.5 h-3.5" />{quiz._count.questions} questions
          </span>
          {quiz.category && (
            <span className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
              <TagIcon className="w-3 h-3" />{quiz.category.name}
            </span>
          )}
          {hasPlayed && (
            <span className={`flex items-center gap-1 font-semibold ${isPerfect ? 'text-green-600' : 'text-orange-500'}`}>
              <TrophyIcon className="w-3.5 h-3.5" />{score}/{totalPoints} pts
            </span>
          )}
        </div>

        {formattedDate && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            <ClockIcon className="w-3 h-3 inline mr-1" />Créé le {formattedDate}
          </p>
        )}
      </div>

      {quiz.creator?.username && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          <UserIcon className="w-3 h-3 inline mr-1" />Créé par{' '}
          <Link
            href={currentUserId === quiz.creator.id ? '/dashboard#stats' : `/user/${quiz.creator.username}#stats`}
            className="font-semibold text-blue-600 hover:underline transition-colors"
          >
            {quiz.creator.username}
          </Link>
        </p>
      )}

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
          className="block w-full text-center py-2.5 sm:py-3 rounded-lg font-semibold shadow-md bg-gray-400 cursor-not-allowed text-white"
          title="Ce quiz est privé"
        >
          <LockClosedIcon className="w-4 h-4 inline mr-1" />Quiz privé
        </button>
      ) : (
        <Link
          href={`/quiz/${quiz.id}`}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 transform hover:scale-105 active:scale-95"
        >
          {isPerfect ? 'Rejouer' : 'Jouer'}
        </Link>
      )}
    </div>
  );
}
