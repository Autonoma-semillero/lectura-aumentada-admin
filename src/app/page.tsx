import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Box,
  CheckCircle2,
  Download,
  GraduationCap,
  Headphones,
  Layers3,
  LineChart,
  Play,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

const APK_DOWNLOAD_URL =
  "https://github.com/Autonoma-semillero/Lectura-Aumentada-mobile/releases/download/v1.0.0/lectura-aumentada-mobile-v1.0.0.apk";
const RELEASE_URL =
  "https://github.com/Autonoma-semillero/Lectura-Aumentada-mobile/releases/tag/v1.0.0";

const experiences: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
}> = [
  {
    title: "La lectura se escucha",
    description:
      "Cada tarjeta puede acompañarse de una pronunciación clara para reforzar la asociación entre palabra y sonido.",
    icon: Headphones,
    tone: "bg-blue-50 text-action",
  },
  {
    title: "La palabra cobra vida",
    description:
      "Los modelos 3D convierten conceptos abstractos en experiencias visuales cercanas, memorables y divertidas.",
    icon: Box,
    tone: "bg-amber-50 text-amber-700",
  },
  {
    title: "El avance se comprende",
    description:
      "Docentes y familias encuentran señales claras para acompañar el ritmo y los logros de cada estudiante.",
    icon: LineChart,
    tone: "bg-emerald-50 text-emerald-700",
  },
];

const journey: Array<{
  step: string;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    step: "01",
    title: "El docente diseña",
    description:
      "Organiza categorías, tarjetas, niveles y sesiones en un plan flexible que responde a cada proceso.",
    icon: Layers3,
  },
  {
    step: "02",
    title: "El estudiante descubre",
    description:
      "Ve la palabra, escucha su sonido y explora contenido aumentado en sesiones breves y enfocadas.",
    icon: Sparkles,
  },
  {
    step: "03",
    title: "El progreso orienta",
    description:
      "Cada interacción alimenta una visión sencilla del avance para tomar mejores decisiones pedagógicas.",
    icon: UserRoundCheck,
  },
];

function DownloadButton({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href={APK_DOWNLOAD_URL}
      target="_blank"
      rel="noreferrer"
      className={`group inline-flex items-center justify-center gap-2 rounded-full bg-brand font-extrabold text-white shadow-[0_16px_36px_rgba(229,55,52,0.24)] transition duration-200 hover:-translate-y-0.5 hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand ${
        compact ? "h-11 px-5 text-sm" : "min-h-14 px-7 text-base"
      }`}
      aria-label="Descargar Lectura Aumentada para Android, versión 1.0.0"
    >
      <Download className={compact ? "size-4" : "size-5"} aria-hidden="true" />
      {compact ? "Descargar app" : "Descargar para Android"}
      {!compact && (
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      )}
    </a>
  );
}

