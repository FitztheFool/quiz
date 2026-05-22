'use client';

import type { Socket } from 'socket.io-client';
import OptionRow from '@/components/Lobby/forms/OptionRow';
import OptionSelect from '@/components/Lobby/forms/OptionSelect';

interface Props {
    isHost: boolean;
    socket: Socket | null;
    ludoTeamMode: 'none' | '2v2';
    handleLudoTeamMode: (v: 'none' | '2v2') => void;
    ludoPawnExit: '6' | '6_or_1' | 'any';
    setLudoPawnExit: (v: '6' | '6_or_1' | 'any') => void;
    ludoBonusOn6: 'unlimited' | 'triple_lose' | 'none';
    setLudoBonusOn6: (v: 'unlimited' | 'triple_lose' | 'none') => void;
    ludoWinMode: 'first_done' | 'full_ranking';
    setLudoWinMode: (v: 'first_done' | 'full_ranking') => void;
}

export default function LudoOptions({ isHost, socket, ludoTeamMode, handleLudoTeamMode, ludoPawnExit, setLudoPawnExit, ludoBonusOn6, setLudoBonusOn6, ludoWinMode, setLudoWinMode }: Props) {
    return (
        <div className={`bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5 space-y-3 ${!isHost ? 'opacity-60 pointer-events-none' : ''}`}>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Options Ludo</p>
            <div className="grid grid-cols-2 gap-2">
                {([{ v: 'none', label: 'Chacun pour soi', desc: '2–4 joueurs' }, { v: '2v2', label: '2v2', desc: '4 joueurs' }] as const).map(opt => (
                    <button key={opt.v} onClick={() => isHost && handleLudoTeamMode(opt.v)}
                        className={`py-2.5 px-3 rounded-xl border-2 text-xs font-semibold transition-all flex flex-col items-center gap-0.5
                            ${ludoTeamMode === opt.v
                                ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-300'
                                : 'border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'}`}>
                        <span>{opt.label}</span><span className="opacity-60 font-normal">{opt.desc}</span>
                    </button>
                ))}
            </div>
            <OptionRow label="Sortie d'un pion">
                <OptionSelect value={ludoPawnExit} onChange={v => { setLudoPawnExit(v as '6' | '6_or_1' | 'any'); socket?.emit('lobby:setLudoOptions', { pawnExit: v }); }}
                    options={[{ v: '6', label: 'Sur un 6' }, { v: '6_or_1', label: 'Sur 6 ou 1' }, { v: 'any', label: 'Sur tout score' }]} disabled={!isHost} />
            </OptionRow>
            <OptionRow label="Bonus sur un 6">
                <OptionSelect value={ludoBonusOn6} onChange={v => { setLudoBonusOn6(v as 'unlimited' | 'triple_lose' | 'none'); socket?.emit('lobby:setLudoOptions', { bonusOn6: v }); }}
                    options={[{ v: 'unlimited', label: 'Relance illimitée' }, { v: 'triple_lose', label: 'Triple 6 = tour perdu' }, { v: 'none', label: 'Aucun bonus' }]} disabled={!isHost} />
            </OptionRow>
            <OptionRow label="Fin de partie">
                <OptionSelect value={ludoWinMode} onChange={v => { setLudoWinMode(v as 'first_done' | 'full_ranking'); socket?.emit('lobby:setLudoOptions', { winMode: v }); }}
                    options={[{ v: 'first_done', label: 'Premier arrivé' }, { v: 'full_ranking', label: 'Classement complet' }]} disabled={!isHost} />
            </OptionRow>
        </div>
    );
}
