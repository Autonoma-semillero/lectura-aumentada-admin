"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpenText,
  Boxes,
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Shapes,
  UserCog,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

type Profile = { email: string; display_name?: string };

const navigation: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/dashboard/students", label: "Estudiantes", icon: Users },
  { href: "/dashboard/groups", label: "Grupos", icon: UsersRound },
  { href: "/dashboard/users", label: "Usuarios", icon: UserCog },
  { href: "/dashboard/themes", label: "Temáticas", icon: Shapes },
  { href: "/dashboard/cards", label: "Tarjetas", icon: BookOpenText },
  { href: "/dashboard/plans", label: "Planes", icon: CalendarDays },
  { href: "/dashboard/models", label: "Modelos 3D", icon: Boxes },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload: { user: Profile }) => setProfile(payload.user))
      .catch(() => router.replace("/login"));
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const current = navigation.find((item) => isActive(pathname, item.href));

  return (
    <div className="min-h-screen bg-canvas">
      {menuOpen && (
        <button className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" />
      )}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[17.5rem] flex-col border-r border-line bg-white px-5 py-6 transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between">
          <BrandMark />
          <button className="grid size-10 place-items-center rounded-full bg-slate-100 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
            <X className="size-5" />
          </button>
        </div>

        <nav className="mt-10 space-y-1.5" aria-label="Navegación principal">
          {navigation.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`group flex min-h-12 items-center gap-3 rounded-2xl px-4 text-[0.95rem] font-bold transition ${active ? "bg-brand text-white shadow-[0_8px_20px_rgba(229,55,52,0.22)]" : "text-muted hover:bg-brand-soft hover:text-brand"}`}
              >
                <Icon className="size-5" strokeWidth={2.4} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="size-4" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-[22px] bg-canvas p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-action text-sm font-black text-white">
              {(profile?.display_name ?? profile?.email ?? "P").slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0">
              <strong className="block truncate text-sm text-ink">{profile?.display_name ?? "Profesor"}</strong>
              <span className="block truncate text-xs text-muted">{profile?.email ?? "Cargando…"}</span>
            </span>
          </div>
          <button className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-muted transition hover:bg-white hover:text-brand" onClick={logout}>
            <LogOut className="size-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="lg:pl-[17.5rem]">
        <header className="sticky top-0 z-20 flex h-[4.75rem] items-center justify-between border-b border-line bg-white/90 px-5 backdrop-blur-md sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <button className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
              <Menu className="size-5" />
            </button>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand">Panel docente</p>
              <p className="font-extrabold text-ink">{current?.label ?? "Lectura Aumentada"}</p>
            </div>
          </div>
          <p className="hidden text-sm font-semibold capitalize text-muted sm:block">
            {new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}
          </p>
        </header>
        <main className="mx-auto w-full max-w-[96rem] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
