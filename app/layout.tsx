import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Práctica de Certificaciones",
  description: "App local de práctica de exámenes de certificación (AZ-104 y más).",
};

// Aplica el tema guardado antes de pintar para evitar el "flash" de tema claro.
const themeScript = `
(function () {
  try {
    var t = localStorage.getItem('theme');
    var dark = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link
              href="/"
              className="text-lg font-bold text-slate-800 dark:text-slate-100"
            >
              📘 Práctica de Certificaciones
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-3xl px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
          App local de práctica · Tus respuestas se guardan solo en este navegador.
        </footer>
      </body>
    </html>
  );
}
