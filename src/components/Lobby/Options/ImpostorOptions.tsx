'use client';

import type { Socket } from 'socket.io-client';
import OptionRow from '@/components/Lobby/forms/OptionRow';
import OptionSelect from '@/components/Lobby/forms/OptionSelect';
import { formatTime } from '@/components/Lobby/forms/formatTime';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

interface Props {
    isHost: boolean;
    socket: Socket | null;
    impostorRounds: number;
    setImpostorRounds: (n: number) => void;
    impostorTime: number;
    setImpostorTime: (n: number) => void;
    impostorMisterWhite: boolean;
    setImpostorMisterWhite: (v: boolean) => void;
}

export default function ImpostorOptions({ isHost, socket, impostorRounds, setImpostorRounds, impostorTime, setImpostorTime, impostorMisterWhite, setImpostorMisterWhite }: Props) {
    return (
        <div className={`bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5 space-y-3 ${!isHost ? 'opacity-60 pointer-events-none' : ''}`}>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Options Imposteur</p>
            <OptionRow label="Rounds">
                <OptionSelect value={impostorRounds} onChange={v => { setImpostorRounds(Number(v)); socket?.emit('lobby:setImpostorOptions', { rounds: Number(v), timePerRound: impostorTime, misterWhite: impostorMisterWhite }); }}
                    options={[1, 2, 3, 4, 5].map(r => ({ v: r, label: `${r}` }))} disabled={!isHost} />
            </OptionRow>
            <OptionRow label="Temps par round">
                <OptionSelect value={impostorTime} onChange={v => { setImpostorTime(Number(v)); socket?.emit('lobby:setImpostorOptions', { rounds: impostorRounds, timePerRound: Number(v), misterWhite: impostorMisterWhite }); }}
                    options={[30, 45, 60, 90, 120].map(t => ({ v: t, label: formatTime(t) }))} disabled={!isHost} />
            </OptionRow>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Mister White</span>
                    <div className="relative group">
                        <QuestionMarkCircleIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 text-center">
                            Le Mr White commence avec un mot différent mais de la même catégorie que les autres joueurs
                        </div>
                    </div>
                </div>
                <button type="button" onClick={() => { if (!isHost) return; const v = !impostorMisterWhite; setImpostorMisterWhite(v); socket?.emit('lobby:setImpostorOptions', { rounds: impostorRounds, timePerRound: impostorTime, misterWhite: v }); }} disabled={!isHost}
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${impostorMisterWhite ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'} ${!isHost ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${impostorMisterWhite ? 'translate-x-5' : ''}`} />
                </button>
            </div>
        </div>
    );
}
