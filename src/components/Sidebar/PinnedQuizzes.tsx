'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookmarkIcon } from '@heroicons/react/24/solid';
import { usePinnedQuizzes } from '@/hooks/usePinnedQuizzes';

interface Props {
    collapsed: boolean;
}

export default function PinnedQuizzes({ collapsed }: Props) {
    const { pinned } = usePinnedQuizzes();
    const pathname = usePathname();

    if (pinned.length === 0) return null;

    return (
        <div className="ml-3 space-y-0.5 border-l-2 border-gray-100 dark:border-gray-700 pl-3">
            {pinned.map(p => {
                const href = `/quiz/${p.id}`;
                const isActive = pathname === href;
                return (
                    <Link
                        key={p.id}
                        href={href}
                        title={p.title}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${isActive ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        <BookmarkIcon className="w-3 h-3 flex-shrink-0 text-blue-500" />
                        {!collapsed && <span className="truncate">{p.title}</span>}
                    </Link>
                );
            })}
        </div>
    );
}
