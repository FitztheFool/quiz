'use client';

import type { Socket } from 'socket.io-client';
import OptionRow from '@/components/Lobby/forms/OptionRow';
import OptionSelect from '@/components/Lobby/forms/OptionSelect';
import Toggle from '@/components/Lobby/forms/Toggle';

interface Props {
    isHost: boolean;
    socket: Socket | null;
    unoTeamMode: 'none' | '2v2';
    setUnoTeamMode: (v: 'none' | '2v2') => void;
    handleUnoTeamMode: (v: 'none' | '2v2') => void;
    unoTeamWinMode: 'one' | 'both';
    setUnoTeamWinMode: (v: 'one' | 'both') => void;
    unoStackable: boolean;
    setUnoStackable: (v: boolean) => void;
    unoJumpIn: boolean;
    setUnoJumpIn: (v: boolean) => void;
}

export default function UnoOptions({ isHost, socket, unoTeamMode, handleUnoTeamMode, unoTeamWinMode, setUnoTeamWinMode, unoStackable, setUnoStackable, unoJumpIn, setUnoJumpIn }: Props) {
    return (
        <div className={`bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5 space-y-3 ${!isHost ? 'opacity-60 pointer-events-none' : ''}`}>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Options UNO</p>
            <div className="grid grid-cols-2 gap-2">
                {([{ v: 'none', label: 'Solo', desc: '2–8 joueurs' }, { v: '2v2', label: '2v2', desc: '4 joueurs' }] as const).map(opt => (
                    <button key={opt.v} onClick={() => isHost && handleUnoTeamMode(opt.v)}
                        className={`py-2.5 px-3 rounded-xl border-2 text-xs font-semibold transition-all flex flex-col items-center gap-0.5
                            ${unoTeamMode === opt.v
                                ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-300'
                                : 'border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'}`}>
                        <span>{opt.label}</span><span className="opacity-60 font-normal">{opt.desc}</span>
                    </button>
                ))}
            </div>
            {unoTeamMode === '2v2' && (
                <OptionRow label="Condition de victoire">
                    <OptionSelect value={unoTeamWinMode} onChange={v => { setUnoTeamWinMode(v as 'one' | 'both'); socket?.emit('lobby:setUnoOptions', { teamWinMode: v }); }}
                        options={[{ v: 'one', label: 'Un vide sa main' }, { v: 'both', label: 'Les 2 vident' }]} disabled={!isHost} />
                </OptionRow>
            )}
            <Toggle checked={unoStackable} onChange={v => { setUnoStackable(v); socket?.emit('lobby:setUnoOptions', { stackable: v }); }} label="Cartes empilables (+2/+4)" disabled={!isHost} />
            {unoTeamMode !== '2v2' && <Toggle checked={unoJumpIn} onChange={v => { setUnoJumpIn(v); socket?.emit('lobby:setUnoOptions', { jumpIn: v }); }} label="Jump-in" disabled={!isHost} />}
        </div>
    );
}
