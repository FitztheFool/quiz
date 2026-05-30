'use client';

import { userInitials } from '@/lib/userColor';

// Single brand gradient used everywhere a user is rendered without a picture
// (sidebar, profile, settings, admin table, waiting screen, …) so the same
// "A" looks the same in every surface.
const AVATAR_GRADIENT = 'from-sky-400 to-indigo-500';

interface Props {
    /** Unused — kept for backward compatibility. Avatar color is uniform. */
    seed?: string;
    /** Display name used for initials and alt text. */
    name: string;
    /** Optional profile picture URL. When present, overrides the colored avatar. */
    image?: string | null;
    /** Avatar size. Defaults to `md` (40px). */
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    /** Shape: `square` (rounded square) or `round` (circle). Defaults to `square`. */
    shape?: 'square' | 'round';
    /** Show a small green online dot in the bottom-right corner. */
    online?: boolean;
    className?: string;
}

const SIZE_CLASS: Record<NonNullable<Props['size']>, string> = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
};

const DOT_SIZE: Record<NonNullable<Props['size']>, string> = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
    xl: 'w-4 h-4',
};

export default function UserAvatar({
    seed: _seed, name, image, size = 'md', shape = 'square', online, className = '',
}: Props) {
    const radius = shape === 'round' ? 'rounded-full' : 'rounded-xl';
    const sizeCls = SIZE_CLASS[size];
    const dotCls = DOT_SIZE[size];

    return (
        <div className={`relative ${sizeCls} shrink-0 ${className}`}>
            {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt={name} className={`w-full h-full object-cover ${radius}`} />
            ) : (
                <div className={`w-full h-full bg-gradient-to-br ${AVATAR_GRADIENT} flex items-center justify-center text-white font-black ${radius} shadow-sm`}>
                    {userInitials(name)}
                </div>
            )}
            {online && (
                <span className={`absolute -bottom-0.5 -right-0.5 ${dotCls} rounded-full bg-emerald-500 border-2 border-white dark:border-gray-950`} />
            )}
        </div>
    );
}
