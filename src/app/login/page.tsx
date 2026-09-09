import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-canvas lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-brand p-12 text-white lg:flex xl:p-16">
        <div className="absolute -right-24 -top-24 size-96 rounded-full border-[72px] border-white/10" />
        <div className="absolute -bottom-28 -left-24 size-[30rem] rounded-full border-[88px] border-white/10" />
        <div className="relative z-10">
          <BrandMark inverse />
        </div>

        <div className="relative z-10 max-w-xl pb-16">
          <p className="mb-5 text-sm font-extrabold uppercase tracking-[0.2em] text-white/70">
            Espacio docente
          </p>
          <h1 className="text-5xl font-black leading-[1.05] tracking-[-0.045em] xl:text-6xl">
            Acompaña cada palabra, cada avance y cada descubrimiento.
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-white/80">
            Organiza las experiencias de aprendizaje y consulta el progreso de tus estudiantes desde un solo lugar.
          </p>
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-6 py-12 sm:px-10">
        <div className="absolute left-0 top-0 h-2 w-full bg-brand lg:hidden" />
        <div className="w-full max-w-[29rem]">
          <div className="mb-12 lg:hidden">
            <BrandMark />
          </div>
          <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-brand">
            Bienvenido de nuevo
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] text-ink">
            Inicia sesión
          </h2>
          <p className="mb-9 mt-3 text-base leading-7 text-muted">
            Usa las mismas credenciales de profesor de la aplicación móvil.
          </p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
