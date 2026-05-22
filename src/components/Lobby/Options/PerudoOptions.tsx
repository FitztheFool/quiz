'use client';

import type { Socket } from 'socket.io-client';
import OptionRow from '@/components/Lobby/forms/OptionRow';
import OptionSelect from '@/components/Lobby/forms/OptionSelect';

interface Props {
    isHost: boolean;
    socket: Socket | null;
    perudoInitialDice: number;
    setPerudoInitialDice: (n: number) => void;
}

export default function PerudoOptions({ isHost, socket, perudoInitialDice, setPerudoInitialDice }: Props) {
    return (
        <div className={`bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5 space-y-3 ${!isHost ? 'opacity-60 pointer-events-none' : ''}`}>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Options Perudo</p>
            <OptionRow label="Dés par joueur au départ">
                <OptionSelect
                    value={String(perudoInitialDice)}
                    onChange={v => { const n = Number(v); setPerudoInitialDice(n); socket?.emit('lobby:setPerudoOptions', { initialDice: n }); }}
                    options={[
                        { v: '3', label: '3 dés (court)' },
                        { v: '4', label: '4 dés' },
                        { v: '5', label: '5 dés (standard)' },
                        { v: '6', label: '6 dés (long)' },
                    ]}
                    disabled={!isHost}
                />
            </OptionRow>
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">Les 1 sont wild (comptent pour n&apos;importe quelle face). Si quelqu&apos;un bid sur les 1, ils redeviennent normaux pour le round.</p>
        </div>
    );
}
