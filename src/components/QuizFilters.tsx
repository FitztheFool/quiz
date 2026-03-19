// src/components/QuizFilters.tsx
'use client';

import { useEffect } from 'react';

interface Category {
  id: string;
  name: string;
}

interface QuizFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  categoryId: string;
  onCategoryChange: (value: string) => void;
  categories: Category[];
  onQuizzesChange: (quizzes: any[]) => void;
}

export default function QuizFilters({
  search,
  onSearchChange,
  categoryId,
  onCategoryChange,
  categories,
  onQuizzesChange,
}: QuizFiltersProps) {
  const hasFilters = search || categoryId;

  useEffect(() => {
    if (!search && !categoryId) return;

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (categoryId) params.set('categoryId', categoryId);
        const res = await fetch(`/api/quiz?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.quizzes ?? [];
          onQuizzesChange(list);
        }
      } catch (err) {
        console.error('Erreur recherche:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, categoryId]);

  const handleReset = async () => {
    onSearchChange('');
    onCategoryChange('');
    try {
      const res = await fetch('/api/quiz');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.quizzes ?? [];
        onQuizzesChange(list);
      }
    } catch (err) {
      console.error('Erreur reset:', err);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[180px]">
        <label className="block text-xs font-medium text-gray-500 mb-1">🔍 Recherche</label>
        <input
          type="text"
          placeholder="Rechercher par titre..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input-field w-full"
        />
      </div>

      <div className="flex-1 min-w-[160px]">
        <label className="block text-xs font-medium text-gray-500 mb-1">🏷️ Catégorie</label>
        <select
          value={categoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="input-field w-full"
          disabled={categories.length === 0}
        >
          <option value="">
            {categories.length === 0 ? 'Chargement...' : 'Toutes les catégories'}
          </option>
          {[...categories]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
        </select>
      </div>

      {hasFilters && (
        <button
          onClick={handleReset}
          className="text-sm text-gray-500 hover:text-gray-700 underline whitespace-nowrap"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}
