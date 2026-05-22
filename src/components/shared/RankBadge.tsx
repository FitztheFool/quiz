interface Props {
    rank: number;
    size?: 'sm' | 'md';
}

const SIZE_CLASS = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-lg',
};

export default function RankBadge({ rank, size = 'md' }: Props) {
    const base = `inline-flex items-center justify-center rounded-full font-black shadow-md ${SIZE_CLASS[size]}`;
    if (rank === 1) return <span className={`${base} bg-amber-300 text-amber-900`}>1</span>;
    if (rank === 2) return <span className={`${base} bg-slate-300 text-slate-800`}>2</span>;
    if (rank === 3) return <span className={`${base} bg-orange-400 text-orange-950`}>3</span>;
    return <span className={`inline-flex items-center justify-center font-semibold text-gray-400 ${SIZE_CLASS[size]}`}>#{rank}</span>;
}
