// src/components/LoadingOverlay.tsx
import LoadingSpinner from '@/components/LoadingSpinner';

interface LoadingOverlayProps {
    loading: boolean;
    children: React.ReactNode;
}

/**
 * Wraps content with a dimming overlay + centred spinner while `loading` is true.
 * The content remains in the DOM (no layout shift) but becomes non-interactive.
 */
export default function LoadingOverlay({ loading, children }: LoadingOverlayProps) {
    return (
        <div className={`relative transition-opacity duration-150 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                    <LoadingSpinner fullScreen={false} />
                </div>
            )}
            {children}
        </div>
    );
}
