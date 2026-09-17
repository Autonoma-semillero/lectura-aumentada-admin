"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  Layers3,
  ListChecks,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  Save,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui-kit";
import { apiFetch } from "@/lib/api-client";
import type {
  Category,
  DailyPlan,
  DailyPlanSummary,
  DomanSession,
  Student,
  StudyPlan,
  StudyPlanStatus,
  WordCard,
} from "@/lib/types";
import { studentName } from "@/lib/types";

type LevelCategoryDraft = {
  categoryId: string;
  wordCardIds: string[];
};

type LevelDraft = {
  clientId: string;
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  categories: LevelCategoryDraft[];
};

type StudyPlanDraft = {
  id?: string;
  name: string;
  description: string;
  studentId: string;
  startDate: string;
  endDate: string;
  sessionsPerDay: number;
  displayMs: number;
  audioMode: StudyPlan["audio_mode"];
  mode: StudyPlan["mode"];
  status: StudyPlanStatus;
  levels: LevelDraft[];
};

type SessionDraft = {
  session: DomanSession;
  displayMs: number;
  audioMode: DomanSession["audio_mode"];
  mode: NonNullable<DomanSession["mode"]>;
};

const sessionStatusLabel: Record<DomanSession["status"], string> = {
  planned: "Planificada",
  in_progress: "En curso",
  completed: "Completada",
  cancelled: "Cancelada",
};

const planStatusLabel: Record<StudyPlanStatus, string> = {
  draft: "Borrador",
  active: "Activo",
  paused: "Pausado",
  completed: "Completado",
  archived: "Archivado",
};

