// src/components/QuizForm.tsx
'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { uploadToCloudinary } from '@/lib/uploadToCloudinary';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

type QuestionType = 'TRUE_FALSE' | 'MCQ' | 'TEXT' | 'MULTI_TEXT' | 'MCQ_UNIQUE';

type AnswerForm = {
    id?: string;
    tempId?: string;
    text: string;
    isCorrect: boolean;
};

type QuestionForm = {
    id?: string;
    tempId?: string;
    text: string;
    type: QuestionType;
    points: number;
    answers: AnswerForm[];
    strictOrder?: boolean;
    imageUrl?: string;
};

type QuizFormState = {
    id?: string;
    title: string;
    description: string;
    isPublic: boolean;
    randomizeQuestions?: boolean;
    categoryId?: string;
    imageUrl?: string;
    questions: QuestionForm[];
};

interface Category {
    id: string;
    name: string;
}

// ─── Upload signé via votre backend ──────────────────────────────────────────
// Votre route POST /api/upload reçoit un FormData avec le champ "file"
// et retourne { url: string } (ou { secure_url: string } selon votre implémentation).
// Adaptez l'URL et le nom du champ de retour si nécessaire.

// ─── Composant ImageUpload ────────────────────────────────────────────────────
function ImageUpload({
    value,
    onChange,
    label = 'Image',
}: {
    value?: string;
    onChange: (url: string | undefined) => void;
    label?: string;
}) {
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setUploadError('Fichier non valide — image requise');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setUploadError('Image trop lourde — 5 Mo max');
            return;
        }
        setUploadError(null);
        setUploading(true);
        try {
            const url = await uploadToCloudinary(file, 'quiz');
            onChange(url);
        } catch (e: any) {
            setUploadError(e?.message ?? "Erreur lors de l'upload");
        } finally {
            setUploading(false);
        }
    }, [onChange]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label}
                <span className="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">(optionnel)</span>
            </label>

            {value ? (
                /* ── Prévisualisation ── */
                <div className="relative inline-block group">
                    <img
                        src={value}
                        alt="Aperçu"
                        className="h-32 w-auto max-w-xs rounded-lg object-cover border border-gray-200 dark:border-gray-700 shadow-sm"
                    />
                    {/* Overlay au survol */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className="px-2 py-1 bg-white text-gray-800 rounded text-xs font-medium hover:bg-gray-100"
                        >
                            Changer
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange(undefined)}
                            className="px-2 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600"
                        >
                            Supprimer
                        </button>
                    </div>
                </div>
            ) : (
                /* ── Zone de dépôt ── */
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => inputRef.current?.click()}
                    onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-5 cursor-pointer select-none transition-colors
                        ${uploading
                            ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 pointer-events-none'
                            : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/60 dark:hover:bg-blue-900/10'
                        }`}
                >
                    {uploading ? (
                        <>
                            <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            <span className="text-xs text-blue-500 dark:text-blue-400">Envoi en cours…</span>
                        </>
                    ) : (
                        <>
                            <svg className="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                Glisser-déposer ou{' '}
                                <span className="text-blue-600 dark:text-blue-400 font-medium">choisir un fichier</span>
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">PNG, JPG, WebP — 5 Mo max</span>
                        </>
                    )}
                </div>
            )}

            {uploadError && (
                <p className="text-red-500 dark:text-red-400 text-xs mt-1">{uploadError}</p>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = ''; // reset pour permettre de re-sélectionner le même fichier
                }}
            />
        </div>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
let idCounter = 0;
const generateId = () => `temp_${Date.now()}_${idCounter++}`;

function defaultTrueFalseAnswers(): AnswerForm[] {
    return [
        { tempId: generateId(), text: 'Vrai', isCorrect: true },
        { tempId: generateId(), text: 'Faux', isCorrect: false },
    ];
}
function defaultMcqAnswers(): AnswerForm[] {
    return [
        { tempId: generateId(), text: 'Réponse 1', isCorrect: false },
        { tempId: generateId(), text: 'Réponse 2', isCorrect: false },
    ];
}
function defaultMcqUniqueAnswers(): AnswerForm[] {
    return [
        { tempId: generateId(), text: 'Réponse 1', isCorrect: false },
        { tempId: generateId(), text: 'Réponse 2', isCorrect: false },
    ];
}
function defaultTextAnswer(): AnswerForm[] {
    return [{ tempId: generateId(), text: '', isCorrect: true }];
}
function defaultMultiTextAnswers(): AnswerForm[] {
    return [
        { tempId: generateId(), text: '', isCorrect: true },
        { tempId: generateId(), text: '', isCorrect: true },
    ];
}

function normalizeQuestion(q: QuestionForm): QuestionForm {
    if (q.type === 'TRUE_FALSE') {
        const a = q.answers?.length ? q.answers : defaultTrueFalseAnswers();
        const two = [
            { ...a[0], text: a[0]?.text ?? 'Vrai' },
            { ...a[1], text: a[1]?.text ?? 'Faux' },
        ].slice(0, 2);
        const hasTrue = two.some((x) => x.isCorrect);
        if (!hasTrue) two[0].isCorrect = true;
        if (two.filter((x) => x.isCorrect).length > 1) { two[0].isCorrect = true; two[1].isCorrect = false; }
        return { ...q, answers: two };
    }
    if (q.type === 'TEXT') {
        const a = q.answers?.length ? q.answers : defaultTextAnswer();
        return { ...q, answers: [{ ...a[0], isCorrect: true }] };
    }
    if (q.type === 'MULTI_TEXT') {
        const a = q.answers?.length ? q.answers : defaultMultiTextAnswers();
        return { ...q, answers: a.map(x => ({ ...x, isCorrect: true })) };
    }
    const a = q.answers?.length ? q.answers : q.type === 'MCQ_UNIQUE' ? defaultMcqUniqueAnswers() : defaultMcqAnswers();
    if (q.type === 'MCQ_UNIQUE') {
        const hasCorrect = a.some(x => x.isCorrect);
        return { ...q, answers: a.map((x, i) => ({ ...x, isCorrect: hasCorrect ? x.isCorrect : i === 0 })) };
    }
    return { ...q, answers: a };
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function QuizForm({
    mode,
    initialData,
}: {
    mode: 'create' | 'edit';
    initialData?: Partial<QuizFormState>;
}) {
    const router = useRouter();

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const titleRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState<QuizFormState>(() => ({
        id: initialData?.id,
        title: initialData?.title ?? '',
        description: initialData?.description ?? '',
        isPublic: initialData?.isPublic ?? true,
        randomizeQuestions: initialData?.randomizeQuestions !== undefined ? initialData.randomizeQuestions : true,
        categoryId: initialData?.categoryId ?? '',
        imageUrl: initialData?.imageUrl,
        questions: initialData?.questions?.length
            ? (initialData.questions as QuestionForm[]).map(q => ({
                ...normalizeQuestion(q),
                tempId: q.id || generateId(),
            }))
            : [{
                ...normalizeQuestion({ text: 'Question 1', type: 'MCQ', points: 3, answers: defaultMcqAnswers() }),
                tempId: generateId(),
            }],
    }));

    useEffect(() => {
        fetch('/api/categories').then(r => r.json()).then(setCategories);
    }, []);

    const totalPoints = useMemo(
        () => form.questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0),
        [form.questions]
    );

    function setFieldError(key: string, msg: string) {
        setFieldErrors(prev => ({ ...prev, [key]: msg }));
    }
    function validateQuestionText(qi: number, value: string) {
        setFieldError(`q${qi}_text`, value.trim() ? '' : 'Texte de la question requis');
    }
    function validateQuestionPoints(qi: number, value: number) {
        setFieldError(`q${qi}_points`, value >= 0 ? '' : 'Points invalides');
    }
    function validateAnswers(qi: number, answers: AnswerForm[], type: QuestionType) {
        let msg = '';
        if (type === 'MCQ') {
            if (answers.some(a => !a.text.trim())) msg = 'Une réponse est vide';
            else if (!answers.some(a => a.isCorrect)) msg = 'Coche au moins une bonne réponse';
        }
        if (type === 'MCQ_UNIQUE') {
            if (answers.some(a => !a.text.trim())) msg = 'Une réponse est vide';
            else if (answers.filter(a => a.isCorrect).length !== 1) msg = 'Coche exactement une bonne réponse';
        }
        if (type === 'TEXT' && !answers[0]?.text.trim()) msg = 'Réponse attendue requise';
        if (type === 'MULTI_TEXT' && answers.some(a => !a.text.trim())) msg = 'Une réponse attendue est vide';
        setFieldError(`q${qi}_answers`, msg);
    }
    function hasQuestionErrors(qi: number) {
        if (!submitted) return false;
        return Object.keys(fieldErrors).some(k => k.startsWith(`q${qi}_`) && fieldErrors[k]);
    }
    function fieldError(key: string) {
        return submitted ? fieldErrors[key] : '';
    }

    function setQuizField<K extends keyof QuizFormState>(key: K, value: QuizFormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
        if (submitted && key === 'title') {
            setFieldError('title', (value as string).trim() ? '' : 'Titre requis');
        }
    }

    function updateQuestion(index: number, patch: Partial<QuestionForm>) {
        setForm((prev) => {
            const next = [...prev.questions];
            const current = next[index];
            if (patch.type && patch.type !== current.type) {
                const defaultPoints = patch.type === 'TRUE_FALSE' ? 2 : patch.type === 'TEXT' ? 5 : patch.type === 'MULTI_TEXT' ? 1 : 3;
                next[index] = normalizeQuestion({ ...current, ...patch, points: defaultPoints });
            } else {
                next[index] = { ...current, ...patch };
            }
            if (submitted && patch.type) validateAnswers(index, next[index].answers, next[index].type);
            return { ...prev, questions: next };
        });
        if (submitted) {
            if (patch.text !== undefined) validateQuestionText(index, patch.text);
            if (patch.points !== undefined) validateQuestionPoints(index, patch.points);
            if (patch.answers !== undefined && patch.type === undefined) {
                setForm(prev => {
                    const q = prev.questions[index];
                    const isCorrectChange = patch.answers!.some((a, i) => a.isCorrect !== q.answers[i]?.isCorrect);
                    if (q.type !== 'MCQ' || isCorrectChange) validateAnswers(index, patch.answers!, q.type);
                    return prev;
                });
            }
        }
    }

    function addQuestion() {
        if (form.questions.length >= 15) return;
        const last = form.questions[form.questions.length - 1];
        const qi = form.questions.length - 1;

        if (!form.title.trim()) {
            setSubmitted(true);
            setFieldError('title', 'Titre requis');
            setTimeout(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); titleRef.current?.focus(); }, 50);
            return;
        }

        const newErrors: Record<string, string> = {};
        if (!last.text.trim()) newErrors[`q${qi}_text`] = 'Texte de la question requis';
        if (last.type === 'MCQ') {
            if (last.answers.some(a => !a.text.trim())) newErrors[`q${qi}_answers`] = 'Une réponse est vide';
            else if (!last.answers.some(a => a.isCorrect)) newErrors[`q${qi}_answers`] = 'Coche au moins une bonne réponse';
        }
        if (last.type === 'TEXT' && !last.answers[0]?.text.trim()) newErrors[`q${qi}_answers`] = 'Réponse attendue requise';
        if (last.type === 'MULTI_TEXT' && last.answers.some(a => !a.text.trim())) newErrors[`q${qi}_answers`] = 'Une réponse attendue est vide';

        if (Object.keys(newErrors).length > 0) {
            setSubmitted(true);
            setFieldErrors(prev => ({ ...prev, ...newErrors }));
            return;
        }

        setForm((prev) => ({
            ...prev,
            questions: [
                ...prev.questions,
                {
                    ...normalizeQuestion({ text: `Question ${prev.questions.length + 1}`, type: 'MCQ', points: 3, answers: defaultMcqAnswers() }),
                    tempId: generateId(),
                },
            ],
        }));
    }

    function deleteQuestion(index: number) {
        setForm((prev) => ({ ...prev, questions: prev.questions.filter((_, i) => i !== index) }));
        setFieldErrors(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => { if (k.startsWith(`q${index}_`)) delete next[k]; });
            return next;
        });
    }

    function addAnswer(qIndex: number) {
        setForm((prev) => {
            const next = [...prev.questions];
            const q = next[qIndex];
            if (q.type !== 'MCQ' && q.type !== 'MCQ_UNIQUE' && q.type !== 'MULTI_TEXT') return prev;
            const isMultiText = q.type === 'MULTI_TEXT';
            const newAnswers = [...q.answers, { tempId: generateId(), text: isMultiText ? '' : `Réponse ${q.answers.length + 1}`, isCorrect: isMultiText }];
            next[qIndex] = { ...q, answers: newAnswers };
            if (submitted) validateAnswers(qIndex, newAnswers, q.type);
            return { ...prev, questions: next };
        });
    }

    function deleteAnswer(qIndex: number, aIndex: number) {
        setForm((prev) => {
            const next = [...prev.questions];
            const q = next[qIndex];
            if (q.type !== 'MCQ' && q.type !== 'MCQ_UNIQUE' && q.type !== 'MULTI_TEXT') return prev;
            if (q.answers.length <= (q.type === 'MULTI_TEXT' ? 1 : 2)) return prev;
            let newAnswers = q.answers.filter((_, i) => i !== aIndex);
            if (q.type === 'MCQ_UNIQUE' && !newAnswers.some(a => a.isCorrect)) {
                newAnswers = newAnswers.map((a, i) => ({ ...a, isCorrect: i === 0 }));
            }
            next[qIndex] = { ...q, answers: newAnswers };
            if (submitted) validateAnswers(qIndex, newAnswers, q.type);
            return { ...prev, questions: next };
        });
    }

    function toggleCorrect(qIndex: number, aIndex: number) {
        setForm((prev) => {
            const next = [...prev.questions];
            const q = next[qIndex];
            let newAnswers: AnswerForm[];
            if (q.type === 'MCQ') {
                newAnswers = q.answers.map((a, i) => i === aIndex ? { ...a, isCorrect: !a.isCorrect } : a);
            } else if (q.type === 'MCQ_UNIQUE' || q.type === 'TRUE_FALSE') {
                newAnswers = q.answers.map((a, i) => ({ ...a, isCorrect: i === aIndex }));
            } else {
                return prev;
            }
            next[qIndex] = { ...q, answers: newAnswers };
            if (submitted) validateAnswers(qIndex, newAnswers, q.type);
            return { ...prev, questions: next };
        });
    }

    function setTextExpected(qIndex: number, value: string) {
        setForm((prev) => {
            const next = [...prev.questions];
            const q = next[qIndex];
            if (q.type !== 'TEXT') return prev;
            const answers = [{ ...q.answers[0], text: value, isCorrect: true }];
            next[qIndex] = { ...q, answers };
            if (submitted) validateAnswers(qIndex, answers, 'TEXT');
            return { ...prev, questions: next };
        });
    }

    function validate(): string | null {
        if (!form.title.trim()) return 'Titre requis.';
        if (!form.categoryId) return 'Catégorie requise.';
        if (form.questions.length === 0) return 'Ajoute au moins une question.';
        for (const [qi, q] of form.questions.entries()) {
            if (!q.text.trim()) return `Question ${qi + 1}: texte requis.`;
            if (!q.points || q.points < 0) return `Question ${qi + 1}: points invalides.`;
            if (q.type === 'MCQ') {
                if (!q.answers || q.answers.length < 2) return `Question ${qi + 1}: minimum 2 réponses.`;
                if (q.answers.some((a) => !a.text.trim())) return `Question ${qi + 1}: une réponse est vide.`;
                if (q.answers.filter((a) => a.isCorrect).length === 0) return `Question ${qi + 1}: coche au moins une bonne réponse.`;
            }
            if (q.type === 'TRUE_FALSE') {
                if (q.answers.length !== 2) return `Question ${qi + 1}: doit avoir Vrai/Faux.`;
                if (q.answers.filter((a) => a.isCorrect).length !== 1) return `Question ${qi + 1}: coche exactement une bonne réponse.`;
            }
            if (q.type === 'TEXT' && !(q.answers?.[0]?.text ?? '').trim()) return `Question ${qi + 1}: réponse attendue requise.`;
            if (q.type === 'MULTI_TEXT') {
                if (!q.answers.length) return `Question ${qi + 1}: au moins une réponse requise.`;
                if (q.answers.some((a) => !a.text.trim())) return `Question ${qi + 1}: une réponse attendue est vide.`;
            }
            if (q.type === 'MCQ_UNIQUE') {
                if (!q.answers || q.answers.length < 2) return `Question ${qi + 1}: minimum 2 réponses.`;
                if (q.answers.some(a => !a.text.trim())) return `Question ${qi + 1}: une réponse est vide.`;
                if (q.answers.filter(a => a.isCorrect).length !== 1) return `Question ${qi + 1}: coche exactement une bonne réponse.`;
            }
        }
        return null;
    }

    async function onSubmit() {
        setSubmitted(true);

        if (!form.title.trim()) {
            setFieldError('title', 'Titre requis');
            setTimeout(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); titleRef.current?.focus(); }, 50);
            return;
        }
        if (!form.categoryId) {
            setFieldError('categoryId', 'Catégorie requise');
            setTimeout(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); titleRef.current?.focus(); }, 50);
            return;
        }

        form.questions.forEach((q, qi) => {
            validateQuestionText(qi, q.text);
            validateQuestionPoints(qi, q.points);
            validateAnswers(qi, q.answers, q.type);
        });

        const msg = validate();
        if (msg) { setError(msg); return; }

        try {
            setSaving(true);
            setError(null);

            const payload = {
                title: form.title,
                description: form.description,
                isPublic: form.isPublic,
                randomizeQuestions: form.randomizeQuestions,
                categoryId: form.categoryId,
                imageUrl: form.imageUrl ?? null,
                questions: form.questions.map((q) => ({
                    id: q.id,
                    text: q.text,
                    type: q.type,
                    points: q.points,
                    strictOrder: q.strictOrder ?? false,
                    imageUrl: q.imageUrl ?? null,
                    answers: q.answers.map((a) => ({
                        id: a.id,
                        content: a.text,
                        isCorrect: a.isCorrect,
                    })),
                })),
            };

            const res = mode === 'create'
                ? await fetch('/api/quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                : await fetch(`/api/quiz/${form.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

            if (!res.ok) {
                const j = await res.json().catch(() => null);
                throw new Error(j?.error ?? "Erreur lors de l'enregistrement");
            }

            await res.json();
            router.push('/dashboard');
            router.refresh();
        } catch (e: any) {
            setError(e?.message ?? 'Erreur');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* ── Bloc quiz ── */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    {mode === 'create' ? 'Créer un quiz' : 'Modifier le quiz'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total points : {totalPoints}</p>

                {error && (
                    <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
                        {error}
                    </div>
                )}

                <div className="mt-6 grid gap-4">
                    {/* Titre */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titre</label>
                        <input
                            ref={titleRef}
                            value={form.title}
                            onChange={(e) => setQuizField('title', e.target.value)}
                            className={`w-full border rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-600 dark:border-gray-700 dark:focus:border-blue-500 ${fieldError('title') ? 'border-red-400 dark:border-red-500' : 'border-gray-300'}`}
                            placeholder="Titre du quiz"
                        />
                        {fieldError('title') && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{fieldError('title')}</p>}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setQuizField('description', e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 min-h-24"
                            placeholder="Description"
                        />
                    </div>

                    {/* Image de couverture */}
                    <ImageUpload
                        label="Image de couverture"
                        value={form.imageUrl}
                        onChange={(url) => setQuizField('imageUrl', url)}
                    />

                    {/* Catégorie */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catégorie</label>
                        <select
                            value={form.categoryId ?? ''}
                            onChange={(e) => {
                                setQuizField('categoryId', e.target.value);
                                if (submitted) setFieldError('categoryId', e.target.value ? '' : 'Catégorie requise');
                            }}
                            className={`w-full border rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 ${fieldError('categoryId') ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                        >
                            <option value="">Sélectionner une catégorie</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        {fieldError('categoryId') && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{fieldError('categoryId')}</p>}
                    </div>

                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input type="checkbox" checked={form.isPublic} onChange={(e) => setQuizField('isPublic', e.target.checked)} className="accent-blue-600" />
                        Quiz public
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input type="checkbox" checked={form.randomizeQuestions} onChange={(e) => setQuizField('randomizeQuestions', e.target.checked)} className="accent-blue-600" />
                        Ordre des questions aléatoire
                    </label>
                </div>
            </div>

            {/* ── Questions ── */}
            <div className="space-y-6">
                {form.questions.map((q, qi) => (
                    <div
                        key={q.id || q.tempId}
                        className={`bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 transition-all ${hasQuestionErrors(qi) ? 'ring-2 ring-red-400 border border-red-400 dark:ring-red-500 dark:border-red-500' : ''}`}
                    >
                        {hasQuestionErrors(qi) && (
                            <div className="mb-4 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
                                <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />Cette question contient des erreurs à corriger
                            </div>
                        )}

                        {/* Texte de la question */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Question {qi + 1}</label>
                                <input
                                    value={q.text}
                                    onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                                    className={`w-full border rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 ${fieldError(`q${qi}_text`) ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                                    placeholder="Texte de la question"
                                />
                                {fieldError(`q${qi}_text`) && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{fieldError(`q${qi}_text`)}</p>}
                            </div>
                            <button
                                onClick={() => deleteQuestion(qi)}
                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm"
                                type="button"
                                disabled={form.questions.length === 1}
                            >
                                Supprimer
                            </button>
                        </div>

                        {/* Type + Points */}
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                                <select
                                    value={q.type}
                                    onChange={(e) => {
                                        const type = e.target.value as QuestionType;
                                        updateQuestion(qi, {
                                            type,
                                            answers:
                                                type === 'TRUE_FALSE' ? defaultTrueFalseAnswers()
                                                    : type === 'TEXT' ? defaultTextAnswer()
                                                        : type === 'MULTI_TEXT' ? defaultMultiTextAnswers()
                                                            : type === 'MCQ_UNIQUE' ? defaultMcqUniqueAnswers()
                                                                : defaultMcqAnswers(),
                                        });
                                    }}
                                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                >
                                    <option value="MCQ">QCM (multi)</option>
                                    <option value="MCQ_UNIQUE">QCM (unique)</option>
                                    <option value="TRUE_FALSE">Vrai / Faux</option>
                                    <option value="TEXT">Texte</option>
                                    <option value="MULTI_TEXT">Texte multiple</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Points</label>
                                <input
                                    type="number"
                                    value={q.points}
                                    onChange={(e) => updateQuestion(qi, { points: Number(e.target.value) })}
                                    className={`w-full border rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${fieldError(`q${qi}_points`) ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                                    min={0}
                                />
                                {fieldError(`q${qi}_points`) && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{fieldError(`q${qi}_points`)}</p>}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-end">
                                {q.type === 'MULTI_TEXT' ? 'Points par bonne réponse' : ''}
                            </div>
                        </div>

                        {/* ── Image de la question ── */}
                        <div className="mt-4">
                            <ImageUpload
                                label="Image de la question"
                                value={q.imageUrl}
                                onChange={(url) => updateQuestion(qi, { imageUrl: url })}
                            />
                        </div>

                        {/* Réponses */}
                        <div className="mt-6">
                            {q.type === 'TEXT' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Réponse attendue</label>
                                    <input
                                        value={q.answers?.[0]?.text ?? ''}
                                        onChange={(e) => setTextExpected(qi, e.target.value)}
                                        className={`w-full border rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 ${fieldError(`q${qi}_answers`) ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                                        placeholder="Ex: Paris"
                                    />
                                    {fieldError(`q${qi}_answers`) && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{fieldError(`q${qi}_answers`)}</p>}
                                </div>
                            ) : q.type === 'MULTI_TEXT' ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Réponses attendues</p>
                                        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                                            <input type="checkbox" checked={q.strictOrder ?? false} onChange={(e) => updateQuestion(qi, { strictOrder: e.target.checked })} className="accent-blue-600" />
                                            Ordre obligatoire
                                        </label>
                                    </div>
                                    {q.answers.map((a, ai) => (
                                        <div key={a.id || a.tempId} className="flex items-center gap-3">
                                            {q.strictOrder && <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-5 text-center shrink-0">{ai + 1}.</span>}
                                            <input
                                                value={a.text}
                                                onChange={(e) => {
                                                    const answers = q.answers.map((x, i) => i === ai ? { ...x, text: e.target.value } : x);
                                                    updateQuestion(qi, { answers });
                                                }}
                                                className={`flex-1 border rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 ${!a.text.trim() && fieldError(`q${qi}_answers`) ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-700'}`}
                                                placeholder={`Réponse attendue ${ai + 1}`}
                                            />
                                            <button type="button" onClick={() => deleteAnswer(qi, ai)} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" disabled={q.answers.length <= 1}>
                                                Suppr.
                                            </button>
                                        </div>
                                    ))}
                                    {fieldError(`q${qi}_answers`) && <p className="text-red-500 dark:text-red-400 text-xs">{fieldError(`q${qi}_answers`)}</p>}
                                    <button type="button" onClick={() => addAnswer(qi)} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                                        + Ajouter une réponse
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {q.answers.map((a, ai) => (
                                        <div key={a.id || a.tempId} className="flex items-center gap-3">
                                            <input
                                                type={q.type === 'MCQ' ? 'checkbox' : 'radio'}
                                                name={q.type !== 'MCQ' ? `q_${q.id || q.tempId}` : undefined}
                                                checked={a.isCorrect}
                                                onChange={() => toggleCorrect(qi, ai)}
                                                className="h-5 w-5 accent-blue-600"
                                            />
                                            <input
                                                value={a.text}
                                                onChange={(e) => {
                                                    const answers = q.answers.map((x, i) => i === ai ? { ...x, text: e.target.value } : x);
                                                    updateQuestion(qi, { answers });
                                                }}
                                                className={`flex-1 border rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 ${q.type === 'MCQ' && !a.text.trim() && fieldError(`q${qi}_answers`) ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-700'}`}
                                                placeholder={`Réponse ${ai + 1}`}
                                                disabled={q.type === 'TRUE_FALSE'}
                                            />
                                            {(q.type === 'MCQ' || q.type === 'MCQ_UNIQUE') && (
                                                <button type="button" onClick={() => deleteAnswer(qi, ai)} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" disabled={q.answers.length <= 2}>
                                                    Suppr.
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {fieldError(`q${qi}_answers`) && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{fieldError(`q${qi}_answers`)}</p>}
                                    {(q.type === 'MCQ' || q.type === 'MCQ_UNIQUE') && (
                                        <button type="button" onClick={() => addAnswer(qi)} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                                            + Ajouter une réponse
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Actions ── */}
            <div className="mt-8 flex items-center justify-between">
                <button
                    type="button"
                    onClick={addQuestion}
                    disabled={form.questions.length >= 15}
                    className={`px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 ${form.questions.length >= 15 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    + Ajouter une question {form.questions.length >= 15 && '(max 15)'}
                </button>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-3 rounded-lg font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={saving}
                        className={`px-6 py-3 rounded-lg font-medium ${saving ? 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500'}`}
                    >
                        {saving ? 'Enregistrement...' : mode === 'create' ? 'Créer le quiz' : 'Enregistrer'}
                    </button>
                </div>
            </div>
        </div>
    );
}
