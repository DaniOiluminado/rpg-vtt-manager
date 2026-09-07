'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        // Busca a foto atualizada diretamente da tabela profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();

        // Prioriza a foto do perfil customizada. Se não tiver, usa a do Google.
        setAvatarUrl(profile?.avatar_url || user.user_metadata?.avatar_url);
      }
    };
    fetchUserAndProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
    router.refresh();
  };

  // Ícone padrão em SVG
  const defaultAvatar = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F2E8CF'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>`;

  return (
    <header className="relative z-50 bg-codice-dark text-codice-parchment shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        
        <Link href="/" className="text-2xl font-bold tracking-wider text-codice-parchment hover:text-codice-light transition">
          CódiceRPG
        </Link>

        <div className="relative">
          {user ? (
            <div>
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-codice-light bg-codice-dark transition hover:scale-105"
              >
                <img src={avatarUrl || defaultAvatar} alt="Perfil" className="h-full w-full object-cover" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 z-50 rounded-md bg-white py-2 shadow-2xl ring-1 ring-black ring-opacity-5">
                  <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100 mb-1 truncate" title={user.email}>
                    {user.email}
                  </div>
                  <Link href="/perfil" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-codice-dark hover:bg-codice-parchment">
                    Preferências da Conta
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-codice-red hover:bg-red-50"
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link 
              href="/login" 
              className="rounded-md bg-codice-green px-6 py-2 font-medium text-codice-parchment transition hover:bg-codice-light hover:text-codice-dark"
            >
              Entrar / Cadastrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}