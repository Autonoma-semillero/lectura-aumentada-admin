"use client";

import { FormEvent, useEffect, useState } from "react";
import { Box, CheckCircle2, ExternalLink, FileBox, Plus, Upload } from "lucide-react";
import { ErrorState, LoadingState, Modal, PageHeader } from "@/components/ui-kit";
import { apiFetch } from "@/lib/api-client";
import type { ArModel, Category } from "@/lib/types";
import { MARKERS } from "@/lib/types";

type AssetSlot = ArModel & { id?: string };
type ModelDraft = { word: string; categoryId: string; markerId: string; modelUrl: string };

export default function ModelsPage() {
  const [assets, setAssets] = useState<AssetSlot[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [draft, setDraft] = useState<ModelDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    setError(null);
    try {
      const [nextAssets, nextCategories] = await Promise.all([
        apiFetch<AssetSlot[]>("assets"),
        apiFetch<Category[]>("categories"),
      ]);
      setAssets(nextAssets);
      setCategories(nextCategories);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar los modelos.");
    }
  }

  useEffect(() => { void Promise.resolve().then(load); }, []);

  function openSlot(markerId: string) {
    const current = assets?.find((asset) => asset.marker_id === markerId);
    setDraft({ word: current?.word ?? "", categoryId: "", markerId, modelUrl: current?.model_3d ?? "" });
    setFormError(null);
  }

  async function uploadModel(file?: File) {
    if (!file) return;
    setIsUploading(true);
    setFormError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/models/upload", { method: "POST", body });
      const payload = (await response.json()) as { url?: string; message?: string };
      if (!response.ok || !payload.url) throw new Error(payload.message ?? "No fue posible cargar el modelo.");
      setDraft((current) => current && ({ ...current, modelUrl: payload.url ?? "" }));
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "No fue posible cargar el modelo.");
    } finally {
      setIsUploading(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setIsSaving(true);
    setFormError(null);
    try {
      const current = assets?.find((asset) => asset.marker_id === draft.markerId);
      const payload = {
        word: draft.word.trim(),
        marker_id: draft.markerId,
        model_3d: draft.modelUrl.trim(),
        category_id: draft.categoryId || undefined,
        language: "es",
      };
      await apiFetch(current ? `learning-units/${current.learning_unit_id}` : "learning-units", {
        method: current ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setDraft(null);
      await load();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "No fue posible guardar el modelo.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Realidad aumentada" title="Modelos 3D" description="Administra los modelos asociados a los dos marcadores físicos que reconoce la aplicación móvil." />

      <aside className="flex gap-3 rounded-[24px] border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-900">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-action" />
        <p><strong>Dos espacios activos:</strong> Hiro y Kanji. Al reemplazar un modelo en uno de estos espacios, la cámara mostrará el nuevo contenido cuando reconozca ese marcador.</p>
      </aside>

      {!assets && !error && <LoadingState label="Cargando modelos 3D…" />}
      {error && <ErrorState message={error} onRetry={load} />}

      {assets && (
        <section className="grid gap-6 lg:grid-cols-2">
          {MARKERS.map((marker, index) => {
            const asset = assets.find((item) => item.marker_id === marker.id);
            const usable = asset?.model_3d && !asset.model_3d.startsWith("https://demo.lectura.local/");
            return (
              <article key={marker.id} className="relative overflow-hidden rounded-[30px] border border-line bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:p-7">
                <div className={`absolute right-0 top-0 h-28 w-28 rounded-bl-[80px] ${index === 0 ? "bg-brand-soft" : "bg-action-soft"}`} />
                <div className="relative">
                  <span className={`grid size-14 place-items-center rounded-[20px] ${index === 0 ? "bg-brand text-white" : "bg-action text-white"}`}><Box className="size-7" /></span>
                  <p className="mt-6 text-sm font-extrabold uppercase tracking-[0.14em] text-muted">Marcador {marker.name}</p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-ink">{usable ? asset?.word : "Espacio disponible"}</h2>
                  <p className="mt-3 break-all text-sm leading-6 text-muted">{usable ? asset?.model_3d : "Carga un archivo GLB o registra la URL pública de un modelo."}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button className="inline-flex h-12 items-center gap-2 rounded-2xl bg-brand px-5 font-extrabold text-white" onClick={() => openSlot(marker.id)}><Upload className="size-4" /> {usable ? "Reemplazar modelo" : "Cargar modelo"}</button>
                    {usable && <a className="inline-flex h-12 items-center gap-2 rounded-2xl bg-slate-100 px-5 font-extrabold text-muted" href={asset?.model_3d} target="_blank" rel="noreferrer">Abrir archivo <ExternalLink className="size-4" /></a>}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {draft && (
        <Modal title={`Modelo para marcador ${MARKERS.find((item) => item.id === draft.markerId)?.name}`} onClose={() => setDraft(null)}>
          <form className="space-y-4" onSubmit={save}>
            <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">Palabra que representa</span><input className="field" value={draft.word} onChange={(event) => setDraft({ ...draft, word: event.target.value })} placeholder="Ej. perro" required /></label>
            <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">Temática (opcional)</span><select className="field" value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}><option value="">Sin temática</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <div className="rounded-[22px] bg-canvas p-4">
              <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">URL pública del GLB</span><input className="field" type="url" value={draft.modelUrl} onChange={(event) => setDraft({ ...draft, modelUrl: event.target.value })} placeholder="https://…/modelo.glb" required /></label>
              <div className="my-3 flex items-center gap-3 text-xs font-extrabold uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-line" /> o <span className="h-px flex-1 bg-line" /></div>
              <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-white p-4 text-center transition hover:border-brand">
                <FileBox className="mb-2 size-6 text-brand" />
                <strong className="text-sm text-ink">{isUploading ? "Subiendo archivo…" : "Seleccionar archivo GLB"}</strong>
                <span className="mt-1 text-xs text-muted">GLB 2.0 · máximo 25 MB</span>
                <input className="sr-only" type="file" accept=".glb,model/gltf-binary" disabled={isUploading} onChange={(event) => void uploadModel(event.target.files?.[0])} />
              </label>
            </div>
            {draft.modelUrl && <p className="flex items-center gap-2 rounded-2xl bg-green-50 p-3 text-sm font-semibold text-green-700"><CheckCircle2 className="size-4" /> Modelo listo para registrar.</p>}
            {formError && <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{formError}</p>}
            <div className="flex justify-end gap-3 pt-2"><button type="button" className="h-12 rounded-2xl px-5 font-bold text-muted" onClick={() => setDraft(null)}>Cancelar</button><button className="inline-flex h-12 items-center gap-2 rounded-2xl bg-brand px-6 font-extrabold text-white disabled:opacity-60" disabled={isSaving || isUploading || !draft.modelUrl}><Plus className="size-4" /> {isSaving ? "Guardando…" : "Guardar modelo"}</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
