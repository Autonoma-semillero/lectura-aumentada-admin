import type { ReactNode } from "react";
import { AlertCircle, Inbox, LoaderCircle, X } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-2 text-sm font-extrabold uppercase tracking-[0.15em] text-brand">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-black tracking-[-0.04em] text-ink sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-base leading-7 text-muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function LoadingState({ label = "Cargando información…" }: { label?: string }) {
  return (
    <div className="grid min-h-60 place-items-center rounded-[28px] border border-line bg-white">
      <div className="flex items-center gap-3 font-semibold text-muted">
        <LoaderCircle className="size-5 animate-spin text-brand" />
        {label}
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-[28px] border border-red-200 bg-red-50 p-8 text-center">
      <AlertCircle className="mb-3 size-8 text-brand" />
      <p className="max-w-md font-semibold text-red-800">{message}</p>
      {onRetry && (
        <button className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-extrabold text-brand shadow-sm" onClick={onRetry}>
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid min-h-60 place-items-center rounded-[28px] border border-dashed border-line bg-white/70 p-8 text-center">
      <div>
        <Inbox className="mx-auto mb-3 size-9 text-brand" />
        <h3 className="text-lg font-extrabold text-ink">{title}</h3>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
      <section
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 id="modal-title" className="text-2xl font-black tracking-[-0.03em] text-ink">{title}</h2>
          <button className="grid size-10 place-items-center rounded-full bg-slate-100 text-muted transition hover:bg-brand-soft hover:text-brand" onClick={onClose} aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    new: "Nueva",
    active: "En progreso",
    completed: "Dominada",
    archived: "Archivada",
    planned: "Planeada",
    in_progress: "En curso",
  };
  const color =
    status === "completed"
      ? "bg-green-100 text-green-700"
      : status === "active" || status === "in_progress"
        ? "bg-amber-100 text-amber-800"
        : status === "archived"
          ? "bg-slate-100 text-slate-600"
          : "bg-blue-100 text-blue-700";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${color}`}>{labels[status] ?? status}</span>;
}
