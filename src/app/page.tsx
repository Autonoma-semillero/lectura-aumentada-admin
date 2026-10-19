import { Nunito } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--font-nunito",
});

const APK_DOWNLOAD_URL =
  "https://github.com/Autonoma-semillero/Lectura-Aumentada-mobile/releases/download/latest-apk/lectura-aumentada-mobile-latest.apk";

type Step = {
  number: string;
  numberBg: string;
  numberColor: string;
  cardBg: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  imageHeight: number;
  imageHeightClass: string;
};

const steps: Step[] = [
  {
    number: "1",
    numberBg: "bg-[#3D61BB]",
    numberColor: "text-white",
    cardBg: "bg-[#EAF0FC]",
    title: "El profe crea la sala",
    description: "Elige la lectura y la prepara desde su celular o su tablet.",
    image: "/mascot/mascot-thumbs-up.png",
    alt: "La mascota con el pulgar arriba",
    imageHeight: 210,
    imageHeightClass: "h-[210px]",
  },
  {
    number: "2",
    numberBg: "bg-[#147D82]",
    numberColor: "text-white",
    cardBg: "bg-[#DDF0F0]",
    title: "Los niños entran",
    description: "Abren la app y esperan a su profe. No hay nada que apretar.",
    image: "/mascot/mascot-waiting.png",
    alt: "La mascota esperando tranquila",
    imageHeight: 196,
    imageHeightClass: "h-[196px]",
  },
  {
    number: "3",
    numberBg: "bg-[#FFD66B]",
    numberColor: "text-[#755400]",
    cardBg: "bg-[#FFF1C8]",
    title: "¡A leer juntos!",
    description: "El profe empieza y toda la clase juega al mismo tiempo.",
    image: "/mascot/mascot-celebrate.png",
    alt: "La mascota celebrando",
    imageHeight: 204,
    imageHeightClass: "h-[204px]",
  },
];

const waitingHighlights: string[] = [
  "Letras grandes y pocas palabras",
  "Colores suaves que no cansan",
  "Nada que apretar por error",
];

type AudienceCard = {
  badgeText: string;
  badgeBg: string;
  badgeColor: string;
  title: string;
  bullets: string[];
  dotBg: string;
};

const audienceCards: AudienceCard[] = [
  {
    badgeText: "Para el profe",
    badgeBg: "bg-[#EAF0FC]",
    badgeColor: "text-[#3D61BB]",
    title: "Tú mandas, ellos juegan",
    bullets: [
      "Crea la sala en un momento",
      "Elige y prepara la lectura",
      "Empieza la clase cuando todos estén listos",
    ],
    dotBg: "bg-[#3D61BB]",
  },
  {
    badgeText: "Para las familias",
    badgeBg: "bg-[#DDF0F0]",
    badgeColor: "text-[#0F6064]",
    title: "Fácil para manitos pequeñas",
    bullets: [
      "Pantallas calmadas y claras",
      "Letras grandes y pocas palabras",
      "Todo se toca fácil con deditos pequeños",
    ],
    dotBg: "bg-[#147D82]",
  },
];

type MascotMoment = {
  title: string;
  image: string;
  alt: string;
  cardBg: string;
  imageHeight: number;
  imageHeightClass: string;
};

const mascotMoments: MascotMoment[] = [
  {
    title: "Saluda",
    image: "/mascot/mascot-wave.png",
    alt: "La mascota saluda",
    cardBg: "bg-[#EAF0FC]",
    imageHeight: 220,
    imageHeightClass: "h-[220px]",
  },
  {
    title: "Pregunta",
    image: "/mascot/mascot-curious.png",
    alt: "La mascota con cara de curiosidad",
    cardBg: "bg-[#DDF0F0]",
    imageHeight: 220,
    imageHeightClass: "h-[220px]",
  },
  {
    title: "Celebra",
    image: "/mascot/mascot-celebrate.png",
    alt: "La mascota celebra",
    cardBg: "bg-[#FFF1C8]",
    imageHeight: 220,
    imageHeightClass: "h-[220px]",
  },
  {
    title: "Te anima",
    image: "/mascot/mascot-thumbs-up.png",
    alt: "La mascota con el pulgar arriba",
    cardBg: "bg-[#F7DAD7]",
    imageHeight: 200,
    imageHeightClass: "h-[200px]",
  },
];

