import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(publicSiteUrl),
  title: {
    default: "Lectura Aumentada | Leer cobra vida",
    template: "%s | Lectura Aumentada",
  },
  description:
    "Una experiencia educativa que une el método Doman, audio, realidad aumentada y acompañamiento docente para aprender a leer con curiosidad y confianza.",
  applicationName: "Lectura Aumentada",
  keywords: [
    "lectura infantil",
    "método Doman",
    "realidad aumentada",
    "aplicación educativa",
    "aprendizaje",
  ],
  openGraph: {
    type: "website",
    locale: "es_CO",
    title: "Lectura Aumentada | Leer cobra vida",
    description:
      "Lectura, sonido y realidad aumentada en una experiencia diseñada para estudiantes y docentes.",
    images: [
      {
        url: "/og.png",
        width: 1536,
        height: 1024,
        alt: "Lectura Aumentada funcionando en un teléfono Android",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lectura Aumentada | Leer cobra vida",
    description:
      "Lectura, sonido y realidad aumentada en una experiencia diseñada para estudiantes y docentes.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/logo-lectura-aumentada.svg",
    shortcut: "/logo-lectura-aumentada.svg",
    apple: "/logo-lectura-aumentada.svg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full scroll-smooth antialiased`}>
      <body>{children}</body>
    </html>
  );
}
