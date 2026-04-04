// src/components/ActivityTable.tsx
'use client';

import Link from 'next/link';
import { GAME_EMOJI_MAP, GAME_LABEL_MAP, GAME_COLOR } from '@/lib/gameConfig';
import PlayerButton from '@/components/PlayerButton';

// ─── Constants ────────────────────────────────────────────────────────────────

export const PLACEMENT_EMOJI: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActivityPlayer {
    username: string;
    score: number;
    placement: number | null;
    abandon?: boolean;
    afk?: boolean;
    isBot?: boolean;
}

export interface ActivityRow {
    gameId: string;
    gameType: string;
    createdAt: string;
    quiz: { id: string; title: string } | null;
    playerCount?: number;          // AdminPanel provides a pre-computed count
    players: ActivityPlayer[];
    /** Only present in UserStats context */
    score?: number;
    /** Only present in UserStats context */
    placement?: number | null;
    /** Only present in UserStats context */
    abandon?: boolean;
    /** Only present in UserStats context */
    afk?: boolean;
    vsBot?: boolean;
}

interface ActivityTableProps {
    rows: ActivityRow[];
    /**
     * "admin"  → columns: Jeu | Quiz | Joueurs | Date
     * "user"   → columns: Jeu | Quiz | Score | Place | Joueurs | Date
     */
    variant: 'admin' | 'user';
    onPlayerClick: (row: ActivityRow) => void;
    emptyLabel?: string;
    /** Afficher la colonne Quiz (défaut: true) */
    showQuiz?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActivityTable({
    rows,
    variant,
    onPlayerClick,
    emptyLabel = 'Aucune activité pour cette période.',
    showQuiz = true,
}: ActivityTableProps) {
    const isUser = variant === 'user';

    const headers = isUser
        ? ['Jeu', ...(showQuiz ? ['Quiz'] : []), 'Score', 'Place', 'Joueurs', 'Date']
        : ['Jeu', ...(showQuiz ? ['Quiz'] : []), 'Joueurs', 'Date'];

    return (
        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
            <table className={`w-full text-sm ${!isUser ? 'table-fixed' : 'min-w-full'}`}>
                <thead className="bg-white dark:bg-gray-900">
                    <tr>
                        {headers.map((h) => (
                            <th
                                key={h}
                                className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider"
                                style={!isUser ? columnWidth(h) : undefined}
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {rows.length === 0 ? (
                        <tr>
                            <td
                                colSpan={headers.length}
                                className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500"
                            >
                                {emptyLabel}
                            </td>
                        </tr>
                    ) : (
                        rows.map((row) => (
                            <tr
                                key={row.gameId}
                                className="hover:bg-white dark:hover:bg-gray-900 transition-colors"
                            >
                                {/* Jeu */}
                                <td className="px-3 py-2 whitespace-nowrap">
                                    <span
                                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${GAME_COLOR[row.gameType]?.badge ??
                                            'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                            }`}
                                    >
                                        {GAME_EMOJI_MAP[row.gameType] ?? '🎮'}{' '}
                                        {GAME_LABEL_MAP[row.gameType] ?? row.gameType}
                                    </span>
                                </td>

                                {/* Quiz */}
                                {showQuiz && (
                                    <td className="px-3 py-2 whitespace-nowrap max-w-[140px]">
                                        {row.quiz ? (
                                            <Link
                                                href={`/quiz/${row.quiz.id}`}
                                                className="text-blue-600 dark:text-blue-400 hover:underline text-xs truncate block"
                                            >
                                                {row.quiz.title}
                                            </Link>
                                        ) : (
                                            <span className="text-gray-300 dark:text-gray-600">—</span>
                                        )}
                                    </td>
                                )}

                                {/* Score — user only */}
                                {isUser && (
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <span className="font-semibold text-gray-900 dark:text-white text-xs">
                                            {row.score ?? 0}
                                        </span>
                                        <span className="text-[10px] text-gray-400 ml-0.5">pts</span>
                                    </td>
                                )}

                                {/* Place — user only */}
                                {isUser && (
                                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                                        {row.abandon ? (
                                            <span title="Abandon">🚫</span>
                                        ) : row.afk ? (
                                            <span title="AFK">⏳</span>
                                        ) : row.placement != null ? (
                                            <span>
                                                {PLACEMENT_EMOJI[row.placement] ?? `#${row.placement}`}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300 dark:text-gray-600">—</span>
                                        )}
                                    </td>
                                )}

                                {/* Joueurs */}
                                <td className="px-3 py-2">
                                    <PlayerButton
                                        players={row.players}
                                        onClick={() => onPlayerClick(row)}
                                    />
                                    {/* Admin variant: show pre-computed count if players array is empty */}
                                    {!isUser && row.players.length === 0 && row.playerCount != null && (
                                        <button
                                            onClick={() => onPlayerClick(row)}
                                            className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                        >
                                            👥 {row.playerCount}
                                        </button>
                                    )}
                                </td>

                                {/* Date */}
                                <td className="px-3 py-2 whitespace-nowrap text-[10px] text-gray-400 dark:text-gray-500">
                                    {new Date(row.createdAt).toLocaleDateString('fr-FR', {
                                        day: '2-digit',
                                        month: 'short',
                                    })}{' '}
                                    {new Date(row.createdAt).toLocaleTimeString('fr-FR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fixed column widths used in the admin variant (mirrors the original inline styles). */
function columnWidth(header: string): React.CSSProperties {
    const map: Record<string, string> = {
        Jeu: '22%',
        Quiz: '38%',
        Joueurs: '16%',
        Date: '24%',
    };
    return map[header] ? { width: map[header] } : {};
}
