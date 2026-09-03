import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VTT RPG Manager',
  description: 'Organize suas campanhas, missões e personagens.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}