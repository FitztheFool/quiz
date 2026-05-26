// src/components/Chat.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

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
    const [isMobile, setIsMobile] = useState(false);

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [bottomOffset, setBottomOffset] = useState(16);

    useEffect(() => {
        const footer = document.querySelector('footer');
        if (!footer) return;
        const update = () => {
            const rect = footer.getBoundingClientRect();
            const visible = Math.max(0, window.innerHeight - rect.top);
            setBottomOffset(visible + 16);
        };
        update();
        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
        };
    }, []);

    useEffect(() => {
        const update = () => setIsMobile(window.innerWidth < 768);
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    useEffect(() => {
        if (isMobile && open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMobile, open]);

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
        <>
            {isMobile && open && (
                <div
                    className="fixed inset-0 z-40 bg-black/40"
                    onClick={toggle}
                    aria-hidden="true"
                />
            )}
            <div
                className={isMobile
                    ? (open ? 'fixed inset-x-0 bottom-0 z-50' : 'fixed right-4 bottom-4 z-50')
                    : 'fixed right-4 z-50'
                }
                style={isMobile ? undefined : { bottom: bottomOffset }}
            >

            {/* BOUTON FERMÉ */}
            {!open && (
                <button onClick={toggle}
                    className="relative bg-primary-600 dark:bg-slate-700 hover:bg-primary-500 dark:hover:bg-slate-600 text-white px-4 py-3 rounded-full shadow-xl">
                    <ChatBubbleLeftRightIcon className="w-5 h-5" />
                    {unread > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-xs px-2 py-0.5 rounded-full">
                            {unread}
                        </span>
                    )}
                </button>
            )}

            {/* FENÊTRE CHAT */}
            {open && (
                <div className={isMobile
                    ? 'w-full h-[80vh] bg-white dark:bg-slate-900 flex flex-col rounded-t-2xl'
                    : 'w-80 sm:w-96 max-w-[calc(100vw-2rem)] h-[500px] bg-white dark:bg-slate-900 border dark:border-slate-700 shadow-2xl rounded-2xl flex flex-col animate-in fade-in slide-in-from-bottom-4'
                }>

                    {/* HEADER */}
                    <div className="bg-primary-600 dark:bg-slate-800 text-white rounded-t-2xl">
                        <div className="flex justify-between items-center px-4 py-2 cursor-pointer" onClick={toggle}>
                            <div className="font-semibold flex items-center gap-1.5"><ChatBubbleLeftRightIcon className="w-4 h-4" />Lobby Chat</div>
                            <div className="text-lg">—</div>
                        </div>

                        {teamColor !== undefined && (
                            <div className="flex border-t border-white/10 dark:border-slate-700">
                                <button
                                    onClick={() => setActiveTab('lobby')}
                                    className={`flex-1 py-2 text-xs font-semibold relative transition-all
                    ${activeTab === 'lobby'
                                            ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400'
                                            : 'text-white/70 dark:text-slate-400 hover:text-white dark:hover:text-slate-200 hover:bg-white/10 dark:hover:bg-slate-700/50'
                                        }`}>
                                    <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 inline mr-1" />Lobby
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
                                                ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400'
                                                : 'bg-white dark:bg-slate-900 text-felt-700 dark:text-felt-400'
                                            : 'text-white/70 dark:text-slate-400 hover:text-white dark:hover:text-slate-200 hover:bg-white/10 dark:hover:bg-slate-700/50'
                                        }`}>
                                    <span className={`inline-block w-2 h-2 rounded-full mr-1 ${teamColor === 0 ? 'bg-primary-500' : 'bg-felt-600'}`} />{teamColor === 0 ? 'Équipe Ambre' : 'Équipe Verte'}
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
                                            ? 'bg-primary-600 text-white rounded-br-sm'
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
                            className="bg-primary-600 hover:bg-primary-500 text-white px-4 rounded-xl flex items-center justify-center">
                            <PaperAirplaneIcon className="w-4 h-4" />
                        </button>
                    </div>

                </div>
            )}

            </div>
        </>
    );
}
