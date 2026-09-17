"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Search, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui-kit";
import { apiFetch } from "@/lib/api-client";
import type { User } from "@/lib/types";

type UserRole = "student" | "teacher";

const initialForm = {
  displayName: "",
  username: "",
  email: "",
  password: "",
  role: "student" as UserRole,
};

const roleLabel: Record<string, string> = {
  student: "Estudiante",
  teacher: "Profesor",
  admin: "Administrador",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [form, setForm] = useState(initialForm);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setError(null);
    try {
      setUsers(await apiFetch<User[]>("users"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar los usuarios.");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadUsers);
  }, [loadUsers]);

  const visibleUsers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    if (!normalized) return users ?? [];
    return (users ?? []).filter((user) =>
      `${user.display_name ?? ""} ${user.username ?? ""} ${user.email} ${user.roles.join(" ")}`
        .toLocaleLowerCase("es")
        .includes(normalized),
    );
  }, [query, users]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setNotice(null);
    setError(null);
    try {
      const created = await apiFetch<User>("users", {
        method: "POST",
        body: JSON.stringify({
          display_name: form.displayName.trim() || undefined,
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          roles: [form.role],
          status: "active",
        }),
      });
      setForm(initialForm);
      setNotice(`${created.display_name ?? created.username ?? created.email} fue creado correctamente.`);
      await loadUsers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible crear el usuario.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Administración"
        title="Usuarios"
        description="Crea accesos para profesores y estudiantes. Cada persona puede ingresar con su usuario o correo."
      />

      {error && <ErrorState message={error} onRetry={loadUsers} />}
      {notice && (
        <p className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
          {notice}
        </p>
      )}

      <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <form
          onSubmit={createUser}
          className="h-fit rounded-[30px] bg-brand p-6 text-white shadow-[0_16px_45px_rgba(229,55,52,0.22)] sm:p-7"
        >
          <UserPlus className="size-8" />
          <h2 className="mt-5 text-2xl font-black">Crear usuario</h2>
          <p className="mt-2 text-sm leading-6 text-white/75">
            La contraseña se cifra de forma segura al guardar la cuenta.
          </p>
          <div className="mt-6 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-bold text-white/80">Tipo de usuario</span>
              <select
                className="field border-0"
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}
              >
                <option value="student">Estudiante</option>
                <option value="teacher">Profesor</option>
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-white/80">Nombre completo</span>
              <input
                className="field border-0"
                value={form.displayName}
                onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                placeholder="Ana García"
                autoComplete="name"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-white/80">Nombre de usuario</span>
              <input
                className="field border-0"
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                placeholder="ana.garcia"
                minLength={3}
                maxLength={30}
                pattern="[A-Za-z0-9._-]+"
                autoCapitalize="none"
                autoComplete="username"
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-white/80">Correo electrónico</span>
              <input
                className="field border-0"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="ana@colegio.edu"
                autoComplete="email"
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-white/80">Contraseña temporal</span>
              <input
                className="field border-0"
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                autoComplete="new-password"
                required
              />
            </label>
          </div>
          <button
            className="mt-6 inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-white font-extrabold text-brand transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={isSaving}
          >
            <UserPlus className="size-4" /> {isSaving ? "Creando…" : "Crear usuario"}
          </button>
        </form>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
            <input
              className="field pl-12"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, usuario o correo"
              aria-label="Buscar usuarios"
            />
          </div>

          {!users && !error && <LoadingState label="Cargando usuarios…" />}
          {users && visibleUsers.length === 0 && (
            <EmptyState title="No hay usuarios para mostrar" description="Crea la primera cuenta desde el formulario." />
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {visibleUsers.map((user) => {
              const primaryRole = user.roles[0] ?? "student";
              return (
                <article
                  key={user.id}
                  className="rounded-[26px] border border-line bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex items-start gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft font-black text-brand">
                      {(user.display_name ?? user.username ?? user.email).slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-extrabold text-ink">
                        {user.display_name ?? user.username ?? user.email}
                      </h3>
                      <p className="truncate text-sm font-semibold text-muted">@{user.username ?? "sin-usuario"}</p>
                      <p className="truncate text-sm text-muted">{user.email}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-action-soft px-3 py-1 text-xs font-extrabold text-action">
                      <ShieldCheck className="size-3.5" /> {roleLabel[primaryRole] ?? primaryRole}
                    </span>
                    <span className="text-xs font-bold text-muted">
                      {user.status === "disabled" ? "Deshabilitado" : user.status === "pending" ? "Pendiente" : "Activo"}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
          {users && users.length > 0 && (
            <p className="flex items-center gap-2 text-sm font-semibold text-muted">
              <UsersRound className="size-4 text-brand" /> {users.length} usuarios registrados
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
