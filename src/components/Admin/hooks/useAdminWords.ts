import { useCallback, useState } from 'react';

export interface AdminWord {
    id: string;
    word: string;
    description: string | null;
    wordGroupId: string | null;
    wordGroup: { id: string; theme: string } | null;
}

export function useAdminWords() {
    const [wordIndex, setWordIndex] = useState<{ letter: string; count: number }[]>([]);
    const [wordTotal, setWordTotal] = useState(0);
    const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
    const [letterWords, setLetterWords] = useState<AdminWord[]>([]);
    const [letterPage, setLetterPage] = useState(1);
    const [letterTotalPages, setLetterTotalPages] = useState(1);
    const [loadingLetter, setLoadingLetter] = useState(false);
    const [wordSearch, setWordSearch] = useState('');
    const [wordGroupFilter, setWordGroupFilter] = useState('');
    const [wordSearchResults, setWordSearchResults] = useState<AdminWord[]>([]);
    const [wordSearchPage, setWordSearchPage] = useState(1);
    const [wordSearchTotalPages, setWordSearchTotalPages] = useState(1);
    const [loadingWordSearch, setLoadingWordSearch] = useState(false);
    const [newWord, setNewWord] = useState('');
    const [newWordDesc, setNewWordDesc] = useState('');
    const [newWordGroupId, setNewWordGroupId] = useState('');
    const [editingWord, setEditingWord] = useState<{ id: string; word: string; description: string; wordGroupId: string } | null>(null);

    const fetchWordIndex = useCallback(async () => {
        const res = await fetch('/api/admin/words', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        setWordIndex(data.index);
        setWordTotal(data.total);
    }, []);

    const fetchLetter = useCallback(async (letter: string, page = 1) => {
        setLoadingLetter(true);
        try {
            const res = await fetch(`/api/admin/words?letter=${letter}&page=${page}`, { cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();
            setLetterWords(data.words ?? []);
            setLetterPage(data.page ?? page);
            setLetterTotalPages(data.totalPages ?? 1);
        } finally { setLoadingLetter(false); }
    }, []);

    const fetchWordSearch = useCallback(async (q: string, groupId: string, page = 1) => {
        setLoadingWordSearch(true);
        try {
            const params = new URLSearchParams({ page: String(page) });
            if (q) params.set('q', q);
            if (groupId) params.set('groupId', groupId);
            const res = await fetch(`/api/admin/words?${params}`, { cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();
            setWordSearchResults(data.words ?? []);
            setWordSearchPage(data.page ?? page);
            setWordSearchTotalPages(data.totalPages ?? 1);
        } finally { setLoadingWordSearch(false); }
    }, []);

    const handleSelectLetter = useCallback(async (letter: string) => {
        setSelectedLetter(letter);
        setEditingWord(null);
        setWordSearch('');
        setWordGroupFilter('');
        setWordSearchResults([]);
        await fetchLetter(letter, 1);
    }, [fetchLetter]);

    const handleLetterPageChange = useCallback(async (page: number) => {
        if (!selectedLetter) return;
        setEditingWord(null);
        await fetchLetter(selectedLetter, page);
    }, [fetchLetter, selectedLetter]);

    const handleWordSearchPageChange = useCallback(async (page: number) => {
        setEditingWord(null);
        await fetchWordSearch(wordSearch, wordGroupFilter, page);
    }, [fetchWordSearch, wordSearch, wordGroupFilter]);

    const handleAddWord = async () => {
        if (!newWord.trim()) return;
        const res = await fetch('/api/admin/words', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word: newWord, description: newWordDesc, wordGroupId: newWordGroupId || null }),
        });
        if (!res.ok) { alert((await res.json())?.error ?? 'Erreur'); return; }
        const created = await res.json();
        setNewWord(''); setNewWordDesc(''); setNewWordGroupId('');
        const firstLetter = created.word[0].toUpperCase();
        await fetchWordIndex();
        if (wordSearch || wordGroupFilter) {
            await fetchWordSearch(wordSearch, wordGroupFilter, wordSearchPage);
        } else if (selectedLetter === firstLetter) {
            await fetchLetter(firstLetter, letterPage);
        } else {
            setSelectedLetter(firstLetter);
            await fetchLetter(firstLetter, 1);
        }
    };

    const handleSaveWord = async () => {
        if (!editingWord) return;
        const res = await fetch('/api/admin/words', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wordId: editingWord.id,
                word: editingWord.word,
                description: editingWord.description,
                wordGroupId: editingWord.wordGroupId || null,
            }),
        });
        if (!res.ok) { alert((await res.json())?.error ?? 'Erreur'); return; }
        const updated = await res.json();
        setEditingWord(null);
        setLetterWords(prev => prev.map(w => w.id === updated.id ? updated : w));
        setWordSearchResults(prev => prev.map(w => w.id === updated.id ? updated : w));
        await fetchWordIndex();
    };

    const handleDeleteWord = async (wordId: string, word: string) => {
        if (!confirm(`Supprimer le mot "${word}" ?`)) return;
        await fetch('/api/admin/words', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wordId }) });
        setLetterWords(prev => prev.filter(w => w.id !== wordId));
        setWordSearchResults(prev => prev.filter(w => w.id !== wordId));
        await fetchWordIndex();
        if (selectedLetter && !wordSearch && !wordGroupFilter) await fetchLetter(selectedLetter, letterPage);
    };

    return {
        wordIndex, wordTotal, selectedLetter, setSelectedLetter,
        letterWords, setLetterWords, letterPage, letterTotalPages,
        loadingLetter,
        wordSearch, setWordSearch,
        wordGroupFilter, setWordGroupFilter,
        wordSearchResults, setWordSearchResults, wordSearchPage, wordSearchTotalPages, loadingWordSearch,
        newWord, setNewWord, newWordDesc, setNewWordDesc,
        newWordGroupId, setNewWordGroupId,
        editingWord, setEditingWord,
        fetchWordIndex, fetchWordSearch, handleSelectLetter, handleLetterPageChange,
        handleWordSearchPageChange, handleAddWord, handleSaveWord, handleDeleteWord,
    };
}
