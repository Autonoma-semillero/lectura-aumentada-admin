"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "No fue posible iniciar sesión.");
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible iniciar sesión.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block space-y-2">
        <span className="text-sm font-bold text-ink-soft">Correo institucional</span>
        <input
          className="field"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="docente@lectura.app"
          required
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-bold text-ink-soft">Contraseña</span>
        <span className="relative block">
          <input
            className="field pr-24"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Ingresa tu contraseña"
            required
          />
          <button
            className="absolute inset-y-0 right-4 text-sm font-bold text-brand transition hover:text-brand-dark"
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
          >
            {showPassword ? "Ocultar" : "Ver"}
          </button>
        </span>
      </label>

      {error && (
        <p
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}

      <button
        className="flex h-14 w-full items-center justify-center rounded-[18px] bg-brand px-5 text-base font-extrabold text-white shadow-[0_12px_30px_rgba(229,55,52,0.28)] transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Ingresando…" : "Ingresar al panel"}
      </button>

      <p className="text-center text-sm leading-6 text-muted">
        Acceso para cuentas con rol docente o administrador.
      </p>
    </form>
  );
}
