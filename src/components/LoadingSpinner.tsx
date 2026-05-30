'use client';

interface LoadingSpinnerProps {
    message?: string;
    fullScreen?: boolean;
    /** Optional sub-message displayed under the main one (e.g. an ETA). */
    hint?: string;
}

export default function LoadingSpinner({ message, fullScreen = true, hint }: LoadingSpinnerProps) {
    const content = (
        <div className="flex flex-col items-center justify-center gap-4">
            <style>{`
                @keyframes ln-spin { to { transform: rotate(360deg); } }
                @keyframes ln-spin-rev { to { transform: rotate(-360deg); } }
                @keyframes ln-pulse-dot { 0%, 80%, 100% { opacity: 0.25; transform: scale(0.7); } 40% { opacity: 1; transform: scale(1); } }
                @keyframes ln-fade { from { opacity: 0; } to { opacity: 1; } }
                @keyframes ln-glow { 0%, 100% { box-shadow: 0 0 18px rgba(220,38,38,0.25); } 50% { box-shadow: 0 0 28px rgba(220,38,38,0.45); } }
            `}</style>
            <div className="relative w-14 h-14" style={{ animation: 'ln-fade 200ms ease-out' }}>
                {/* Outer glow ring */}
                <div className="absolute inset-0 rounded-full" style={{ animation: 'ln-glow 1.6s ease-in-out infinite' }} />
                {/* Outer arc (red) */}
                <div
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: 'conic-gradient(from 0deg, transparent 0%, transparent 25%, #dc2626 90%, #dc2626 100%)',
                        WebkitMask: 'radial-gradient(circle, transparent 56%, black 58%)',
                        mask: 'radial-gradient(circle, transparent 56%, black 58%)',
                        animation: 'ln-spin 0.9s cubic-bezier(0.55, 0.1, 0.45, 0.95) infinite',
                    }}
                />
                {/* Inner arc (amber) — counter-rotating for depth */}
                <div
                    className="absolute inset-[6px] rounded-full"
                    style={{
                        background: 'conic-gradient(from 180deg, transparent 0%, transparent 40%, #f59e0b 100%)',
                        WebkitMask: 'radial-gradient(circle, transparent 50%, black 52%)',
                        mask: 'radial-gradient(circle, transparent 50%, black 52%)',
                        animation: 'ln-spin-rev 1.4s cubic-bezier(0.55, 0.1, 0.45, 0.95) infinite',
                    }}
                />
                {/* Center pulsing dots */}
                <div className="absolute inset-0 flex items-center justify-center gap-[3px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ animation: 'ln-pulse-dot 1.2s ease-in-out infinite' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" style={{ animation: 'ln-pulse-dot 1.2s ease-in-out 0.2s infinite' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ animation: 'ln-pulse-dot 1.2s ease-in-out 0.4s infinite' }} />
                </div>
            </div>
            {message && (
                <div className="flex flex-col items-center gap-1" style={{ animation: 'ln-fade 300ms ease-out' }}>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-wide">{message}</p>
                    {hint && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">{hint}</p>
                    )}
                </div>
            )}
        </div>
    );

    if (!fullScreen) return content;

    return (
        <div
            className="min-h-screen flex items-center justify-center px-4"
            style={{
                background: 'radial-gradient(circle at 50% 30%, rgba(220,38,38,0.08), transparent 60%)',
            }}
        >
            {content}
        </div>
    );
}
