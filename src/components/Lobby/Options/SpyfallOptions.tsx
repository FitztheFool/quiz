'use client';

import type { Socket } from 'socket.io-client';
import OptionRow from '@/components/Lobby/forms/OptionRow';
import OptionSelect from '@/components/Lobby/forms/OptionSelect';
import { formatTime } from '@/components/Lobby/forms/formatTime';

interface Props {
    isHost: boolean;
    socket: Socket | null;
    spyfallExchanges: number;
    setSpyfallExchanges: (n: number) => void;
    spyfallTurnTime: number;
    setSpyfallTurnTime: (n: number) => void;
}

export default function SpyfallOptions({ isHost, socket, spyfallExchanges, setSpyfallExchanges, spyfallTurnTime, setSpyfallTurnTime }: Props) {
    return (
        <div className={`bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5 space-y-3 ${!isHost ? 'opacity-60 pointer-events-none' : ''}`}>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Options Spyfall</p>
            <OptionRow label="Questions par joueur">
                <OptionSelect value={spyfallExchanges} onChange={v => { setSpyfallExchanges(Number(v)); socket?.emit('lobby:setSpyfallOptions', { exchangesPerPlayer: Number(v), turnTime: spyfallTurnTime }); }}
                    options={[1, 2, 3].map(r => ({ v: r, label: `${r}` }))} disabled={!isHost} />
            </OptionRow>
            <OptionRow label="Temps par tour">
                <OptionSelect value={spyfallTurnTime} onChange={v => { setSpyfallTurnTime(Number(v)); socket?.emit('lobby:setSpyfallOptions', { exchangesPerPlayer: spyfallExchanges, turnTime: Number(v) }); }}
                    options={[30, 45, 60, 90, 120].map(t => ({ v: t, label: formatTime(t) }))} disabled={!isHost} />
            </OptionRow>
        </div>
    );
}
