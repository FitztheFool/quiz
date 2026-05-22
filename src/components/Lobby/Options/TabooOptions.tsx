'use client';

import type { Socket } from 'socket.io-client';
import OptionRow from '@/components/Lobby/forms/OptionRow';
import OptionSelect from '@/components/Lobby/forms/OptionSelect';
import { formatTime } from '@/components/Lobby/forms/formatTime';

interface Props {
    isHost: boolean;
    socket: Socket | null;
    tabooTurnDuration: number;
    setTabooTurnDuration: (n: number) => void;
    tabooTotalRounds: number;
    setTabooTotalRounds: (n: number) => void;
    tabooTrapWordCount: number;
    setTabooTrapWordCount: (n: number) => void;
    tabooTrapDuration: number;
    setTabooTrapDuration: (n: number) => void;
    tabooMaxAttempts: number;
    setTabooMaxAttempts: (n: number) => void;
}

export default function TabooOptions({ isHost, socket, tabooTurnDuration, setTabooTurnDuration, tabooTotalRounds, setTabooTotalRounds, tabooTrapWordCount, setTabooTrapWordCount, tabooTrapDuration, setTabooTrapDuration, tabooMaxAttempts, setTabooMaxAttempts }: Props) {
    return (
        <div className={`bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5 space-y-3 ${!isHost ? 'opacity-60 pointer-events-none' : ''}`}>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Options Taboo</p>
            <OptionRow label="Durée d'un tour"><OptionSelect value={tabooTurnDuration} onChange={v => { setTabooTurnDuration(Number(v)); socket?.emit('lobby:setTabooOptions', { turnDuration: Number(v) }); }} options={[15, 30, 45, 60, 90, 120, 180, 240, 300].map(t => ({ v: t, label: formatTime(t) }))} disabled={!isHost} /></OptionRow>
            <OptionRow label="Rounds"><OptionSelect value={tabooTotalRounds} onChange={v => { setTabooTotalRounds(Number(v)); socket?.emit('lobby:setTabooOptions', { totalRounds: Number(v) }); }} options={[1, 2, 3, 4, 5, 7, 10].map(r => ({ v: r, label: `${r}` }))} disabled={!isHost} /></OptionRow>
            <OptionRow label="Mots piégés"><OptionSelect value={tabooTrapWordCount} onChange={v => { setTabooTrapWordCount(Number(v)); socket?.emit('lobby:setTabooOptions', { trapWordCount: Number(v) }); }} options={[2, 3, 4, 5, 6, 7, 8, 10].map(n => ({ v: n, label: `${n}` }))} disabled={!isHost} /></OptionRow>
            <OptionRow label="Temps mots piégés"><OptionSelect value={tabooTrapDuration} onChange={v => { setTabooTrapDuration(Number(v)); socket?.emit('lobby:setTabooOptions', { trapDuration: Number(v) }); }} options={[15, 30, 45, 60, 90, 120, 180].map(t => ({ v: t, label: formatTime(t) }))} disabled={!isHost} /></OptionRow>
            <OptionRow label="Tentatives max"><OptionSelect value={tabooMaxAttempts} onChange={v => { setTabooMaxAttempts(Number(v)); socket?.emit('lobby:setTabooOptions', { maxAttempts: Number(v) }); }} options={[3, 5, 7, 10, 15, 20, 30].map(n => ({ v: n, label: `${n}` }))} disabled={!isHost} /></OptionRow>
        </div>
    );
}
