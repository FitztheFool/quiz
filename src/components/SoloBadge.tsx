// src/components/SoloBadge.tsx
export function SoloBadge({ color }: { color: string }) {
    return (
        <span
            className="absolute top-3 -left-5 -rotate-45 text-white text-[9px] font-bold px-8 py-0.5 leading-none tracking-widest pointer-events-none"
            style={{ background: `linear-gradient(to right, transparent, ${color} 30%, ${color} 70%, transparent)` }}
        >
            SOLO
        </span>
    );
}
