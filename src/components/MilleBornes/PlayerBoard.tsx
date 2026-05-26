'use client';

import type { MBPlayerView } from '@/hooks/useMilleBornes';
import { isBot } from '@/hooks/useMilleBornes';
import { SAFETY_LABEL, SAFETY_DESC, drivingStatus } from './labels';
import AfkCountdown from '@/components/AfkCountdown';
import { ShieldCheckIcon, BoltIcon } from '@heroicons/react/24/solid';

const TONE: Record<'go' | 'stop' | 'warn', string> = {
    go: 'bg-emerald-500/90 text-white',
    stop: 'bg-red-500/90 text-white',
    warn: 'bg-amber-500/90 text-white',
};

interface Props {
    player: MBPlayerView;
    target: number;
    isCurrent: boolean;
    isMe: boolean;
    targetable?: boolean;
    targetMode?: 'attack' | 'help';
    onTarget?: () => void;
    inactivityEndsAt?: number | null;
}

const TEAM_LABEL: Record<0 | 1, string> = { 0: 'Ambre', 1: 'Verte' };
const TEAM_DOT: Record<0 | 1, string> = { 0: 'bg-primary-500', 1: 'bg-felt-600' };

export default function PlayerBoard({ player, target, isCurrent, isMe, targetable, targetMode = 'attack', onTarget, inactivityEndsAt }: Props) {
    const st = drivingStatus(player);
    const pct = Math.min(100, Math.round((player.distance / target) * 100));

    const Wrapper: React.ElementType = targetable ? 'button' : 'div';

    return (
        <Wrapper
            {...(targetable ? { type: 'button', onClick: onTarget } : {})}
            className={`relative wood-tile rounded-xl px-3 py-2.5 text-left w-full transition-all
                ${!player.alive ? 'opacity-40 grayscale' : ''}
                ${isCurrent && player.alive ? 'ring-4 ring-yellow-300/80' : ''}
                ${isMe ? 'ring-2 ring-sky-400/70' : ''}
                ${targetable ? `cursor-pointer ring-4 animate-pulse hover:-translate-y-0.5 hover:animate-none ${targetMode === 'help' ? 'ring-emerald-500 hover:ring-emerald-400' : 'ring-red-500 hover:ring-red-400'}` : ''}`}
        >
            {targetable && (
                <span className={`absolute -top-2 -right-2 z-10 inline-flex items-center gap-0.5 text-[10px] font-black text-white rounded-full px-2 py-0.5 shadow-lg ${targetMode === 'help' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {targetMode === 'help' ? 'Soigner' : 'Attaquer'}
                </span>
            )}
            <div className="flex items-center justify-between gap-1.5 mb-1">
                <div className="flex items-center gap-1.5 font-extrabold text-gray-900 min-w-0">
                    <span className="truncate">{player.username}{isMe && ' (vous)'}</span>
                    {player.team != null && (
                        <span title={`Équipe ${TEAM_LABEL[player.team]}`} className="inline-flex items-center gap-1 text-[9px] font-bold text-gray-700 bg-white/70 rounded-full px-1.5 py-0.5">
                            <span className={`w-2 h-2 rounded-full ${TEAM_DOT[player.team]}`} />{TEAM_LABEL[player.team]}
                        </span>
                    )}
                    {isBot(player) && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-indigo-600 text-white leading-none shadow-sm">BOT</span>
                    )}
                </div>
                {inactivityEndsAt != null && <AfkCountdown endsAt={inactivityEndsAt} />}
            </div>

            <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-lg font-black text-gray-900">{player.distance}</span>
                <span className="text-[10px] text-gray-600">/ {target} km</span>
                {!player.alive ? (
                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-700/90 text-white">
                        {player.exitReason === 'abandon' ? 'Abandon' : player.exitReason === 'afk' ? 'AFK' : 'Hors course'}
                    </span>
                ) : (
                    <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${TONE[st.tone]}`}>{st.label}</span>
                )}
            </div>

            {/* Distance bar */}
            <div className="h-2 rounded-full bg-black/15 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
            </div>

            {/* Safeties + coups fourrés */}
            <div className="flex items-center gap-1 mt-1.5 flex-wrap min-h-[18px]">
                {player.safeties.map(s => (
                    <span key={s} title={SAFETY_DESC[s]} className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-800 bg-amber-200/80 rounded px-1 py-0.5 cursor-help">
                        <ShieldCheckIcon className="w-3 h-3" />
                        {SAFETY_LABEL[s]}
                    </span>
                ))}
                {player.coupsFourres > 0 && (
                    <span title="Coups fourrés réussis : botte jouée juste après l'attaque correspondante (+300 pts chacun)." className="inline-flex items-center gap-0.5 text-[9px] font-bold text-purple-800 bg-purple-200/80 rounded px-1 py-0.5 cursor-help">
                        <BoltIcon className="w-3 h-3" />
                        ×{player.coupsFourres}
                    </span>
                )}
                <span className="ml-auto text-[10px] text-gray-600 font-semibold">{player.handCount} carte{player.handCount > 1 ? 's' : ''}</span>
            </div>
        </Wrapper>
    );
}
