import type { Dir } from '@/lib/snake/constants';

const btnClass = 'flex items-center justify-center w-12 h-12 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 active:bg-gray-400 dark:active:bg-gray-600 text-gray-800 dark:text-white rounded-xl text-lg font-bold transition-colors select-none touch-none';

export function MobileControls({ onPress }: { onPress: (dir: Dir) => void }) {
    return (
        <div className="mt-5 grid grid-cols-3 gap-2 w-40">
            <div />
            <button className={btnClass} onPointerDown={() => onPress('U')}>↑</button>
            <div />
            <button className={btnClass} onPointerDown={() => onPress('L')}>←</button>
            <button className={btnClass} onPointerDown={() => onPress('D')}>↓</button>
            <button className={btnClass} onPointerDown={() => onPress('R')}>→</button>
        </div>
    );
}
