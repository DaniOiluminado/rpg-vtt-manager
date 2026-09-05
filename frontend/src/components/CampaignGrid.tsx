'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import NewCampaignModal from './NewCampaignModal';
import Link from 'next/link';

type Campaign = {
  id: string;
  title: string;
  system: string;
  cover_image: string;
  next_session: string | null;
  owner_id: string;
  campaign_members: { user_id: string }[];
};

// Formatador de data e hora
const formatNextSession = (dateString: string | null) => {
  if (!dateString) return null;
  const sessionDate = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const time = sessionDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (sessionDate.toDateString() === today.toDateString()) return `Hoje às ${time}`;
  if (sessionDate.toDateString() === tomorrow.toDateString()) return `Amanhã às ${time}`;

  const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  return `${days[sessionDate.getDay()]} ${String(sessionDate.getDate()).padStart(2, '0')}/${String(sessionDate.getMonth() + 1).padStart(2, '0')} às ${time}`;
};

export default function CampaignGrid() {
  const [userId, setUserId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchUserAndCampaigns = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        // 1. Verifica em quais mesas o usuário atual tem uma cadeira (como mestre ou jogador)
        const { data: memberships } = await supabase
          .from('campaign_members')
          .select('campaign_id')
          .eq('user_id', user.id);

        // Se ele não participar de nenhuma, para por aqui e mostra o grid vazio
        if (!memberships || memberships.length === 0) {
          setCampaigns([]);
          setLoading(false);
          return;
        }

        // Extrai apenas a lista de IDs das campanhas
        const campaignIds = memberships.map(m => m.campaign_id);

        // 2. Busca os detalhes EXCLUSIVAMENTE das mesas daquele usuário
        const { data } = await supabase
          .from('campaigns')
          .select(`*, campaign_members(user_id)`)
          .in('id', campaignIds)
          .order('created_at', { ascending: false })
          .limit(5);

        if (data) setCampaigns(data as Campaign[]);
      }
      setLoading(false);
    };
    fetchUserAndCampaigns();
  }, []);

  if (loading) return <div className="py-12 text-center font-bold text-codice-dark/50">Lendo os pergaminhos...</div>;

  if (!userId) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-4 text-2xl font-bold text-codice-dark">Suas Campanhas</h2>
        <p className="text-codice-dark/70">Faça login para ver suas campanhas recentes ou criar sua primeira.</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <h2 className="mb-6 text-2xl font-bold text-codice-dark border-b border-codice-dark/20 pb-2">
        Suas Campanhas
      </h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Renderiza as 5 últimas campanhas */}
        {campaigns.map((camp) => {
          const isMaster = camp.owner_id === userId;
          const playerCount = camp.campaign_members?.length || 0;
          const nextSessionText = formatNextSession(camp.next_session);

          return (
            <Link key={camp.id} href={`/campanha/${camp.id}`} className="group block overflow-hidden rounded-xl border border-codice-dark/10 bg-white shadow-sm transition hover:shadow-md hover:border-codice-green">
              {/* Capa */}
              <div className="relative h-32 w-full bg-codice-dark/20">
                {camp.cover_image && (
                  <img src={camp.cover_image} alt={camp.title} className="h-full w-full object-cover" />
                )}
                {/* Tag Mestre/Jogador */}
                <div className={`absolute left-3 top-3 rounded px-2 py-1 text-xs font-bold text-white shadow ${isMaster ? 'bg-codice-red' : 'bg-codice-green'}`}>
                  {isMaster ? 'Mestre' : 'Jogador'}
                </div>
              </div>

              {/* Informações */}
              <div className="p-4">
                <h3 className="mb-1 text-lg font-bold text-codice-dark group-hover:text-codice-green">{camp.title}</h3>
                <p className="mb-3 text-sm font-medium text-codice-dark/60">
                  {camp.system} • {playerCount} {playerCount === 1 ? 'Membro' : 'Membros'}
                </p>
                
                {/* Data da Sessão */}
                <div className="mt-4 flex items-center border-t border-codice-dark/10 pt-3">
                  <span className="text-xs font-bold uppercase text-codice-dark/50">Próxima Sessão:</span>
                  <span className="ml-2 text-sm font-bold text-codice-dark">
                    {nextSessionText || 'Não marcada'}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}

        {/* Card 6: Botão Nova Campanha */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-codice-green/50 bg-codice-green/5 text-codice-green transition hover:border-codice-green hover:bg-codice-green/10"
        >
          <span className="mb-2 text-4xl">+</span>
          <span className="font-bold">Nova Campanha</span>
        </button>
      </div>

      <NewCampaignModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} userId={userId} />
    </div>
  );
}