function CheckIcon({ stroke }: { stroke: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3 8.5l3.2 3.2L13 4.8"
        fill="none"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadButton() {
  return (
    <a
      className="cta rounded-full bg-[#C62828] px-9 py-[18px] text-xl font-extrabold leading-[26px] text-white shadow-[0_6px_0_#A91F1D] transition hover:-translate-y-0.5"
      href={APK_DOWNLOAD_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Descargar Lectura Aumentada para Android"
    >
      Descargar la app
    </a>
  );
}

export default function HomePage() {
  return (
    <div
      className={`${nunito.variable} w-full overflow-x-hidden bg-[#FFFDF7] font-[family-name:var(--font-nunito)] text-[#26324B]`}
    >
      <a
        href="#inicio"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-full bg-[#26324B] px-5 py-3 font-bold text-white transition focus:translate-y-0"
      >
        Ir al contenido
      </a>

      <header className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 px-6 py-5">
        <a href="#inicio" className="flex items-center gap-3">
          <span className="relative block size-12 shrink-0 overflow-hidden rounded-full">
            <Image
              src="/logo-lectura-aumentada.png"
              alt=""
              aria-hidden="true"
              fill
              sizes="48px"
              className="object-cover"
            />
          </span>
          <span className="text-xl font-extrabold leading-[26px]">Lectura Aumentada</span>
        </a>
        <nav className="flex flex-wrap items-center gap-2 text-lg font-semibold leading-[26px] sm:gap-6">
          <Link className="px-1 py-2.5 text-[#26324B]" href="/login">
            Panel docente
          </Link>
          <a
            className="cta rounded-full bg-[#C62828] px-6 py-3 font-extrabold text-white transition hover:-translate-y-0.5"
            href="#descargar"
          >
            Descargar
          </a>
        </nav>
      </header>

      <main id="contenido">
        <section
          id="inicio"
          className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-12 px-6 py-10 pb-[72px]"
        >
          <div className="flex min-w-0 flex-1 basis-[460px] flex-col items-start gap-6">
            <h1 className="text-[clamp(38px,6vw,60px)] font-extrabold leading-[1.1] text-[#26324B]">
              Aprender a leer es un juego
            </h1>
            <p className="max-w-[520px] text-xl leading-[30px] text-[#637083]">
              El profe abre la sala. Los niños entran desde el celular. ¡Y todos leen
              juntos!
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <a
                href="#descargar"
                className="cta rounded-full bg-[#C62828] px-9 py-[18px] text-xl font-extrabold leading-[26px] text-white shadow-[0_6px_0_#A91F1D] transition hover:-translate-y-0.5"
              >
                Descargar la app
              </a>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 basis-[380px] justify-center">
            <div className="relative mt-10 aspect-square w-[420px] max-w-full">
              <div className="absolute inset-0 rounded-full bg-[#FFD66B]" aria-hidden="true" />
              <Image
                src="/mascot/mascot-wave.png"
                alt="Nuestra mascota saluda con la mano"
                width={360}
                height={400}
                className="bob absolute bottom-[14px] left-1/2 h-[112%] w-auto -translate-x-1/2 object-contain"
              />
              <div
                aria-hidden="true"
                className="fl absolute left-[-6px] top-14 flex size-16 items-center justify-center rounded-full bg-[#3D61BB] text-[34px] font-extrabold text-white [--r:-10deg]"
              >
                A
              </div>
              <div
                aria-hidden="true"
                className="fl absolute right-[-4px] top-5 flex size-[58px] items-center justify-center rounded-full bg-white text-[30px] font-extrabold text-[#755400] shadow-[0_4px_0_rgba(117,84,0,0.2)] [--r:8deg] [animation-delay:-1.2s]"
              >
                B
              </div>
              <div
                aria-hidden="true"
                className="fl absolute bottom-[90px] right-2 flex size-[54px] items-center justify-center rounded-full bg-[#147D82] text-[28px] font-extrabold text-white [--r:-6deg] [animation-delay:-2.1s]"
              >
                C
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="bg-white py-20">
          <div className="mx-auto flex max-w-[1120px] flex-col gap-10 px-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-[clamp(30px,4.5vw,42px)] font-extrabold leading-[1.15]">
                Así de fácil
              </h2>
              <p className="text-xl leading-[30px] text-[#637083]">
                Tres pasos y la clase empieza.
              </p>
            </div>

            <div className="flex flex-wrap gap-6">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className={`flex min-w-0 flex-1 basis-[300px] flex-col overflow-hidden rounded-[28px] ${step.cardBg}`}
                >
                  <div className="flex flex-col gap-2.5 px-7 pt-7">
                    <span
                      className={`flex size-11 items-center justify-center rounded-full text-[22px] font-extrabold ${step.numberBg} ${step.numberColor}`}
                    >
                      {step.number}
                    </span>
                    <h3 className="text-2xl font-extrabold leading-[30px]">{step.title}</h3>
                    <p className="text-lg leading-[26px] text-[#4B586D]">
                      {step.description}
                    </p>
                  </div>
                  <div className="relative mt-4 h-[220px]">
                    <Image
                      src={step.image}
                      alt={step.alt}
                      width={200}
                      height={step.imageHeight}
                      className={`absolute bottom-0 left-1/2 w-auto -translate-x-1/2 object-contain ${step.imageHeightClass}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#3D61BB] py-20 text-white">
          <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-center gap-14 px-6">
            <div className="flex min-w-0 flex-1 basis-[420px] flex-col gap-5">
              <h2 className="text-[clamp(30px,4.5vw,42px)] font-extrabold leading-[1.15]">
                Esperar también es divertido
              </h2>
              <p className="max-w-[480px] text-xl leading-[30px]">
                Mientras llega el profe, el niño ve a su amigo y una pantalla tranquila.
                Sin textos largos y sin botones.
              </p>
              <ul className="mt-2 flex flex-col gap-3.5">
                {waitingHighlights.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-lg font-semibold leading-[26px]"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FFD66B]">
                      <CheckIcon stroke="#755400" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="shrink-0 rounded-[44px] bg-[#26324B] p-2.5 shadow-[0_12px_0_rgba(0,0,0,0.18)]">
              <div className="relative h-[606px] w-[280px] overflow-hidden rounded-[34px] bg-[#FFFDF7] text-[#26324B]">
                <div
                  aria-hidden="true"
                  className="drift absolute left-[-17px] top-[95px] h-[27px] w-[86px] rounded-full bg-[#3D61BB] opacity-10"
                />
                <div
                  aria-hidden="true"
                  className="drift absolute left-[181px] top-[179px] h-[30px] w-[108px] rounded-full bg-[#3D61BB] opacity-10 [animation-delay:-3s]"
                />
                <div className="absolute inset-x-0 top-[43px] flex justify-center">
                  <span className="flex items-center gap-2.5 rounded-full bg-[#E3F1E4] py-2 pl-2.5 pr-[13px]">
                    <span className="flex size-[19px] items-center justify-center rounded-full bg-[#2E7D32]">
                      <CheckIcon stroke="#FFFFFF" />
                    </span>
                    <span className="text-sm font-semibold leading-5 text-[#1F5E24]">
                      ¡Ya estás en la sala!
                    </span>
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className="fl absolute left-7 top-[126px] flex size-[43px] items-center justify-center rounded-full bg-[#3D61BB] text-xl font-extrabold text-white [--r:-10deg]"
                >
                  A
                </div>
                <div
                  aria-hidden="true"
                  className="fl absolute left-[210px] top-[115px] flex size-10 items-center justify-center rounded-full bg-[#FFD66B] text-lg font-extrabold text-[#755400] [--r:8deg] [animation-delay:-1.2s]"
                >
                  B
                </div>
                <div
                  aria-hidden="true"
                  className="fl absolute left-[19px] top-[286px] flex size-[37px] items-center justify-center rounded-full bg-[#147D82] text-base font-extrabold text-white [--r:-6deg] [animation-delay:-2.1s]"
                >
                  C
                </div>
                <div
                  aria-hidden="true"
                  className="absolute left-[-65px] top-[392px] h-[373px] w-[409px] rounded-full bg-[#FFD66B]"
                />
                <Image
                  src="/mascot/mascot-waiting.png"
                  alt=""
                  aria-hidden="true"
                  width={160}
                  height={161}
                  className="bob absolute left-[89px] top-[237px] h-[161px] w-auto object-contain"
                />
                <div className="absolute inset-x-[17px] top-[422px] flex flex-col items-center gap-2 rounded-[28px] bg-white px-[17px] py-[16px] text-center shadow-[0_6px_0_rgba(117,84,0,0.18)]">
                  <p className="text-2xl font-extrabold leading-[34px] text-[#26324B]">
                    ¡Ya casi!
                  </p>
                  <p className="text-lg leading-[26px] text-[#637083]">
                    Tu profe está preparando la clase
                  </p>
                  <div className="mt-2.5 flex gap-3">
                    <span
                      aria-hidden="true"
                      className="dot size-[10px] rounded-full bg-[#3D61BB]"
                    />
                    <span
                      aria-hidden="true"
                      className="dot size-[10px] rounded-full bg-[#147D82] [animation-delay:0.18s]"
                    />
                    <span
                      aria-hidden="true"
                      className="dot size-[10px] rounded-full bg-[#FFD66B] [animation-delay:0.36s]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="para-quien" className="py-20">
          <div className="mx-auto flex max-w-[1120px] flex-col gap-10 px-6">
            <h2 className="text-center text-[clamp(30px,4.5vw,42px)] font-extrabold leading-[1.15]">
              Pensada para toda la clase
            </h2>
            <div className="flex flex-wrap gap-6">
              {audienceCards.map((card) => (
                <div
                  key={card.title}
                  className="flex min-w-0 flex-1 basis-[400px] flex-col gap-[18px] rounded-[28px] bg-white p-8 shadow-[0_6px_0_rgba(117,84,0,0.14)]"
                >
                  <span
                    className={`self-start rounded-full px-4 py-1.5 text-[15px] font-extrabold leading-5 ${card.badgeBg} ${card.badgeColor}`}
                  >
                    {card.badgeText}
                  </span>
                  <h3 className="text-[28px] font-extrabold leading-[34px]">{card.title}</h3>
                  <ul className="flex flex-col gap-3 text-lg leading-[26px] text-[#4B586D]">
                    {card.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className={`mt-[7px] size-3 shrink-0 rounded-full ${card.dotBg}`}
                        />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto flex max-w-[1120px] flex-col gap-10 px-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-[clamp(30px,4.5vw,42px)] font-extrabold leading-[1.15]">
                Conoce a nuestro amigo
              </h2>
              <p className="max-w-[560px] text-xl leading-[30px] text-[#637083]">
                Está en cada clase: saluda, pregunta, celebra y te anima.
              </p>
            </div>
            <div className="flex flex-wrap gap-5">
              {mascotMoments.map((moment) => (
                <div
                  key={moment.title}
                  className={`flex min-w-0 flex-1 basis-[220px] flex-col items-center overflow-hidden rounded-[28px] ${moment.cardBg}`}
                >
                  <span className="pt-[22px] text-xl font-extrabold leading-[26px]">
                    {moment.title}
                  </span>
                  <div className="relative h-[250px] w-full">
                    <Image
                      src={moment.image}
                      alt={moment.alt}
                      width={200}
                      height={moment.imageHeight}
                      className={`absolute bottom-4 left-1/2 w-auto -translate-x-1/2 object-contain ${moment.imageHeightClass}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="descargar" className="bg-[#FFD66B] pt-[72px]">
          <div className="mx-auto flex max-w-[1120px] flex-wrap items-end justify-center gap-10 px-6">
            <div className="flex min-w-0 flex-1 basis-[420px] flex-col items-start gap-5 pb-[72px]">
              <h2 className="text-[clamp(34px,5vw,52px)] font-extrabold leading-[1.1] text-[#26324B]">
                ¿Listos para leer?
              </h2>
              <p className="max-w-[480px] text-xl font-semibold leading-[30px] text-[#755400]">
                Baja la app y prepara la primera clase.
              </p>
              <DownloadButton />
            </div>
            <div className="flex min-w-0 flex-[0_1_380px] justify-center">
              <Image
                src="/mascot/mascot-celebrate.png"
                alt="La mascota celebra"
                width={300}
                height={340}
                className="bob mb-2 h-[340px] w-auto object-contain"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 px-6 py-8 text-[15px] font-semibold leading-5 text-[#637083]">
        <span>© 2026 Lectura Aumentada</span>
        <div className="flex flex-wrap gap-2 gap-x-6">
          <a className="py-2.5" href="#">
            Privacidad
          </a>
          <a className="py-2.5" href="#">
            Contacto
          </a>
        </div>
      </footer>
    </div>
  );
}
