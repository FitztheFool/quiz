'use client';

import type { Socket } from 'socket.io-client';
import OptionRow from '@/components/Lobby/forms/OptionRow';
import OptionSelect from '@/components/Lobby/forms/OptionSelect';

interface Props {
    isHost: boolean;
    socket: Socket | null;
    cantStopColumnsToWin: number;
    setCantStopColumnsToWin: (n: number) => void;
}

export default function CantStopOptions({ isHost, socket, cantStopColumnsToWin, setCantStopColumnsToWin }: Props) {
    return (
        <div className={`bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5 space-y-3 ${!isHost ? 'opacity-60 pointer-events-none' : ''}`}>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Options Can&apos;t Stop</p>
            <OptionRow label="Colonnes à claim pour gagner">
                <OptionSelect
                    value={String(cantStopColumnsToWin)}
                    onChange={v => { const n = Number(v); setCantStopColumnsToWin(n); socket?.emit('lobby:setCantStopOptions', { columnsToWin: n }); }}
                    options={[
                        { v: '2', label: '2 (rapide)' },
                        { v: '3', label: '3 (standard)' },
                        { v: '4', label: '4 (long)' },
                    ]}
                    disabled={!isHost}
                />
            </OptionRow>
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">Push-your-luck aux dés. Continuez ou banker à chaque lancer. Bust → progression du tour perdue.</p>
        </div>
    );
}
