'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';
import Header from '../../components/Header';
import NewCampaignModal from '../../components/NewCampaignModal';

type Campaign = {
  id: string;
  title: string;
  system: string;
  cover_image: string;
  next_session: string | null;
  owner_id: string;
  campaign_members: { user_id: string }[];
};

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

export default function PainelPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchAllCampaigns = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: memberships } = await supabase
          .from('campaign_members')
          .select('campaign_id')
          .eq('user_id', user.id);

        if (!memberships || memberships.length === 0) {
          setCampaigns([]);
          setLoading(false);
          return;
        }

        const campaignIds = memberships.map(m => m.campaign_id);
        const { data } = await supabase
          .from('campaigns')
          .select(`*, campaign_members(user_id)`)
          .in('id', campaignIds)
          .order('created_at', { ascending: false });

        if (data) setCampaigns(data as Campaign[]);
      }
      setLoading(false);
    };
    fetchAllCampaigns();
  }, []);

  return (
    <div className="min-h-screen bg-codice-parchment flex flex-col">
      <Header />
      
      <main className="mx-auto w-full max-w-7xl px-6 py-12 flex-1">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between border-b border-codice-dark/20 pb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-codice-dark">Biblioteca de Campanhas</h1>
            <p className="text-sm font-medium text-codice-dark/60">Todos os universos atrelados ao seu perfil.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="rounded-md bg-codice-green px-6 py-2 font-bold text-codice-parchment transition hover:bg-codice-dark"
          >
            + Nova Campanha
          </button>
        </div>

        {loading ? (
          <div className="text-center font-bold text-codice-dark/50">Carregando manuscritos...</div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-codice-dark/20 p-12 text-center text-codice-dark/50">
            Sua biblioteca está vazia. Inicie uma nova aventura!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((camp) => {
              const isMaster = camp.owner_id === userId;
              const playerCount = camp.campaign_members?.length || 0;
              const nextSessionText = formatNextSession(camp.next_session);

              return (
                <Link key={camp.id} href={`/campanha/${camp.id}`} className="group block overflow-hidden rounded-xl border border-codice-dark/10 bg-white shadow-sm transition hover:shadow-md hover:border-codice-green">
                  <div className="relative h-32 w-full bg-codice-dark/20">
                    {camp.cover_image && <img src={camp.cover_image} alt={camp.title} className="h-full w-full object-cover" />}
                    <div className={`absolute left-3 top-3 rounded px-2 py-1 text-xs font-bold text-white shadow ${isMaster ? 'bg-codice-red' : 'bg-codice-green'}`}>
                      {isMaster ? 'Mestre' : 'Jogador'}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="mb-1 text-lg font-bold text-codice-dark group-hover:text-codice-green">{camp.title}</h3>
                    <p className="mb-3 text-sm font-medium text-codice-dark/60">{camp.system} • {playerCount} {playerCount === 1 ? 'Membro' : 'Membros'}</p>
                    <div className="mt-4 flex items-center border-t border-codice-dark/10 pt-3">
                      <span className="text-xs font-bold uppercase text-codice-dark/50">Próxima Sessão:</span>
                      <span className="ml-2 text-sm font-bold text-codice-dark">{nextSessionText || 'Não marcada'}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {userId && <NewCampaignModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} userId={userId} />}
    </div>
  );
}