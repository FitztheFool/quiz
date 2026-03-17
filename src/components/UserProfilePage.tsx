'use client';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import QuizCard from '@/components/QuizCard';
import Pagination from '@/components/Pagination';
import UserStats from '@/components/UserStats';

const PAGE_SIZE = 6;

interface Quiz {
    id: string;
    title: string;
    description: string | null;
    isPublic: boolean;
    createdAt?: string;
    creatorId?: string;
    creator?: { id: string; username: string } | null;
    _count: { questions: number };
    category?: { name: string } | null;
    questions?: { points: number }[];
}

interface ProfileData {
    id: string;
    name: string | null;
    image?: string | null;
    totalScore: number;
    quizzesCompleted: number;
    quizzesCreated: number;
    quizzes: Quiz[];
}

type TabType = 'stats' | 'quizzes';

interface Props {
    username: string;
    isOwnProfile?: boolean;
}

export default function UserProfilePage({ username, isOwnProfile = false }: Props) {
    const router = useRouter();
    const { data: session } = useSession();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('stats');
    const [quizPage, setQuizPage] = useState(1);
    const [quizPoints, setQuizPoints] = useState<Record<string, number>>({});

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch(`/api/profil/${username}`);
                if (!res.ok) { setNotFound(true); setLoading(false); return; }
                const data = await res.json();
                setProfile(data);
                const map: Record<string, number> = {};
                data.quizzes?.forEach((q: any) => {
                    map[q.id] = q.questions?.reduce((s: number, qq: any) => s + (qq.points || 0), 0) || 0;
                });
                setQuizPoints(map);
            } catch {
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [username]);

    if (loading) return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
            <LoadingSpinner />
        </div>
    );

    if (notFound || !profile) return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
            <div className="text-center">
                <p className="text-2xl font-bold text-gray-700 mb-2">Joueur introuvable</p>
                <p className="text-gray-500 mb-6">Ce profil n'existe pas ou n'est pas accessible.</p>
                <button onClick={() => router.back()} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">← Retour</button>
            </div>
        </div>
    );

    const currentUserId = session?.user?.id;
    const displayName = profile.name || username;
    const quizzes = profile.quizzes ?? [];
    const quizTotalPages = Math.ceil(quizzes.length / PAGE_SIZE);
    const paginatedQuizzes = quizzes.slice((quizPage - 1) * PAGE_SIZE, quizPage * PAGE_SIZE);

    const handleEdit = (quizId: string) => router.push(`/quiz/${quizId}/edit`);
    const handleDelete = async (quizId: string) => {
        if (!confirm('Supprimer ce quiz ?')) return;
        const res = await fetch(`/api/quiz/${quizId}`, { method: 'DELETE' });
        if (res.ok) setProfile(prev => prev ? { ...prev, quizzes: prev.quizzes.filter(q => q.id !== quizId) } : prev);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 md:p-8">

                    {/* Header */}
                    {!isOwnProfile && (
                        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center gap-1">
                            ← Retour
                        </button>
                    )}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                            {profile.image ? (
                                <img src={profile.image} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                                    {displayName.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {isOwnProfile ? `Bonjour, ${displayName} !` : displayName}
                            </h1>
                            <p className="text-gray-500 text-sm">{isOwnProfile ? 'Mon dashboard' : 'Profil joueur'}</p>
                            {isOwnProfile && (
                                <a href="/settings" className="text-xs text-blue-500 hover:text-blue-700 transition-colors mt-0.5 inline-flex items-center gap-1">
                                    ⚙️ Paramètres
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b-2 border-gray-200 dark:border-gray-700 mb-6">
                        <div className="flex gap-6">
                            {(['stats', 'quizzes'] as TabType[]).map((tab) => (
                                <button key={tab} onClick={() => setActiveTab(tab)}
                                    className={`pb-3 px-2 font-semibold text-sm transition-colors border-b-4 -mb-0.5 ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                    {tab === 'stats' ? '📊 Statistiques' : '📝 Quiz créés'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab Stats */}
                    {activeTab === 'stats' && (
                        <UserStats username={username} />
                    )}

                    {/* Tab Quiz */}
                    {activeTab === 'quizzes' && (
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                                Quiz créés {isOwnProfile ? 'par vous' : `par ${displayName}`}
                            </h2>
                            {isOwnProfile && (
                                <div className="flex gap-3 mb-6">
                                    <Link href="/quiz/create" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
                                        ✏️ Créer un quiz
                                    </Link>
                                    <Link href="/quiz/generate" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors">
                                        🤖 Générer un quiz
                                    </Link>
                                </div>
                            )}
                            {quizzes.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-8">Aucun quiz créé pour l'instant.</p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {paginatedQuizzes.map((quiz) => (
                                            <QuizCard
                                                key={quiz.id}
                                                quiz={{ ...quiz, creator: quiz.creator ?? { id: profile.id, username } }}
                                                currentUserId={currentUserId}
                                                totalPoints={quizPoints[quiz.id] || 0}
                                                showActions={isOwnProfile}
                                                onEdit={() => handleEdit(quiz.id)}
                                                onDelete={() => handleDelete(quiz.id)}
                                            />
                                        ))}
                                    </div>
                                    {quizTotalPages > 1 && (
                                        <Pagination currentPage={quizPage} totalPages={quizTotalPages} onPageChange={setQuizPage} />
                                    )}
                                </>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
