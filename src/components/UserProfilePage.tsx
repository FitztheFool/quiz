// src/components/UserProfilePage.tsx
'use client';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import QuizCard from '@/components/Quiz/QuizCard';
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
        <div className="flex-1 flex items-center justify-center p-8">
            <LoadingSpinner fullScreen={false} />
        </div>
    );

    if (notFound || !profile) return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
            <div className="text-center">
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">Joueur introuvable</p>
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">

                {/* ── Header compact ── */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-3">
                    <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                            {profile.image ? (
                                <img src={profile.image} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-base font-bold">
                                    {displayName.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>

                        {/* Nom */}
                        <div className="flex-1 min-w-0">
                            <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight truncate">
                                {isOwnProfile ? `Bonjour, ${displayName}` : displayName}
                            </h1>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                {isOwnProfile ? 'Dashboard personnel' : 'Profil joueur'}
                            </p>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5 shrink-0">
                            {(['stats', 'quizzes'] as TabType[]).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${
                                        activeTab === tab
                                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                                >
                                    {tab === 'stats' ? '📊 Stats' : '📝 Quiz'}
                                </button>
                            ))}
                        </div>

                        {/* Action */}
                        {!isOwnProfile && (
                            <button
                                onClick={() => router.back()}
                                className="text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition shrink-0"
                            >
                                ← Retour
                            </button>
                        )}
                        {isOwnProfile && (
                            <a
                                href="/settings"
                                className="text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition shrink-0"
                            >
                                ⚙️ Paramètres
                            </a>
                        )}
                    </div>
                </div>

                {/* ── Contenu ── */}
                {activeTab === 'stats' && <UserStats username={username} />}

                {activeTab === 'quizzes' && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                        <div className="flex items-center justify-between gap-4 mb-5">
                            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Quiz {isOwnProfile ? 'créés par vous' : `de ${displayName}`}
                            </h2>
                            {isOwnProfile && (
                                <div className="flex gap-2">
                                    <Link href="/quiz/create" className="rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white transition">
                                        ✏️ Créer
                                    </Link>
                                    <Link href="/quiz/generate" className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 transition">
                                        🤖 Générer
                                    </Link>
                                </div>
                            )}
                        </div>

                        {quizzes.length === 0 ? (
                            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">Aucun quiz créé pour l'instant.</p>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
    );
}
