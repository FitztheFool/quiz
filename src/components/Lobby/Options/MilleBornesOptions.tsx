'use client';

import type { Socket } from 'socket.io-client';
import OptionRow from '@/components/Lobby/forms/OptionRow';
import OptionSelect from '@/components/Lobby/forms/OptionSelect';

interface Props {
    isHost: boolean;
    socket: Socket | null;
    mbTarget: number;
    setMbTarget: (n: number) => void;
    mbTeamMode: 'none' | '2v2';
    setMbTeamMode: (m: 'none' | '2v2') => void;
    mbTeamDistance: 'individual' | 'shared';
    setMbTeamDistance: (d: 'individual' | 'shared') => void;
}

export default function MilleBornesOptions({
    isHost, socket, mbTarget, setMbTarget,
    mbTeamMode, setMbTeamMode, mbTeamDistance, setMbTeamDistance,
}: Props) {
    return (
        <div className={`bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5 space-y-3 ${!isHost ? 'opacity-60 pointer-events-none' : ''}`}>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Options Mille Bornes</p>
            <OptionRow label="Distance à parcourir">
                <OptionSelect
                    value={String(mbTarget)}
                    onChange={v => { const n = Number(v); setMbTarget(n); socket?.emit('lobby:setMilleBornesOptions', { target: n }); }}
                    options={[
                        { v: '700', label: '700 km (rapide)' },
                        { v: '1000', label: '1000 km (standard)' },
                    ]}
                    disabled={!isHost}
                />
            </OptionRow>
            <div className="grid grid-cols-2 gap-2">
                {([{ v: 'none', label: 'Chacun pour soi', desc: '2–4 joueurs' }, { v: '2v2', label: 'Équipes 2v2', desc: '4 joueurs' }] as const).map(opt => (
                    <button key={opt.v} onClick={() => { if (!isHost) return; setMbTeamMode(opt.v); socket?.emit('lobby:setMilleBornesOptions', { teamMode: opt.v }); }}
                        className={`py-2.5 px-3 rounded-xl border-2 text-xs font-semibold transition-all flex flex-col items-center gap-0.5
                            ${mbTeamMode === opt.v
                                ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-300'
                                : 'border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'}`}>
                        <span>{opt.label}</span><span className="opacity-60 font-normal">{opt.desc}</span>
                    </button>
                ))}
            </div>
            {mbTeamMode === '2v2' && (
                <OptionRow label="Distance d'équipe">
                    <OptionSelect
                        value={mbTeamDistance}
                        onChange={v => { const d = v as 'individual' | 'shared'; setMbTeamDistance(d); socket?.emit('lobby:setMilleBornesOptions', { teamDistance: d }); }}
                        options={[
                            { v: 'individual', label: 'Individuelle (1ᵉʳ à la cible)' },
                            { v: 'shared', label: 'Commune (cumul de l\'équipe)' },
                        ]}
                        disabled={!isHost}
                    />
                </OptionRow>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                {mbTeamMode === '2v2'
                    ? "2 équipes de 2. On aide son coéquipier (parades) et on n'attaque que l'équipe adverse."
                    : 'Course de cartes : avancez, attaquez, parez et tentez le coup fourré. Premier à la distance exacte gagne.'}
            </p>
        </div>
    );
}
