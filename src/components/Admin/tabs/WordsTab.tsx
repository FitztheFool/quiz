'use client';

import LoadingSpinner from '@/components/LoadingSpinner';

interface Word { id: string; word: string; description: string | null; }
interface WordIndex { letter: string; count: number; }

interface Props {
    wordIndex: WordIndex[];
    wordTotal: number;
    selectedLetter: string | null;
    setSelectedLetter: (l: string | null) => void;
    letterWords: Word[];
    setLetterWords: (w: Word[]) => void;
    loadingLetter: boolean;
    newWord: string;
    setNewWord: (v: string) => void;
    newWordDesc: string;
    setNewWordDesc: (v: string) => void;
    editingWord: { id: string; word: string; description: string } | null;
    setEditingWord: (w: { id: string; word: string; description: string } | null) => void;
    onSelectLetter: (letter: string) => void;
    onAddWord: () => void;
    onSaveWord: () => void;
    onDeleteWord: (id: string, word: string) => void;
}

export default function WordsTab({
    wordIndex, wordTotal, selectedLetter, setSelectedLetter,
    letterWords, setLetterWords, loadingLetter,
    newWord, setNewWord, newWordDesc, setNewWordDesc,
    editingWord, setEditingWord,
    onSelectLetter, onAddWord, onSaveWord, onDeleteWord,
}: Props) {
    return (
        <div id="admin-words" className="scroll-mt-24 space-y-4">
            {/* Formulaire d'ajout */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3 flex flex-wrap gap-2">
                <input
                    type="text"
                    placeholder="Nouveau mot…"
                    value={newWord}
                    onChange={e => setNewWord(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && onAddWord()}
                    className="flex-1 min-w-[140px] text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg px-3 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <input
                    type="text"
                    placeholder="Description (optionnel)…"
                    value={newWordDesc}
                    onChange={e => setNewWordDesc(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && onAddWord()}
                    className="flex-[2] min-w-[180px] text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg px-3 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <button onClick={onAddWord} className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors shrink-0">
                    + Ajouter
                </button>
            </div>

            {/* Index par lettre */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Index — {wordTotal} mot{wordTotal > 1 ? 's' : ''}
                    </h3>
                    {selectedLetter && (
                        <button onClick={() => { setSelectedLetter(null); setLetterWords([]); }} className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline">
                            ← Toutes les lettres
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {wordIndex.map(({ letter, count }) => (
                        <button
                            key={letter}
                            onClick={() => onSelectLetter(letter)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${selectedLetter === letter
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        >
                            {letter}
                            <span className="ml-1 text-[10px] opacity-70">{count}</span>
                        </button>
                    ))}
                    {wordIndex.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500">Aucun mot enregistré.</p>}
                </div>
            </div>

            {/* Liste des mots */}
            {selectedLetter && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-2">
                    {loadingLetter ? (
                        <div className="flex justify-center py-6"><LoadingSpinner fullScreen={false} /></div>
                    ) : letterWords.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500 py-2">Aucun mot pour cette lettre.</p>
                    ) : letterWords.map(w => (
                        <div key={w.id} className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-2.5 gap-3">
                            {editingWord?.id === w.id ? (
                                <div className="flex flex-1 gap-2 mr-2">
                                    <input
                                        value={editingWord.word}
                                        onChange={e => setEditingWord({ ...editingWord, word: e.target.value })}
                                        onKeyDown={e => e.key === 'Enter' && onSaveWord()}
                                        className="flex-1 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        autoFocus
                                    />
                                    <input
                                        value={editingWord.description}
                                        onChange={e => setEditingWord({ ...editingWord, description: e.target.value })}
                                        onKeyDown={e => e.key === 'Enter' && onSaveWord()}
                                        placeholder="Description…"
                                        className="flex-[2] text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 shrink-0">{w.word}</span>
                                    {w.description && <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{w.description}</span>}
                                </div>
                            )}
                            <div className="flex gap-1.5 shrink-0">
                                {editingWord?.id === w.id ? (
                                    <>
                                        <button onClick={onSaveWord} className="text-[10px] px-2 py-0.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors">Sauvegarder</button>
                                        <button onClick={() => setEditingWord(null)} className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Annuler</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => setEditingWord({ id: w.id, word: w.word, description: w.description ?? '' })} className="text-[10px] font-semibold text-blue-500 hover:text-blue-700 px-2 py-0.5 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">Modifier</button>
                                        <button onClick={() => onDeleteWord(w.id, w.word)} className="text-[10px] font-semibold text-red-500 hover:text-red-700 px-2 py-0.5 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Supprimer</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
