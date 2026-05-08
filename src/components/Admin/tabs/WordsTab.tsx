'use client';

import LoadingSpinner from '@/components/LoadingSpinner';
import Pagination from '@/components/Pagination';
import {
    MagnifyingGlassIcon, PlusIcon, PencilSquareIcon, TrashIcon,
    CheckIcon, XMarkIcon, ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import type { AdminWord } from '../hooks/useAdminWords';
import type { AdminWordGroup } from '../types';

interface WordIndex { letter: string; count: number; }

interface Props {
    wordGroups: AdminWordGroup[];
    wordIndex: WordIndex[];
    wordTotal: number;
    selectedLetter: string | null;
    setSelectedLetter: (l: string | null) => void;
    letterWords: AdminWord[];
    setLetterWords: (w: AdminWord[]) => void;
    letterPage: number;
    letterTotalPages: number;
    loadingLetter: boolean;
    wordSearch: string;
    setWordSearch: (q: string) => void;
    wordGroupFilter: string;
    setWordGroupFilter: (v: string) => void;
    wordSearchResults: AdminWord[];
    setWordSearchResults: (w: AdminWord[]) => void;
    wordSearchPage: number;
    wordSearchTotalPages: number;
    loadingWordSearch: boolean;
    newWord: string;
    setNewWord: (v: string) => void;
    newWordDesc: string;
    setNewWordDesc: (v: string) => void;
    newWordGroupId: string;
    setNewWordGroupId: (v: string) => void;
    editingWord: { id: string; word: string; description: string; wordGroupId: string } | null;
    setEditingWord: (w: { id: string; word: string; description: string; wordGroupId: string } | null) => void;
    onSelectLetter: (letter: string) => void;
    onLetterPageChange: (page: number) => void;
    onWordSearchPageChange: (page: number) => void;
    onAddWord: () => void;
    onSaveWord: () => void;
    onDeleteWord: (id: string, word: string) => void;
}

function GroupSelect({ value, onChange, groups, placeholder }: {
    value: string; onChange: (v: string) => void;
    groups: AdminWordGroup[]; placeholder?: string;
}) {
    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400"
        >
            <option value="">{placeholder ?? '— Groupe —'}</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.theme}</option>)}
        </select>
    );
}

