'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AdminUser {
    id: string;
    username: string;
    email: string;
    role: string;
    createdAt: string;
    _count: { createdQuizzes: number; scores: number };
}

interface AdminQuiz {
    id: string;
    title: string;
    description: string | null;
    isPublic: boolean;
    createdAt: string;
    creator: { username: string };
    category: { name: string } | null;
    _count: { questions: number; scores: number };
}

interface AdminCategory {
    id: string;
    name: string;
    slug: string;
    _count: { quizzes: number };
}

interface AdminStats {
    totals: { users: number; quizzes: number; scores: number; pointsScored: number };
    topQuizzes: { id: string; title: string; playCount: number; avgScore: number; maxScore: number; maxPossibleScore: number; questionCount: number }[];
    recentActivity: { completedAt: string; totalScore: number; quiz: { title: string }; user: { username: string } }[];
}

type AdminTab = 'stats' | 'users' | 'quizzes' | 'categories';

export default function AdminPanel() {
    const [activeTab, setActiveTab] = useState<AdminTab>('stats');
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [quizzes, setQuizzes] = useState<AdminQuiz[]>([]);
    const [categories, setCategories] = useState<AdminCategory[]>([]);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);

    useEffect(() => {
        fetchTab(activeTab);
    }, [activeTab]);

    const fetchTab = async (tab: AdminTab) => {
        setLoading(true);
        try {
            if (tab === 'stats') {
                const res = await fetch('/api/admin/stats');
                if (res.ok) setStats(await res.json());
            } else if (tab === 'users') {
                const res = await fetch('/api/admin/users');
                if (res.ok) setUsers(await res.json());
            } else if (tab === 'quizzes') {
                const res = await fetch('/api/admin/quiz');
                if (res.ok) setQuizzes(await res.json());
            } else if (tab === 'categories') {
                const res = await fetch('/api/admin/categories');
                if (res.ok) setCategories(await res.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, role: string) => {
        const res = await fetch('/api/admin/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, role }),
        });
        if (res.ok) fetchTab('users');
    };

    const handleDeleteUser = async (userId: string, username: string) => {
        if (!confirm(`Supprimer l'utilisateur "${username}" ?`)) return;
        const res = await fetch('/api/admin/users', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        if (res.ok) setUsers(users.filter((u) => u.id !== userId));
        else alert((await res.json()).error);
    };

    const handleDeleteQuiz = async (quizId: string, title: string) => {
        if (!confirm(`Supprimer le quiz "${title}" ?`)) return;
        const res = await fetch('/api/admin/quiz', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quizId }),
        });
        if (res.ok) setQuizzes(quizzes.filter((q) => q.id !== quizId));
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        const res = await fetch('/api/admin/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newCategoryName }),
        });
        if (res.ok) {
            setNewCategoryName('');
            fetchTab('categories');
        } else alert((await res.json()).error);
    };

    const handleRenameCategory = async () => {
        if (!editingCategory || !editingCategory.name.trim()) return;
        const res = await fetch('/api/admin/categories', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryId: editingCategory.id, name: editingCategory.name }),
        });
        if (res.ok) {
            setEditingCategory(null);
            fetchTab('categories');
        }
    };

    const handleDeleteCategory = async (categoryId: string, name: string) => {
        if (!confirm(`Supprimer la catégorie "${name}" ?`)) return;
        const res = await fetch('/api/admin/categories', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryId }),
        });
        if (res.ok) setCategories(categories.filter((c) => c.id !== categoryId));
        else alert((await res.json()).error);
    };

    const tabs: { key: AdminTab; label: string; emoji: string }[] = [
        { key: 'stats', label: 'Statistiques', emoji: '📊' },
        { key: 'users', label: 'Utilisateurs', emoji: '👥' },
        { key: 'quizzes', label: 'Quiz', emoji: '📝' },
        { key: 'categories', label: 'Catégories', emoji: '🏷️' },
    ];

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                🛡️ Administration
            </h2>

            {/* Sous-onglets admin */}
            <div className="flex gap-2 flex-wrap mb-6 border-b border-gray-200 pb-4">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${activeTab === tab.key
                            ? 'bg-red-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {tab.emoji} {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-red-600 border-t-transparent"></div>
                </div>
            ) : (
                <>
                    {/* Stats */}
                    {activeTab === 'stats' && stats && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Utilisateurs', value: stats.totals.users, color: 'blue' },
                                    { label: 'Quiz', value: stats.totals.quizzes, color: 'green' },
                                    { label: 'Parties jouées', value: stats.totals.scores, color: 'orange' },
                                    { label: 'Points marqués', value: stats.totals.pointsScored, color: 'purple' },
                                ].map((stat) => (
                                    <div key={stat.label} className={`bg-${stat.color}-50 border border-${stat.color}-200 rounded-xl p-4 text-center`}>
                                        <div className={`text-3xl font-bold text-${stat.color}-600`}>{stat.value.toLocaleString()}</div>
                                        <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4">🏆 Quiz les plus joués</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 text-gray-600 text-left">
                                                <th className="px-4 py-3 rounded-l-lg">Quiz</th>
                                                <th className="px-4 py-3 text-center">Questions</th>
                                                <th className="px-4 py-3 text-center">Parties</th>
                                                <th className="px-4 py-3 text-center">Score moyen</th>
                                                <th className="px-4 py-3 text-center">Score max joueur</th>
                                                <th className="px-4 py-3 text-center rounded-r-lg">Score max quiz</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.topQuizzes.map((quiz, i) => (
                                                <tr key={quiz.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-medium">
                                                        <Link href={`/quiz/${quiz.id}`} className="hover:text-blue-600">
                                                            {i + 1}. {quiz.title}
                                                        </Link>
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-gray-500">{quiz.questionCount}</td>
                                                    <td className="px-4 py-3 text-center">{quiz.playCount}</td>
                                                    <td className="px-4 py-3 text-center text-orange-600 font-semibold">{quiz.avgScore} pts</td>
                                                    <td className="px-4 py-3 text-center text-green-600 font-semibold">{quiz.maxScore} pts</td>
                                                    <td className="px-4 py-3 text-center text-purple-600 font-semibold">{quiz.maxPossibleScore} pts</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4">🕐 Activité récente (30 jours)</h3>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {stats.recentActivity.map((activity, i) => (
                                        <div key={i} className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-2 text-sm">
                                            <span className="font-medium text-gray-800">{activity.user.username}</span>
                                            <span className="text-gray-500 truncate mx-4">{activity.quiz.title}</span>
                                            <span className="text-orange-600 font-semibold whitespace-nowrap">{activity.totalScore} pts</span>
                                            <span className="text-gray-400 ml-4 whitespace-nowrap">
                                                {new Date(activity.completedAt).toLocaleDateString('fr-FR')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Users */}
                    {activeTab === 'users' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600 text-left">
                                        <th className="px-4 py-3 rounded-l-lg">Utilisateur</th>
                                        <th className="px-4 py-3">Email</th>
                                        <th className="px-4 py-3 text-center">Quiz créés</th>
                                        <th className="px-4 py-3 text-center">Parties</th>
                                        <th className="px-4 py-3 text-center">Rôle</th>
                                        <th className="px-4 py-3 text-center rounded-r-lg">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-4 py-3 font-semibold">{user.username}</td>
                                            <td className="px-4 py-3 text-gray-500">{user.email}</td>
                                            <td className="px-4 py-3 text-center">{user._count.createdQuizzes}</td>
                                            <td className="px-4 py-3 text-center">{user._count.scores}</td>
                                            <td className="px-4 py-3 text-center">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                    disabled={user.role === 'ADMIN'}
                                                    className={`text-xs font-bold px-2 py-1 rounded-full border ${user.role === 'ADMIN' ? 'bg-red-100 text-red-700 border-red-200' :
                                                        user.role === 'RANDOM' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                            'bg-blue-100 text-blue-700 border-blue-200'
                                                        }`}
                                                >
                                                    <option value="USER">USER</option>
                                                    <option value="RANDOM">RANDOM</option>
                                                    <option value="ADMIN">ADMIN</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {user.role !== 'ADMIN' && (
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id, user.username)}
                                                        className="text-red-500 hover:text-red-700 font-semibold text-xs px-3 py-1 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                                                    >
                                                        Supprimer
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Quiz */}
                    {activeTab === 'quizzes' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600 text-left">
                                        <th className="px-4 py-3 rounded-l-lg">Titre</th>
                                        <th className="px-4 py-3">Créateur</th>
                                        <th className="px-4 py-3">Catégorie</th>
                                        <th className="px-4 py-3 text-center">Questions</th>
                                        <th className="px-4 py-3 text-center">Parties</th>
                                        <th className="px-4 py-3 text-center">Visibilité</th>
                                        <th className="px-4 py-3 text-center rounded-r-lg">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quizzes.map((quiz) => (
                                        <tr key={quiz.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium">
                                                <Link href={`/quiz/${quiz.id}`} className="hover:text-blue-600">
                                                    {quiz.title}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">{quiz.creator.username}</td>
                                            <td className="px-4 py-3 text-gray-500">{quiz.category?.name ?? '—'}</td>
                                            <td className="px-4 py-3 text-center">{quiz._count.questions}</td>
                                            <td className="px-4 py-3 text-center">{quiz._count.scores}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${quiz.isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {quiz.isPublic ? 'Public' : 'Privé'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center flex gap-2 justify-center">
                                                <Link
                                                    href={`/quiz/${quiz.id}/edit`}
                                                    className="text-blue-500 hover:text-blue-700 font-semibold text-xs px-3 py-1 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                                                >
                                                    Modifier
                                                </Link>
                                                <button
                                                    onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                                                    className="text-red-500 hover:text-red-700 font-semibold text-xs px-3 py-1 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                                                >
                                                    Supprimer
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Categories */}
                    {activeTab === 'categories' && (
                        <div className="space-y-6">
                            {/* Créer une catégorie */}
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="Nouvelle catégorie..."
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                                    className="input-field flex-1"
                                />
                                <button
                                    onClick={handleCreateCategory}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                                >
                                    + Ajouter
                                </button>
                            </div>

                            {/* Liste des catégories */}
                            <div className="space-y-2">
                                {categories.map((cat) => (
                                    <div key={cat.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                                        {editingCategory?.id === cat.id ? (
                                            <input
                                                type="text"
                                                value={editingCategory.name}
                                                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                                onKeyDown={(e) => e.key === 'Enter' && handleRenameCategory()}
                                                className="input-field flex-1 mr-4"
                                                autoFocus
                                            />
                                        ) : (
                                            <div>
                                                <span className="font-semibold text-gray-800">{cat.name}</span>
                                                <span className="text-xs text-gray-400 ml-3">{cat._count.quizzes} quiz</span>
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            {editingCategory?.id === cat.id ? (
                                                <>
                                                    <button onClick={handleRenameCategory} className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                                        Sauvegarder
                                                    </button>
                                                    <button onClick={() => setEditingCategory(null)} className="text-xs px-3 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
                                                        Annuler
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setEditingCategory({ id: cat.id, name: cat.name })}
                                                        className="text-blue-500 hover:text-blue-700 font-semibold text-xs px-3 py-1 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                                                    >
                                                        Renommer
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                                        className="text-red-500 hover:text-red-700 font-semibold text-xs px-3 py-1 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                                                    >
                                                        Supprimer
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
