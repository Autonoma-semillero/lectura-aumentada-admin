"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Box,
  CalendarCheck2,
  Shapes,
  Sparkles,
  Users,
} from "lucide-react";
import { ErrorState, LoadingState, PageHeader } from "@/components/ui-kit";
import { apiFetch } from "@/lib/api-client";
import type { ArModel, Category, Student } from "@/lib/types";
import { studentName } from "@/lib/types";

type DashboardData = {
  students: Student[];
  categories: Category[];
  models: ArModel[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [students, categories, models] = await Promise.all([
        apiFetch<Student[]>("docente/students"),
        apiFetch<Category[]>("categories"),
        apiFetch<ArModel[]>("assets/models"),
      ]);
      setData({ students, categories, models });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar el resumen.");
    }
  }

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  if (!data && !error) return <LoadingState label="Preparando tu espacio docente…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  const cardsCount = data.categories.reduce((sum, category) => sum + (category.word_cards_count ?? 0), 0);
  const metrics = [
    { label: "Estudiantes", value: data.students.length, icon: Users, color: "bg-brand text-white", href: "/dashboard/students" },
    { label: "Temáticas", value: data.categories.length, icon: Shapes, color: "bg-action text-white", href: "/dashboard/themes" },
    { label: "Tarjetas", value: cardsCount, icon: BookOpenText, color: "bg-amber-300 text-amber-950", href: "/dashboard/cards" },
    { label: "Modelos 3D", value: data.models.length, icon: Box, color: "bg-green-500 text-white", href: "/dashboard/models" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Vista general"
        title="Hola, profe"
        description="Todo lo necesario para preparar el aprendizaje y acompañar el progreso de tus estudiantes."
        action={
          <Link className="inline-flex h-12 items-center gap-2 rounded-2xl bg-brand px-5 font-extrabold text-white shadow-[0_10px_24px_rgba(229,55,52,0.2)] transition hover:bg-brand-dark" href="/dashboard/cards">
            <Sparkles className="size-5" /> Nueva tarjeta
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Link key={metric.label} href={metric.href} className="group rounded-[26px] border border-line bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,0.09)]">
              <div className="flex items-start justify-between">
                <span className={`grid size-12 place-items-center rounded-2xl ${metric.color}`}><Icon className="size-6" /></span>
                <ArrowRight className="size-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand" />
              </div>
              <p className="mt-5 text-3xl font-black tracking-[-0.04em] text-ink">{metric.value}</p>
              <p className="mt-1 font-semibold text-muted">{metric.label}</p>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[30px] border border-line bg-white p-6 shadow-[0_10px_35px_rgba(15,23,42,0.04)] sm:p-7">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-ink">Estudiantes</h2>
              <p className="mt-1 text-sm text-muted">Acceso rápido a seguimiento y planes.</p>
            </div>
            <Link className="text-sm font-extrabold text-brand" href="/dashboard/students">Ver todos</Link>
          </div>
          <div className="space-y-3">
            {data.students.slice(0, 5).map((student, index) => (
              <Link key={student.id} href={`/dashboard/students/${student.id}`} className="flex items-center gap-4 rounded-2xl border border-transparent p-3 transition hover:border-brand-soft hover:bg-canvas">
                <span className={`grid size-11 place-items-center rounded-full font-black text-white ${["bg-brand", "bg-action", "bg-violet-500", "bg-emerald-500"][index % 4]}`}>
                  {studentName(student).slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[0.95rem] text-ink">{studentName(student)}</strong>
                  <span className="block truncate text-sm text-muted">{student.email}</span>
                </span>
                <ArrowRight className="size-4 text-slate-300" />
              </Link>
            ))}
            {data.students.length === 0 && <p className="py-8 text-center text-sm text-muted">Aún no hay estudiantes registrados.</p>}
          </div>
        </article>

        <article className="relative overflow-hidden rounded-[30px] bg-brand p-7 text-white shadow-[0_16px_45px_rgba(229,55,52,0.24)]">
          <div className="absolute -right-12 -top-12 size-52 rounded-full border-[42px] border-white/10" />
          <div className="relative">
            <span className="grid size-12 place-items-center rounded-2xl bg-white/15"><CalendarCheck2 className="size-6" /></span>
            <h2 className="mt-8 text-2xl font-black tracking-[-0.03em]">Planes de estudio</h2>
            <p className="mt-3 max-w-sm leading-7 text-white/80">Genera las sesiones diarias con la cantidad de tarjetas y el ritmo adecuado para cada estudiante.</p>
            <Link className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-extrabold text-brand transition hover:-translate-y-0.5" href="/dashboard/plans">
              Administrar planes <ArrowRight className="size-4" />
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
