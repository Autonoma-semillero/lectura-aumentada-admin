"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Box, Edit3, Plus, Search, Sparkles, Upload, Volume2 } from "lucide-react";
import { EmptyState, ErrorState, LoadingState, Modal, PageHeader, StatusBadge } from "@/components/ui-kit";
import { apiFetch } from "@/lib/api-client";
import type { ArModel, Category, Student, WordCard } from "@/lib/types";
import { MARKERS, studentName } from "@/lib/types";

type CardDraft = {
  id?: string;
  studentId: string;
  categoryId: string;
  word: string;
  audioUrl: string;
  audioSource: "generated" | "manual";
  learningUnitId: string;
  markerId: string;
};

let spanishSpeechSynthesizer: ReturnType<typeof loadSpanishSpeechSynthesizer> | undefined;

async function loadSpanishSpeechSynthesizer() {
  const { pipeline } = await import("@huggingface/transformers");
  return pipeline("text-to-speech", "Xenova/mms-tts-spa", { dtype: "q8" });
}

async function generateAudioFile(word: string): Promise<File> {
  spanishSpeechSynthesizer ??= loadSpanishSpeechSynthesizer();
  const synthesizer = await spanishSpeechSynthesizer;
  const output = await synthesizer(word);
  if (Array.isArray(output)) throw new Error("El modelo devolvió un audio inesperado.");
  return new File([output.toBlob()], `${word}.wav`, { type: "audio/wav" });
}

