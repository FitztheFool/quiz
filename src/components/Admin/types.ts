export type UserSort = 'createdAt_desc' | 'createdAt_asc' | 'username_asc' | 'username_desc';
export type AdminTab = 'stats' | 'users' | 'quizzes' | 'categories' | 'words';

export interface AdminUser {
    status: 'ACTIVE' | 'BANNED' | 'DEACTIVATED' | 'PENDING';
    id: string;
    username: string;
    email: string;
    role: string;
    createdAt: string;
    lastSeen: string | null;
    deactivatedAt: string | null;
    bannedAt: string | null;
    image: string | null;
}

export interface AdminQuiz {
    id: string;
    title: string;
    description: string | null;
    isPublic: boolean;
    createdAt: string;
    creator: { username: string };
    category: { name: string } | null;
    _count: {
        questions: number;
        attempts: number
    };
}

export interface AdminCategory {
    id: string;
    name: string;
    slug: string;
    _count: { quizzes: number };
}
export interface AdminStats {
    totals: {
        gameStats: Record<string, {
            count: number; points: number; rounds: number
        }>;
        users: number;
        quizzes: number;
        scores: number;
        pointsScored: number;
    }; topQuizzes: {
        id: string;
        title: string;
        playCount: number;
        avgScore: number;
        maxScore: number;
        maxPossibleScore:
        number;
        questionCount: number;
    }[];
    recentActivity: import('@/components/ActivityTable').ActivityRow[]; activityMeta: { page: number; pageSize: number; totalGames: number; totalPages: number; };
}
