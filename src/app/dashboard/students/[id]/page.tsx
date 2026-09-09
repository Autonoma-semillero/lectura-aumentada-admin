"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookCheck, CalendarPlus, CheckCircle2, Layers3, Volume2 } from "lucide-react";
import { ErrorState, LoadingState, PageHeader } from "@/components/ui-kit";
import { apiFetch } from "@/lib/api-client";
import type { Category, CategoryProgress, CompletedCardsPage, DailyPlan, DailyPlanSummary, Student } from "@/lib/types";
import { studentName } from "@/lib/types";

type DetailData = {
  student: Student;
  progress: CategoryProgress[];
  completed: CompletedCardsPage;
  plans: DailyPlan[];
  categories: Category[];
};

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [students, progress, completed, plans, categories] = await Promise.all([
        apiFetch<Student[]>("docente/students"),
        apiFetch<CategoryProgress[]>(`docente/students/${id}/progress`),
        apiFetch<CompletedCardsPage>(`docente/students/${id}/cards/completed?limit=12`),
        apiFetch<DailyPlan[]>(`doman/daily-plans?student_id=${id}`),
        apiFetch<Category[]>("categories"),
      ]);
      const student = students.find((item) => item.id === id);
      if (!student) throw new Error("No encontramos este estudiante.");
      setData({ student, progress, completed, plans, categories });
      setCategoryId((current) => current || progress[0]?.categoryId || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar el seguimiento.");
    }
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const summary = useMemo(() => {
    const total = data?.progress.reduce((sum, category) => sum + category.total, 0) ?? 0;
    const completed = data?.progress.reduce((sum, category) => sum + category.byStatus.completed, 0) ?? 0;
    return { total, completed, percent: total ? Math.round((completed / total) * 100) : 0 };
  }, [data]);

  async function generatePlan() {
    setIsGenerating(true);
    setNotice(null);
    try {
      const result = await apiFetch<DailyPlanSummary>("doman/daily-plans/generate", {
        method: "POST",
        body: JSON.stringify({ student_id: id, category_id: categoryId || undefined, force: true }),
      });
      setNotice(`Plan listo: ${result.cards_count} tarjetas en ${result.sessions_count} sesiones.`);
      await load();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "No fue posible generar el plan.");
    } finally {
      setIsGenerating(false);
    }
  }

  if (!data && !error) return <LoadingState label="Cargando progreso…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  return (
    <div className="space-y-7">
      <Link href="/dashboard/students" className="inline-flex items-center gap-2 text-sm font-extrabold text-muted transition hover:text-brand"><ArrowLeft className="size-4" /> Volver a estudiantes</Link>
      <PageHeader
        eyebrow="Seguimiento individual"
        title={studentName(data.student)}
        description={data.student.email}
        action={
          <div className="flex min-w-52 items-center gap-4 rounded-[22px] bg-white px-5 py-4 shadow-sm">
            <div className="grid size-12 place-items-center rounded-full bg-brand-soft text-lg font-black text-brand">{summary.percent}%</div>
            <div><strong className="block text-ink">Progreso total</strong><span className="text-sm text-muted">{summary.completed}/{summary.total} dominadas</span></div>
          </div>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-black text-ink"><Layers3 className="size-5 text-brand" /> Progreso por temática</h2>
          {data.progress.map((category) => {
            const percent = category.total ? Math.round((category.byStatus.completed / category.total) * 100) : 0;
            return (
              <article key={category.categoryId} className="rounded-[26px] border border-line bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.04)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h3 className="text-lg font-extrabold text-ink">{category.categoryName}</h3><p className="mt-1 text-sm text-muted">{category.byStatus.completed}/{category.total} palabras dominadas</p></div>
                  {category.phase2Ready && <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-extrabold text-green-700">✓ Lista para Fase 2</span>}
                </div>
                <div className="mt-5 h-3 overflow-hidden rounded-full bg-brand-soft"><div className="h-full rounded-full bg-success" style={{ width: `${percent}%` }} /></div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-muted">
                  <span><i className="mr-1 inline-block size-2 rounded-full bg-slate-400" />{category.byStatus.new} nuevas</span>
                  <span><i className="mr-1 inline-block size-2 rounded-full bg-warning" />{category.byStatus.active} en progreso</span>
                  <span><i className="mr-1 inline-block size-2 rounded-full bg-success" />{category.byStatus.completed} dominadas</span>
                </div>
              </article>
            );
          })}
          {data.progress.length === 0 && <p className="rounded-[26px] bg-white p-8 text-center text-muted">Aún no tiene tarjetas asignadas.</p>}
        </div>

        <div className="space-y-6">
          <article className="rounded-[28px] bg-action p-6 text-white shadow-[0_12px_35px_rgba(0,96,172,0.2)]">
            <CalendarPlus className="size-7" />
            <h2 className="mt-5 text-xl font-black">Plan de estudio de hoy</h2>
            <p className="mt-2 text-sm leading-6 text-white/75">Selecciona una temática y genera las sesiones Doman del día.</p>
            <select className="mt-5 h-12 w-full rounded-2xl border-0 bg-white px-4 font-semibold text-ink" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">Temática con mayor prioridad</option>
              {data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <button className="mt-3 h-12 w-full rounded-2xl bg-white font-extrabold text-action transition hover:-translate-y-0.5 disabled:opacity-60" onClick={generatePlan} disabled={isGenerating}>
              {isGenerating ? "Generando…" : "Generar o actualizar plan"}
            </button>
            {notice && <p className="mt-4 rounded-2xl bg-white/10 p-3 text-sm font-semibold">{notice}</p>}
            {data.plans[0] && <p className="mt-4 text-sm text-white/80">Último plan: {new Date(data.plans[0].plan_date).toLocaleDateString("es-CO")} · {data.plans[0].target_sessions_count} sesiones</p>}
          </article>

          <article className="rounded-[28px] border border-line bg-white p-6">
            <h2 className="flex items-center gap-2 text-xl font-black text-ink"><BookCheck className="size-5 text-brand" /> Palabras dominadas</h2>
            <div className="mt-5 space-y-3">
              {data.completed.data.slice(0, 6).map((card) => (
                <div key={card.id} className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
                  <CheckCircle2 className="size-5 shrink-0 text-success" />
                  <div className="min-w-0 flex-1"><strong className="block truncate text-ink">{card.word}</strong><span className="text-xs text-muted">{card.category.name} · {card.timesShown} vistas</span></div>
                  {card.audioUrl && <Volume2 className="size-4 text-action" />}
                </div>
              ))}
              {data.completed.data.length === 0 && <p className="py-5 text-center text-sm text-muted">Aún no hay palabras dominadas.</p>}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
