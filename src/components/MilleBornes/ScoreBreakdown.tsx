'use client';

import type { MBScore } from '@/hooks/useMilleBornes';
import { isBot } from '@/hooks/useMilleBornes';

interface Props {
    scores: MBScore[];
    myUserId: string;
    winnerUserId: string | null;
    winningTeam?: 0 | 1 | null;
}

const TEAM_LABEL: Record<0 | 1, string> = { 0: 'Ambre', 1: 'Verte' };
const TEAM_DOT: Record<0 | 1, string> = { 0: 'bg-primary-500', 1: 'bg-felt-600' };

export default function ScoreBreakdown({ scores, myUserId, winnerUserId, winningTeam = null }: Props) {
    const is2v2 = scores.some(s => s.team != null);
    // Active players first (by score desc), then players who abandoned / went AFK.
    // In 2v2, group by team (winning team first).
    const rank = (s: MBScore) => (s.abandon || s.afk ? 1 : 0);
    const teamRank = (s: MBScore) => (winningTeam != null && s.team === winningTeam ? 0 : 1);
    const sorted = [...scores].sort((a, b) =>
        rank(a) - rank(b)
        || (is2v2 ? teamRank(a) - teamRank(b) || (a.team ?? 0) - (b.team ?? 0) : 0)
        || b.total - a.total);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        <th className="text-left py-2 px-2">Joueur</th>
                        <th className="text-right py-2 px-1.5" title="Distance parcourue">Dist.</th>
                        <th className="text-right py-2 px-1.5" title="Bottes (100 chacune, +300 si les 4)">Bottes</th>
                        <th className="text-right py-2 px-1.5" title="Coups fourrés (300 chacun)">Coups f.</th>
                        <th className="text-right py-2 px-1.5" title="Bonus d'arrivée">Arrivée</th>
                        <th className="text-right py-2 px-2 font-bold">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map(s => {
                        const isMe = s.userId === myUserId;
                        const dq = !!s.abandon || !!s.afk;
                        const isWinner = !dq && (is2v2 && winningTeam != null ? s.team === winningTeam : s.userId === winnerUserId);
                        return (
                            <tr
                                key={s.userId}
                                className={`border-t border-gray-200 dark:border-gray-700/60 ${isMe ? 'bg-sky-50 dark:bg-sky-950/30' : ''} ${dq ? 'opacity-60' : ''}`}
                            >
                                <td className="py-2 px-2 font-semibold text-gray-900 dark:text-white">
                                    <span className="inline-flex items-center gap-1.5">
                                        {isWinner && <span aria-hidden>🏆</span>}
                                        {s.team != null && <span title={`Équipe ${TEAM_LABEL[s.team]}`} className={`w-2 h-2 rounded-full ${TEAM_DOT[s.team]}`} />}
                                        <span className="truncate max-w-[140px]">{s.username}</span>
                                        {isBot(s) && <span className="text-[10px] font-bold text-indigo-500 uppercase">Bot</span>}
                                        {s.abandon && <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase bg-red-100 dark:bg-red-950/50 rounded px-1">Abandon</span>}
                                        {s.afk && !s.abandon && <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase bg-amber-100 dark:bg-amber-950/50 rounded px-1">AFK</span>}
                                    </span>
                                </td>
                                <td className="text-right px-1.5 tabular-nums text-gray-600 dark:text-gray-300">{s.distance}</td>
                                <td className="text-right px-1.5 tabular-nums text-gray-600 dark:text-gray-300">{s.safetyPts || '–'}</td>
                                <td className="text-right px-1.5 tabular-nums text-gray-600 dark:text-gray-300">{s.coupFourrePts || '–'}</td>
                                <td className="text-right px-1.5 tabular-nums text-gray-600 dark:text-gray-300">{s.arrivalPts || '–'}</td>
                                <td className="text-right px-2 tabular-nums font-black text-gray-900 dark:text-white">{s.total}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
