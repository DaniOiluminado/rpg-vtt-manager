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
      <body className="bg-codice-parchment text-codice-dark antialiased min-h-screen">
          {children}
      </body>
    </html>
  );
}