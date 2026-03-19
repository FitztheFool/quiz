// src/components/QuizSearch.tsx
import { useRef, useState } from "react";

function QuizSearch({ isHost, onSelect, selectedId }: { isHost: boolean; onSelect: (id: string, title: string) => void; selectedId?: string }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ id: string; title: string; _count: { questions: number } }[]>([]);
    const [selectedTitle, setSelectedTitle] = useState('');
    const [open, setOpen] = useState(false);
    const searchTimer = useRef<NodeJS.Timeout | null>(null);

    const [selectedQuizId, setSelectedQuizId] = useState<string | undefined>();
    const [selectedQuizTitle, setSelectedQuizTitle] = useState('');

    const search = (q: string) => {
        setQuery(q);
        setOpen(true);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (!q.trim()) { setResults([]); return; }
        searchTimer.current = setTimeout(async () => {
            const res = await fetch(`/api/quiz?search=${encodeURIComponent(q)}&page=1&pageSize=6`);
            if (!res.ok) return;
            const data = await res.json();
            setResults(Array.isArray(data) ? data : data.quizzes ?? []);
        }, 300);
    };

    return (
        <div className="relative">
            <input
                type="text"
                value={selectedTitle || query}
                onChange={e => { setSelectedTitle(''); search(e.target.value); }}
                onFocus={() => { if (query) setOpen(true); }}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                placeholder="Rechercher un quiz…"
                disabled={!isHost}
                className="w-full bg-slate-700/60 border border-slate-600/50 rounded-lg px-3 py-1.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {open && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600/50 rounded-lg shadow-xl overflow-hidden">
                    {results.map(q => (
                        <button key={q.id} onMouseDown={() => { onSelect(q.id, q.title); setSelectedTitle(q.title); setQuery(''); setOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700 transition-colors ${selectedId === q.id ? 'bg-blue-600/20 text-blue-300' : 'text-slate-200'}`}>
                            <span className="font-medium truncate">{q.title}</span>
                            <span className="text-slate-500 flex-shrink-0 ml-2">{q._count.questions}q</span>
                        </button>
                    ))}
                </div>
            )}
            {selectedId && selectedTitle && (
                <p className="text-xs text-green-400 mt-1">✅ {selectedTitle}</p>
            )}
        </div>
    );
}
