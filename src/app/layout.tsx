import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Panel docente | Lectura Aumentada",
    template: "%s | Lectura Aumentada",
  },
  description: "Gestión docente de Lectura Aumentada.",
  icons: {
    icon: "/logo-lectura-aumentada.svg",
    shortcut: "/logo-lectura-aumentada.svg",
    apple: "/logo-lectura-aumentada.svg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
