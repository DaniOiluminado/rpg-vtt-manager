'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

// Definindo o formato dos dados da nossa mesa
type Campaign = {
  id: string;
  title: string;
  description: string;
  invite_code: string;
  owner_id: string;
};

export default function PainelPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do formulário de criação
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setEmail(user.email ?? 'Jogador');
        fetchCampaigns();
      }
    }
    loadData();
  }, []);

  // Busca as campanhas (O RLS do banco garante que só vêm as permitidas)
  const fetchCampaigns = async () => {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setCampaigns(data);
    setLoading(false);
  };

  // Cria uma nova mesa no banco
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const { data, error } = await supabase
      .from('campaigns')
      .insert([{ title, description, owner_id: userId }])
      .select(); // O .select() faz o Supabase devolver os dados recém-criados

    if (error) {
      alert('Erro ao criar mesa: ' + error.message);
    } else if (data) {
      setCampaigns([data[0], ...campaigns]); // Adiciona a nova mesa no topo da lista na tela
      setIsCreating(false);
      setTitle('');
      setDescription('');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-5xl">
        
        {/* Cabeçalho */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-4">
          <h1 className="text-3xl font-bold text-indigo-500">Minhas Campanhas</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">Logado como: <strong className="text-white">{email}</strong></span>
            <button 
              onClick={handleLogout}
              className="rounded bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700"
            >
              Sair
            </button>
          </div>
        </header>
        
        {/* Botão de Nova Mesa */}
        <div className="mb-8 flex justify-between items-center">
          <p className="text-zinc-400">Selecione uma aventura para gerenciar ou crie uma nova.</p>
          <button 
            onClick={() => setIsCreating(!isCreating)}
            className="rounded bg-indigo-600 px-4 py-2 font-medium transition hover:bg-indigo-700"
          >
            {isCreating ? 'Cancelar' : '+ Nova Mesa'}
          </button>
        </div>

        {/* Formulário de Criação */}
        {isCreating && (
          <form onSubmit={handleCreateCampaign} className="mb-8 rounded-xl bg-zinc-900 p-6 shadow-lg border border-zinc-800">
            <h2 className="mb-4 text-xl font-bold">Configurar Nova Mesa</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Título da Campanha</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: A Profecia da Lira"
                  className="w-full rounded-md bg-zinc-950 border border-zinc-700 p-3 text-white outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Sinopse / Contexto</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Operação tática no Marrocos no ano de 2026..."
                  rows={3}
                  className="w-full rounded-md bg-zinc-950 border border-zinc-700 p-3 text-white outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-6 py-2 font-medium text-white transition hover:bg-indigo-700"
              >
                Criar Mesa
              </button>
            </div>
          </form>
        )}

        {/* Grid de Mesas */}
        {loading ? (
          <p className="text-zinc-500">Carregando seus universos...</p>
        ) : campaigns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
            Você ainda não possui nenhuma mesa. Crie a primeira para começar!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((camp) => (
              <div key={camp.id} className="group relative rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10">
                <h3 className="mb-2 text-xl font-bold text-white">{camp.title}</h3>
                <p className="mb-6 text-sm text-zinc-400 line-clamp-3">{camp.description}</p>
                
                {/* Rodapé do Card com o Código de Convite */}
                <div className="mt-auto border-t border-zinc-800 pt-4">
                  {camp.owner_id === userId ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold uppercase text-zinc-500">Código de Convite (Mestre)</span>
                      <code className="rounded bg-zinc-950 px-2 py-1 text-xs text-indigo-400 select-all">
                        {camp.invite_code}
                      </code>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold uppercase text-emerald-500">Você é um Jogador</span>
                  )}
                </div>
                
                {/* Botão para entrar na mesa (Link invisível sobre o card) */}
                <button className="mt-4 w-full rounded bg-zinc-800 py-2 text-sm font-medium transition group-hover:bg-indigo-600 group-hover:text-white">
                  Acessar Painel da Mesa
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}