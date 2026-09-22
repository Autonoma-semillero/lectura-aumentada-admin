"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CalendarDays,
  Check,
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
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui-kit";
import { apiFetch } from "@/lib/api-client";
import type {
  AudienceSearchItem,
  AudienceSearchResponse,
  Category,
  DailyPlan,
  DailyPlanSummary,
  DomanSession,
  GenerateStudyPlanDayResponse,
  GroupAudienceItem,
  PreviewCategoryCardsResponse,
  Student,
  StudentAudienceItem,
  StudyPlan,
  StudyPlanAudienceStudent,
  StudyPlanStatus,
} from "@/lib/types";
import { studentName } from "@/lib/types";

type LevelCategoryDraft = {
  categoryId: string;
  targetCardsCount: number;
  mode: "legacy" | "target" | "words";
  legacyWordCardIds?: string[];
  words?: string[];
};

type CategoryPreviewState = {
  status: "loading" | "error" | "done";
  error?: string;
  students?: PreviewCategoryCardsResponse["students"];
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
  groupIds: string[];
  directStudentIds: string[];
  resolvedStudentIds: string[];
  audienceStudents: StudyPlanAudienceStudent[];
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

const MAX_PLAN_AUDIENCE_STUDENTS = 50;
const MAX_PLAN_DAY_JOBS = 100;
const MAX_PLAN_DAY_SESSION_CARDS = 10_000;

export default function PlansPage() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [executionStudentId, setExecutionStudentId] = useState("");
  const [studyPlans, setStudyPlans] = useState<StudyPlan[] | null>(null);
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[] | null>(null);
  const [draft, setDraft] = useState<StudyPlanDraft | null>(null);
  const [categoryToAdd, setCategoryToAdd] = useState<Record<string, string>>({});
  const [audienceQuery, setAudienceQuery] = useState("");
  const [audienceResults, setAudienceResults] = useState<AudienceSearchItem[]>([]);
  const [selectedAudienceItems, setSelectedAudienceItems] = useState<AudienceSearchItem[]>([]);
  const [isAudienceSearching, setIsAudienceSearching] = useState(false);
  const [audienceError, setAudienceError] = useState<string | null>(null);
  const [sessionsByPlan, setSessionsByPlan] = useState<Record<string, DomanSession[]>>({});
  const [expandedPlanIds, setExpandedPlanIds] = useState<string[]>([]);
  const [editingSession, setEditingSession] = useState<SessionDraft | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewByKey, setPreviewByKey] = useState<Record<string, CategoryPreviewState>>({});

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const studentsById = useMemo(
    () => new Map((students ?? []).map((student) => [student.id, student])),
    [students],
  );

  const isCreatingPlan = draft !== null && draft.id === undefined;
  const selectedResolvedStudentIds = useMemo(
    () => resolveAudienceStudentIds(selectedAudienceItems),
    [selectedAudienceItems],
  );

  const loadFilters = useCallback(async () => {
    setError(null);
    try {
      const [nextStudents, nextCategories] = await Promise.all([
        apiFetch<Student[]>("docente/students"),
        apiFetch<Category[]>("categories"),
      ]);
      setStudents(nextStudents);
      setCategories(nextCategories);
      const requestedStudent = new URLSearchParams(window.location.search).get("student");
      setExecutionStudentId((current) => current || requestedStudent || nextStudents[0]?.id || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar la información.");
    }
  }, []);

  const loadStudyPlans = useCallback(async () => {
    setStudyPlans(null);
    setError(null);
    try {
      setStudyPlans(await apiFetch<StudyPlan[]>("doman/study-plans"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar los planes maestros.");
    }
  }, []);

  const loadExecutionPlans = useCallback(async () => {
    if (!executionStudentId) {
      setDailyPlans([]);
      setSessionsByPlan({});
      setExpandedPlanIds([]);
      return;
    }
    setDailyPlans(null);
    setSessionsByPlan({});
    setExpandedPlanIds([]);
    setError(null);
    try {
      setDailyPlans(
        await apiFetch<DailyPlan[]>(
          `doman/daily-plans?student_id=${encodeURIComponent(executionStudentId)}`,
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar la ejecución del estudiante.");
    }
  }, [executionStudentId]);

  useEffect(() => {
    void Promise.resolve().then(() => Promise.all([loadFilters(), loadStudyPlans()]));
  }, [loadFilters, loadStudyPlans]);

  useEffect(() => {
    void Promise.resolve().then(loadExecutionPlans);
  }, [loadExecutionPlans]);

  useEffect(() => {
    if (!isCreatingPlan) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void apiFetch<AudienceSearchResponse>(
        `groups/audience/search?q=${encodeURIComponent(audienceQuery.trim())}&limit=50`,
        { signal: controller.signal },
      )
        .then((response) => {
          setAudienceResults(response.items);
          setAudienceError(null);
        })
        .catch((cause: unknown) => {
          if (controller.signal.aborted) return;
          setAudienceError(cause instanceof Error ? cause.message : "No fue posible buscar la audiencia.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsAudienceSearching(false);
        });
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [audienceQuery, isCreatingPlan]);

  function newStudyPlanDraft(): StudyPlanDraft {
    const startDate = todayInputDate();
    const endDate = addDays(startDate, 6);
    return {
      name: "",
      description: "",
      groupIds: [],
      directStudentIds: [],
      resolvedStudentIds: [],
      audienceStudents: [],
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

  function openNewStudyPlan() {
    setDraft(newStudyPlanDraft());
    setSelectedAudienceItems([]);
    setAudienceQuery("");
    setAudienceResults([]);
    setAudienceError(null);
    setIsAudienceSearching(true);
    setFormError(null);
    setPreviewByKey({});
  }

  function closeStudyPlan() {
    setDraft(null);
    setSelectedAudienceItems([]);
    setAudienceQuery("");
    setAudienceResults([]);
    setAudienceError(null);
    setIsAudienceSearching(false);
    setFormError(null);
    setPreviewByKey({});
  }

  function editStudyPlan(plan: StudyPlan) {
    const legacyStudentIds = plan.student_id ? [plan.student_id] : [];
    const resolvedStudentIds = uniqueStrings([
      ...(plan.student_ids ?? []),
      ...(plan.students ?? []).map((student) => student.student_id),
      ...legacyStudentIds,
    ]);
    const nextDraft: StudyPlanDraft = {
      id: plan.id,
      name: plan.name,
      description: plan.description ?? "",
      groupIds: plan.group_ids ?? [],
      directStudentIds: plan.direct_student_ids?.length
        ? plan.direct_student_ids
        : legacyStudentIds,
      resolvedStudentIds,
      audienceStudents: plan.students?.length
        ? plan.students
        : resolvedStudentIds.map((studentId) => ({ student_id: studentId, sources: [] })),
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
        categories: level.categories.map((category) => {
          const legacyWordCardIds = Array.isArray(category.word_card_ids)
            ? [...category.word_card_ids]
            : undefined;
          const words = Array.isArray(category.word_card_words)
            ? [...category.word_card_words]
            : undefined;
          const mode: LevelCategoryDraft["mode"] =
            legacyWordCardIds !== undefined ? "legacy" : words !== undefined ? "words" : "target";
          return {
            categoryId: category.category_id,
            targetCardsCount: categoryTargetCardsCount(category),
            mode,
            legacyWordCardIds,
            words,
          };
        }),
      })),
    };
    setDraft(nextDraft);
    setSelectedAudienceItems([]);
    setAudienceQuery("");
    setAudienceResults([]);
    setAudienceError(null);
    setIsAudienceSearching(false);
    setFormError(null);
    setPreviewByKey({});
  }

  function changeAudienceQuery(value: string) {
    setAudienceQuery(value);
    setAudienceError(null);
    setIsAudienceSearching(true);
  }

  function isAudienceSelected(item: AudienceSearchItem): boolean {
    if (!draft) return false;
    return item.type === "group"
      ? draft.groupIds.includes(item.id)
      : draft.directStudentIds.includes(item.id);
  }

  function toggleAudienceItem(item: AudienceSearchItem) {
    if (!draft || draft.id) return;
    const selected = isAudienceSelected(item);
    const nextSelectedItems = selected
      ? selectedAudienceItems.filter(
          (selectedItem) =>
            selectedItem.type !== item.type || selectedItem.id !== item.id,
        )
      : [
          ...selectedAudienceItems.filter(
            (selectedItem) =>
              selectedItem.type !== item.type || selectedItem.id !== item.id,
          ),
          item,
        ];

    if (
      !selected &&
      resolveAudienceStudentIds(nextSelectedItems).length > MAX_PLAN_AUDIENCE_STUDENTS
    ) {
      setFormError(
        `La audiencia resuelta no puede superar ${MAX_PLAN_AUDIENCE_STUDENTS} estudiantes.`,
      );
      return;
    }

    setDraft({
      ...draft,
      groupIds:
        item.type === "group"
          ? selected
            ? draft.groupIds.filter((id) => id !== item.id)
            : [...draft.groupIds, item.id]
          : draft.groupIds,
      directStudentIds:
        item.type === "student"
          ? selected
            ? draft.directStudentIds.filter((id) => id !== item.id)
            : [...draft.directStudentIds, item.id]
          : draft.directStudentIds,
    });
    setSelectedAudienceItems(nextSelectedItems);
    setFormError(null);
  }

  function selectAllStudents() {
    if (!draft || draft.id || !students?.length) return;

    const knownStudentItems = new Map<string, StudentAudienceItem>();
    for (const item of [...audienceResults, ...selectedAudienceItems]) {
      if (item.type === "student") knownStudentItems.set(item.id, item);
    }

    const allStudentItems = [
      ...new Map(
        students.map(
          (student) =>
            [
              student.id,
              knownStudentItems.get(student.id) ?? toStudentAudienceItem(student),
            ] as const,
        ),
      ).values(),
    ];
    const selectedGroups = selectedAudienceItems.filter(
      (item): item is GroupAudienceItem => item.type === "group",
    );
    const nextSelectedItems: AudienceSearchItem[] = [...selectedGroups, ...allStudentItems];
    const resolvedStudentCount = resolveAudienceStudentIds(nextSelectedItems).length;

    if (resolvedStudentCount > MAX_PLAN_AUDIENCE_STUDENTS) {
      setFormError(
        `No es posible seleccionar todos: la audiencia resuelta tendría ${resolvedStudentCount} estudiantes y el máximo es ${MAX_PLAN_AUDIENCE_STUDENTS}.`,
      );
      return;
    }

    setDraft({
      ...draft,
      directStudentIds: allStudentItems.map((item) => item.id),
    });
    setSelectedAudienceItems(nextSelectedItems);
    setFormError(null);
  }

  function clearDirectStudents() {
    if (!draft || draft.id) return;
    setDraft({ ...draft, directStudentIds: [] });
    setSelectedAudienceItems((current) =>
      current.filter((item): item is GroupAudienceItem => item.type === "group"),
    );
    setFormError(null);
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

  function addCategory(level: LevelDraft) {
    if (!draft) return;
    const categoryId = categoryToAdd[level.clientId] ?? "";
    if (!categoryId || level.categories.some((item) => item.categoryId === categoryId)) return;
    patchLevel(level.clientId, {
      categories: [
        ...level.categories,
        { categoryId, targetCardsCount: 5, mode: "target" },
      ],
    });
    setCategoryToAdd((current) => ({ ...current, [level.clientId]: "" }));
  }

  function removeCategory(level: LevelDraft, categoryId: string) {
    patchLevel(level.clientId, {
      categories: level.categories.filter((category) => category.categoryId !== categoryId),
    });
  }

  function setCategoryTarget(level: LevelDraft, categoryId: string, targetCardsCount: number) {
    patchLevel(level.clientId, {
      categories: level.categories.map((category) =>
        category.categoryId === categoryId ? { ...category, targetCardsCount } : category,
      ),
    });
  }

  function setCategoryMode(
    level: LevelDraft,
    categoryId: string,
    mode: LevelCategoryDraft["mode"],
  ) {
    patchLevel(level.clientId, {
      categories: level.categories.map((category) =>
        category.categoryId === categoryId
          ? { ...category, mode, words: mode === "words" ? (category.words ?? []) : category.words }
          : category,
      ),
    });
  }

  function setCategoryWords(level: LevelDraft, categoryId: string, words: string[]) {
    patchLevel(level.clientId, {
      categories: level.categories.map((category) =>
        category.categoryId === categoryId ? { ...category, words } : category,
      ),
    });
    setPreviewByKey((current) => {
      const key = `${level.clientId}:${categoryId}`;
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function previewCategoryWords(level: LevelDraft, category: LevelCategoryDraft) {
    if (!draft) return;
    const key = `${level.clientId}:${category.categoryId}`;
    const words = (category.words ?? []).map((word) => word.trim()).filter(Boolean);
    const studentIds = draft.id ? draft.resolvedStudentIds : selectedResolvedStudentIds;
    if (words.length === 0) {
      setPreviewByKey((current) => ({
        ...current,
        [key]: { status: "error", error: "Agrega al menos una palabra antes de previsualizar." },
      }));
      return;
    }
    if (studentIds.length === 0) {
      setPreviewByKey((current) => ({
        ...current,
        [key]: { status: "error", error: "Define la audiencia del plan antes de previsualizar." },
      }));
      return;
    }
    setPreviewByKey((current) => ({ ...current, [key]: { status: "loading" } }));
    try {
      const response = await apiFetch<PreviewCategoryCardsResponse>(
        "doman/study-plans/preview-category-cards",
        {
          method: "POST",
          body: JSON.stringify({
            category_id: category.categoryId,
            word_card_words: words,
            student_ids: studentIds,
          }),
        },
      );
      setPreviewByKey((current) => ({
        ...current,
        [key]: { status: "done", students: response.students },
      }));
    } catch (cause) {
      setPreviewByKey((current) => ({
        ...current,
        [key]: {
          status: "error",
          error: cause instanceof Error ? cause.message : "No fue posible previsualizar las tarjetas.",
        },
      }));
    }
  }

  async function saveStudyPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    if (!draft.id && draft.groupIds.length === 0 && draft.directStudentIds.length === 0) {
      setFormError("Selecciona al menos un grupo o estudiante para la audiencia.");
      return;
    }
    if (!draft.id && selectedResolvedStudentIds.length === 0) {
      setFormError("La audiencia seleccionada no contiene estudiantes.");
      return;
    }
    if (!draft.id && selectedResolvedStudentIds.length > MAX_PLAN_AUDIENCE_STUDENTS) {
      setFormError(
        `La audiencia resuelta no puede superar ${MAX_PLAN_AUDIENCE_STUDENTS} estudiantes.`,
      );
      return;
    }
    if (draft.levels.some((level) => level.categories.length === 0)) {
      setFormError("Cada nivel debe incluir al menos una categoría.");
      return;
    }
    if (
      draft.levels.some((level) =>
        level.categories.some(
          (category) =>
            category.mode === "target" &&
            (category.targetCardsCount < 1 || category.targetCardsCount > 50),
        ),
      )
    ) {
      setFormError("La cantidad objetivo de cada categoría debe estar entre 1 y 50 tarjetas.");
      return;
    }
    if (
      draft.levels.some((level) =>
        level.categories.some(
          (category) => category.mode === "words" && (category.words ?? []).length === 0,
        ),
      )
    ) {
      setFormError("Cada categoría con palabras explícitas debe tener al menos una palabra.");
      return;
    }

    const audienceStudentCount = draft.id
      ? draft.resolvedStudentIds.length
      : selectedResolvedStudentIds.length;
    const oversizedLevel = draft.levels.find((level) => {
      const jobs = audienceStudentCount * level.categories.length;
      const cardsPerStudent = level.categories.reduce(
        (total, category) =>
          total +
          categoryCardsPerStudent(category),
        0,
      );
      const sessionCards =
        audienceStudentCount * draft.sessionsPerDay * cardsPerStudent;
      return jobs > MAX_PLAN_DAY_JOBS || sessionCards > MAX_PLAN_DAY_SESSION_CARDS;
    });
    if (oversizedLevel) {
      const jobs = audienceStudentCount * oversizedLevel.categories.length;
      const cardsPerStudent = oversizedLevel.categories.reduce(
        (total, category) =>
          total +
          categoryCardsPerStudent(category),
        0,
      );
      const sessionCards =
        audienceStudentCount * draft.sessionsPerDay * cardsPerStudent;
      setFormError(
        jobs > MAX_PLAN_DAY_JOBS
          ? `El nivel “${oversizedLevel.name || "Sin nombre"}” genera ${jobs} combinaciones estudiante-categoría; el máximo es ${MAX_PLAN_DAY_JOBS}. Reduce la audiencia o las categorías.`
          : `El nivel “${oversizedLevel.name || "Sin nombre"}” generaría ${sessionCards} asignaciones de tarjetas por día; el máximo es ${MAX_PLAN_DAY_SESSION_CARDS}. Reduce la audiencia, sesiones o tarjetas.`,
      );
      return;
    }

    setIsSavingPlan(true);
    setFormError(null);
    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        ...(!draft.id
          ? {
              group_ids: draft.groupIds,
              student_ids: draft.directStudentIds,
            }
          : {}),
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
          categories: level.categories.map(toStudyPlanCategoryPayload),
        })),
      };
      await apiFetch(draft.id ? `doman/study-plans/${draft.id}` : "doman/study-plans", {
        method: draft.id ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      closeStudyPlan();
      setNotice(draft.id ? "El plan de estudio fue actualizado." : "El plan de estudio fue creado.");
      await loadStudyPlans();
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
      const generated = await apiFetch<GenerateStudyPlanDayResponse | DailyPlanSummary[]>(
        `doman/study-plans/${plan.id}/generate-day`,
        { method: "POST", body: JSON.stringify({}) },
      );
      const summary = normalizeGenerateDaySummary(generated);
      const ready = summary.generated + summary.existing;
      setNotice(
        `${ready} de ${summary.total} bloques diarios quedaron listos` +
          (summary.failed > 0 ? `; ${summary.failed} fallaron.` : "."),
      );
      await Promise.all([loadStudyPlans(), loadExecutionPlans()]);
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
      await loadStudyPlans();
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
        title="Planes maestros"
        description="Diseña una programación común para grupos y estudiantes directos, organiza sus niveles y define cuántas tarjetas trabajará cada categoría."
        action={
          <button
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-brand px-5 font-extrabold text-white disabled:opacity-50"
            onClick={openNewStudyPlan}
            disabled={categories.length === 0}
          >
            <Plus className="size-5" /> Nuevo plan
          </button>
        }
      />

      {notice && <p className="rounded-2xl border border-green-200 bg-green-50 p-4 font-semibold text-green-800">{notice}</p>}
      {!students && !error && <LoadingState label="Cargando estudiantes, categorías y planes…" />}
      {error && (
        <ErrorState
          message={error}
          onRetry={() => void Promise.all([loadFilters(), loadStudyPlans(), loadExecutionPlans()])}
        />
      )}

      <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-black text-ink">Todos los planes maestros</h2>
            <p className="mt-1 text-sm text-muted">La audiencia queda guardada como una fotografía inmutable; los cambios futuros de un grupo no alteran el plan existente.</p>
          </div>
          {studyPlans === null && <LoadingState label="Cargando planes de estudio…" />}
          {studyPlans?.length === 0 && (
            <EmptyState title="Aún no hay planes maestros" description="Crea el primero, combina grupos y estudiantes, y configura sus niveles." />
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            {studyPlans?.map((plan) => {
              const cardsCount = plan.levels.reduce(
                (total, level) =>
                  total +
                  level.categories.reduce(
                    (subtotal, category) => subtotal + categoryTargetCardsCount(category),
                    0,
                  ),
                0,
              );
              const audienceStudentIds = studyPlanStudentIds(plan);
              const directStudentIds = studyPlanDirectStudentIds(plan);
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
                  <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                    <PlanFact icon={<CalendarDays className="size-4" />} label={`${dateLabel(plan.start_date)} – ${dateLabel(plan.end_date)}`} />
                    <PlanFact icon={<Users className="size-4" />} label={`${audienceStudentIds.length} estudiantes · ${(plan.group_ids ?? []).length} grupos + ${directStudentIds.length} directos`} />
                    <PlanFact icon={<RotateCcw className="size-4" />} label={`${plan.sessions_per_day} sesiones/día`} />
                    <PlanFact icon={<Clock3 className="size-4" />} label={`${(plan.display_ms / 1000).toFixed(1)} s por tarjeta`} />
                    <PlanFact icon={<ListChecks className="size-4" />} label={`${plan.levels.length} niveles · ${cardsCount} tarjetas objetivo`} />
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

      {students && (
        <section className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-ink">Ejecución individual: días y sesiones</h2>
              <p className="mt-1 text-sm text-muted">Elige un estudiante únicamente para inspeccionar y administrar sus días ya generados.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-action-soft px-4 text-sm font-extrabold text-action disabled:opacity-50" disabled={!dailyPlans?.length || busyKey !== null} onClick={() => void runAllDaysAction("restore")}><RefreshCcw className="size-4" /> Restaurar todos los días</button>
              <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-50 px-4 text-sm font-extrabold text-brand disabled:opacity-50" disabled={!dailyPlans?.length || busyKey !== null} onClick={() => void runAllDaysAction("delete")}><Trash2 className="size-4" /> Eliminar todas las sesiones</button>
            </div>
          </div>
          <section className="flex flex-col gap-4 rounded-[26px] border border-line bg-white p-5 sm:flex-row sm:items-end sm:justify-between">
            <label className="block w-full max-w-md space-y-2">
              <span className="text-sm font-bold text-ink-soft">Estudiante para ejecución y sesiones</span>
              <select
                className="field"
                value={executionStudentId}
                onChange={(event) => setExecutionStudentId(event.target.value)}
              >
                {students.length === 0 && <option value="">No hay estudiantes disponibles</option>}
                {students.map((student) => (
                  <option key={student.id} value={student.id}>{studentName(student)}</option>
                ))}
              </select>
            </label>
            <div className="flex max-w-xl items-center gap-2 text-sm font-semibold text-muted">
              <UserRound className="size-4 shrink-0 text-brand" /> Este selector no filtra los planes maestros; solo cambia la ejecución individual mostrada debajo.
            </div>
          </section>
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm" role="presentation" onMouseDown={closeStudyPlan}>
          <section className="mx-auto my-4 w-full max-w-6xl rounded-[30px] bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="study-plan-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand">Plan maestro</p><h2 id="study-plan-title" className="mt-1 text-2xl font-black text-ink">{draft.id ? "Editar plan maestro" : "Nuevo plan maestro"}</h2><p className="mt-2 text-sm text-muted">{draft.id ? "Actualiza la programación sin alterar la fotografía de audiencia original." : "Combina grupos y estudiantes directos, y configura la programación que compartirán."}</p></div>
              <button type="button" className="grid size-10 place-items-center rounded-full bg-canvas text-muted" onClick={closeStudyPlan} aria-label="Cerrar"><X className="size-5" /></button>
            </div>

            <form className="mt-7 space-y-7" onSubmit={saveStudyPlan}>
              <div className="grid gap-4 lg:grid-cols-3">
                <label className="block space-y-2 lg:col-span-2"><span className="text-sm font-bold text-ink-soft">Nombre del plan</span><input className="field" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} maxLength={120} placeholder="Ej. Animales · primer trimestre" required /></label>
                <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">Estado</span><select className="field" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as StudyPlanStatus })}><option value="draft">Borrador</option><option value="active">Activo</option><option value="paused">Pausado</option><option value="completed">Completado</option><option value="archived">Archivado</option></select></label>
                <label className="block space-y-2 lg:col-span-3"><span className="text-sm font-bold text-ink-soft">Descripción (opcional)</span><textarea className="field min-h-24 resize-y" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} maxLength={500} placeholder="Objetivo pedagógico, observaciones o indicaciones…" /></label>
                <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">Inicio del plan</span><input className="field" type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} required /></label>
                <label className="block space-y-2"><span className="text-sm font-bold text-ink-soft">Fin del plan</span><input className="field" type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} required /></label>
              </div>

              {draft.id ? (
                <AudienceSnapshotSummary draft={draft} studentsById={studentsById} />
              ) : (
                <AudiencePicker
                  query={audienceQuery}
                  results={audienceResults}
                  selectedItems={selectedAudienceItems}
                  resolvedStudentCount={selectedResolvedStudentIds.length}
                  loadedStudentCount={students?.length ?? 0}
                  selectedDirectStudentCount={draft.directStudentIds.length}
                  allStudentsSelected={Boolean(
                    students?.length &&
                      students.every((student) => draft.directStudentIds.includes(student.id)),
                  )}
                  isSearching={isAudienceSearching}
                  error={audienceError}
                  onQueryChange={changeAudienceQuery}
                  onToggle={toggleAudienceItem}
                  onSelectAllStudents={selectAllStudents}
                  onClearDirectStudents={clearDirectStudents}
                  isSelected={isAudienceSelected}
                />
              )}

              <div className="grid gap-4 rounded-[24px] bg-brand p-5 text-white md:grid-cols-4">
                <label className="block space-y-2"><span className="text-sm font-bold text-white/80">Sesiones por día</span><input className="field border-0" type="number" min={1} max={10} value={draft.sessionsPerDay} onChange={(event) => setDraft({ ...draft, sessionsPerDay: Number(event.target.value) })} required /><span className="text-xs text-white/70">Normal: 5 sesiones</span></label>
                <label className="block space-y-2"><span className="text-sm font-bold text-white/80">Milisegundos por tarjeta</span><input className="field border-0" type="number" min={200} max={10000} step={100} value={draft.displayMs} onChange={(event) => setDraft({ ...draft, displayMs: Number(event.target.value) })} required /><span className="text-xs text-white/70">{(draft.displayMs / 1000).toFixed(1)} segundos</span></label>
                <label className="block space-y-2"><span className="text-sm font-bold text-white/80">Audio</span><select className="field border-0" value={draft.audioMode} onChange={(event) => setDraft({ ...draft, audioMode: event.target.value as StudyPlan["audio_mode"] })}><option value="auto">Automático</option><option value="manual">Manual</option><option value="disabled">Desactivado</option></select></label>
                <label className="block space-y-2"><span className="text-sm font-bold text-white/80">Avance</span><select className="field border-0" value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.target.value as StudyPlan["mode"] })}><option value="auto">Automático</option><option value="manual">Manual</option></select></label>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4"><div><h3 className="text-xl font-black text-ink">Niveles del plan</h3><p className="mt-1 text-sm text-muted">Los rangos no pueden cruzarse. Cada categoría define una cantidad objetivo para toda la audiencia.</p></div><button type="button" className="inline-flex h-10 items-center gap-2 rounded-xl bg-action-soft px-4 text-sm font-extrabold text-action" onClick={addLevel}><Plus className="size-4" /> Añadir nivel</button></div>
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
                        <button type="button" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-action px-5 font-extrabold text-white disabled:opacity-50" onClick={() => addCategory(level)} disabled={!categoryToAdd[level.clientId]}><Plus className="size-4" /> Agregar</button>
                      </div>

                      {level.categories.length === 0 && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Agrega al menos una categoría y define cuántas tarjetas trabajará.</p>}
                      <div className="mt-4 space-y-4">
                        {level.categories.map((selectedCategory) => (
                          <div key={selectedCategory.categoryId} className="flex flex-col gap-4 rounded-2xl border border-line p-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                              <div className="min-w-0 flex-1">
                                <strong className="text-ink">{categoryNames.get(selectedCategory.categoryId) ?? "Categoría"}</strong>
                                {selectedCategory.legacyWordCardIds !== undefined ? (
                                  selectedCategory.mode === "legacy" ? (
                                    <div className="mt-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                                      <p>
                                        Compatibilidad legacy: al guardar se conservarán exactamente los {selectedCategory.legacyWordCardIds.length} IDs de tarjetas originales.
                                      </p>
                                      <button
                                        type="button"
                                        className="mt-2 inline-flex items-center gap-1.5 font-extrabold text-amber-950 underline decoration-2 underline-offset-2"
                                        onClick={() => setCategoryMode(level, selectedCategory.categoryId, "target")}
                                      >
                                        Usar cantidad objetivo
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="mt-2 rounded-xl bg-action-soft p-3 text-xs font-semibold text-action">
                                      <p>
                                        Migración pendiente: al guardar, esta categoría dejará de usar IDs fijos y elegirá {selectedCategory.targetCardsCount} tarjetas por estudiante.
                                      </p>
                                      <button
                                        type="button"
                                        className="mt-2 inline-flex items-center gap-1.5 font-extrabold underline decoration-2 underline-offset-2"
                                        onClick={() => setCategoryMode(level, selectedCategory.categoryId, "legacy")}
                                      >
                                        <RotateCcw className="size-3.5" /> Conservar tarjetas originales
                                      </button>
                                    </div>
                                  )
                                ) : (
                                  <>
                                    <p className="mt-1 text-xs font-semibold text-muted">
                                      {selectedCategory.mode === "words"
                                        ? "El motor resolverá exactamente estas palabras para cada estudiante al generar el día."
                                        : "El motor elegirá las tarjetas adecuadas para cada estudiante al generar el día."}
                                    </p>
                                    <div className="mt-2 inline-flex rounded-xl border border-line bg-canvas p-1 text-xs font-extrabold">
                                      <button
                                        type="button"
                                        className={`rounded-lg px-3 py-1.5 ${selectedCategory.mode === "target" ? "bg-white text-ink shadow-sm" : "text-muted"}`}
                                        onClick={() => setCategoryMode(level, selectedCategory.categoryId, "target")}
                                      >
                                        Cantidad objetivo
                                      </button>
                                      <button
                                        type="button"
                                        className={`rounded-lg px-3 py-1.5 ${selectedCategory.mode === "words" ? "bg-white text-ink shadow-sm" : "text-muted"}`}
                                        onClick={() => setCategoryMode(level, selectedCategory.categoryId, "words")}
                                      >
                                        Palabras explícitas
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                              <div className="flex items-end gap-2">
                                {selectedCategory.mode !== "words" && (
                                  <label className="block w-40 space-y-2">
                                    <span className="text-xs font-bold text-ink-soft">
                                      {selectedCategory.mode === "legacy" ? "Tarjetas actuales" : "Tarjetas objetivo"}
                                    </span>
                                    <input
                                      className="field"
                                      type="number"
                                      min={1}
                                      max={50}
                                      value={selectedCategory.targetCardsCount}
                                      disabled={selectedCategory.mode === "legacy"}
                                      onChange={(event) =>
                                        setCategoryTarget(
                                          level,
                                          selectedCategory.categoryId,
                                          Number(event.target.value),
                                        )
                                      }
                                      required={selectedCategory.mode === "target"}
                                    />
                                  </label>
                                )}
                                <button type="button" className="grid size-12 shrink-0 place-items-center rounded-xl bg-red-50 text-brand" onClick={() => removeCategory(level, selectedCategory.categoryId)} aria-label="Quitar categoría"><Trash2 className="size-4" /></button>
                              </div>
                            </div>
                            {selectedCategory.mode === "words" && selectedCategory.legacyWordCardIds === undefined && (
                              <div className="rounded-xl bg-canvas p-4">
                                <CategoryWordsEditor
                                  words={selectedCategory.words ?? []}
                                  onChange={(words) => setCategoryWords(level, selectedCategory.categoryId, words)}
                                />
                                <div className="mt-3">
                                  <button
                                    type="button"
                                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-action-soft px-3 text-xs font-extrabold text-action disabled:opacity-50"
                                    onClick={() => void previewCategoryWords(level, selectedCategory)}
                                    disabled={(selectedCategory.words ?? []).length === 0}
                                  >
                                    <Search className="size-3.5" /> Previsualizar tarjetas
                                  </button>
                                </div>
                                <CategoryWordsPreview
                                  state={previewByKey[`${level.clientId}:${selectedCategory.categoryId}`]}
                                  studentsById={studentsById}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {formError && <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700" role="alert">{formError}</p>}
              <div className="sticky bottom-0 flex justify-end gap-3 border-t border-line bg-white/95 pt-5 backdrop-blur"><button type="button" className="h-12 rounded-2xl px-5 font-bold text-muted" onClick={closeStudyPlan}>Cancelar</button><button className="inline-flex h-12 items-center gap-2 rounded-2xl bg-brand px-6 font-extrabold text-white disabled:opacity-60" disabled={isSavingPlan}><Save className="size-4" /> {isSavingPlan ? "Guardando…" : "Guardar plan"}</button></div>
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

type AudiencePickerProps = {
  query: string;
  results: AudienceSearchItem[];
  selectedItems: AudienceSearchItem[];
  resolvedStudentCount: number;
  loadedStudentCount: number;
  selectedDirectStudentCount: number;
  allStudentsSelected: boolean;
  isSearching: boolean;
  error: string | null;
  onQueryChange: (value: string) => void;
  onToggle: (item: AudienceSearchItem) => void;
  onSelectAllStudents: () => void;
  onClearDirectStudents: () => void;
  isSelected: (item: AudienceSearchItem) => boolean;
};

function AudiencePicker({
  query,
  results,
  selectedItems,
  resolvedStudentCount,
  loadedStudentCount,
  selectedDirectStudentCount,
  allStudentsSelected,
  isSearching,
  error,
  onQueryChange,
  onToggle,
  onSelectAllStudents,
  onClearDirectStudents,
  isSelected,
}: AudiencePickerProps) {
  return (
    <section className="rounded-[24px] border border-line bg-canvas p-5" aria-labelledby="audience-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 id="audience-title" className="text-xl font-black text-ink">Audiencia del plan</h3>
          <p className="mt-1 text-sm text-muted">Busca y combina grupos con estudiantes directos. Cada estudiante cuenta una sola vez.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-extrabold text-green-800" aria-live="polite">
          <Users className="size-4" /> {resolvedStudentCount}/{MAX_PLAN_AUDIENCE_STUDENTS} estudiantes únicos
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-action/20 bg-action-soft/50 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-action px-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onSelectAllStudents}
            disabled={loadedStudentCount === 0 || allStudentsSelected}
            aria-pressed={allStudentsSelected}
          >
            {allStudentsSelected ? <Check className="size-4" /> : <Users className="size-4" />}
            Seleccionar todos los estudiantes actuales
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{loadedStudentCount}</span>
          </button>
          {selectedDirectStudentCount > 0 && (
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-extrabold text-ink-soft shadow-sm"
              onClick={onClearDirectStudents}
            >
              <X className="size-4" /> Quitar estudiantes directos ({selectedDirectStudentCount})
            </button>
          )}
        </div>
        <p className="mt-2 text-xs font-semibold text-muted">
          Los grupos seleccionados se conservan al quitar estudiantes directos. El límite es de {MAX_PLAN_AUDIENCE_STUDENTS} estudiantes únicos entre todas las fuentes.
        </p>
      </div>

      <label className="relative mt-5 block">
        <span className="sr-only">Buscar estudiante o grupo</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
        <input
          className="field pl-12"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar por estudiante, correo o nombre de grupo…"
          autoComplete="off"
        />
      </label>

      {selectedItems.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted">Selección actual</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedItems.map((item) => (
              <button
                key={item.audience_key}
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-extrabold text-ink-soft shadow-sm"
                onClick={() => onToggle(item)}
                aria-label={`Quitar ${audienceItemLabel(item)}`}
              >
                {item.type === "group" ? <Users className="size-4 text-action" /> : <UserRound className="size-4 text-brand" />}
                <span className="max-w-56 truncate">{audienceItemLabel(item)}</span>
                <X className="size-3.5 text-muted" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Selecciona al menos un grupo o estudiante.</p>
      )}

      <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
        {isSearching && <p className="rounded-xl bg-white p-4 text-sm font-semibold text-muted">Buscando audiencia…</p>}
        {!isSearching && error && <p className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700" role="alert">{error}</p>}
        {!isSearching && !error && results.length === 0 && (
          <p className="rounded-xl bg-white p-4 text-sm font-semibold text-muted">No encontramos grupos ni estudiantes con esa búsqueda.</p>
        )}
        {!isSearching && !error && results.map((item) => {
          const selected = isSelected(item);
          return (
            <button
              key={item.audience_key}
              type="button"
              aria-pressed={selected}
              className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${selected ? "border-brand bg-brand-soft" : "border-line bg-white hover:border-action/40"}`}
              onClick={() => onToggle(item)}
            >
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${item.type === "group" ? "bg-action-soft text-action" : "bg-red-50 text-brand"}`}>
                {item.type === "group" ? <Users className="size-5" /> : <UserRound className="size-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm text-ink">{audienceItemLabel(item)}</strong>
                <span className="mt-0.5 block truncate text-xs font-semibold text-muted">{audienceItemMeta(item)}</span>
              </span>
              <span className={`grid size-7 shrink-0 place-items-center rounded-full border ${selected ? "border-brand bg-brand text-white" : "border-line bg-white text-transparent"}`}>
                <Check className="size-4" />
              </span>
            </button>
          );
        })}
      </div>
      {!isSearching && !error && results.length > 0 && (
        <p className="mt-3 text-xs font-semibold text-muted">Mostrando {results.length} coincidencias recibidas. Escribe para refinar la búsqueda.</p>
      )}
    </section>
  );
}

function AudienceSnapshotSummary({
  draft,
  studentsById,
}: {
  draft: StudyPlanDraft;
  studentsById: Map<string, Student>;
}) {
  const snapshotById = new Map(draft.audienceStudents.map((student) => [student.student_id, student]));
  const visibleStudents = draft.resolvedStudentIds.slice(0, 12);

  return (
    <section className="rounded-[24px] border border-action/20 bg-action-soft/50 p-5" aria-labelledby="audience-snapshot-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 id="audience-snapshot-title" className="text-xl font-black text-ink">Audiencia guardada</h3>
          <p className="mt-1 text-sm text-muted">Esta fotografía es inmutable. Crea otro plan si necesitas una audiencia diferente.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-extrabold text-action shadow-sm">
          <Users className="size-4" /> {draft.resolvedStudentIds.length} estudiantes
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <PlanFact icon={<Users className="size-4" />} label={`${draft.groupIds.length} grupos de origen`} />
        <PlanFact icon={<UserRound className="size-4" />} label={`${draft.directStudentIds.length} estudiantes directos`} />
        <PlanFact icon={<Check className="size-4" />} label={`${draft.resolvedStudentIds.length} únicos resueltos`} />
      </div>
      {visibleStudents.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {visibleStudents.map((studentId) => {
            const snapshot = snapshotById.get(studentId);
            const currentStudent = studentsById.get(studentId);
            const label = snapshot?.display_name || snapshot?.username || snapshot?.email ||
              (currentStudent ? studentName(currentStudent) : `Estudiante ${studentId.slice(-6)}`);
            return <span key={studentId} className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-ink-soft shadow-sm">{label}</span>;
          })}
          {draft.resolvedStudentIds.length > visibleStudents.length && (
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-muted shadow-sm">+{draft.resolvedStudentIds.length - visibleStudents.length} más</span>
          )}
        </div>
      )}
    </section>
  );
}

function PlanFact({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <span className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2 font-semibold text-ink-soft">{icon}{label}</span>;
}

function CategoryWordsEditor({
  words,
  onChange,
}: {
  words: string[];
  onChange: (words: string[]) => void;
}) {
  const [pendingWord, setPendingWord] = useState("");

  function commitPendingWord() {
    const candidates = pendingWord
      .split(",")
      .map((word) => word.trim())
      .filter(Boolean);
    if (candidates.length === 0) return;
    const next = [...words];
    for (const candidate of candidates) {
      if (next.length >= 50) break;
      if (!next.some((existing) => existing.toLowerCase() === candidate.toLowerCase())) {
        next.push(candidate);
      }
    }
    onChange(next);
    setPendingWord("");
  }

  return (
    <div className="space-y-2">
      <span className="text-xs font-bold text-ink-soft">Palabras seleccionadas ({words.length}/50)</span>
      <div className="flex flex-wrap gap-2">
        {words.length === 0 && <p className="text-xs font-semibold text-muted">Aún no hay palabras agregadas.</p>}
        {words.map((word) => (
          <span key={word} className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-extrabold text-brand">
            {word}
            <button
              type="button"
              onClick={() => onChange(words.filter((existing) => existing !== word))}
              aria-label={`Quitar palabra ${word}`}
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="field flex-1"
          value={pendingWord}
          onChange={(event) => setPendingWord(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              commitPendingWord();
            }
          }}
          placeholder="Escribe una palabra y presiona Enter o coma…"
          maxLength={60}
          disabled={words.length >= 50}
        />
        <button
          type="button"
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-action-soft px-3 text-sm font-extrabold text-action disabled:opacity-50"
          onClick={commitPendingWord}
          disabled={!pendingWord.trim() || words.length >= 50}
        >
          <Plus className="size-4" /> Agregar
        </button>
      </div>
    </div>
  );
}

function CategoryWordsPreview({
  state,
  studentsById,
}: {
  state: CategoryPreviewState | undefined;
  studentsById: Map<string, Student>;
}) {
  if (!state) return null;

  if (state.status === "loading") {
    return <p className="mt-3 rounded-xl bg-white p-3 text-xs font-semibold text-muted">Cargando previsualización…</p>;
  }

  if (state.status === "error") {
    return (
      <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700" role="alert">
        {state.error}
      </p>
    );
  }

  const students = state.students ?? [];
  return (
    <div className="mt-3 space-y-2 rounded-xl bg-white p-3">
      <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-muted">Previsualización por estudiante</p>
      {students.length === 0 && <p className="text-xs font-semibold text-muted">No hay estudiantes en la audiencia.</p>}
      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {students.map((item) => {
          const student = studentsById.get(item.student_id);
          const label = student ? studentName(student) : `Estudiante ${item.student_id.slice(-6)}`;
          return (
            <div key={item.student_id} className="rounded-lg border border-line p-2 text-xs">
              <strong className="text-ink">{label}</strong>
              <p className="mt-1 text-muted">
                {item.cards.length} tarjeta{item.cards.length === 1 ? "" : "s"} resuelta{item.cards.length === 1 ? "" : "s"}
                {item.cards.length > 0 ? `: ${item.cards.map((card) => card.word).join(", ")}` : "."}
              </p>
              {item.unresolved_words.length > 0 && (
                <p className="mt-1 font-bold text-amber-700">Sin resolver: {item.unresolved_words.join(", ")}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function studentAudienceLabel(item: StudentAudienceItem): string {
  return item.display_name || item.username || item.email;
}

function groupAudienceLabel(item: GroupAudienceItem): string {
  return item.name;
}

function audienceItemLabel(item: AudienceSearchItem): string {
  return item.type === "group" ? groupAudienceLabel(item) : studentAudienceLabel(item);
}

function audienceItemMeta(item: AudienceSearchItem): string {
  if (item.type === "group") {
    return `Grupo · ${item.student_ids.length} ${item.student_ids.length === 1 ? "estudiante" : "estudiantes"}`;
  }
  return item.unassigned ? `Estudiante sin grupo · ${item.email}` : `Estudiante · ${item.email}`;
}

function resolveAudienceStudentIds(items: AudienceSearchItem[]): string[] {
  return uniqueStrings(
    items.flatMap((item) => (item.type === "group" ? item.student_ids : [item.id])),
  );
}

function toStudentAudienceItem(student: Student): StudentAudienceItem {
  return {
    type: "student",
    audience_key: `student:${student.id}`,
    id: student.id,
    display_name: student.displayName ?? student.display_name,
    email: student.email,
    group_ids: [],
    unassigned: false,
  };
}

function studyPlanStudentIds(plan: StudyPlan): string[] {
  return uniqueStrings([
    ...(plan.student_ids ?? []),
    ...(plan.students ?? []).map((student) => student.student_id),
    ...(plan.student_id ? [plan.student_id] : []),
  ]);
}

function studyPlanDirectStudentIds(plan: StudyPlan): string[] {
  return uniqueStrings([
    ...(plan.direct_student_ids ?? []),
    ...(!plan.direct_student_ids?.length && plan.student_id ? [plan.student_id] : []),
  ]);
}

function categoryTargetCardsCount(category: StudyPlan["levels"][number]["categories"][number]): number {
  const configuredTarget = validTargetCardsCount(category.target_cards_count);
  if (configuredTarget !== undefined) return configuredTarget;
  return category.word_card_ids?.length || 5;
}

function validTargetCardsCount(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function categoryCardsPerStudent(category: LevelCategoryDraft): number {
  if (category.mode === "legacy") {
    return category.legacyWordCardIds?.length ?? category.targetCardsCount;
  }
  if (category.mode === "words") {
    return category.words?.length ?? 0;
  }
  return category.targetCardsCount;
}

function toStudyPlanCategoryPayload(category: LevelCategoryDraft) {
  if (category.mode === "legacy" && category.legacyWordCardIds !== undefined) {
    return {
      category_id: category.categoryId,
      word_card_ids: category.legacyWordCardIds,
    };
  }

  if (category.mode === "words") {
    return {
      category_id: category.categoryId,
      word_card_words: category.words ?? [],
    };
  }

  return {
    category_id: category.categoryId,
    target_cards_count: category.targetCardsCount,
  };
}

function normalizeGenerateDaySummary(
  response: GenerateStudyPlanDayResponse | DailyPlanSummary[],
): GenerateStudyPlanDayResponse["summary"] {
  if (!Array.isArray(response)) return response.summary;
  return {
    total: response.length,
    generated: response.length,
    existing: 0,
    failed: 0,
  };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function createClientId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function newLevel(index: number, startDate: string, endDate: string): LevelDraft {
  return { clientId: createClientId(), name: `Nivel ${index}`, startDate, endDate, categories: [] };
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
