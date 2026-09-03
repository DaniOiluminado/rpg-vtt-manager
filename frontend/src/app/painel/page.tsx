'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function PainelPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  // Pega o email do usuário logado assim que a tela carrega
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email ?? 'Jogador');
    }
    getUser();
  }, []);

  // Função de deslogar
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh(); // Força o middleware a rodar novamente
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between border-b border-zinc-800 pb-4">
          <h1 className="text-3xl font-bold text-indigo-500">Minhas Campanhas</h1>
          <div className="flex items-center gap-4">
            <span className="text-zinc-400">Logado como: <strong className="text-white">{email}</strong></span>
            <button 
              onClick={handleLogout}
              className="rounded bg-red-600 px-4 py-2 text-sm font-bold transition hover:bg-red-700"
            >
              Sair
            </button>
          </div>
        </header>
        
        <main>
          <p className="text-zinc-400">Seu guarda-chuva de campanhas e personagens aparecerá aqui.</p>
          {/* O CRUD das mesas entrará nesta área */}
        </main>
      </div>
    </div>
  );
}