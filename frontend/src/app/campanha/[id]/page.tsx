'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/Header';

export default function CampaignDashboard({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [latestSummary, setLatestSummary] = useState<any>(null);
  const [quests, setQuests] = useState<any[]>([]);

  // Estados do Acervo
  const [favorites, setFavorites] = useState<any[]>([]);
  const [recents, setRecents] = useState<any[]>([]);
  const [favPage, setFavPage] = useState(0);

  useEffect(() => {
    const fetchCampaignData = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (userId) setCurrentUserId(userId);

      // 1. Busca a campanha
      const { data: campData, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          campaign_members (
            user_id,
            role,
            profiles (display_name, username, avatar_url)
          )
        `)
        .eq('id', id)
        .single();

      if (error || !campData) {
        setErrorMessage('Mesa não encontrada ou você não tem permissão para acessá-la.');
        setLoading(false);
        return;
      }

      setCampaign(campData);

      // 2. Busca o último resumo
      const { data: summaryData } = await supabase
        .from('session_summaries')
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (summaryData) setLatestSummary(summaryData);

      // 3. Busca Missões
      const { data: questsData } = await supabase
        .from('quests')
        .select('*')
        .eq('campaign_id', id)
        .eq('is_draft', false);

      if (questsData && questsData.length > 0) {
        questsData.sort((a, b) => {
          const weightTypeA = a.type === 'Principal' ? 1 : 0;
          const weightTypeB = b.type === 'Principal' ? 1 : 0;
          if (weightTypeA !== weightTypeB) return weightTypeB - weightTypeA;

          const getStatusWeight = (status: string) => {
            if (status === 'Em andamento') return 2;
            if (status === 'Não iniciada') return 1;
            return 0;
          };
          const weightStatusA = getStatusWeight(a.status);
          const weightStatusB = getStatusWeight(b.status);
          if (weightStatusA !== weightStatusB) return weightStatusB - weightStatusA;

          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        setQuests(questsData.slice(0, 5));
      }

      // 4. Busca Interações com o Acervo (Favoritos e Recentes)
      if (userId) {
        const { data: prefData } = await supabase
          .from('user_entity_preferences')
          .select(`
            is_favorite, 
            last_accessed, 
            entities!inner(id, name, type, campaign_id)
          `)
          .eq('user_id', userId)
          .eq('entities.campaign_id', id)
          .order('last_accessed', { ascending: false });

        if (prefData) {
          const favs = prefData.filter(p => p.is_favorite).map(p => p.entities);
          const recs = prefData.slice(0, 4).map(p => p.entities); // Pega os 4 mais recentes absolutos
          setFavorites(favs);
          setRecents(recs);
        }
      }

      setLoading(false);
    };

    fetchCampaignData();
  }, [id, router]);

  if (loading) return <div className="min-h-screen bg-codice-parchment pt-20 text-center font-bold text-codice-dark">Abrindo os arquivos...</div>;

  if (errorMessage) return (
    <div className="min-h-screen bg-codice-parchment flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-codice-red mb-4">{errorMessage}</h2>
        <Link href="/" className="font-bold text-codice-green hover:underline">← Voltar ao Início</Link>
      </div>
    </div>
  );

  // Lógica de Paginação dos Favoritos
  const favsPerPage = 6;
  const totalFavPages = Math.ceil(favorites.length / favsPerPage);
  const currentFavs = favorites.slice(favPage * favsPerPage, (favPage + 1) * favsPerPage);

  const getEntityIcon = (type: string) => {
    const icons: Record<string, string> = { npc: '👤', personagem: '🛡️', criatura: '🐺', lugar: '🗺️', item: '⚔️', documento: '📜', magia: '✨' };
    return icons[type] || '❓';
  };

  return (
    <div className="min-h-screen bg-codice-parchment flex flex-col">
      <Header />

      {/* BANNER DA CAMPANHA */}
      <div className="relative h-64 w-full overflow-hidden sm:h-80 lg:h-96">
        {campaign.cover_image && (
          <div 
            className="absolute inset-0 bg-cover bg-center blur-xl opacity-40 scale-110"
            style={{ backgroundImage: `url(${campaign.cover_image})` }}
          />
        )}
        {campaign.cover_image ? (
          <img src={campaign.cover_image} alt={campaign.title} className="absolute inset-0 h-full w-full object-contain drop-shadow-2xl" />
        ) : (
          <div className="absolute inset-0 bg-codice-dark/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-codice-parchment via-codice-parchment/20 to-transparent" />

        <div className="absolute bottom-0 left-0 w-full px-6 pb-6">
          <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <Link href="/painel" className="mb-2 inline-block text-sm font-bold text-codice-dark/60 hover:text-codice-dark transition">
                ← Voltar ao Painel
              </Link>
              <h1 className="text-4xl font-black text-codice-dark drop-shadow-md lg:text-6xl">{campaign.title}</h1>
              <p className="mt-2 text-lg font-bold text-codice-dark/80 drop-shadow">
                {campaign.system} • Sessões Realizadas: <span className="text-codice-green">{latestSummary?.session_number || 0}</span>
              </p>
            </div>
            
            <button className="rounded-md bg-codice-green px-8 py-4 text-lg font-bold text-codice-parchment shadow-lg transition hover:scale-105 hover:bg-codice-dark hover:shadow-codice-dark/30">
              Iniciar Sessão
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          <div className="lg:col-span-2 space-y-8">
            
            <section className="rounded-xl border border-codice-dark/10 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between border-b border-codice-dark/10 pb-4">
                <h2 className="text-2xl font-bold text-codice-dark">O que aconteceu na última sessão?</h2>
                <Link href={`/campanha/${campaign.id}/resumos`} className="text-sm font-bold text-codice-green hover:underline">
                  Ver todos os resumos →
                </Link>
              </div>
              
              {latestSummary ? (
                <div>
                  <h3 className="mb-2 text-lg font-bold text-codice-dark">Sessão {latestSummary.session_number}: {latestSummary.title}</h3>
                  <p className="whitespace-pre-wrap text-codice-dark/80">{latestSummary.description}</p>
                </div>
              ) : (
                <div className="py-6 text-center text-codice-dark/50">
                  <p className="font-medium">Nenhuma sessão registrada ainda.</p>
                  <Link href={`/campanha/${campaign.id}/resumos`} className="mt-2 inline-block text-sm font-bold text-codice-green hover:underline">
                    Escrever o primeiro resumo
                  </Link>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-codice-dark/10 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between border-b border-codice-dark/10 pb-4">
                <h2 className="text-2xl font-bold text-codice-dark">Mural de Missões</h2>
                <Link href={`/campanha/${campaign.id}/missoes`} className="text-sm font-bold text-codice-green hover:underline">
                  Ver todas →
                </Link>
              </div>
              
              <div className="space-y-3">
                {quests.length === 0 ? (
                  <div className="py-6 text-center text-codice-dark/50">
                    <p className="font-medium">Nenhuma missão disponível no momento.</p>
                  </div>
                ) : (
                  quests.map((quest) => (
                    <Link 
                      key={quest.id} 
                      href={`/campanha/${campaign.id}/missoes?questId=${quest.id}`}
                      className="flex items-center gap-4 rounded-lg border border-codice-dark/5 bg-codice-parchment/30 p-3 transition hover:bg-codice-parchment/60 group"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-codice-dark/10 overflow-hidden">
                        {quest.icon_url ? (
                          <img src={quest.icon_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xl">📜</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-codice-dark group-hover:text-codice-green transition">{quest.title}</h4>
                        <p className="text-xs font-medium uppercase mt-1">
                          <span className={quest.type === 'Principal' ? 'text-codice-red' : 'text-codice-dark/60'}>
                            {quest.type}
                          </span>
                          <span className="mx-2 text-codice-dark/30">•</span>
                          <span className="text-codice-green">{quest.status}</span>
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* SIDEBAR - O Grupo & Acervo */}
          <div className="space-y-8">
            
            <section className="rounded-xl border border-codice-dark/10 bg-white p-6 shadow-sm">
              <h2 className="mb-4 border-b border-codice-dark/10 pb-2 text-xl font-bold text-codice-dark">O Grupo</h2>
              
              {campaign.campaign_members && campaign.campaign_members.filter((m: any) => m.user_id !== currentUserId).length > 0 ? (
                <div className="flex flex-col gap-4">
                  {campaign.campaign_members
                    .filter((m: any) => m.user_id !== currentUserId)
                    .map((member: any) => {
                      const avatar = member.profiles?.avatar_url || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F2E8CF'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>`;
                      const name = member.profiles?.display_name || 'Aventureiro';
                      const username = member.profiles?.username || 'desconhecido';
                      
                      return (
                        <div key={member.user_id} className="flex items-center gap-3">
                          <img src={avatar} alt={name} className="h-10 w-10 rounded-full border border-codice-dark/20 object-cover bg-codice-dark" />
                          <div>
                            <p className="text-sm font-bold text-codice-dark">
                              {name} <span className="text-xs font-normal text-codice-dark/50">@{username}</span>
                            </p>
                            <p className={`text-[10px] font-black uppercase ${member.role === 'mestre' ? 'text-codice-red' : 'text-codice-green'}`}>
                              {member.role}
                            </p>
                          </div>
                        </div>
                      );
                  })}
                </div>
              ) : (
                <div className="py-2 text-center">
                  <p className="text-sm font-medium text-codice-dark/50">Você está sozinho nesta jornada.</p>
                </div>
              )}
            </section>

            {/* NOVO PAINEL DO ACERVO */}
            <section className="rounded-xl border border-codice-dark/10 bg-white p-6 shadow-sm flex flex-col gap-6">
              
              {/* Botão Principal */}
              <Link href={`/campanha/${campaign.id}/acervo`} className="flex items-center justify-between rounded-xl bg-codice-dark p-4 text-white shadow-md transition hover:scale-[1.02] hover:bg-codice-green hover:shadow-lg group">
                <div>
                  <h3 className="font-black text-lg">Vasculhar Acervo</h3>
                  <p className="text-xs font-medium text-white/60 group-hover:text-white/90">Personagens, Lore e Mapas</p>
                </div>
                <span className="text-3xl">🗄️</span>
              </Link>

              {/* Favoritos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold uppercase text-codice-dark/70">Meus Favoritos</h3>
                  {totalFavPages > 1 && (
                    <div className="flex gap-2">
                      <button onClick={() => setFavPage(p => Math.max(0, p - 1))} disabled={favPage === 0} className="text-codice-dark/50 hover:text-codice-green disabled:opacity-30">◄</button>
                      <button onClick={() => setFavPage(p => Math.min(totalFavPages - 1, p + 1))} disabled={favPage === totalFavPages - 1} className="text-codice-dark/50 hover:text-codice-green disabled:opacity-30">►</button>
                    </div>
                  )}
                </div>
                
                {favorites.length === 0 ? (
                  <p className="text-xs font-medium text-codice-dark/40 text-center py-2 italic border border-dashed border-codice-dark/10 rounded">
                    Nenhum registro favoritado.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {currentFavs.map(fav => (
                      <Link key={fav.id} href={`/campanha/${campaign.id}/acervo?entity=${fav.id}`} className="flex items-center gap-2 rounded bg-codice-dark/5 p-2 border border-codice-dark/5 transition hover:border-codice-green hover:bg-codice-green/10">
                        <span className="text-lg">{getEntityIcon(fav.type)}</span>
                        <span className="text-xs font-bold text-codice-dark truncate">{fav.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Recentes */}
              <div className="border-t border-codice-dark/10 pt-4">
                <h3 className="text-sm font-bold uppercase text-codice-dark/70 mb-3">Acessos Recentes</h3>
                {recents.length === 0 ? (
                  <p className="text-xs font-medium text-codice-dark/40 text-center py-2 italic">
                    O rastro das páginas está frio.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {recents.map(rec => (
                      <Link key={rec.id} href={`/campanha/${campaign.id}/acervo?entity=${rec.id}`} className="flex items-center gap-3 rounded bg-transparent p-2 transition hover:bg-codice-dark/5">
                        <span className="text-xl">{getEntityIcon(rec.type)}</span>
                        <span className="text-sm font-bold text-codice-dark truncate">{rec.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

            </section>
          </div>
        </div>
      </main>
    </div>
  );
}