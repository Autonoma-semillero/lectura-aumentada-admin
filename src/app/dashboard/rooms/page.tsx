"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleStop,
  Clock3,
  FastForward,
  Glasses,
  LayoutPanelTop,
  LoaderCircle,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Repeat2,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui-kit";
import { apiFetch } from "@/lib/api-client";
import type {
  Category,
  LiveDomanCard,
  LiveDomanRepertoire,
  LiveDomanSession,
  StudentGroup,
} from "@/lib/types";

const ACTIVE_STATUSES = new Set(["lobby", "running", "paused"]);

type RoomSetup = {
  groups: StudentGroup[];
  categories: Category[];
  cards: LiveDomanCard[];
  rooms: LiveDomanSession[];
};

export default function RoomsPage() {
  const [data, setData] = useState<RoomSetup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [pacing, setPacing] = useState<"teacher_controlled" | "timed">("teacher_controlled");
  const [displayMs, setDisplayMs] = useState(3000);
  const [experienceMode, setExperienceMode] = useState<"standard" | "vr">("standard");
  const [isCreating, setIsCreating] = useState(false);
  const [busyRoomId, setBusyRoomId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [groups, categories, cards, rooms] = await Promise.all([
        apiFetch<StudentGroup[]>("groups"),
        apiFetch<Category[]>("categories"),
        apiFetch<LiveDomanCard[]>("doman/cards"),
        apiFetch<LiveDomanSession[]>("doman/live-sessions"),
      ]);
      const activeGroups = groups.filter((group) => group.status === "active");
      const activeCategories = categories.filter((category) =>
        cards.some((card) => card.status === "active" && card.category_id === category.id),
      );
      setData({ groups, categories, cards, rooms });
      setGroupId((current) =>
        activeGroups.some((group) => group.id === current) ? current : (activeGroups[0]?.id ?? ""),
      );
      setCategoryId((current) =>
        activeCategories.some((category) => category.id === current)
          ? current
          : (activeCategories[0]?.id ?? ""),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar las salas.");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const activeGroups = useMemo(
    () => (data?.groups ?? []).filter((group) => group.status === "active"),
    [data],
  );
  const availableCards = useMemo(
    () =>
      (data?.cards ?? [])
        .filter((card) => card.status === "active" && card.category_id === categoryId)
        .sort((left, right) => cardLabel(left).localeCompare(cardLabel(right), "es")),
    [categoryId, data],
  );
  const cardById = useMemo(
    () => new Map((data?.cards ?? []).map((card) => [card.id, card])),
    [data],
  );
  const activeRooms = useMemo(
    () => (data?.rooms ?? []).filter((room) => ACTIVE_STATUSES.has(room.status)),
    [data],
  );
  const recentRooms = useMemo(
    () => (data?.rooms ?? []).filter((room) => !ACTIVE_STATUSES.has(room.status)).slice(0, 8),
    [data],
  );

  function chooseCategory(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
    setSelectedCardIds([]);
    setActionError(null);
  }

  function toggleCard(cardId: string) {
    setActionError(null);
    setSelectedCardIds((current) => {
      if (current.includes(cardId)) return current.filter((id) => id !== cardId);
      if (current.length >= 10) {
        setActionError("Puedes seleccionar máximo 10 tarjetas por sala.");
        return current;
      }
      return [...current, cardId];
    });
  }

  function moveCard(cardId: string, direction: -1 | 1) {
    setSelectedCardIds((current) => {
      const index = current.indexOf(cardId);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= current.length) return current;
      const next = [...current];
      const [card] = next.splice(index, 1);
      next.splice(destination, 0, card);
      return next;
    });
  }

  async function createAndStartRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groupId || !categoryId || selectedCardIds.length === 0) {
      setActionError("Selecciona un grupo, una temática y al menos una tarjeta.");
      return;
    }
    const group = activeGroups.find((item) => item.id === groupId);
    if (!group?.student_ids.length) {
      setActionError("El grupo debe tener al menos un estudiante antes de iniciar la sala.");
      return;
    }

    setIsCreating(true);
    setActionError(null);
    setNotice(null);
    try {
      const category = data?.categories.find((item) => item.id === categoryId);
      const repertoire = await apiFetch<LiveDomanRepertoire>("doman/repertoires", {
        method: "POST",
        body: JSON.stringify({
          name: `Sala ${category?.name ?? "Tarjetas"} - ${new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" }).format(new Date())}`,
          category_id: categoryId,
          stage: "single_words",
          card_ids: selectedCardIds,
          default_pacing: pacing,
          default_display_ms: pacing === "timed" ? displayMs : 3000,
          audio_policy: "optional_recording",
        }),
      });
      const room = await apiFetch<LiveDomanSession>("doman/live-sessions", {
        method: "POST",
        body: JSON.stringify({
          group_id: groupId,
          repertoire_id: repertoire.id,
          pacing,
          display_ms: pacing === "timed" ? displayMs : 3000,
          experience_mode: experienceMode,
        }),
      });
      await apiFetch<LiveDomanSession>(`doman/live-sessions/${room.id}/commands`, {
        method: "POST",
        body: JSON.stringify({
          action: "start",
          expected_sequence: room.presentation_sequence,
          command_id: crypto.randomUUID(),
        }),
      });
      setNotice(`La sala de “${group.name}” comenzó con ${selectedCardIds.length} tarjetas.`);
      setSelectedCardIds([]);
      setShowSetup(false);
      await load();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "No fue posible iniciar la sala.");
      await load();
    } finally {
      setIsCreating(false);
    }
  }

  async function sendCommand(room: LiveDomanSession, action: "start" | "next" | "repeat" | "pause" | "resume" | "end") {
    setBusyRoomId(room.id);
    setActionError(null);
    setNotice(null);
    try {
      await apiFetch<LiveDomanSession>(`doman/live-sessions/${room.id}/commands`, {
        method: "POST",
        body: JSON.stringify({
          action,
          expected_sequence: room.presentation_sequence,
          command_id: crypto.randomUUID(),
        }),
      });
      setNotice(commandNotice(action, room.group_snapshot?.name));
      await load();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "No fue posible controlar la sala.");
      await load();
    } finally {
      setBusyRoomId(null);
    }
  }

  if (!data && !error) return <LoadingState label="Preparando las salas…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Salas en vivo"
        description="Prepara una secuencia de tarjetas, inicia la clase y controla lo que ven tus estudiantes desde este panel."
        action={
          <button
            type="button"
            onClick={() => {
              setShowSetup((current) => !current);
              setActionError(null);
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand px-5 font-extrabold text-white shadow-[0_10px_24px_rgba(229,55,52,0.2)] transition hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {showSetup ? <X className="size-5" /> : <Plus className="size-5" />}
            {showSetup ? "Cerrar preparación" : "Nueva sala"}
          </button>
        }
      />

      {(notice || actionError) && (
        <div
          aria-live="polite"
          className={`rounded-2xl px-5 py-4 text-sm font-bold ${actionError ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}
        >
          {actionError ?? notice}
        </div>
      )}

      {showSetup && (
        <form onSubmit={createAndStartRoom} className="rounded-[28px] border border-line bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)] sm:p-7">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-ink">Preparar una sala</h2>
              <p className="mt-1 text-sm text-muted">El orden elegido será el orden de presentación.</p>
            </div>
            <span className="text-sm font-extrabold text-brand">{selectedCardIds.length}/10 tarjetas</span>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-5">
              <Field label="Grupo">
                <select value={groupId} onChange={(event) => setGroupId(event.target.value)} required className={inputClass}>
                  <option value="">Selecciona un grupo</option>
                  {activeGroups.map((group) => (
                    <option key={group.id} value={group.id} disabled={group.student_ids.length === 0}>
                      {group.name} · {group.student_ids.length} estudiantes
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Temática">
                <select value={categoryId} onChange={(event) => chooseCategory(event.target.value)} required className={inputClass}>
                  <option value="">Selecciona una temática</option>
                  {data.categories.map((category) => (
                    <option key={category.id} value={category.id} disabled={!data.cards.some((card) => card.status === "active" && card.category_id === category.id)}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>

              <fieldset>
                <legend className="mb-2 text-sm font-extrabold text-ink">Ritmo de presentación</legend>
                <div className="grid grid-cols-2 gap-2">
                  <ChoiceButton selected={pacing === "teacher_controlled"} onClick={() => setPacing("teacher_controlled")} icon={Play} label="Manual" />
                  <ChoiceButton selected={pacing === "timed"} onClick={() => setPacing("timed")} icon={Clock3} label="Automático" />
                </div>
              </fieldset>

              {pacing === "timed" && (
                <Field label={`Tiempo por tarjeta: ${displayMs / 1000} s`}>
                  <input type="range" min={1000} max={10000} step={500} value={displayMs} onChange={(event) => setDisplayMs(Number(event.target.value))} className="w-full accent-brand" />
                </Field>
              )}

              <fieldset>
                <legend className="mb-2 text-sm font-extrabold text-ink">Experiencia del estudiante</legend>
                <div className="grid grid-cols-2 gap-2">
                  <ChoiceButton selected={experienceMode === "standard"} onClick={() => setExperienceMode("standard")} icon={LayoutPanelTop} label="Tarjetas" />
                  <ChoiceButton selected={experienceMode === "vr"} onClick={() => setExperienceMode("vr")} icon={Glasses} label="VR" />
                </div>
                <p className="mt-2 text-sm leading-5 text-muted">
                  {experienceMode === "vr"
                    ? "Abre la cámara y presenta cada palabra en la experiencia inmersiva del dispositivo."
                    : "Muestra cada palabra como una tarjeta clara, sin solicitar acceso a la cámara."}
                </p>
              </fieldset>

              <button
                type="submit"
                disabled={isCreating || !groupId || !categoryId || selectedCardIds.length === 0}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 font-extrabold text-white transition hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? <LoaderCircle className="size-5 animate-spin" /> : <Play className="size-5 fill-current" />}
                {isCreating ? "Iniciando sala…" : "Crear e iniciar sala"}
              </button>
            </div>

            <div className="grid min-h-[25rem] gap-4 lg:grid-cols-2">
              <section className="rounded-2xl bg-canvas p-4" aria-labelledby="available-cards-title">
                <h3 id="available-cards-title" className="font-extrabold text-ink">Tarjetas disponibles</h3>
                <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                  {availableCards.map((card) => {
                    const selected = selectedCardIds.includes(card.id);
                    return (
                      <button key={card.id} type="button" onClick={() => toggleCard(card.id)} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-brand ${selected ? "bg-brand text-white" : "bg-white text-ink hover:bg-brand-soft"}`}>
                        <span>{cardLabel(card)}</span>
                        {selected ? <Check className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
                      </button>
                    );
                  })}
                  {availableCards.length === 0 && <p className="py-8 text-center text-sm text-muted">Esta temática todavía no tiene tarjetas activas.</p>}
                </div>
              </section>

              <section className="rounded-2xl border border-line p-4" aria-labelledby="selected-cards-title">
                <h3 id="selected-cards-title" className="font-extrabold text-ink">Orden de presentación</h3>
                <ol className="mt-3 space-y-2">
                  {selectedCardIds.map((cardId, index) => (
                    <li key={cardId} className="flex items-center gap-2 rounded-xl bg-canvas p-2">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-xs font-black text-brand">{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{cardLabel(cardById.get(cardId))}</span>
                      <OrderButton label="Subir" disabled={index === 0} onClick={() => moveCard(cardId, -1)} icon={ArrowUp} />
                      <OrderButton label="Bajar" disabled={index === selectedCardIds.length - 1} onClick={() => moveCard(cardId, 1)} icon={ArrowDown} />
                      <OrderButton label="Quitar" onClick={() => toggleCard(cardId)} icon={Trash2} danger />
                    </li>
                  ))}
                </ol>
                {selectedCardIds.length === 0 && <p className="py-10 text-center text-sm text-muted">Selecciona las palabras que quieres presentar.</p>}
              </section>
            </div>
          </div>
        </form>
      )}

      <section aria-labelledby="active-rooms-title">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 id="active-rooms-title" className="text-xl font-black text-ink">Salas activas</h2>
            <p className="mt-1 text-sm text-muted">Controla la presentación sin salir del dashboard.</p>
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-extrabold text-muted transition hover:bg-white hover:text-brand" aria-label="Actualizar salas">
            <RefreshCw className="size-4" /> Actualizar
          </button>
        </div>
        {activeRooms.length === 0 ? (
          <EmptyState title="No hay una sala activa" description="Crea una sala para comenzar una clase con tu grupo." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {activeRooms.map((room) => <RoomCard key={room.id} room={room} busy={busyRoomId === room.id} onCommand={sendCommand} />)}
          </div>
        )}
      </section>

      {recentRooms.length > 0 && (
        <section aria-labelledby="recent-rooms-title">
          <h2 id="recent-rooms-title" className="mb-4 text-xl font-black text-ink">Salas recientes</h2>
          <div className="overflow-hidden rounded-[24px] border border-line bg-white">
            {recentRooms.map((room) => (
              <div key={room.id} className="flex flex-col gap-2 border-b border-line px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-extrabold text-ink">{room.group_snapshot?.name ?? "Grupo"}</p>
                  <p className="text-sm text-muted">{room.repertoire_snapshot?.name ?? "Secuencia de tarjetas"}</p>
                </div>
                <StatusPill status={room.status} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RoomCard({ room, busy, onCommand }: { room: LiveDomanSession; busy: boolean; onCommand: (room: LiveDomanSession, action: "start" | "next" | "repeat" | "pause" | "resume" | "end") => void }) {
  const cards = room.repertoire_snapshot?.cards ?? [];
  const currentCard = room.active_card_index === null ? null : cards[room.active_card_index];
  const isLastCard = room.active_card_index !== null && room.active_card_index >= cards.length - 1;
  return (
    <article className="rounded-[26px] border border-line bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.05)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <StatusPill status={room.status} />
            <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 text-xs font-extrabold text-muted">
              {room.experience_mode === "vr" ? <Glasses className="size-3.5" /> : <LayoutPanelTop className="size-3.5" />}
              {room.experience_mode === "vr" ? "VR" : "Tarjetas"}
            </span>
            <span className="text-xs font-bold text-muted">Secuencia {room.presentation_sequence}</span>
          </div>
          <h3 className="mt-3 text-xl font-black text-ink">{room.group_snapshot?.name ?? "Grupo"}</h3>
          <p className="mt-1 text-sm text-muted">{room.repertoire_snapshot?.name ?? "Secuencia de tarjetas"}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-xl bg-canvas px-3 py-2 text-xs font-extrabold text-muted">
          <UsersRound className="size-4" /> {room.group_snapshot?.student_ids?.length ?? 0}
        </span>
      </div>

      <div className="my-5 rounded-2xl bg-canvas px-5 py-6 text-center">
        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted">Tarjeta actual</p>
        <p className="mt-2 text-3xl font-black tracking-[-0.03em] text-ink">{currentCard?.display_text ?? (room.status === "lobby" ? "Lista para comenzar" : "Sin tarjeta")}</p>
        {cards.length > 0 && <p className="mt-2 text-sm font-semibold text-muted">{room.active_card_index === null ? 0 : room.active_card_index + 1} de {cards.length}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        {room.status === "lobby" && <ControlButton label="Iniciar" icon={Play} disabled={busy} onClick={() => onCommand(room, "start")} primary />}
        {room.status === "running" && (
          <>
            <ControlButton label="Repetir" icon={Repeat2} disabled={busy} onClick={() => onCommand(room, "repeat")} />
            <ControlButton label="Pausar" icon={Pause} disabled={busy} onClick={() => onCommand(room, "pause")} />
            <ControlButton label="Siguiente" icon={FastForward} disabled={busy || isLastCard} onClick={() => onCommand(room, "next")} primary />
          </>
        )}
        {room.status === "paused" && <ControlButton label="Continuar" icon={Play} disabled={busy} onClick={() => onCommand(room, "resume")} primary />}
        <ControlButton label="Finalizar" icon={CircleStop} disabled={busy} onClick={() => onCommand(room, "end")} danger />
        {busy && <span className="inline-flex items-center gap-2 px-2 text-sm font-bold text-muted"><LoaderCircle className="size-4 animate-spin" /> Actualizando…</span>}
      </div>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-extrabold text-ink">{label}</span>{children}</label>;
}

function ChoiceButton({ selected, onClick, icon: Icon, label }: { selected: boolean; onClick: () => void; icon: typeof Play; label: string }) {
  return <button type="button" onClick={onClick} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-extrabold transition focus-visible:outline-2 focus-visible:outline-brand ${selected ? "bg-brand text-white" : "bg-canvas text-muted hover:text-brand"}`}><Icon className="size-4" />{label}</button>;
}

function OrderButton({ label, disabled, onClick, icon: Icon, danger = false }: { label: string; disabled?: boolean; onClick: () => void; icon: typeof ArrowUp; danger?: boolean }) {
  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={`grid size-8 shrink-0 place-items-center rounded-lg transition disabled:opacity-25 ${danger ? "text-red-600 hover:bg-red-50" : "text-muted hover:bg-white hover:text-brand"}`}><Icon className="size-4" /></button>;
}

function ControlButton({ label, icon: Icon, disabled, onClick, primary = false, danger = false }: { label: string; icon: typeof Play; disabled: boolean; onClick: () => void; primary?: boolean; danger?: boolean }) {
  const color = primary ? "bg-brand text-white hover:bg-brand-dark" : danger ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-canvas text-ink hover:bg-brand-soft hover:text-brand";
  return <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-extrabold transition focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 ${color}`}><Icon className="size-4" />{label}</button>;
}

function StatusPill({ status }: { status: LiveDomanSession["status"] }) {
  const labels: Record<LiveDomanSession["status"], string> = { lobby: "Preparada", running: "En vivo", paused: "En pausa", ended: "Finalizada", cancelled: "Cancelada", expired: "Expirada" };
  const color = status === "running" ? "bg-emerald-100 text-emerald-800" : status === "paused" ? "bg-amber-100 text-amber-800" : status === "lobby" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${color}`}>{labels[status]}</span>;
}

function cardLabel(card?: LiveDomanCard): string {
  return card?.display_text?.trim() || card?.word?.trim() || "Tarjeta";
}

function commandNotice(action: string, groupName?: string): string {
  const group = groupName ? ` de “${groupName}”` : "";
  const messages: Record<string, string> = { start: `La sala${group} comenzó.`, next: "Se mostró la siguiente tarjeta.", repeat: "La tarjeta se repitió.", pause: `La sala${group} quedó en pausa.`, resume: `La sala${group} continuó.`, end: `La sala${group} finalizó.` };
  return messages[action] ?? "La sala fue actualizada.";
}

const inputClass = "h-12 w-full rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15";