export default function HomePage() {
  return (
    <div className="landing-page min-h-screen overflow-x-hidden bg-[#fffaf8] text-ink">
      <a
        href="#contenido"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-full bg-ink px-5 py-3 font-bold text-white transition focus:translate-y-0"
      >
        Ir al contenido
      </a>

      <header className="sticky top-0 z-50 border-b border-white/70 bg-[#fffaf8]/88 backdrop-blur-xl">
        <div className="mx-auto flex h-[5.25rem] w-full max-w-[90rem] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <Link href="/" aria-label="Ir al inicio de Lectura Aumentada">
            <div className="sm:hidden">
              <BrandMark compact />
            </div>
            <div className="hidden sm:block">
              <BrandMark subtitle="Aprender cobra vida" />
            </div>
          </Link>

          <nav
            className="hidden items-center gap-7 text-sm font-bold text-ink-soft lg:flex"
            aria-label="Navegación pública"
          >
            <a className="transition hover:text-brand" href="#experiencia">
              La experiencia
            </a>
            <a className="transition hover:text-brand" href="#como-funciona">
              Cómo funciona
            </a>
            <a className="transition hover:text-brand" href="#para-quien">
              Para quién
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-full px-3 text-sm font-extrabold text-ink-soft transition hover:bg-white hover:text-brand sm:px-5"
            >
              <GraduationCap className="mr-2 hidden size-4 sm:block" aria-hidden="true" />
              Panel docente
            </Link>
            <span className="hidden sm:block">
              <DownloadButton compact />
            </span>
          </div>
        </div>
      </header>

      <main id="contenido">
        <section className="hero-scene relative isolate h-[calc(100svh-5.25rem)] overflow-hidden">
          <div className="hero-artwork absolute inset-x-0 bottom-0 z-0 h-[48%] lg:inset-0 lg:h-auto">
            <Image
              src="/hero-immersive-concept-v4.png"
              fill
              priority
              sizes="100vw"
              className="origin-bottom-right scale-[1.3] object-contain object-right-bottom sm:scale-[1.18] lg:scale-100"
              alt="Teléfono con Lectura Aumentada mostrando la palabra GATO y un gato que sale de la pantalla"
            />
          </div>
          <div className="hero-gradient pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,#fffaf8_0%,#fffaf8_44%,rgba(255,250,248,0.9)_55%,rgba(255,250,248,0)_72%)] lg:bg-[linear-gradient(90deg,#fffaf8_0%,#fffaf8_37%,rgba(255,250,248,0.88)_48%,rgba(255,250,248,0.12)_66%,rgba(255,250,248,0)_100%)]" />

          <div className="relative z-20 mx-auto flex h-full w-full max-w-[90rem] items-start px-5 pb-4 pt-6 sm:px-8 sm:pt-8 lg:items-center lg:px-12 lg:py-10">
            <div className="hero-copy max-w-[42rem]">
              <div className="hero-eyebrow mb-3 text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-brand sm:text-sm">
                <span className="sm:hidden">Lectura y realidad aumentada</span>
                <span className="hidden sm:inline">Lectura, sonido y realidad aumentada</span>
              </div>

              <h1 className="text-[clamp(2.55rem,12vw,4rem)] font-black leading-[0.93] tracking-[-0.06em] text-ink lg:text-[clamp(3.25rem,5.4vw,5.25rem)]">
                <span className="block">Cada palabra</span>
                <span className="block">se ve, se escucha</span>
                <span className="block text-brand">y cobra vida.</span>
              </h1>
              <p className="hero-description mt-4 max-w-[35rem] text-pretty text-[0.98rem] leading-6 text-ink-soft sm:text-lg sm:leading-8 lg:text-xl lg:leading-9">
                El método Doman y la tecnología inmersiva ayudan a cada estudiante a leer
                con curiosidad, confianza y acompañamiento.
              </p>

              <div className="hero-actions mt-5 flex items-center gap-2 sm:mt-7 sm:gap-3">
                <span className="sm:hidden">
                  <DownloadButton compact />
                </span>
                <span className="hidden sm:inline-flex">
                  <DownloadButton />
                </span>
                <a
                  href="#como-funciona"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-white/90 px-4 text-sm font-extrabold text-ink shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-brand/30 hover:text-brand sm:min-h-14 sm:px-7 sm:text-base"
                >
                  <Play className="size-4 fill-current" aria-hidden="true" />
                  <span className="sm:hidden">Conocer más</span>
                  <span className="hidden sm:inline">Conocer la experiencia</span>
                </a>
              </div>

              <div className="hero-meta mt-5 hidden flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-muted sm:flex">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
                  Android 8.0 o superior
                </span>
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="size-4 text-action" aria-hidden="true" />
                  Descarga directa v1.0.0
                </span>
              </div>
            </div>
          </div>
        </section>

        <section id="experiencia" className="scroll-mt-28 bg-white py-20 sm:py-28">
          <div className="mx-auto w-full max-w-[90rem] px-5 sm:px-8 lg:px-12">
            <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-brand">
                  Una experiencia multisensorial
                </p>
                <h2 className="mt-4 max-w-xl text-balance text-4xl font-black tracking-[-0.05em] text-ink sm:text-5xl lg:text-6xl">
                  Leer también es ver, escuchar y descubrir.
                </h2>
              </div>
              <p className="max-w-2xl text-lg leading-8 text-muted lg:justify-self-end">
                La tecnología no reemplaza la relación pedagógica: la hace más visible.
                Cada elemento está diseñado para reducir distracciones, reforzar la atención
                y celebrar el avance sin convertir el aprendizaje en una competencia.
              </p>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {experiences.map(({ title, description, icon: Icon, tone }) => (
                <article
                  key={title}
                  className="group rounded-[2rem] border border-line bg-[#fffdfc] p-7 transition duration-300 hover:-translate-y-1 hover:border-brand/20 hover:shadow-[0_24px_70px_rgba(30,41,59,0.09)] sm:p-8"
                >
                  <span className={`grid size-14 place-items-center rounded-2xl ${tone}`}>
                    <Icon className="size-6" strokeWidth={2.25} aria-hidden="true" />
                  </span>
                  <h3 className="mt-8 text-2xl font-black tracking-[-0.035em] text-ink">
                    {title}
                  </h3>
                  <p className="mt-3 text-base leading-7 text-muted">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-28 py-20 sm:py-28">
          <div className="mx-auto w-full max-w-[90rem] px-5 sm:px-8 lg:px-12">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-brand">
                Una ruta simple y humana
              </p>
              <h2 className="mt-4 text-balance text-4xl font-black tracking-[-0.05em] text-ink sm:text-5xl lg:text-6xl">
                Cada sesión tiene una intención.
              </h2>
              <p className="mt-5 text-lg leading-8 text-muted">
                Del diseño del plan al acompañamiento del progreso, toda la experiencia
                mantiene al estudiante en el centro.
              </p>
            </div>

            <div className="relative mt-16 grid gap-5 lg:grid-cols-3">
              <div className="absolute left-[16%] right-[16%] top-[2.25rem] hidden border-t-2 border-dashed border-brand/20 lg:block" />
              {journey.map(({ step, title, description, icon: Icon }) => (
                <article
                  key={step}
                  className="relative rounded-[2rem] border border-line bg-white p-7 shadow-[0_16px_55px_rgba(30,41,59,0.06)] sm:p-8"
                >
                  <div className="flex items-center justify-between">
                    <span className="relative z-10 grid size-[4.5rem] place-items-center rounded-[1.4rem] bg-brand text-white shadow-[0_14px_30px_rgba(229,55,52,0.2)]">
                      <Icon className="size-7" aria-hidden="true" />
                    </span>
                    <span className="text-4xl font-black tracking-[-0.05em] text-brand/[0.14]">
                      {step}
                    </span>
                  </div>
                  <h3 className="mt-7 text-2xl font-black tracking-[-0.035em] text-ink">
                    {title}
                  </h3>
                  <p className="mt-3 leading-7 text-muted">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="para-quien" className="scroll-mt-28 bg-ink py-20 text-white sm:py-28">
          <div className="mx-auto grid w-full max-w-[90rem] gap-6 px-5 sm:px-8 lg:grid-cols-2 lg:px-12">
            <article className="relative overflow-hidden rounded-[2.25rem] bg-brand p-8 sm:p-10 lg:p-12">
              <div className="absolute -right-20 -top-20 size-64 rounded-full border-[48px] border-white/10" />
              <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.14] px-4 py-2 text-sm font-extrabold">
                <Sparkles className="size-4" aria-hidden="true" /> Para estudiantes
              </span>
              <h2 className="relative mt-8 max-w-lg text-balance text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                Una experiencia clara, amable y sorprendente.
              </h2>
              <ul className="relative mt-8 space-y-4 text-white/85">
                {[
                  "Sesiones cortas que favorecen la atención.",
                  "Audio, tarjetas y modelos 3D en una misma práctica.",
                  "Progreso visible sin presión ni comparaciones.",
                ].map((item) => (
                  <li key={item} className="flex gap-3 leading-7">
                    <CheckCircle2 className="mt-1 size-5 shrink-0 text-amber-300" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="relative overflow-hidden rounded-[2.25rem] border border-white/[0.12] bg-white/[0.07] p-8 sm:p-10 lg:p-12">
              <div className="absolute -bottom-24 -right-24 size-72 rounded-full bg-blue-400/15 blur-2xl" />
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-extrabold text-blue-200">
                <GraduationCap className="size-4" aria-hidden="true" /> Para docentes
              </span>
              <h2 className="relative mt-8 max-w-lg text-balance text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                Planeación flexible con información que sí orienta.
              </h2>
              <ul className="relative mt-8 space-y-4 text-white/72">
                {[
                  "Planes por niveles, fechas, categorías y estudiantes.",
                  "Control de sesiones, tiempos y contenidos individuales.",
                  "Seguimiento del proceso desde un panel unificado.",
                ].map((item) => (
                  <li key={item} className="flex gap-3 leading-7">
                    <CheckCircle2 className="mt-1 size-5 shrink-0 text-blue-300" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="relative mt-9 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 font-extrabold text-ink transition hover:-translate-y-0.5 hover:text-brand"
              >
                Ingresar al panel
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </article>
          </div>
        </section>

        <section id="descargar" className="scroll-mt-28 py-20 sm:py-28">
          <div className="mx-auto w-full max-w-[90rem] px-5 sm:px-8 lg:px-12">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-[#f8e3de] px-6 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20">
              <div className="absolute -right-28 -top-32 size-[28rem] rounded-full bg-brand/12" />
              <div className="absolute -bottom-36 right-40 size-80 rounded-full bg-blue-200/45" />

              <div className="relative grid gap-12 lg:grid-cols-[1fr_0.72fr] lg:items-center">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/75 px-4 py-2 text-sm font-extrabold text-brand">
                    <Smartphone className="size-4" aria-hidden="true" />
                    Disponible para Android
                  </span>
                  <h2 className="mt-6 max-w-3xl text-balance text-4xl font-black tracking-[-0.055em] text-ink sm:text-5xl lg:text-6xl">
                    Lleva el aprendizaje aumentado a cada sesión.
                  </h2>
                  <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-soft">
                    Descarga la versión más reciente, instálala en tu dispositivo e inicia
                    sesión con tu cuenta de estudiante o docente.
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <DownloadButton />
                    <a
                      href={RELEASE_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-6 font-extrabold text-ink-soft transition hover:bg-white/65 hover:text-brand"
                    >
                      Ver notas de la versión
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </a>
                  </div>
                  <p className="mt-5 text-sm leading-6 text-muted">
                    Versión preliminar v1.0.0 para validación. Es posible que Android solicite
                    autorizar la instalación desde el navegador.
                  </p>
                </div>

                <ol className="relative space-y-3" aria-label="Pasos para instalar la aplicación">
                  {[
                    ["1", "Descarga el APK", "Abre el archivo cuando finalice la descarga."],
                    ["2", "Autoriza la instalación", "Android te guiará si necesita un permiso adicional."],
                    ["3", "Inicia tu experiencia", "Entra con tu usuario o correo y contraseña."],
                  ].map(([number, title, description]) => (
                    <li key={number} className="flex gap-4 rounded-2xl border border-white/70 bg-white/70 p-4 backdrop-blur-sm sm:p-5">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand font-black text-white">
                        {number}
                      </span>
                      <span>
                        <strong className="block text-base text-ink">{title}</strong>
                        <span className="mt-1 block text-sm leading-6 text-muted">{description}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-6 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <BrandMark subtitle="Aprender cobra vida" />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-bold text-muted">
            <a className="transition hover:text-brand" href="#experiencia">
              La experiencia
            </a>
            <a className="transition hover:text-brand" href="#descargar">
              Descargar
            </a>
            <Link className="transition hover:text-brand" href="/login">
              Acceso docente
            </Link>
          </div>
          <p className="text-sm text-muted">Lectura Aumentada · Educación con sentido</p>
        </div>
      </footer>
    </div>
  );
}
