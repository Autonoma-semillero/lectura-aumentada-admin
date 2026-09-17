"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Archive,
  Edit3,
  Plus,
  RotateCcw,
  Search,
  UserMinus,
  UserPlus,
  UsersRound,
} from "lucide-react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  PageHeader,
} from "@/components/ui-kit";
import { apiFetch } from "@/lib/api-client";
import type {
  Student,
  StudentGroup,
  User,
} from "@/lib/types";
import { studentName } from "@/lib/types";

type SessionProfile = {
  id: string;
  email: string;
  display_name?: string;
  roles: string[];
};

type GroupDraft = {
  id?: string;
  name: string;
  description: string;
  teacherId: string;
  initialStudentIds: string[];
};

type StatusFilter = "active" | "archived" | "all";

export default function GroupsPage() {
  const [groups, setGroups] = useState<StudentGroup[] | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [draft, setDraft] = useState<GroupDraft | null>(null);
  const [studentQuery, setStudentQuery] = useState("");
  const [memberGroupId, setMemberGroupId] = useState<string | null>(null);
  const [pendingMemberIds, setPendingMemberIds] = useState<string[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [busyGroupId, setBusyGroupId] = useState<string | null>(null);
  const [busyStudentId, setBusyStudentId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [nextGroups, nextStudents, nextProfile] = await Promise.all([
        apiFetch<StudentGroup[]>("groups"),
        apiFetch<Student[]>("docente/students"),
        getSessionProfile(),
      ]);

      setGroups(nextGroups);
      setStudents(nextStudents);
      setProfile(nextProfile);

      if (nextProfile.roles.includes("admin")) {
        const users = await apiFetch<User[]>("users");
        setTeachers(
          users.filter(
            (user) =>
              user.roles.includes("teacher") && user.status === "active",
          ),
        );
      } else {
        setTeachers([]);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible cargar los grupos.",
      );
    }
  }, []);

  const refreshGroups = useCallback(async () => {
    const nextGroups = await apiFetch<StudentGroup[]>("groups");
    setGroups(nextGroups);
    return nextGroups;
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const orphanStudents = useMemo(() => {
    const assignedStudentIds = new Set(
      (groups ?? [])
        .filter((group) => group.status === "active")
        .flatMap((group) => group.student_ids),
    );
    return students.filter((student) => !assignedStudentIds.has(student.id));
  }, [groups, students]);
  const orphanIds = useMemo(
    () => new Set(orphanStudents.map((student) => student.id)),
    [orphanStudents],
  );
  const studentById = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );
  const teacherById = useMemo(
    () => new Map(teachers.map((teacher) => [teacher.id, teacher])),
    [teachers],
  );
  const memberGroup = useMemo(
    () => groups?.find((group) => group.id === memberGroupId) ?? null,
    [groups, memberGroupId],
  );

  const visibleGroups = useMemo(() => {
    const normalizedQuery = normalize(query);
    return (groups ?? [])
      .filter(
        (group) => statusFilter === "all" || group.status === statusFilter,
      )
      .filter((group) => {
        if (!normalizedQuery) return true;
        const owner = teacherById.get(group.teacher_id);
        return normalize(
          `${group.name} ${group.description ?? ""} ${owner?.display_name ?? ""} ${owner?.email ?? ""}`,
        ).includes(normalizedQuery);
      })
      .sort((left, right) =>
        left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
      );
  }, [groups, query, statusFilter, teacherById]);

  const activeGroups = groups?.filter((group) => group.status === "active") ?? [];
  const totalMemberships = activeGroups.reduce(
    (total, group) => total + group.student_ids.length,
    0,
  );

  function openCreate() {
    const isAdmin = profile?.roles.includes("admin") ?? false;
    setDraft({
      name: "",
      description: "",
      teacherId: isAdmin ? (teachers[0]?.id ?? "") : (profile?.id ?? ""),
      initialStudentIds: [],
    });
    setStudentQuery("");
    setFormError(null);
  }

  function openEdit(group: StudentGroup) {
    setDraft({
      id: group.id,
      name: group.name,
      description: group.description ?? "",
      teacherId: group.teacher_id,
      initialStudentIds: [],
    });
    setFormError(null);
  }

  function openMembers(group: StudentGroup) {
    setMemberGroupId(group.id);
    setPendingMemberIds([]);
    setMemberQuery("");
    setMemberError(null);
  }

  async function saveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const isAdmin = profile?.roles.includes("admin") ?? false;
    if (!draft.id && isAdmin && !draft.teacherId) {
      setFormError("Selecciona el profesor responsable del grupo.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setActionError(null);
    setNotice(null);
    try {
      const payload = draft.id
        ? {
            name: draft.name.trim(),
            description: draft.description.trim(),
          }
        : {
            name: draft.name.trim(),
            description: draft.description.trim() || undefined,
            teacher_id: isAdmin ? draft.teacherId : undefined,
            student_ids: draft.initialStudentIds,
          };
      const saved = await apiFetch<StudentGroup>(
        draft.id ? `groups/${draft.id}` : "groups",
        {
          method: draft.id ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      setDraft(null);
      setNotice(
        draft.id
          ? `El grupo “${saved.name}” fue actualizado.`
          : `El grupo “${saved.name}” fue creado con ${saved.student_ids.length} estudiantes.`,
      );
      await refreshGroups();
    } catch (cause) {
      setFormError(
        cause instanceof Error
          ? cause.message
          : "No fue posible guardar el grupo.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function archiveGroup(group: StudentGroup) {
    const accepted = window.confirm(
      `¿Archivar “${group.name}”? Se quitarán sus ${group.student_ids.length} vínculos con estudiantes; los planes ya creados conservarán su audiencia.`,
    );
    if (!accepted) return;
    setBusyGroupId(group.id);
    setActionError(null);
    setNotice(null);
    try {
      await apiFetch<void>(`groups/${group.id}`, { method: "DELETE" });
      setNotice(`El grupo “${group.name}” fue archivado.`);
      await refreshGroups();
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "No fue posible archivar el grupo.",
      );
    } finally {
      setBusyGroupId(null);
    }
  }

  async function reactivateGroup(group: StudentGroup) {
    setBusyGroupId(group.id);
    setActionError(null);
    setNotice(null);
    try {
      await apiFetch<StudentGroup>(`groups/${group.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "active" }),
      });
      setNotice(
        `El grupo “${group.name}” fue reactivado. Puedes volver a añadir estudiantes.`,
      );
      await refreshGroups();
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "No fue posible reactivar el grupo.",
      );
    } finally {
      setBusyGroupId(null);
    }
  }

  async function addMembers() {
    if (!memberGroup || pendingMemberIds.length === 0) return;
    setIsAddingMembers(true);
    setMemberError(null);
    setNotice(null);
    try {
      await apiFetch<StudentGroup>(`groups/${memberGroup.id}/members`, {
        method: "POST",
        body: JSON.stringify({ student_ids: pendingMemberIds }),
      });
      const addedCount = pendingMemberIds.length;
      setPendingMemberIds([]);
      setMemberQuery("");
      setNotice(
        `${addedCount} ${addedCount === 1 ? "estudiante fue añadido" : "estudiantes fueron añadidos"} a “${memberGroup.name}”.`,
      );
      await refreshGroups();
    } catch (cause) {
      setMemberError(
        cause instanceof Error
          ? cause.message
          : "No fue posible añadir los estudiantes.",
      );
    } finally {
      setIsAddingMembers(false);
    }
  }

  async function removeMember(studentId: string) {
    if (!memberGroup) return;
    const student = studentById.get(studentId);
    const label = student ? studentName(student) : "este estudiante";
    if (
      !window.confirm(
        `¿Quitar a ${label} del grupo “${memberGroup.name}”?`,
      )
    ) {
      return;
    }
    setBusyStudentId(studentId);
    setMemberError(null);
    setNotice(null);
    try {
      await apiFetch<void>(
        `groups/${memberGroup.id}/members/${studentId}`,
        { method: "DELETE" },
      );
      setNotice(`${label} fue retirado de “${memberGroup.name}”.`);
      await refreshGroups();
    } catch (cause) {
      setMemberError(
        cause instanceof Error
          ? cause.message
          : "No fue posible quitar el estudiante.",
      );
    } finally {
      setBusyStudentId(null);
    }
  }

  function selectDraftStudents(studentIds: string[]) {
    setDraft((current) =>
      current
        ? {
            ...current,
            initialStudentIds: studentIds,
          }
        : current,
    );
  }

  function ownerLabel(teacherId: string): string {
    const teacher = teacherById.get(teacherId);
    if (teacher) return userName(teacher);
    if (profile?.id === teacherId) {
      return profile.display_name ?? profile.email;
    }
    return `Profesor ${teacherId.slice(-6)}`;
  }

  const memberCandidates = memberGroup
    ? students.filter(
        (student) => !memberGroup.student_ids.includes(student.id),
      )
    : [];
  const orphanBadgeLabel = profile?.roles.includes("admin")
    ? "Sin grupo"
    : "Fuera de tus grupos";

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Organización"
        title="Grupos"
        description="Crea grupos reutilizables, vincula estudiantes y úsalos como audiencia al preparar un plan maestro. Un estudiante puede estar sin grupo o pertenecer a varios."
        action={
          <button
            type="button"
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-brand px-5 font-extrabold text-white shadow-[0_10px_24px_rgba(229,55,52,0.2)] disabled:opacity-60"
            onClick={openCreate}
            disabled={!profile}
          >
            <Plus className="size-5" /> Nuevo grupo
          </button>
        }
      />

      {notice && (
        <p
          className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700"
          role="status"
          aria-live="polite"
        >
          {notice}
        </p>
      )}
      {actionError && (
        <p
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
          role="alert"
        >
          {actionError}
        </p>
      )}

      {!groups && !error && <LoadingState label="Cargando grupos…" />}
      {error && <ErrorState message={error} onRetry={load} />}

      {groups && (
        <>
          <section className="grid gap-4 sm:grid-cols-3" aria-label="Resumen de grupos">
            <SummaryCard label="Grupos activos" value={activeGroups.length} />
            <SummaryCard label="Vínculos activos" value={totalMemberships} />
            <SummaryCard
              label={
                profile?.roles.includes("admin")
                  ? "Estudiantes sin grupo"
                  : "Sin uno de tus grupos"
              }
              value={orphanStudents.length}
              accent
            />
          </section>

          <section className="rounded-[28px] border border-line bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.04)]">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="relative block">
                <span className="sr-only">Buscar grupos</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
                <input
                  className="field pl-12"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por grupo, descripción o profesor…"
                />
              </label>
              <label>
                <span className="sr-only">Filtrar grupos por estado</span>
                <select
                  className="field min-w-44"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as StatusFilter)
                  }
                >
                  <option value="active">Activos</option>
                  <option value="archived">Archivados</option>
                  <option value="all">Todos</option>
                </select>
              </label>
            </div>
          </section>

          {visibleGroups.length === 0 ? (
            <EmptyState
              title={query ? "No encontramos grupos" : "Aún no hay grupos"}
              description={
                query
                  ? "Prueba con otro término o cambia el filtro de estado."
                  : statusFilter === "archived"
                    ? "No hay grupos archivados."
                    : "Crea el primero y vincula sus estudiantes."
              }
            />
          ) : (
            <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {visibleGroups.map((group) => (
                <article
                  key={group.id}
                  className="rounded-[28px] border border-line bg-white p-6 shadow-[0_10px_35px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={`grid size-13 place-items-center rounded-[18px] ${
                        group.status === "active"
                          ? "bg-action-soft text-action"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <UsersRound className="size-6" />
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                        group.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {group.status === "active" ? "Activo" : "Archivado"}
                    </span>
                  </div>
                  <h2 className="mt-5 text-xl font-black text-ink">{group.name}</h2>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-muted">
                    {group.description || "Sin descripción."}
                  </p>
                  <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="font-semibold text-muted">Profesor</dt>
                      <dd className="truncate font-extrabold text-ink-soft">
                        {ownerLabel(group.teacher_id)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="font-semibold text-muted">Estudiantes</dt>
                      <dd className="font-extrabold text-ink-soft">
                        {group.student_ids.length}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 text-sm font-extrabold text-ink-soft"
                      onClick={() => openEdit(group)}
                    >
                      <Edit3 className="size-4" /> Editar
                    </button>
                    {group.status === "active" ? (
                      <button
                        type="button"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-action-soft px-3 text-sm font-extrabold text-action"
                        onClick={() => openMembers(group)}
                      >
                        <UserPlus className="size-4" /> Miembros
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-action-soft px-3 text-sm font-extrabold text-action disabled:opacity-60"
                        onClick={() => void reactivateGroup(group)}
                        disabled={busyGroupId === group.id}
                      >
                        <RotateCcw className="size-4" /> Reactivar
                      </button>
                    )}
                  </div>
                  {group.status === "active" && (
                    <button
                      type="button"
                      className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-3 text-sm font-extrabold text-brand disabled:opacity-60"
                      onClick={() => void archiveGroup(group)}
                      disabled={busyGroupId === group.id}
                    >
                      <Archive className="size-4" />
                      {busyGroupId === group.id ? "Archivando…" : "Archivar grupo"}
                    </button>
                  )}
                </article>
              ))}
            </section>
          )}

          <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-amber-700">
                  Estudiantes huérfanos
                </p>
                <h2 className="mt-1 text-xl font-black text-amber-950">
                  {profile?.roles.includes("admin")
                    ? "Sin grupo asignado"
                    : "Sin uno de tus grupos"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-amber-900/75">
                  Pueden permanecer así o vincularse desde “Nuevo grupo” o “Miembros”.
                </p>
              </div>
              <span className="w-fit rounded-full bg-white px-3 py-1 text-sm font-extrabold text-amber-800">
                {orphanStudents.length} visibles
              </span>
            </div>
            {orphanStudents.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-white/75 p-4 text-sm font-bold text-amber-900">
                Todos los estudiantes visibles pertenecen al menos a un grupo.
              </p>
            ) : (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {orphanStudents.slice(0, 12).map((student) => (
                  <li
                    key={student.id}
                    className="min-w-0 rounded-2xl bg-white px-4 py-3"
                  >
                    <strong className="block truncate text-sm text-ink">
                      {studentName(student)}
                    </strong>
                    <span className="block truncate text-xs font-semibold text-muted">
                      {student.email}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {orphanStudents.length > 12 && (
              <p className="mt-3 text-xs font-bold text-amber-800">
                Y {orphanStudents.length - 12} estudiantes más.
              </p>
            )}
          </section>
        </>
      )}

      {draft && (
        <Modal
          title={draft.id ? "Editar grupo" : "Nuevo grupo"}
          onClose={() => setDraft(null)}
        >
          <form className="space-y-5" onSubmit={saveGroup}>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-ink-soft">Nombre</span>
              <input
                className="field"
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
                maxLength={100}
                placeholder="Ej. Lectores iniciales"
                autoFocus
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-ink-soft">Descripción</span>
              <textarea
                className="field min-h-24 resize-y"
                value={draft.description}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
                maxLength={500}
                placeholder="Objetivo o nivel del grupo (opcional)"
              />
            </label>

            {!draft.id && profile?.roles.includes("admin") && (
              <label className="block space-y-2">
                <span className="text-sm font-bold text-ink-soft">
                  Profesor responsable
                </span>
                <select
                  className="field"
                  value={draft.teacherId}
                  onChange={(event) =>
                    setDraft({ ...draft, teacherId: event.target.value })
                  }
                  required
                >
                  <option value="">Selecciona un profesor</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {userName(teacher)}
                    </option>
                  ))}
                </select>
                {teachers.length === 0 && (
                  <span className="block text-xs font-semibold text-brand">
                    Crea primero un usuario con rol profesor.
                  </span>
                )}
              </label>
            )}

            {!draft.id && (
              <StudentPicker
                title="Estudiantes iniciales"
                description="Opcional. También podrás añadir o quitar miembros después."
                students={students}
                orphanIds={orphanIds}
                orphanBadgeLabel={orphanBadgeLabel}
                selectedIds={draft.initialStudentIds}
                query={studentQuery}
                onQueryChange={setStudentQuery}
                onSelectionChange={selectDraftStudents}
              />
            )}

            {draft.id && (
              <p className="rounded-2xl bg-action-soft p-4 text-sm font-semibold leading-6 text-action">
                Para cambiar los estudiantes usa el botón “Miembros” de la tarjeta del grupo.
              </p>
            )}
            {formError && (
              <p
                className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700"
                role="alert"
              >
                {formError}
              </p>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                className="h-12 rounded-2xl px-5 font-bold text-muted"
                onClick={() => setDraft(null)}
              >
                Cancelar
              </button>
              <button
                className="h-12 rounded-2xl bg-brand px-6 font-extrabold text-white disabled:opacity-60"
                disabled={
                  isSaving ||
                  (!draft.id &&
                    Boolean(profile?.roles.includes("admin")) &&
                    !draft.teacherId)
                }
              >
                {isSaving ? "Guardando…" : "Guardar grupo"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {memberGroup && (
        <Modal
          title={`Miembros de ${memberGroup.name}`}
          onClose={() => setMemberGroupId(null)}
        >
          <div className="space-y-6">
            <section aria-labelledby="current-members-title">
              <div className="flex items-center justify-between gap-3">
                <h3 id="current-members-title" className="font-black text-ink">
                  Miembros actuales
                </h3>
                <span className="rounded-full bg-canvas px-3 py-1 text-xs font-extrabold text-muted">
                  {memberGroup.student_ids.length}
                </span>
              </div>
              {memberGroup.student_ids.length === 0 ? (
                <p className="mt-3 rounded-2xl bg-canvas p-4 text-sm font-semibold text-muted">
                  Este grupo todavía no tiene estudiantes.
                </p>
              ) : (
                <ul className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                  {memberGroup.student_ids.map((studentId) => {
                    const student = studentById.get(studentId);
                    return (
                      <li
                        key={studentId}
                        className="flex items-center gap-3 rounded-2xl border border-line p-3"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-black text-brand">
                          {(student ? studentName(student) : "E")
                            .slice(0, 1)
                            .toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-sm text-ink">
                            {student
                              ? studentName(student)
                              : `Estudiante ${studentId.slice(-6)}`}
                          </strong>
                          {student && (
                            <span className="block truncate text-xs text-muted">
                              {student.email}
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          className="grid size-9 shrink-0 place-items-center rounded-xl bg-red-50 text-brand disabled:opacity-60"
                          onClick={() => void removeMember(studentId)}
                          disabled={busyStudentId === studentId}
                          aria-label={`Quitar a ${student ? studentName(student) : "estudiante"}`}
                        >
                          <UserMinus className="size-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <StudentPicker
              title="Añadir estudiantes"
              description="Puedes añadir estudiantes huérfanos o que ya pertenezcan a otros grupos."
              students={memberCandidates}
              orphanIds={orphanIds}
              orphanBadgeLabel={orphanBadgeLabel}
              selectedIds={pendingMemberIds}
              query={memberQuery}
              onQueryChange={setMemberQuery}
              onSelectionChange={setPendingMemberIds}
            />

            {memberError && (
              <p
                className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700"
                role="alert"
              >
                {memberError}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="h-12 rounded-2xl px-5 font-bold text-muted"
                onClick={() => setMemberGroupId(null)}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-brand px-6 font-extrabold text-white disabled:opacity-60"
                onClick={() => void addMembers()}
                disabled={isAddingMembers || pendingMemberIds.length === 0}
              >
                <UserPlus className="size-4" />
                {isAddingMembers
                  ? "Añadiendo…"
                  : `Añadir ${pendingMemberIds.length || ""}`.trim()}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StudentPicker({
  title,
  description,
  students,
  orphanIds,
  orphanBadgeLabel,
  selectedIds,
  query,
  onQueryChange,
  onSelectionChange,
}: {
  title: string;
  description: string;
  students: Student[];
  orphanIds: Set<string>;
  orphanBadgeLabel: string;
  selectedIds: string[];
  query: string;
  onQueryChange: (value: string) => void;
  onSelectionChange: (studentIds: string[]) => void;
}) {
  const visibleStudents = useMemo(() => {
    const normalizedQuery = normalize(query);
    return students
      .filter((student) =>
        normalize(`${studentName(student)} ${student.email}`).includes(
          normalizedQuery,
        ),
      )
      .sort((left, right) => {
        const orphanOrder =
          Number(orphanIds.has(right.id)) - Number(orphanIds.has(left.id));
        return (
          orphanOrder ||
          studentName(left).localeCompare(studentName(right), "es", {
            sensitivity: "base",
          })
        );
      });
  }, [students, orphanIds, query]);

  const shownStudents = visibleStudents.slice(0, 80);
  const selectedIdSet = new Set(selectedIds);
  const allVisibleSelected =
    visibleStudents.length > 0 &&
    visibleStudents.every((student) => selectedIdSet.has(student.id));
  const unselectedVisibleCount = visibleStudents.filter(
    (student) => !selectedIdSet.has(student.id),
  ).length;
  const selectionWouldTruncate =
    selectedIds.length + unselectedVisibleCount > 500;

  function toggleStudent(studentId: string) {
    const isSelected = selectedIdSet.has(studentId);
    if (!isSelected && selectedIds.length >= 500) return;
    onSelectionChange(toggleId(selectedIds, studentId));
  }

  function toggleVisibleStudents() {
    const visibleIds = new Set(visibleStudents.map((student) => student.id));
    if (allVisibleSelected) {
      onSelectionChange(selectedIds.filter((id) => !visibleIds.has(id)));
      return;
    }
    const nextIds = [...selectedIds];
    for (const student of visibleStudents) {
      if (!nextIds.includes(student.id) && nextIds.length < 500) {
        nextIds.push(student.id);
      }
    }
    onSelectionChange(nextIds);
  }

  return (
    <section className="rounded-[22px] border border-line bg-canvas p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-ink">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-muted">
            {selectedIds.length}/500 seleccionados
          </span>
          <button
            type="button"
            className="text-xs font-extrabold text-action disabled:opacity-50"
            onClick={toggleVisibleStudents}
            disabled={visibleStudents.length === 0}
          >
            {allVisibleSelected
              ? "Quitar resultados"
              : selectionWouldTruncate
                ? "Seleccionar hasta 500"
                : "Seleccionar resultados"}
          </button>
        </div>
      </div>
      <label className="relative mt-4 block">
        <span className="sr-only">Buscar estudiantes</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          className="field h-11 pl-10"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar por nombre o correo…"
        />
      </label>
      {shownStudents.length === 0 ? (
        <p className="mt-3 rounded-xl bg-white p-3 text-sm font-semibold text-muted">
          No hay estudiantes disponibles con esa búsqueda.
        </p>
      ) : (
        <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
          {shownStudents.map((student) => {
            const selected = selectedIdSet.has(student.id);
            const selectionLimitReached = !selected && selectedIds.length >= 500;
            return (
              <label
                key={student.id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                  selected
                    ? "border-brand bg-brand-soft"
                    : "border-line bg-white hover:border-action/40"
                } ${selectionLimitReached ? "cursor-not-allowed opacity-55" : "cursor-pointer"}`}
              >
                <input
                  className="size-4 accent-[var(--color-brand)]"
                  type="checkbox"
                  checked={selected}
                  disabled={selectionLimitReached}
                  onChange={() => toggleStudent(student.id)}
                />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm text-ink">
                    {studentName(student)}
                  </strong>
                  <span className="block truncate text-xs text-muted">
                    {student.email}
                  </span>
                </span>
                {orphanIds.has(student.id) && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[0.68rem] font-extrabold text-amber-800">
                    {orphanBadgeLabel}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}
      {visibleStudents.length > shownStudents.length && (
        <p className="mt-2 text-xs font-semibold text-muted">
          Refina la búsqueda para ver los {visibleStudents.length} resultados.
        </p>
      )}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <article
      className={`rounded-[24px] border p-5 ${
        accent
          ? "border-amber-200 bg-amber-50"
          : "border-line bg-white shadow-[0_8px_28px_rgba(15,23,42,0.04)]"
      }`}
    >
      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-ink">{value}</p>
    </article>
  );
}

async function getSessionProfile(): Promise<SessionProfile> {
  const response = await fetch("/api/auth/session", { cache: "no-store" });
  const payload = (await response.json()) as {
    user?: SessionProfile;
    message?: string;
  };
  if (!response.ok || !payload.user) {
    throw new Error(payload.message ?? "Tu sesión no es válida.");
  }
  return payload.user;
}

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

function userName(user: User): string {
  return user.display_name ?? user.username ?? user.email;
}
