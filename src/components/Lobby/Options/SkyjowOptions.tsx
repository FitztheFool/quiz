'use client';

import type { Socket } from 'socket.io-client';
import Toggle from '@/components/Lobby/forms/Toggle';

interface Props {
    isHost: boolean;
    socket: Socket | null;
    skyjowEliminateRows: boolean;
    setSkyjowEliminateRows: (v: boolean) => void;
}

export default function SkyjowOptions({ isHost, socket, skyjowEliminateRows, setSkyjowEliminateRows }: Props) {
    return (
        <div className={`bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5 space-y-3 ${!isHost ? 'opacity-60 pointer-events-none' : ''}`}>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Options Skyjow</p>
            <Toggle checked={skyjowEliminateRows} onChange={v => { setSkyjowEliminateRows(v); socket?.emit('lobby:setSkyjowOptions', { eliminateRows: v }); }} label="Éliminer les lignes (4 identiques)" disabled={!isHost} />
        </div>
    );
}
