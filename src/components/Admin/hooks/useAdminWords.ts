import { useCallback, useState } from 'react';

export function useAdminWords() {
    const [wordIndex, setWordIndex] = useState<{ letter: string; count: number }[]>([]);
    const [wordTotal, setWordTotal] = useState(0);
    const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
    const [letterWords, setLetterWords] = useState<{ id: string; word: string; description: string | null }[]>([]);
    const [loadingLetter, setLoadingLetter] = useState(false);
    const [newWord, setNewWord] = useState('');
    const [newWordDesc, setNewWordDesc] = useState('');
    const [editingWord, setEditingWord] = useState<{ id: string; word: string; description: string } | null>(null);

    const fetchWordIndex = useCallback(async () => {
        const res = await fetch('/api/admin/words', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        setWordIndex(data.index);
        setWordTotal(data.total);
    }, []);

    const fetchLetter = useCallback(async (letter: string) => {
        setLoadingLetter(true);
        try {
            const res = await fetch(`/api/admin/words?letter=${letter}`, { cache: 'no-store' });
            if (res.ok) setLetterWords((await res.json()).words);
        } finally { setLoadingLetter(false); }
    }, []);

    const handleSelectLetter = useCallback(async (letter: string) => {
        setSelectedLetter(letter);
        setEditingWord(null);
        await fetchLetter(letter);
    }, [fetchLetter]);

    const handleAddWord = async () => {
        if (!newWord.trim()) return;
        const res = await fetch('/api/admin/words', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word: newWord, description: newWordDesc }) });
        if (!res.ok) { alert((await res.json())?.error ?? 'Erreur'); return; }
        const created = await res.json();
        setNewWord(''); setNewWordDesc('');
        const firstLetter = created.word[0].toUpperCase();
        await fetchWordIndex();
        if (selectedLetter === firstLetter) {
            setLetterWords(prev => [...prev, created].sort((a, b) => a.word.localeCompare(b.word)));
        } else { setSelectedLetter(firstLetter); await fetchLetter(firstLetter); }
    };

    const handleSaveWord = async () => {
        if (!editingWord) return;
        const res = await fetch('/api/admin/words', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wordId: editingWord.id, word: editingWord.word, description: editingWord.description }) });
        if (!res.ok) { alert((await res.json())?.error ?? 'Erreur'); return; }
        setEditingWord(null);
        await fetchWordIndex();
        if (selectedLetter) await fetchLetter(selectedLetter);
    };

    const handleDeleteWord = async (wordId: string, word: string) => {
        if (!confirm(`Supprimer le mot "${word}" ?`)) return;
        await fetch('/api/admin/words', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wordId }) });
        setLetterWords(prev => prev.filter(w => w.id !== wordId));
        await fetchWordIndex();
    };

    return { wordIndex, wordTotal, selectedLetter, setSelectedLetter, letterWords, setLetterWords, loadingLetter, newWord, setNewWord, newWordDesc, setNewWordDesc, editingWord, setEditingWord, fetchWordIndex, handleSelectLetter, handleAddWord, handleSaveWord, handleDeleteWord };
}
