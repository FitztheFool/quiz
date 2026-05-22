'use client';

import type { Socket } from 'socket.io-client';
import OptionRow from '@/components/Lobby/forms/OptionRow';
import OptionSelect from '@/components/Lobby/forms/OptionSelect';

interface Props {
    isHost: boolean;
    socket: Socket | null;
    gridSize: number;
    setGridSize: (n: number) => void;
    turnTime: number;
    setTurnTime: (n: number) => void;
}

export default function BattleshipOptions({ isHost, socket, gridSize, setGridSize, turnTime, setTurnTime }: Props) {
    return (
        <div className={`bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5 space-y-3 ${!isHost ? 'opacity-60 pointer-events-none' : ''}`}>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Options Bataille Navale</p>
            <OptionRow label="Taille de la grille">
                <OptionSelect value={gridSize} onChange={v => { const g = Number(v); setGridSize(g); socket?.emit('lobby:setBattleshipOptions', { gridSize: g, turnTime }); }}
                    options={[8, 10, 12].map(n => ({ v: n, label: `${n}×${n}` }))} disabled={!isHost} />
            </OptionRow>
            <OptionRow label="Temps par tour">
                <OptionSelect value={turnTime} onChange={v => { const t = Number(v); setTurnTime(t); socket?.emit('lobby:setBattleshipOptions', { gridSize, turnTime: t }); }}
                    options={[10, 20, 30, 60, 90, 120].map(t => ({ v: t, label: `${t}s` }))} disabled={!isHost} />
            </OptionRow>
        </div>
    );
}