export default function CardsPage() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [models, setModels] = useState<ArModel[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [cards, setCards] = useState<WordCard[] | null>(null);
  const [draft, setDraft] = useState<CardDraft | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  async function loadFilters() {
    setError(null);
    try {
      const [nextStudents, nextCategories, nextModels] = await Promise.all([
        apiFetch<Student[]>("docente/students"),
        apiFetch<Category[]>("categories"),
        apiFetch<ArModel[]>("assets/models"),
      ]);
      setStudents(nextStudents);
      setCategories(nextCategories);
      setModels(nextModels);
      setCategoryId((value) => value || nextCategories[0]?.id || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar los filtros.");
    }
  }

  const loadCards = useCallback(async () => {
    if (!categoryId) {
      setCards([]);
      return;
    }
    setCards(null);
    setError(null);
    try {
      setCards(await apiFetch<WordCard[]>(`categories/${categoryId}/word-cards`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar las tarjetas.");
    }
  }, [categoryId]);

  useEffect(() => { void Promise.resolve().then(loadFilters); }, []);
  useEffect(() => { void Promise.resolve().then(loadCards); }, [loadCards]);

  const visibleCards = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return cards?.filter((card) => card.word.toLocaleLowerCase("es").includes(normalized)) ?? [];
  }, [cards, query]);

  const studentsById = useMemo(() => {
    const map = new Map<string, Student>();
    students?.forEach((student) => map.set(student.id, student));
    return map;
  }, [students]);

  function ownerName(card: WordCard): string {
    const owner = studentsById.get(card.student_id);
    return owner ? studentName(owner) : "Estudiante desconocido";
  }

  function newDraft(): CardDraft {
    return { studentId: students?.[0]?.id ?? "", categoryId, word: "", audioUrl: "", audioSource: "generated", learningUnitId: "", markerId: "" };
  }

  function editDraft(card: WordCard): CardDraft {
    const model = models.find((item) => item.learning_unit_id === card.learning_unit_id);
    return {
      id: card.id,
      studentId: card.student_id,
      categoryId: card.category_id ?? categoryId,
      word: card.word,
      audioUrl: card.audio_url ?? "",
      audioSource: "manual",
      learningUnitId: model?.learning_unit_id ?? "",
      markerId: model?.marker_id ?? "",
    };
  }

  function selectModel(learningUnitId: string) {
    if (!draft) return;
    const model = models.find((item) => item.learning_unit_id === learningUnitId);
    setDraft({ ...draft, learningUnitId, markerId: model?.marker_id ?? MARKERS[0].id });
  }

  async function uploadAudio(file?: File) {
    if (!file || !draft) return;
    setIsUploading(true);
    setFormError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/audio/upload", { method: "POST", body: formData });
      const payload = (await response.json()) as { url?: string; message?: string };
      if (!response.ok || !payload.url) throw new Error(payload.message ?? "No fue posible cargar el audio.");
      setDraft((current) => current && ({ ...current, audioUrl: payload.url ?? "" }));
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "No fue posible cargar el audio.");
    } finally {
      setIsUploading(false);
    }
  }

  async function storeGeneratedAudio(word: string): Promise<string> {
    const file = await generateAudioFile(word);
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/audio/upload", { method: "POST", body: formData });
    const payload = (await response.json()) as { url?: string; message?: string };
    if (!response.ok || !payload.url) throw new Error(payload.message ?? "No fue posible guardar el audio generado.");
    return payload.url;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setIsSaving(true);
    setFormError(null);
    try {
      let audioUrl = draft.audioUrl.trim();
      if (draft.audioSource === "generated") {
        audioUrl = await storeGeneratedAudio(draft.word.trim());
      }
      const model = models.find((item) => item.learning_unit_id === draft.learningUnitId);
      if (model) {
        await apiFetch("assets", {
          method: "POST",
          body: JSON.stringify({ learning_unit_id: model.learning_unit_id, marker_id: draft.markerId, model_3d: model.model_3d }),
        });
      }
      const payload = {
        ...(draft.id ? {} : { student_id: draft.studentId }),
        word: draft.word.trim(),
        category_id: draft.categoryId,
        ...(audioUrl ? { audio_url: audioUrl } : {}),
        ...(model ? { learning_unit_id: model.learning_unit_id } : {}),
      };
      await apiFetch(draft.id ? `word-cards/${draft.id}` : "word-cards", {
        method: draft.id ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setDraft(null);
      await loadCards();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "No fue posible guardar la tarjeta.");
    } finally {
      setIsSaving(false);
    }
  }

  async function archive(card: WordCard) {
    if (!window.confirm(`¿Archivar la tarjeta “${card.word}”?`)) return;
    try {
      await apiFetch(`word-cards/${card.id}`, { method: "PATCH", body: JSON.stringify({ status: "archived" }) });
      await loadCards();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible archivar la tarjeta.");
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Contenido" title="Tarjetas de palabras" description="Asigna palabras, pronunciación y experiencias 3D a cada estudiante." action={<button className="inline-flex h-12 items-center gap-2 rounded-2xl bg-brand px-5 font-extrabold text-white disabled:opacity-50" onClick={() => setDraft(newDraft())} disabled={!categoryId}><Plus className="size-5" /> Nueva tarjeta</button>} />

      <section className="grid gap-4 rounded-[26px] border border-line bg-white p-5 md:grid-cols-[1fr_1.2fr]">
        <label className="space-y-2"><span className="text-sm font-bold text-ink-soft">Temática</span><select className="field" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="space-y-2"><span className="text-sm font-bold text-ink-soft">Buscar palabra</span><span className="relative block"><Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" /><input className="field pl-12" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. gato" /></span></label>
      </section>

      {!students && !error && <LoadingState label="Cargando contenido…" />}
      {students && cards === null && !error && <LoadingState label="Cargando tarjetas…" />}
      {error && <ErrorState message={error} onRetry={loadFilters} />}
      {cards && visibleCards.length === 0 && <EmptyState title="No hay tarjetas aquí" description="Crea una tarjeta para esta temática." />}

      {visibleCards.length > 0 && (
        <section className="overflow-hidden rounded-[28px] border border-line bg-white shadow-[0_10px_35px_rgba(15,23,42,0.04)]">
          <div className="hidden grid-cols-[1.2fr_1fr_0.8fr_0.7fr_0.7fr_auto] gap-4 border-b border-line bg-slate-50 px-6 py-4 text-xs font-extrabold uppercase tracking-wider text-muted md:grid">
            <span>Palabra</span><span>Estudiante</span><span>Estado</span><span>Práctica</span><span>Recursos</span><span>Acciones</span>
          </div>
          {visibleCards.map((card) => (
            <article key={card.id} className="grid gap-4 border-b border-line p-5 last:border-0 md:grid-cols-[1.2fr_1fr_0.8fr_0.7fr_0.7fr_auto] md:items-center md:px-6">
              <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-lg font-black text-brand">{card.initial_letter || card.word.slice(0, 1).toUpperCase()}</span><div><strong className="block text-lg text-ink">{card.word}</strong><span className="text-xs text-muted">ID {card.id.slice(-6)}</span></div></div>
              <div className="text-sm font-semibold text-ink">{ownerName(card)}</div>
              <div><StatusBadge status={card.status} /></div>
              <div className="text-sm"><strong className="block text-ink">{card.times_shown}</strong><span className="text-muted">veces vista</span></div>
              <div className="flex gap-2 text-muted">{card.audio_url && <Volume2 className="size-5 text-action" />}{card.learning_unit_id && <Box className="size-5 text-success" />}{!card.audio_url && !card.learning_unit_id && <span className="text-sm">Sin recursos</span>}</div>
              <div className="flex gap-2"><button className="grid size-10 place-items-center rounded-xl bg-action-soft text-action" onClick={() => setDraft(editDraft(card))} aria-label={`Editar ${card.word}`}><Edit3 className="size-4" /></button><button className="grid size-10 place-items-center rounded-xl bg-red-50 text-brand" onClick={() => archive(card)} aria-label={`Archivar ${card.word}`}><Archive className="size-4" /></button></div>
            </article>
          ))}
        </section>
      )}

      {draft && (
        <Modal title={draft.id ? "Editar tarjeta" : "Nueva tarjeta"} onClose={() => setDraft(null)}>
          <form className="space-y-4" onSubmit={save}>
            {!draft.id && <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">Estudiante</span><select className="field" value={draft.studentId} onChange={(event) => setDraft({ ...draft, studentId: event.target.value })}>{students?.map((student) => <option key={student.id} value={student.id}>{studentName(student)}</option>)}</select></label>}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">Palabra</span><input className="field text-xl font-black uppercase text-brand" value={draft.word} onChange={(event) => setDraft({ ...draft, word: event.target.value.slice(0, 15) })} required /></label>
              <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">Temática</span><select className="field" value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            </div>
            <div className="rounded-[22px] bg-canvas p-4">
              <strong className="text-sm text-ink-soft">Pronunciación</strong>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button type="button" className={`rounded-2xl border px-4 py-3 text-left text-sm font-extrabold transition ${draft.audioSource === "generated" ? "border-brand bg-brand-soft text-brand" : "border-line bg-white text-muted"}`} onClick={() => setDraft({ ...draft, audioSource: "generated" })}><Sparkles className="mr-2 inline size-4" />Generar automáticamente</button>
                <button type="button" className={`rounded-2xl border px-4 py-3 text-left text-sm font-extrabold transition ${draft.audioSource === "manual" ? "border-action bg-action-soft text-action" : "border-line bg-white text-muted"}`} onClick={() => setDraft({ ...draft, audioSource: "manual" })}><Upload className="mr-2 inline size-4" />Cargar manualmente</button>
              </div>
              {draft.audioSource === "generated" ? (
                <p className="mt-3 text-sm leading-6 text-muted">Al guardar, se creará gratis la pronunciación de “{draft.word.trim() || "la palabra"}” en este navegador. La primera vez puede tardar mientras se descarga el modelo de voz.</p>
              ) : (
                <>
                  <label className="mt-3 block space-y-2"><span className="text-sm font-bold text-ink-soft">URL de pronunciación (opcional)</span><input className="field" type="url" value={draft.audioUrl} onChange={(event) => setDraft({ ...draft, audioUrl: event.target.value })} placeholder="https://…/palabra.mp3" /></label>
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-extrabold text-action shadow-sm"><Upload className="size-4" /> {isUploading ? "Cargando…" : "Subir audio"}<input className="sr-only" type="file" accept=".m4a,.mp3,.wav,audio/*" disabled={isUploading} onChange={(event) => void uploadAudio(event.target.files?.[0])} /></label>
                </>
              )}
            </div>
            <div className="rounded-[22px] border border-brand-soft bg-white p-4">
              <div className="mb-3"><strong className="text-ink">Realidad aumentada</strong><p className="mt-1 text-sm text-muted">Selecciona un modelo ya guardado y el marcador que lo activará.</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <select className="field" value={draft.learningUnitId} onChange={(event) => selectModel(event.target.value)}><option value="">Sin modelo 3D</option>{models.map((model) => <option key={model.learning_unit_id} value={model.learning_unit_id}>{model.word}</option>)}</select>
                <select className="field" value={draft.markerId} onChange={(event) => setDraft({ ...draft, markerId: event.target.value })} disabled={!draft.learningUnitId}><option value="">Seleccionar marcador</option>{MARKERS.map((marker) => <option key={marker.id} value={marker.id}>{marker.name}</option>)}</select>
              </div>
            </div>
            {formError && <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{formError}</p>}
            <div className="flex justify-end gap-3 pt-2"><button type="button" className="h-12 rounded-2xl px-5 font-bold text-muted" onClick={() => setDraft(null)}>Cancelar</button><button className="h-12 rounded-2xl bg-brand px-6 font-extrabold text-white disabled:opacity-60" disabled={isSaving || isUploading}>{isSaving ? (draft.audioSource === "generated" ? "Generando audio…" : "Guardando…") : "Guardar tarjeta"}</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
