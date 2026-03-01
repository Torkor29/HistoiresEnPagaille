import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'HistoireEnPagaille — Créez des histoires personnalisées',
  description: 'Générez des histoires illustrées pour enfants avec l’IA.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-stone-50 font-sans text-stone-800 antialiased">
        <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
        <header className="border-b border-stone-200 bg-white/90 shadow-sm backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
            <a
              href="/"
              className="text-xl font-bold tracking-tight text-stone-800 transition hover:text-primary-600"
            >
              HistoireEnPagaille
            </a>
            <nav className="flex items-center gap-1">
              <a
                href="/"
                className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
              >
                Mes histoires
              </a>
              <a
                href="/new?fresh=1"
                className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-600"
              >
                Nouvelle histoire
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
