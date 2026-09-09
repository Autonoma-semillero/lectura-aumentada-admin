"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Search, TrendingUp, UserRound } from "lucide-react";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui-kit";
import { apiFetch } from "@/lib/api-client";
import type { CategoryProgress, Student } from "@/lib/types";
import { studentName } from "@/lib/types";

type StudentWithProgress = Student & {
  completed: number;
  total: number;
  phase2Ready: boolean;
};

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentWithProgress[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const baseStudents = await apiFetch<Student[]>("docente/students");
      const enriched = await Promise.all(
        baseStudents.map(async (student) => {
          try {
            const progress = await apiFetch<CategoryProgress[]>(`docente/students/${student.id}/progress`);
            return {
              ...student,
              completed: progress.reduce((sum, item) => sum + item.byStatus.completed, 0),
              total: progress.reduce((sum, item) => sum + item.total, 0),
              phase2Ready: progress.some((item) => item.phase2Ready),
            };
          } catch {
            return { ...student, completed: 0, total: 0, phase2Ready: false };
          }
        }),
      );
      setStudents(enriched);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar los estudiantes.");
    }
  }

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return students?.filter((student) => `${studentName(student)} ${student.email}`.toLocaleLowerCase("es").includes(normalized)) ?? [];
  }, [query, students]);

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Seguimiento" title="Estudiantes" description="Consulta el avance por temática y prepara el plan de estudio de cada estudiante." />

      <label className="relative block max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
        <input className="field pl-12" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o correo" aria-label="Buscar estudiantes" />
      </label>

      {!students && !error && <LoadingState label="Cargando estudiantes…" />}
      {error && <ErrorState message={error} onRetry={load} />}
      {students && filtered.length === 0 && <EmptyState title="No hay estudiantes para mostrar" description={query ? "Prueba con otro término de búsqueda." : "Los estudiantes aparecerán aquí cuando estén registrados."} />}

      {filtered.length > 0 && (
        <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((student, index) => {
            const percent = student.total > 0 ? Math.round((student.completed / student.total) * 100) : 0;
            return (
              <article key={student.id} className="rounded-[28px] border border-line bg-white p-6 shadow-[0_10px_35px_rgba(15,23,42,0.05)]">
                <div className="flex items-start gap-4">
                  <span className={`grid size-14 shrink-0 place-items-center rounded-full text-lg font-black text-white ${["bg-brand", "bg-action", "bg-violet-500", "bg-emerald-500"][index % 4]}`}>
                    {studentName(student).slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-extrabold text-ink">{studentName(student)}</h2>
                    <p className="truncate text-sm text-muted">{student.email}</p>
                    <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${student.phase2Ready ? "bg-green-100 text-green-700" : "bg-brand-soft text-brand"}`}>
                      {student.phase2Ready ? "✓ Fase 2 disponible" : "Fase 1"}
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-semibold text-muted">{student.completed} de {student.total} dominadas</span>
                    <strong className="text-brand">{percent}%</strong>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-brand-soft">
                    <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${percent}%` }} />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-[1fr_auto] gap-3">
                  <Link href={`/dashboard/students/${student.id}`} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand font-extrabold text-white transition hover:bg-brand-dark">
                    <TrendingUp className="size-4" /> Ver progreso
                  </Link>
                  <Link href={`/dashboard/plans?student=${student.id}`} className="grid size-12 place-items-center rounded-2xl bg-action-soft text-action transition hover:bg-blue-200" aria-label={`Ver plan de ${studentName(student)}`}>
                    <CalendarDays className="size-5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {students && students.length > 0 && (
        <p className="flex items-center gap-2 text-sm font-semibold text-muted"><UserRound className="size-4 text-brand" /> {students.length} estudiantes registrados</p>
      )}
    </div>
  );
}
