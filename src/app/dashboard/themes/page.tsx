"use client";

import { FormEvent, useEffect, useState } from "react";
import { BookOpenText, Edit3, Plus, Shapes, Trash2 } from "lucide-react";
import { EmptyState, ErrorState, LoadingState, Modal, PageHeader } from "@/components/ui-kit";
import { apiFetch } from "@/lib/api-client";
import type { Category } from "@/lib/types";

type CategoryDraft = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sort_order: number;
};

const emptyDraft: CategoryDraft = {
  name: "",
  slug: "",
  description: "",
  icon: "auto_stories",
  sort_order: 0,
};

const iconOptions = [
  { value: "pets", label: "Animales" },
  { value: "nutrition", label: "Alimentos" },
  { value: "directions_car", label: "Transporte" },
  { value: "home", label: "Hogar" },
  { value: "nature", label: "Naturaleza" },
  { value: "auto_stories", label: "General" },
];

export default function ThemesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [draft, setDraft] = useState<CategoryDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    setError(null);
    try {
      setCategories(await apiFetch<Category[]>("categories"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar las temáticas.");
    }
  }

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  function updateName(name: string) {
    setDraft((current) => current && ({
      ...current,
      name,
      slug: current.id ? current.slug : slugify(name),
    }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setIsSaving(true);
    setFormError(null);
    const payload = {
      name: draft.name.trim(),
      slug: draft.slug.trim(),
      description: draft.description.trim() || undefined,
      icon: draft.icon,
      sort_order: Number(draft.sort_order),
    };
    try {
      await apiFetch(draft.id ? `categories/${draft.id}` : "categories", {
        method: draft.id ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setDraft(null);
      await load();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "No fue posible guardar la temática.");
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(category: Category) {
    if (!window.confirm(`¿Eliminar la temática “${category.name}”?`)) return;
    try {
      await apiFetch(`categories/${category.id}`, { method: "DELETE" });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible eliminar la temática.");
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Contenido"
        title="Temáticas"
        description="Organiza las palabras en categorías reconocibles para los estudiantes."
        action={<button className="inline-flex h-12 items-center gap-2 rounded-2xl bg-brand px-5 font-extrabold text-white shadow-[0_10px_24px_rgba(229,55,52,0.2)]" onClick={() => setDraft({ ...emptyDraft, sort_order: categories?.length ?? 0 })}><Plus className="size-5" /> Nueva temática</button>}
      />

      {!categories && !error && <LoadingState label="Cargando temáticas…" />}
      {error && <ErrorState message={error} onRetry={load} />}
      {categories?.length === 0 && <EmptyState title="Aún no hay temáticas" description="Crea la primera para empezar a organizar las tarjetas." />}

      {categories && categories.length > 0 && (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((category) => (
            <article key={category.id} className="group rounded-[28px] border border-line bg-white p-6 shadow-[0_10px_35px_rgba(15,23,42,0.05)] transition hover:-translate-y-1">
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-14 place-items-center rounded-[20px] bg-brand-soft text-brand"><Shapes className="size-7" /></span>
                <div className="flex gap-2 opacity-70 transition group-hover:opacity-100">
                  <button className="grid size-10 place-items-center rounded-xl bg-action-soft text-action" onClick={() => setDraft({ id: category.id, name: category.name, slug: category.slug, description: category.description ?? "", icon: category.icon ?? "auto_stories", sort_order: category.sort_order ?? 0 })} aria-label={`Editar ${category.name}`}><Edit3 className="size-4" /></button>
                  <button className="grid size-10 place-items-center rounded-xl bg-red-50 text-brand" onClick={() => remove(category)} aria-label={`Eliminar ${category.name}`}><Trash2 className="size-4" /></button>
                </div>
              </div>
              <h2 className="mt-5 text-xl font-black text-ink">{category.name}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-muted">{category.description || "Sin descripción."}</p>
              <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                <span className="flex items-center gap-2 text-sm font-bold text-muted"><BookOpenText className="size-4 text-brand" /> {category.word_cards_count ?? 0} tarjetas</span>
                <span className="rounded-full bg-canvas px-3 py-1 text-xs font-bold text-muted">/{category.slug}</span>
              </div>
            </article>
          ))}
        </section>
      )}

      {draft && (
        <Modal title={draft.id ? "Editar temática" : "Nueva temática"} onClose={() => setDraft(null)}>
          <form className="space-y-4" onSubmit={save}>
            <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">Nombre</span><input className="field" value={draft.name} onChange={(event) => updateName(event.target.value)} maxLength={128} required /></label>
            <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">Identificador</span><input className="field" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: slugify(event.target.value) })} maxLength={128} required /></label>
            <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">Descripción</span><textarea className="field min-h-28 resize-y" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">Icono</span><select className="field" value={draft.icon} onChange={(event) => setDraft({ ...draft, icon: event.target.value })}>{iconOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">Orden</span><input className="field" type="number" min="0" value={draft.sort_order} onChange={(event) => setDraft({ ...draft, sort_order: Number(event.target.value) })} /></label>
            </div>
            {formError && <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{formError}</p>}
            <div className="flex justify-end gap-3 pt-2"><button type="button" className="h-12 rounded-2xl px-5 font-bold text-muted" onClick={() => setDraft(null)}>Cancelar</button><button className="h-12 rounded-2xl bg-brand px-6 font-extrabold text-white disabled:opacity-60" disabled={isSaving}>{isSaving ? "Guardando…" : "Guardar temática"}</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
