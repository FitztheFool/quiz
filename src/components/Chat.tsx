// src/components/Chat.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

type ChatTab = 'lobby' | 'team';

type ChatMessage = {
    userId: string;
    username: string;
    text: string;
    sentAt: number;
};

interface ChatProps {
    messages: ChatMessage[];
    teamMessages?: ChatMessage[];
    onSend: (text: string, tab: ChatTab) => void;
    currentUserId?: string;
    teamColor?: 0 | 1;
}

export default function Chat({ messages, teamMessages, onSend, currentUserId, teamColor }: ChatProps) {
    const [open, setOpen] = useState(false);
    const [chatText, setChatText] = useState('');
    const [activeTab, setActiveTab] = useState<ChatTab>('lobby');
    const [unread, setUnread] = useState(0);
    const [unreadLobby, setUnreadLobby] = useState(0);
    const [unreadTeam, setUnreadTeam] = useState(0);

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const prevTeamMessagesLength = useRef(0);
    const prevMessagesLength = useRef(0);

    const currentMessages = activeTab === 'team' ? (teamMessages ?? []) : messages;

    const isNearBottom = () => {
        const el = containerRef.current;
        if (!el) return true;
        return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };

    // Nouveaux messages lobby
    useEffect(() => {
        if (messages.length <= prevMessagesLength.current) return;
        prevMessagesLength.current = messages.length;

        if (!open) { setUnread(prev => prev + 1); return; }
        if (activeTab !== 'lobby') { setUnreadLobby(prev => prev + 1); return; }
        if (isNearBottom()) scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Nouveaux messages équipe
    useEffect(() => {
        if (teamMessages === undefined) return;
        if (teamMessages.length <= prevTeamMessagesLength.current) return;
        prevTeamMessagesLength.current = teamMessages.length;

        if (!open) { setUnread(prev => prev + 1); return; }
        if (activeTab !== 'team') { setUnreadTeam(prev => prev + 1); return; }
        if (isNearBottom()) scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [teamMessages]);

    // Scroll quand on change d'onglet
    useEffect(() => {
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        if (activeTab === 'lobby') setUnreadLobby(0);
        else setUnreadTeam(0);
    }, [activeTab]);

    const sendChat = () => {
        const text = chatText.trim();
        if (!text) return;
        onSend(text, activeTab);
        setChatText('');
    };

    const toggle = () => {
        setOpen(prev => !prev);
        setUnread(0);
    };

    const formatTime = (t: number) =>
        new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="fixed bottom-4 right-4 z-50">

            {/* BOUTON FERMÉ */}
            {!open && (
                <button onClick={toggle}
                    className="relative bg-blue-600 dark:bg-slate-700 hover:bg-blue-700 dark:hover:bg-slate-600 text-white px-4 py-3 rounded-full shadow-xl">
                    💬
                    {unread > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-xs px-2 py-0.5 rounded-full">
                            {unread}
                        </span>
                    )}
                </button>
            )}

            {/* FENÊTRE CHAT */}
            {open && (
                <div className="w-80 md:w-96 h-[420px] md:h-[500px] bg-white dark:bg-slate-900 border dark:border-slate-700 shadow-2xl rounded-2xl flex flex-col animate-in fade-in slide-in-from-bottom-4">

                    {/* HEADER */}
                    <div className="bg-blue-600 dark:bg-slate-800 text-white rounded-t-2xl">
                        <div className="flex justify-between items-center px-4 py-2 cursor-pointer" onClick={toggle}>
                            <div className="font-semibold">💬 Lobby Chat</div>
                            <div className="text-lg">—</div>
                        </div>

                        {teamColor !== undefined && (
                            <div className="flex border-t border-white/10 dark:border-slate-700">
                                <button
                                    onClick={() => setActiveTab('lobby')}
                                    className={`flex-1 py-2 text-xs font-semibold relative transition-all
                    ${activeTab === 'lobby'
                                            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400'
                                            : 'text-white/70 dark:text-slate-400 hover:text-white dark:hover:text-slate-200 hover:bg-white/10 dark:hover:bg-slate-700/50'
                                        }`}>
                                    💬 Lobby
                                    {unreadLobby > 0 && (
                                        <span className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1.5 rounded-full">
                                            {unreadLobby}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('team')}
                                    className={`flex-1 py-2 text-xs font-semibold relative transition-all
                    ${activeTab === 'team'
                                            ? teamColor === 0
                                                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400'
                                                : 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400'
                                            : 'text-white/70 dark:text-slate-400 hover:text-white dark:hover:text-slate-200 hover:bg-white/10 dark:hover:bg-slate-700/50'
                                        }`}>
                                    {teamColor === 0 ? '🔵 Équipe Bleue' : '🔴 Équipe Rouge'}
                                    {unreadTeam > 0 && (
                                        <span className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1.5 rounded-full">
                                            {unreadTeam}
                                        </span>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* MESSAGES */}
                    <div ref={containerRef}
                        className="flex-1 overflow-auto p-3 space-y-2 bg-gray-50 dark:bg-slate-800">

                        {currentMessages.map((m, i) => {
                            const mine = m.userId === currentUserId;
                            return (
                                <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm shadow
                                        ${mine
                                            ? 'bg-blue-600 text-white rounded-br-sm'
                                            : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100 rounded-bl-sm'
                                        }`}>
                                        {!mine && (
                                            <div className="text-xs font-bold mb-1 opacity-70">{m.username}</div>
                                        )}
                                        <div>{m.text}</div>
                                        <div className="text-[10px] mt-1 opacity-60 text-right">{formatTime(m.sentAt)}</div>
                                    </div>
                                </div>
                            );
                        })}

                        {currentMessages.length === 0 && (
                            <div className="text-center text-xs opacity-50 mt-10">Aucun message…</div>
                        )}

                        <div ref={scrollRef} />
                    </div>

                    {/* INPUT */}
                    <div className="p-3 border-t dark:border-slate-700 bg-white dark:bg-slate-900 flex gap-2">
                        <input
                            value={chatText}
                            onChange={e => setChatText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendChat()}
                            placeholder={activeTab === 'team' ? 'Message équipe…' : 'Message…'}
                            className="flex-1 border rounded-xl px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                        />
                        <button onClick={sendChat}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl">
                            ➤
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
}
