import { useCallback, useRef, useState } from 'react';
import type { GameFilter } from '@/components/GameFilterPills';
import type { AdminStats } from '../types';

const ACTIVITY_PAGE_SIZE = 20;

export function useAdminStats(activityPeriod: number) {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [loadingActivity, setLoadingActivity] = useState(false);
    const userQueryRef = useRef('');
    const gameFilterRef = useRef<GameFilter>('ALL');

    const buildUrl = useCallback((period: number, page: number, q: string, gameType: GameFilter | 'ALL') => {
        const params = new URLSearchParams({ period: String(period), page: String(page), pageSize: String(ACTIVITY_PAGE_SIZE) });
        if (q.trim()) params.set('q', q.trim());
        if (gameType !== 'ALL') params.set('gameType', gameType);
        return `/api/admin/stats?${params}`;
    }, []);

    const fetchFull = useCallback(async (period = activityPeriod, page = 1, q = userQueryRef.current, gameType: GameFilter | 'ALL' = gameFilterRef.current) => {
        setLoadingStats(true);
        try {
            const res = await fetch(buildUrl(period, page, q, gameType), { cache: 'no-store' });
            if (res.ok) setStats(await res.json());
        } finally { setLoadingStats(false); }
    }, [activityPeriod, buildUrl]);

    const refreshActivity = useCallback(async (period: number, page: number, q: string, gameType: GameFilter | 'ALL' = gameFilterRef.current) => {
        setLoadingActivity(true);
        try {
            const res = await fetch(buildUrl(period, page, q, gameType), { cache: 'no-store' });
            if (!res.ok) return;
            const data: AdminStats = await res.json();
            setStats(prev => prev ? { ...prev, recentActivity: data.recentActivity, activityMeta: data.activityMeta } : data);
        } finally { setLoadingActivity(false); }
    }, [buildUrl]);

    return { stats, loadingStats, loadingActivity, fetchFull, refreshActivity, userQueryRef, gameFilterRef };
}
