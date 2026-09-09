"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck2, RotateCcw, Trash2 } from "lucide-react";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui-kit";
import { apiFetch } from "@/lib/api-client";
import type { Category, DailyPlan, DailyPlanSummary, Student } from "@/lib/types";
import { studentName } from "@/lib/types";

export default function PlansPage() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [studentId, setStudentId] = useState("");
  const [plans, setPlans] = useState<DailyPlan[] | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [cardsCount, setCardsCount] = useState(5);
  const [sessionsCount, setSessionsCount] = useState(3);
  const [displayMs, setDisplayMs] = useState(2200);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function loadFilters() {
    setError(null);
    try {
      const [nextStudents, nextCategories] = await Promise.all([
        apiFetch<Student[]>("docente/students"),
        apiFetch<Category[]>("categories"),
      ]);
      setStudents(nextStudents);
      setCategories(nextCategories);
      const requestedStudent = new URLSearchParams(window.location.search).get("student");
      setStudentId((current) => current || requestedStudent || nextStudents[0]?.id || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar los planes.");
    }
  }

  const loadPlans = useCallback(async () => {
    if (!studentId) return setPlans([]);
    setPlans(null);
    try {
      setPlans(await apiFetch<DailyPlan[]>(`doman/daily-plans?student_id=${studentId}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar los planes.");
    }
  }, [studentId]);

  useEffect(() => { void Promise.resolve().then(loadFilters); }, []);
  useEffect(() => { void Promise.resolve().then(loadPlans); }, [loadPlans]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: "create_daily_study_plan",
          title: "Crear plan diario",
          description: "Genera o reemplaza el plan Doman de hoy para un estudiante existente.",
          inputSchema: {
            type: "object",
            properties: {
              student_id: { type: "string", description: "ID del estudiante" },
              category_id: { type: "string", description: "ID opcional de la temática" },
              cards_count: { type: "integer", minimum: 3, maximum: 8 },
              sessions_count: { type: "integer", minimum: 1, maximum: 5 },
            },
            required: ["student_id"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          async execute(input) {
            if (!input || typeof input !== "object" || !("student_id" in input)) {
              throw new Error("student_id es obligatorio");
            }
            const values = input as Record<string, unknown>;
            const targetStudent = String(values.student_id ?? "").trim();
            if (!targetStudent) throw new Error("student_id es obligatorio");
            const result = await apiFetch<DailyPlanSummary>("doman/daily-plans/generate", {
              method: "POST",
              body: JSON.stringify({
                student_id: targetStudent,
                category_id: values.category_id || undefined,
                target_cards_count: Number(values.cards_count ?? 5),
                target_sessions_count: Number(values.sessions_count ?? 3),
                display_ms: 2200,
                force: true,
              }),
            });
            if (targetStudent === studentId) {
              setPlans(await apiFetch<DailyPlan[]>(`doman/daily-plans?student_id=${targetStudent}`));
            }
            return {
              plan_id: result.plan.id,
              cards_count: result.cards_count,
              sessions_count: result.sessions_count,
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, [studentId]);

  const categoryNames = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (!studentId) return;
    setIsGenerating(true);
    setNotice(null);
    try {
      const result = await apiFetch<DailyPlanSummary>("doman/daily-plans/generate", {
        method: "POST",
        body: JSON.stringify({ student_id: studentId, category_id: categoryId || undefined, target_cards_count: cardsCount, target_sessions_count: sessionsCount, display_ms: displayMs, force: true }),
      });
      setNotice(`Plan listo con ${result.cards_count} tarjetas y ${result.sessions_count} sesiones.`);
      await loadPlans();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "No fue posible generar el plan.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function remove(plan: DailyPlan) {
    if (!window.confirm("¿Eliminar este plan y sus sesiones pendientes?")) return;
    try {
      await apiFetch(`doman/daily-plans/${plan.id}`, { method: "DELETE" });
      await loadPlans();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible eliminar el plan.");
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Método Doman" title="Planes de estudio" description="Configura las tarjetas, sesiones y velocidad de exposición para la práctica diaria." />
      {!students && !error && <LoadingState label="Cargando estudiantes y planes…" />}
      {error && <ErrorState message={error} onRetry={loadFilters} />}
      {students && (
        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <form className="h-fit rounded-[30px] bg-brand p-6 text-white shadow-[0_16px_45px_rgba(229,55,52,0.22)] sm:p-7" onSubmit={generate}>
            <CalendarCheck2 className="size-8" />
            <h2 className="mt-5 text-2xl font-black">Preparar plan de hoy</h2>
            <p className="mt-2 text-sm leading-6 text-white/75">La generación prioriza tarjetas nuevas y en progreso.</p>
            <div className="mt-6 space-y-4">
              <label className="block space-y-2"><span className="text-sm font-bold text-white/80">Estudiante</span><select className="field border-0" value={studentId} onChange={(event) => setStudentId(event.target.value)}>{students.map((student) => <option key={student.id} value={student.id}>{studentName(student)}</option>)}</select></label>
              <label className="block space-y-2"><span className="text-sm font-bold text-white/80">Temática</span><select className="field border-0" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Mayor prioridad</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <div className="grid grid-cols-2 gap-3"><label className="block space-y-2"><span className="text-sm font-bold text-white/80">Tarjetas</span><input className="field border-0" type="number" min="3" max="8" value={cardsCount} onChange={(event) => setCardsCount(Number(event.target.value))} /></label><label className="block space-y-2"><span className="text-sm font-bold text-white/80">Sesiones</span><input className="field border-0" type="number" min="1" max="5" value={sessionsCount} onChange={(event) => setSessionsCount(Number(event.target.value))} /></label></div>
              <label className="block space-y-2"><span className="text-sm font-bold text-white/80">Tiempo por tarjeta: {(displayMs / 1000).toFixed(1)} s</span><input className="w-full accent-white" type="range" min="800" max="6000" step="100" value={displayMs} onChange={(event) => setDisplayMs(Number(event.target.value))} /></label>
            </div>
            <button className="mt-6 inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-white font-extrabold text-brand transition hover:-translate-y-0.5 disabled:opacity-60" disabled={isGenerating || !studentId}><RotateCcw className={`size-4 ${isGenerating ? "animate-spin" : ""}`} /> {isGenerating ? "Generando…" : "Generar o actualizar"}</button>
            {notice && <p className="mt-4 rounded-2xl bg-white/10 p-3 text-sm font-semibold">{notice}</p>}
          </form>

          <div>
            <h2 className="mb-4 text-xl font-black text-ink">Historial reciente</h2>
            {plans === null && <LoadingState label="Cargando historial…" />}
            {plans?.length === 0 && <EmptyState title="Aún no hay planes" description="Genera el primer plan diario para este estudiante." />}
            <div className="space-y-4">
              {plans?.map((plan) => (
                <article key={plan.id} className="flex flex-col gap-5 rounded-[26px] border border-line bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center">
                  <span className="grid size-14 shrink-0 place-items-center rounded-[20px] bg-action-soft text-action"><CalendarCheck2 className="size-6" /></span>
                  <div className="min-w-0 flex-1"><h3 className="text-lg font-extrabold text-ink">{new Date(plan.plan_date).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}</h3><p className="mt-1 text-sm text-muted">{categoryNames.get(plan.category_id) ?? "Temática"} · {plan.target_cards_count} tarjetas · {plan.target_sessions_count} sesiones</p></div>
                  <button className="grid size-11 place-items-center rounded-2xl bg-red-50 text-brand" onClick={() => remove(plan)} aria-label="Eliminar plan"><Trash2 className="size-4" /></button>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