function WordRow({ w, editingWord, setEditingWord, wordGroups, onSaveWord, onDeleteWord }: {
    w: AdminWord;
    editingWord: Props['editingWord'];
    setEditingWord: Props['setEditingWord'];
    wordGroups: AdminWordGroup[];
    onSaveWord: () => void;
    onDeleteWord: (id: string, word: string) => void;
}) {
    const isEditing = editingWord?.id === w.id;
    return (
        <li className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors gap-3">
            {isEditing ? (
                <div className="flex flex-1 flex-wrap gap-2">
                    <input
                        value={editingWord.word}
                        onChange={e => setEditingWord({ ...editingWord, word: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && onSaveWord()}
                        className="w-28 text-sm border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        autoFocus
                    />
                    <input
                        value={editingWord.description}
                        onChange={e => setEditingWord({ ...editingWord, description: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && onSaveWord()}
                        placeholder="Description…"
                        className="flex-1 min-w-[140px] text-sm border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <GroupSelect
                        value={editingWord.wordGroupId}
                        onChange={v => setEditingWord({ ...editingWord, wordGroupId: v })}
                        groups={wordGroups}
                        placeholder="— Aucun groupe —"
                    />
                </div>
            ) : (
                <div className="flex items-center gap-2.5 flex-1 min-w-0 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 shrink-0">{w.word}</span>
                    {w.wordGroup && (
                        <span className="text-[10px] font-medium bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 px-2 py-0.5 rounded-full shrink-0">
                            {w.wordGroup.theme}
                        </span>
                    )}
                    {w.description && <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{w.description}</span>}
                </div>
            )}
            <div className="flex items-center gap-1 shrink-0">
                {isEditing ? (
                    <>
                        <button onClick={onSaveWord} className="inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded-lg transition-colors">
                            <CheckIcon className="w-3 h-3" />
                            Sauvegarder
                        </button>
                        <button onClick={() => setEditingWord(null)} className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-2 py-1 rounded-lg transition-colors">
                            <XMarkIcon className="w-3 h-3" />
                            Annuler
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => setEditingWord({ id: w.id, word: w.word, description: w.description ?? '', wordGroupId: w.wordGroupId ?? '' })}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border border-blue-200 dark:border-blue-800"
                        >
                            <PencilSquareIcon className="w-3 h-3" />
                            Modifier
                        </button>
                        <button onClick={() => onDeleteWord(w.id, w.word)} className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-red-200 dark:border-red-800">
                            <TrashIcon className="w-3 h-3" />
                            Supprimer
                        </button>
                    </>
                )}
            </div>
        </li>
    );
}

export default function WordsTab({
    wordGroups, wordIndex, wordTotal, selectedLetter, setSelectedLetter,
    letterWords, setLetterWords, letterPage, letterTotalPages, loadingLetter,
    wordSearch, setWordSearch, wordGroupFilter, setWordGroupFilter,
    wordSearchResults, setWordSearchResults,
    wordSearchPage, wordSearchTotalPages, loadingWordSearch,
    newWord, setNewWord, newWordDesc, setNewWordDesc,
    newWordGroupId, setNewWordGroupId,
    editingWord, setEditingWord,
    onSelectLetter, onLetterPageChange, onWordSearchPageChange,
    onAddWord, onSaveWord, onDeleteWord,
}: Props) {
    const isSearching = wordSearch.trim().length > 0 || wordGroupFilter !== '';

    return (
        <div id="admin-words" className="scroll-mt-24 space-y-4">

            {/* Add form */}
            <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 flex flex-wrap gap-2 items-center">
                <input
                    type="text"
                    placeholder="Nouveau mot…"
                    value={newWord}
                    onChange={e => setNewWord(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && onAddWord()}
                    className="w-32 text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <input
                    type="text"
                    placeholder="Description (optionnel)…"
                    value={newWordDesc}
                    onChange={e => setNewWordDesc(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && onAddWord()}
                    className="flex-1 min-w-[160px] text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <GroupSelect value={newWordGroupId} onChange={setNewWordGroupId} groups={wordGroups} />
                <button onClick={onAddWord} className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors shrink-0">
                    <PlusIcon className="w-4 h-4" />
                    Ajouter
                </button>
            </div>

            {/* Search + group filter */}
            <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[180px]">
                    <MagnifyingGlassIcon className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        value={wordSearch}
                        onChange={e => setWordSearch(e.target.value)}
                        placeholder="Rechercher un mot…"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                </div>
                <GroupSelect
                    value={wordGroupFilter}
                    onChange={setWordGroupFilter}
                    groups={wordGroups}
                    placeholder="— Tous les groupes —"
                />
            </div>

            {/* Search results */}
            {isSearching && (
                <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                    {loadingWordSearch ? (
                        <div className="flex justify-center py-10"><LoadingSpinner fullScreen={false} message="Chargement..." /></div>
                    ) : wordSearchResults.length === 0 ? (
                        <p className="px-4 py-10 text-sm text-center text-gray-400 dark:text-gray-500">Aucun mot trouvé.</p>
                    ) : (
                        <>
                            <ul className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {wordSearchResults.map(w => (
                                    <WordRow key={w.id} w={w} editingWord={editingWord} setEditingWord={setEditingWord}
                                        wordGroups={wordGroups} onSaveWord={onSaveWord} onDeleteWord={onDeleteWord} />
                                ))}
                            </ul>
                            <Pagination currentPage={wordSearchPage} totalPages={wordSearchTotalPages} onPageChange={onWordSearchPageChange} />
                        </>
                    )}
                </div>
            )}

            {/* Letter index */}
            {!isSearching && (
                <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                            Index — <span className="tabular-nums">{wordTotal.toLocaleString('fr-FR')}</span> mot{wordTotal > 1 ? 's' : ''}
                        </p>
                        {selectedLetter && (
                            <button onClick={() => { setSelectedLetter(null); setLetterWords([]); }} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                                <ArrowLeftIcon className="w-3.5 h-3.5" />
                                Toutes les lettres
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {wordIndex.map(({ letter, count }) => (
                            <button
                                key={letter}
                                onClick={() => onSelectLetter(letter)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                    selectedLetter === letter
                                        ? 'bg-red-600 text-white border-red-600'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                {letter}
                                <span className="ml-1 text-[10px] opacity-60 tabular-nums">{count}</span>
                            </button>
                        ))}
                        {wordIndex.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-500">Aucun mot enregistré.</p>}
                    </div>
                </div>
            )}

            {/* Letter words */}
            {!isSearching && selectedLetter && (
                <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                    {loadingLetter ? (
                        <div className="flex justify-center py-10"><LoadingSpinner fullScreen={false} message="Chargement..." /></div>
                    ) : letterWords.length === 0 ? (
                        <p className="px-4 py-10 text-sm text-center text-gray-400 dark:text-gray-500">Aucun mot pour cette lettre.</p>
                    ) : (
                        <>
                            <ul className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {letterWords.map(w => (
                                    <WordRow key={w.id} w={w} editingWord={editingWord} setEditingWord={setEditingWord}
                                        wordGroups={wordGroups} onSaveWord={onSaveWord} onDeleteWord={onDeleteWord} />
                                ))}
                            </ul>
                            <Pagination currentPage={letterPage} totalPages={letterTotalPages} onPageChange={onLetterPageChange} />
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