export default function PlansPage() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [studentId, setStudentId] = useState("");
  const [studyPlans, setStudyPlans] = useState<StudyPlan[] | null>(null);
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[] | null>(null);
  const [draft, setDraft] = useState<StudyPlanDraft | null>(null);
  const [categoryToAdd, setCategoryToAdd] = useState<Record<string, string>>({});
  const [cardsByKey, setCardsByKey] = useState<Record<string, WordCard[]>>({});
  const [loadingCardKeys, setLoadingCardKeys] = useState<string[]>([]);
  const [sessionsByPlan, setSessionsByPlan] = useState<Record<string, DomanSession[]>>({});
  const [expandedPlanIds, setExpandedPlanIds] = useState<string[]>([]);
  const [editingSession, setEditingSession] = useState<SessionDraft | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

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
      setError(cause instanceof Error ? cause.message : "No fue posible cargar la información.");
    }
  }

  const loadPlans = useCallback(async () => {
    if (!studentId) {
      setStudyPlans([]);
      setDailyPlans([]);
      return;
    }
    setStudyPlans(null);
    setDailyPlans(null);
    setSessionsByPlan({});
    setExpandedPlanIds([]);
    setError(null);
    try {
      const encodedStudentId = encodeURIComponent(studentId);
      const [nextStudyPlans, nextDailyPlans] = await Promise.all([
        apiFetch<StudyPlan[]>(`doman/study-plans?student_id=${encodedStudentId}`),
        apiFetch<DailyPlan[]>(`doman/daily-plans?student_id=${encodedStudentId}`),
      ]);
      setStudyPlans(nextStudyPlans);
      setDailyPlans(nextDailyPlans);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar los planes.");
    }
  }, [studentId]);

  useEffect(() => {
    void Promise.resolve().then(loadFilters);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadPlans);
  }, [loadPlans]);

  function newStudyPlanDraft(): StudyPlanDraft {
    const startDate = todayInputDate();
    const endDate = addDays(startDate, 6);
    return {
      name: "",
      description: "",
      studentId,
      startDate,
      endDate,
      sessionsPerDay: 5,
      displayMs: 2200,
      audioMode: "manual",
      mode: "auto",
      status: "active",
      levels: [newLevel(1, startDate, endDate)],
    };
  }

  function editStudyPlan(plan: StudyPlan) {
    const nextDraft: StudyPlanDraft = {
      id: plan.id,
      name: plan.name,
      description: plan.description ?? "",
      studentId: plan.student_id,
      startDate: inputDate(plan.start_date),
      endDate: inputDate(plan.end_date),
      sessionsPerDay: plan.sessions_per_day,
      displayMs: plan.display_ms,
      audioMode: plan.audio_mode,
      mode: plan.mode,
      status: plan.status,
      levels: plan.levels.map((level) => ({
        clientId: createClientId(),
        id: level.id,
        name: level.name,
        startDate: inputDate(level.start_date),
        endDate: inputDate(level.end_date),
        categories: level.categories.map((category) => ({
          categoryId: category.category_id,
          wordCardIds: [...category.word_card_ids],
        })),
      })),
    };
    setDraft(nextDraft);
    setFormError(null);
    for (const level of nextDraft.levels) {
      for (const category of level.categories) {
        void loadCards(nextDraft.studentId, category.categoryId);
      }
    }
  }

  async function loadCards(targetStudentId: string, categoryId: string): Promise<WordCard[]> {
    const key = cardKey(targetStudentId, categoryId);
    if (cardsByKey[key]) return cardsByKey[key];
    setLoadingCardKeys((current) => (current.includes(key) ? current : [...current, key]));
    try {
      const cards = await apiFetch<WordCard[]>(
        `word-cards?student_id=${encodeURIComponent(targetStudentId)}&category_id=${encodeURIComponent(categoryId)}`,
      );
      setCardsByKey((current) => ({ ...current, [key]: cards }));
      return cards;
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "No fue posible cargar las tarjetas.");
      return [];
    } finally {
      setLoadingCardKeys((current) => current.filter((item) => item !== key));
    }
  }

  function changeDraftStudent(nextStudentId: string) {
    if (!draft) return;
    const hasSelections = draft.levels.some((level) => level.categories.length > 0);
    if (
      hasSelections &&
      !window.confirm("Al cambiar de estudiante se quitarán las categorías y tarjetas seleccionadas. ¿Continuar?")
    ) {
      return;
    }
    setDraft({
      ...draft,
      studentId: nextStudentId,
      levels: draft.levels.map((level) => ({ ...level, categories: [] })),
    });
    setCardsByKey({});
  }

  function patchLevel(clientId: string, patch: Partial<LevelDraft>) {
    if (!draft) return;
    setDraft({
      ...draft,
      levels: draft.levels.map((level) =>
        level.clientId === clientId ? { ...level, ...patch } : level,
      ),
    });
  }

  function addLevel() {
    if (!draft) return;
    const previous = draft.levels.at(-1);
    const startDate = previous ? addDays(previous.endDate, 1) : draft.startDate;
    setDraft({
      ...draft,
      levels: [...draft.levels, newLevel(draft.levels.length + 1, startDate, draft.endDate)],
    });
  }

  function removeLevel(clientId: string) {
    if (!draft || draft.levels.length === 1) return;
    setDraft({ ...draft, levels: draft.levels.filter((level) => level.clientId !== clientId) });
  }

  async function addCategory(level: LevelDraft) {
    if (!draft) return;
    const categoryId = categoryToAdd[level.clientId] ?? "";
    if (!categoryId || level.categories.some((item) => item.categoryId === categoryId)) return;
    patchLevel(level.clientId, {
      categories: [...level.categories, { categoryId, wordCardIds: [] }],
    });
    setCategoryToAdd((current) => ({ ...current, [level.clientId]: "" }));
    await loadCards(draft.studentId, categoryId);
  }

  function removeCategory(level: LevelDraft, categoryId: string) {
    patchLevel(level.clientId, {
      categories: level.categories.filter((category) => category.categoryId !== categoryId),
    });
  }

  function setCategoryCards(level: LevelDraft, categoryId: string, wordCardIds: string[]) {
    patchLevel(level.clientId, {
      categories: level.categories.map((category) =>
        category.categoryId === categoryId ? { ...category, wordCardIds } : category,
      ),
    });
  }

  function toggleCard(level: LevelDraft, categoryId: string, cardId: string) {
    const category = level.categories.find((item) => item.categoryId === categoryId);
    if (!category) return;
    const selected = category.wordCardIds.includes(cardId)
      ? category.wordCardIds.filter((id) => id !== cardId)
      : [...category.wordCardIds, cardId];
    setCategoryCards(level, categoryId, selected);
  }

  async function saveStudyPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    if (draft.levels.some((level) => level.categories.length === 0)) {
      setFormError("Cada nivel debe incluir al menos una categoría.");
      return;
    }
    if (
      draft.levels.some((level) =>
        level.categories.some((category) => category.wordCardIds.length === 0),
      )
    ) {
      setFormError("Selecciona al menos una tarjeta en cada categoría.");
      return;
    }

    setIsSavingPlan(true);
    setFormError(null);
    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        student_id: draft.studentId,
        start_date: draft.startDate,
        end_date: draft.endDate,
        sessions_per_day: draft.sessionsPerDay,
        display_ms: draft.displayMs,
        audio_mode: draft.audioMode,
        mode: draft.mode,
        status: draft.status,
        levels: draft.levels.map((level, index) => ({
          ...(level.id ? { id: level.id } : {}),
          name: level.name.trim(),
          order_index: index + 1,
          start_date: level.startDate,
          end_date: level.endDate,
          categories: level.categories.map((category) => ({
            category_id: category.categoryId,
            word_card_ids: category.wordCardIds,
          })),
        })),
      };
      await apiFetch(draft.id ? `doman/study-plans/${draft.id}` : "doman/study-plans", {
        method: draft.id ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setDraft(null);
      setNotice(draft.id ? "El plan de estudio fue actualizado." : "El plan de estudio fue creado.");
      if (draft.studentId !== studentId) {
        setStudentId(draft.studentId);
      } else {
        await loadPlans();
      }
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "No fue posible guardar el plan.");
    } finally {
      setIsSavingPlan(false);
    }
  }

  async function generateToday(plan: StudyPlan) {
    setBusyKey(`generate-${plan.id}`);
    setNotice(null);
    try {
      const generated = await apiFetch<DailyPlanSummary[]>(
        `doman/study-plans/${plan.id}/generate-day`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setNotice(
        `Se prepararon ${generated.length} ${generated.length === 1 ? "bloque" : "bloques"} de sesiones para hoy.`,
      );
      await loadPlans();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible generar las sesiones de hoy.");
    } finally {
      setBusyKey(null);
    }
  }

  async function archiveStudyPlan(plan: StudyPlan) {
    if (!window.confirm(`¿Archivar el plan “${plan.name}”? Los días ya generados se conservarán.`)) return;
    setBusyKey(`archive-${plan.id}`);
    try {
      await apiFetch(`doman/study-plans/${plan.id}`, { method: "DELETE" });
      setNotice("El plan quedó archivado.");
      await loadPlans();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible archivar el plan.");
    } finally {
      setBusyKey(null);
    }
  }

  async function fetchSessions(planId: string): Promise<DomanSession[]> {
    const sessions = await apiFetch<DomanSession[]>(`doman/sessions?daily_plan_id=${planId}`);
    setSessionsByPlan((current) => ({ ...current, [planId]: sessions }));
    return sessions;
  }

  async function toggleSessions(planId: string) {
    if (expandedPlanIds.includes(planId)) {
      setExpandedPlanIds((current) => current.filter((id) => id !== planId));
      return;
    }
    setExpandedPlanIds((current) => [...current, planId]);
    if (sessionsByPlan[planId] !== undefined) return;
    setBusyKey(`sessions-${planId}`);
    try {
      await fetchSessions(planId);
    } catch (cause) {
      setExpandedPlanIds((current) => current.filter((id) => id !== planId));
      setError(cause instanceof Error ? cause.message : "No fue posible cargar las sesiones.");
    } finally {
      setBusyKey(null);
    }
  }

  async function addSession(planId: string) {
    setBusyKey(`add-${planId}`);
    try {
      const sessions = await apiFetch<DomanSession[]>(`doman/sessions/daily-plan/${planId}`, {
        method: "POST",
        body: JSON.stringify({ count: 1 }),
      });
      setSessionsByPlan((current) => ({ ...current, [planId]: sessions }));
      setExpandedPlanIds((current) => (current.includes(planId) ? current : [...current, planId]));
      setNotice("Se añadió una sesión al día seleccionado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible añadir la sesión.");
    } finally {
      setBusyKey(null);
    }
  }

  async function restoreDay(planId: string, ask = true) {
    if (ask && !window.confirm("¿Restaurar todas las sesiones de este día al estado planificado?")) return;
    const sessions = await apiFetch<DomanSession[]>(`doman/sessions/daily-plan/${planId}/restore`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    setSessionsByPlan((current) => ({ ...current, [planId]: sessions }));
  }

  async function deleteDaySessions(planId: string, ask = true) {
    if (ask && !window.confirm("¿Eliminar todas las sesiones de este día? El día seguirá existiendo.")) return;
    await apiFetch(`doman/sessions/daily-plan/${planId}`, { method: "DELETE" });
    setSessionsByPlan((current) => ({ ...current, [planId]: [] }));
  }

  async function runDayAction(planId: string, action: "restore" | "delete") {
    setBusyKey(`${action}-${planId}`);
    setError(null);
    try {
      if (action === "restore") await restoreDay(planId);
      else await deleteDaySessions(planId);
      setNotice(action === "restore" ? "Las sesiones del día fueron restauradas." : "Las sesiones del día fueron eliminadas.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible actualizar las sesiones.");
    } finally {
      setBusyKey(null);
    }
  }

  async function runAllDaysAction(action: "restore" | "delete") {
    if (!dailyPlans?.length) return;
    const message =
      action === "restore"
        ? "¿Restaurar las sesiones de todos los días visibles para este estudiante?"
        : "¿Eliminar las sesiones de todos los días visibles para este estudiante?";
    if (!window.confirm(message)) return;
    setBusyKey(`${action}-all`);
    setError(null);
    try {
      await Promise.all(
        dailyPlans.map((plan) =>
          action === "restore" ? restoreDay(plan.id, false) : deleteDaySessions(plan.id, false),
        ),
      );
      setNotice(
        action === "restore"
          ? "Se restauraron las sesiones de todos los días."
          : "Se eliminaron las sesiones de todos los días.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible actualizar todos los días.");
    } finally {
      setBusyKey(null);
    }
  }

  function editSession(session: DomanSession) {
    setEditingSession({
      session,
      displayMs: session.display_ms,
      audioMode: session.audio_mode,
      mode: session.mode ?? "manual",
    });
  }

  async function saveSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingSession) return;
    setIsSavingSession(true);
    setError(null);
    try {
      const updated = await apiFetch<DomanSession>(`doman/sessions/${editingSession.session.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          display_ms: editingSession.displayMs,
          audio_mode: editingSession.audioMode,
          mode: editingSession.mode,
        }),
      });
      setSessionsByPlan((current) => ({
        ...current,
        [updated.daily_plan_id]: (current[updated.daily_plan_id] ?? []).map((session) =>
          session.id === updated.id ? updated : session,
        ),
      }));
      setEditingSession(null);
      setNotice(`La sesión ${updated.session_index} fue actualizada.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible actualizar la sesión.");
    } finally {
      setIsSavingSession(false);
    }
  }

  async function restoreSession(session: DomanSession) {
    if (!window.confirm(`¿Restaurar la sesión ${session.session_index} al estado planificado?`)) return;
    setBusyKey(`restore-session-${session.id}`);
    try {
      const restored = await apiFetch<DomanSession>(`doman/sessions/${session.id}/restore`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setSessionsByPlan((current) => ({
        ...current,
        [session.daily_plan_id]: (current[session.daily_plan_id] ?? []).map((item) =>
          item.id === restored.id ? restored : item,
        ),
      }));
      setNotice(`La sesión ${session.session_index} fue restaurada.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible restaurar la sesión.");
    } finally {
      setBusyKey(null);
    }
  }

  async function deleteSession(session: DomanSession) {
    if (!window.confirm(`¿Eliminar definitivamente la sesión ${session.session_index}?`)) return;
    setBusyKey(`delete-session-${session.id}`);
    try {
      await apiFetch(`doman/sessions/${session.id}`, { method: "DELETE" });
      setSessionsByPlan((current) => ({
        ...current,
        [session.daily_plan_id]: (current[session.daily_plan_id] ?? []).filter(
          (item) => item.id !== session.id,
        ),
      }));
      setNotice(`La sesión ${session.session_index} fue eliminada.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible eliminar la sesión.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Método Doman"
        title="Planes de estudio"
        description="Diseña planes duraderos por estudiante, organiza niveles y elige exactamente las categorías y tarjetas de cada etapa."
        action={
          <button
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-brand px-5 font-extrabold text-white disabled:opacity-50"
            onClick={() => {
              setDraft(newStudyPlanDraft());
              setFormError(null);
            }}
            disabled={!studentId}
          >
            <Plus className="size-5" /> Nuevo plan
          </button>
        }
      />

      <section className="flex flex-col gap-4 rounded-[26px] border border-line bg-white p-5 sm:flex-row sm:items-end sm:justify-between">
        <label className="block w-full max-w-md space-y-2">
          <span className="text-sm font-bold text-ink-soft">Gestionar planes de</span>
          <select className="field" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            {students?.map((student) => (
              <option key={student.id} value={student.id}>{studentName(student)}</option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2 text-sm font-semibold text-muted">
          <UserRound className="size-4 text-brand" /> Cada plan pertenece a un estudiante.
        </div>
      </section>

      {notice && <p className="rounded-2xl border border-green-200 bg-green-50 p-4 font-semibold text-green-800">{notice}</p>}
      {!students && !error && <LoadingState label="Cargando estudiantes y planes…" />}
      {error && <ErrorState message={error} onRetry={loadPlans} />}

      {students && (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-black text-ink">Planes configurados</h2>
            <p className="mt-1 text-sm text-muted">El valor predeterminado es 5 sesiones por día y puedes cambiarlo en cada plan.</p>
          </div>
          {studyPlans === null && <LoadingState label="Cargando planes de estudio…" />}
          {studyPlans?.length === 0 && (
            <EmptyState title="Aún no hay un plan de estudio" description="Crea el primero y agrega sus niveles, categorías y tarjetas." />
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            {studyPlans?.map((plan) => {
              const cardsCount = plan.levels.reduce(
                (total, level) => total + level.categories.reduce((subtotal, category) => subtotal + category.word_card_ids.length, 0),
                0,
              );
              return (
                <article key={plan.id} className="rounded-[28px] border border-line bg-white p-6 shadow-[0_10px_35px_rgba(15,23,42,0.04)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${plan.status === "active" ? "bg-green-100 text-green-700" : plan.status === "archived" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-800"}`}>
                        {planStatusLabel[plan.status]}
                      </span>
                      <h3 className="mt-3 text-xl font-black text-ink">{plan.name}</h3>
                      {plan.description && <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{plan.description}</p>}
                    </div>
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand"><Layers3 className="size-5" /></span>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <PlanFact icon={<CalendarDays className="size-4" />} label={`${dateLabel(plan.start_date)} – ${dateLabel(plan.end_date)}`} />
                    <PlanFact icon={<RotateCcw className="size-4" />} label={`${plan.sessions_per_day} sesiones/día`} />
                    <PlanFact icon={<Clock3 className="size-4" />} label={`${(plan.display_ms / 1000).toFixed(1)} s por tarjeta`} />
                    <PlanFact icon={<ListChecks className="size-4" />} label={`${plan.levels.length} niveles · ${cardsCount} selecciones`} />
                  </div>
                  <div className="mt-5 space-y-2 rounded-2xl bg-canvas p-4">
                    {plan.levels.map((level) => (
                      <div key={level.id} className="flex items-center justify-between gap-3 text-sm">
                        <strong className="truncate text-ink">{level.name}</strong>
                        <span className="shrink-0 text-muted">{dateLabel(level.start_date)} – {dateLabel(level.end_date)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-action-soft px-4 text-sm font-extrabold text-action" onClick={() => editStudyPlan(plan)}><Pencil className="size-4" /> Editar</button>
                    {plan.status === "active" && (
                      <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-extrabold text-white disabled:opacity-60" onClick={() => void generateToday(plan)} disabled={busyKey === `generate-${plan.id}`}><CalendarDays className="size-4" /> {busyKey === `generate-${plan.id}` ? "Preparando…" : "Preparar hoy"}</button>
                    )}
                    {plan.status !== "archived" && (
                      <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-extrabold text-muted disabled:opacity-60" onClick={() => void archiveStudyPlan(plan)} disabled={busyKey === `archive-${plan.id}`}><Archive className="size-4" /> Archivar</button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {students && (
        <section className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-ink">Días y sesiones generadas</h2>
              <p className="mt-1 text-sm text-muted">Añade, edita, restaura o elimina sesiones de un día específico o de todos los días visibles.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-action-soft px-4 text-sm font-extrabold text-action disabled:opacity-50" disabled={!dailyPlans?.length || busyKey !== null} onClick={() => void runAllDaysAction("restore")}><RefreshCcw className="size-4" /> Restaurar todos los días</button>
              <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-50 px-4 text-sm font-extrabold text-brand disabled:opacity-50" disabled={!dailyPlans?.length || busyKey !== null} onClick={() => void runAllDaysAction("delete")}><Trash2 className="size-4" /> Eliminar todas las sesiones</button>
            </div>
          </div>
          {dailyPlans === null && <LoadingState label="Cargando días generados…" />}
          {dailyPlans?.length === 0 && <EmptyState title="No hay días generados" description="Abre un plan activo y usa “Preparar hoy”, o inicia una práctica desde la app móvil." />}
          <div className="space-y-4">
            {dailyPlans?.map((plan) => {
              const isExpanded = expandedPlanIds.includes(plan.id);
              const sessions = sessionsByPlan[plan.id];
              return (
                <article key={plan.id} className="rounded-[26px] border border-line bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                    <span className="grid size-14 shrink-0 place-items-center rounded-[20px] bg-action-soft text-action"><CalendarDays className="size-6" /></span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-extrabold capitalize text-ink">{longDateLabel(plan.plan_date)}</h3>
                      <p className="mt-1 text-sm text-muted">{categoryNames.get(plan.category_id) ?? "Temática"} · {plan.target_cards_count} tarjetas · objetivo de {plan.target_sessions_count} sesiones{plan.study_plan_id ? " · plan de estudio" : " · generación libre"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-action-soft px-3 text-sm font-extrabold text-action" onClick={() => void toggleSessions(plan.id)} disabled={busyKey === `sessions-${plan.id}`}>
                        <ListChecks className="size-4" /> {isExpanded ? "Ocultar" : "Ver sesiones"} {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                      </button>
                      <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-green-50 px-3 text-sm font-extrabold text-green-700" onClick={() => void addSession(plan.id)} disabled={busyKey === `add-${plan.id}`}><Plus className="size-4" /> Añadir</button>
                      <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-50 px-3 text-sm font-extrabold text-amber-800" onClick={() => void runDayAction(plan.id, "restore")} disabled={busyKey === `restore-${plan.id}`}><RefreshCcw className="size-4" /> Restaurar día</button>
                      <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-50 px-3 text-sm font-extrabold text-brand" onClick={() => void runDayAction(plan.id, "delete")} disabled={busyKey === `delete-${plan.id}`}><Trash2 className="size-4" /> Eliminar sesiones</button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-5 space-y-3 border-t border-line pt-5">
                      {sessions === undefined && <p className="text-sm font-semibold text-muted">Cargando sesiones…</p>}
                      {sessions?.length === 0 && <p className="rounded-2xl bg-canvas p-4 text-sm font-semibold text-muted">Este día no tiene sesiones. Puedes añadir una sin recrear el plan.</p>}
                      {sessions?.map((session) => (
                        <div key={session.id} className="flex flex-col gap-3 rounded-2xl bg-canvas p-4 lg:flex-row lg:items-center">
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white font-black text-brand shadow-sm">{session.session_index}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-extrabold text-ink">Sesión {session.session_index} · {sessionStatusLabel[session.status]}</p>
                            <p className="mt-1 text-sm text-muted">{(session.display_ms / 1000).toFixed(1)} s por tarjeta · Audio {session.audio_mode} · Modo {session.mode ?? "manual"}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-sm font-extrabold text-action shadow-sm" onClick={() => editSession(session)}><Pencil className="size-4" /> Editar</button>
                            <button className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-sm font-extrabold text-amber-700 shadow-sm disabled:opacity-50" onClick={() => void restoreSession(session)} disabled={busyKey === `restore-session-${session.id}`}><RefreshCcw className="size-4" /> Restaurar</button>
                            <button className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-sm font-extrabold text-brand shadow-sm disabled:opacity-50" onClick={() => void deleteSession(session)} disabled={busyKey === `delete-session-${session.id}`}><Trash2 className="size-4" /> Eliminar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {draft && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => setDraft(null)}>
          <section className="mx-auto my-4 w-full max-w-6xl rounded-[30px] bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="study-plan-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand">Plan maestro</p><h2 id="study-plan-title" className="mt-1 text-2xl font-black text-ink">{draft.id ? "Editar plan de estudio" : "Nuevo plan de estudio"}</h2><p className="mt-2 text-sm text-muted">Configura la duración general y distribuye las tarjetas en niveles con fechas propias.</p></div>
              <button type="button" className="grid size-10 place-items-center rounded-full bg-canvas text-muted" onClick={() => setDraft(null)} aria-label="Cerrar"><X className="size-5" /></button>
            </div>

            <form className="mt-7 space-y-7" onSubmit={saveStudyPlan}>
              <div className="grid gap-4 lg:grid-cols-3">
                <label className="block space-y-2 lg:col-span-2"><span className="text-sm font-bold text-ink-soft">Nombre del plan</span><input className="field" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} maxLength={120} placeholder="Ej. Animales · primer trimestre" required /></label>
                <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">Estudiante</span><select className="field" value={draft.studentId} onChange={(event) => changeDraftStudent(event.target.value)} required>{students?.map((student) => <option key={student.id} value={student.id}>{studentName(student)}</option>)}</select></label>
                <label className="block space-y-2 lg:col-span-3"><span className="text-sm font-bold text-ink-soft">Descripción (opcional)</span><textarea className="field min-h-24 resize-y" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} maxLength={500} placeholder="Objetivo pedagógico, observaciones o indicaciones…" /></label>
                <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">Inicio del plan</span><input className="field" type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} required /></label>
                <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">Fin del plan</span><input className="field" type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} required /></label>
                <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">Estado</span><select className="field" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as StudyPlanStatus })}><option value="draft">Borrador</option><option value="active">Activo</option><option value="paused">Pausado</option><option value="completed">Completado</option><option value="archived">Archivado</option></select></label>
              </div>

              <div className="grid gap-4 rounded-[24px] bg-brand p-5 text-white md:grid-cols-4">
                <label className="block space-y-2"><span className="text-sm font-bold text-white/80">Sesiones por día</span><input className="field border-0" type="number" min={1} max={10} value={draft.sessionsPerDay} onChange={(event) => setDraft({ ...draft, sessionsPerDay: Number(event.target.value) })} required /><span className="text-xs text-white/70">Normal: 5 sesiones</span></label>
                <label className="block space-y-2"><span className="text-sm font-bold text-white/80">Milisegundos por tarjeta</span><input className="field border-0" type="number" min={200} max={10000} step={100} value={draft.displayMs} onChange={(event) => setDraft({ ...draft, displayMs: Number(event.target.value) })} required /><span className="text-xs text-white/70">{(draft.displayMs / 1000).toFixed(1)} segundos</span></label>
                <label className="block space-y-2"><span className="text-sm font-bold text-white/80">Audio</span><select className="field border-0" value={draft.audioMode} onChange={(event) => setDraft({ ...draft, audioMode: event.target.value as StudyPlan["audio_mode"] })}><option value="auto">Automático</option><option value="manual">Manual</option><option value="disabled">Desactivado</option></select></label>
                <label className="block space-y-2"><span className="text-sm font-bold text-white/80">Avance</span><select className="field border-0" value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.target.value as StudyPlan["mode"] })}><option value="auto">Automático</option><option value="manual">Manual</option></select></label>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4"><div><h3 className="text-xl font-black text-ink">Niveles del plan</h3><p className="mt-1 text-sm text-muted">Los rangos de los niveles no pueden cruzarse.</p></div><button type="button" className="inline-flex h-10 items-center gap-2 rounded-xl bg-action-soft px-4 text-sm font-extrabold text-action" onClick={addLevel}><Plus className="size-4" /> Añadir nivel</button></div>
                {draft.levels.map((level, levelIndex) => (
                  <article key={level.clientId} className="rounded-[24px] border border-line bg-canvas p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand font-black text-white">{levelIndex + 1}</span>
                      <label className="block flex-1 space-y-2"><span className="text-sm font-bold text-ink-soft">Nombre del nivel</span><input className="field bg-white" value={level.name} onChange={(event) => patchLevel(level.clientId, { name: event.target.value })} maxLength={100} required /></label>
                      <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">Desde</span><input className="field bg-white" type="date" value={level.startDate} onChange={(event) => patchLevel(level.clientId, { startDate: event.target.value })} required /></label>
                      <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">Hasta</span><input className="field bg-white" type="date" value={level.endDate} onChange={(event) => patchLevel(level.clientId, { endDate: event.target.value })} required /></label>
                      <button type="button" className="grid size-11 place-items-center rounded-xl bg-red-50 text-brand disabled:opacity-30" onClick={() => removeLevel(level.clientId)} disabled={draft.levels.length === 1} aria-label="Eliminar nivel"><Trash2 className="size-4" /></button>
                    </div>

                    <div className="mt-5 rounded-2xl bg-white p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <label className="block flex-1 space-y-2"><span className="text-sm font-bold text-ink-soft">Agregar categoría al nivel</span><select className="field" value={categoryToAdd[level.clientId] ?? ""} onChange={(event) => setCategoryToAdd((current) => ({ ...current, [level.clientId]: event.target.value }))}><option value="">Seleccionar categoría…</option>{categories.filter((category) => !level.categories.some((item) => item.categoryId === category.id)).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                        <button type="button" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-action px-5 font-extrabold text-white disabled:opacity-50" onClick={() => void addCategory(level)} disabled={!categoryToAdd[level.clientId]}><Plus className="size-4" /> Agregar</button>
                      </div>

                      {level.categories.length === 0 && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Agrega al menos una categoría y selecciona sus tarjetas.</p>}
                      <div className="mt-4 space-y-4">
                        {level.categories.map((selectedCategory) => {
                          const key = cardKey(draft.studentId, selectedCategory.categoryId);
                          const cards = (cardsByKey[key] ?? []).filter((card) => card.status !== "archived");
                          const isLoading = loadingCardKeys.includes(key);
                          const allSelected = cards.length > 0 && cards.every((card) => selectedCategory.wordCardIds.includes(card.id));
                          return (
                            <div key={selectedCategory.categoryId} className="rounded-2xl border border-line p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3"><div><strong className="text-ink">{categoryNames.get(selectedCategory.categoryId) ?? "Categoría"}</strong><p className="mt-1 text-xs font-semibold text-muted">{selectedCategory.wordCardIds.length} tarjetas seleccionadas</p></div><div className="flex gap-2"><button type="button" className="rounded-xl bg-action-soft px-3 py-2 text-xs font-extrabold text-action disabled:opacity-40" onClick={() => setCategoryCards(level, selectedCategory.categoryId, allSelected ? [] : cards.map((card) => card.id))} disabled={cards.length === 0}>{allSelected ? "Quitar todas" : "Seleccionar todas"}</button><button type="button" className="grid size-9 place-items-center rounded-xl bg-red-50 text-brand" onClick={() => removeCategory(level, selectedCategory.categoryId)} aria-label="Quitar categoría"><Trash2 className="size-4" /></button></div></div>
                              {isLoading && <p className="mt-3 text-sm font-semibold text-muted">Cargando tarjetas…</p>}
                              {!isLoading && cards.length === 0 && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">Este estudiante no tiene tarjetas disponibles en esta categoría.</p>}
                              {cards.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{cards.map((card) => <label key={card.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-bold transition ${selectedCategory.wordCardIds.includes(card.id) ? "border-brand bg-brand-soft text-brand" : "border-line bg-white text-ink-soft"}`}><input className="size-4 accent-brand" type="checkbox" checked={selectedCategory.wordCardIds.includes(card.id)} onChange={() => toggleCard(level, selectedCategory.categoryId, card.id)} /><span className="truncate">{card.word}</span></label>)}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {formError && <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700" role="alert">{formError}</p>}
              <div className="sticky bottom-0 flex justify-end gap-3 border-t border-line bg-white/95 pt-5 backdrop-blur"><button type="button" className="h-12 rounded-2xl px-5 font-bold text-muted" onClick={() => setDraft(null)}>Cancelar</button><button className="inline-flex h-12 items-center gap-2 rounded-2xl bg-brand px-6 font-extrabold text-white disabled:opacity-60" disabled={isSavingPlan}><Save className="size-4" /> {isSavingPlan ? "Guardando…" : "Guardar plan"}</button></div>
            </form>
          </section>
        </div>
      )}

      {editingSession && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" role="presentation" onMouseDown={() => setEditingSession(null)}>
          <form onSubmit={saveSession} className="w-full max-w-lg rounded-[30px] bg-white p-6 shadow-2xl sm:p-7" role="dialog" aria-modal="true" aria-label="Editar sesión" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand">Método Doman</p><h2 className="mt-1 text-2xl font-black text-ink">Editar sesión {editingSession.session.session_index}</h2><p className="mt-2 text-sm text-muted">Estado actual: {sessionStatusLabel[editingSession.session.status]}</p></div><button type="button" className="grid size-10 place-items-center rounded-full bg-canvas text-muted" onClick={() => setEditingSession(null)} aria-label="Cerrar"><X className="size-5" /></button></div>
            <div className="mt-6 space-y-4">
              <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">Tiempo por tarjeta</span><div className="grid grid-cols-[1fr_7rem] items-center gap-3"><input className="w-full accent-brand" type="range" min={200} max={10000} step={100} value={editingSession.displayMs} onChange={(event) => setEditingSession({ ...editingSession, displayMs: Number(event.target.value) })} /><input className="field" type="number" min={200} max={10000} value={editingSession.displayMs} onChange={(event) => setEditingSession({ ...editingSession, displayMs: Number(event.target.value) })} required /></div><span className="text-xs font-semibold text-muted">{(editingSession.displayMs / 1000).toFixed(1)} segundos</span></label>
              <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">Audio</span><select className="field" value={editingSession.audioMode} onChange={(event) => setEditingSession({ ...editingSession, audioMode: event.target.value as DomanSession["audio_mode"] })}><option value="auto">Automático</option><option value="manual">Manual</option><option value="disabled">Desactivado</option></select></label>
              <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">Modo de avance</span><select className="field" value={editingSession.mode} onChange={(event) => setEditingSession({ ...editingSession, mode: event.target.value as NonNullable<DomanSession["mode"]> })}><option value="manual">Manual</option><option value="auto">Automático</option></select></label>
            </div>
            <button className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand font-extrabold text-white disabled:opacity-60" disabled={isSavingSession}><Save className="size-4" /> {isSavingSession ? "Guardando…" : "Guardar cambios"}</button>
          </form>
        </div>
      )}
    </div>
  );
}

function PlanFact({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <span className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2 font-semibold text-ink-soft">{icon}{label}</span>;
}

function createClientId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function newLevel(index: number, startDate: string, endDate: string): LevelDraft {
  return { clientId: createClientId(), name: `Nivel ${index}`, startDate, endDate, categories: [] };
}

function cardKey(studentId: string, categoryId: string): string {
  return `${studentId}:${categoryId}`;
}

function inputDate(value: string): string {
  return value.slice(0, 10);
}

function todayInputDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateLabel(value: string): string {
  return new Date(`${inputDate(value)}T12:00:00`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function longDateLabel(value: string): string {
  return new Date(`${inputDate(value)}T12:00:00`).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
