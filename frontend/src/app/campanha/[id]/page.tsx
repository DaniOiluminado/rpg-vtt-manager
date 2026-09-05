'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/Header';

export default function CampaignDashboard({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params); // O Next.js moderno exige desembrulhar o ID assim

  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [latestSummary, setLatestSummary] = useState<any>(null);
  const [quests, setQuests] = useState<any[]>([]);

  useEffect(() => {
    const fetchCampaignData = async () => {
      // Busca a campanha validando se o usuário tem acesso
      const { data: campData, error } = await supabase
        .from('campaigns')
        .select('*, campaign_members(user_id, role)')
        .eq('id', id)
        .single();

      if (error || !campData) {
        setErrorMessage('Mesa não encontrada ou você não tem permissão para acessá-la.');
        setLoading(false);
        return;
      }

      setCampaign(campData);

      // Busca o último resumo
      const { data: summaryData } = await supabase
        .from('session_summaries')
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (summaryData) setLatestSummary(summaryData);

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

      {/* CONTEÚDO PRINCIPAL (Dashboard) */}
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
                {[1, 2].map((mock) => (
                  <div key={mock} className="flex items-center gap-4 rounded-lg border border-codice-dark/5 bg-codice-parchment/30 p-3 transition hover:bg-codice-parchment/60">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-codice-red/10 text-codice-red">⚔️</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-codice-dark">Investigar o Culto {mock}</h4>
                      <p className="text-xs font-medium text-codice-dark/60">Missão Principal • Em andamento</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="rounded-xl border border-codice-dark/10 bg-white p-6 shadow-sm">
              <h2 className="mb-4 border-b border-codice-dark/10 pb-2 text-xl font-bold text-codice-dark">O Grupo</h2>
              <div className="flex -space-x-3">
                <div className="h-10 w-10 rounded-full border-2 border-white bg-codice-dark" />
                <div className="h-10 w-10 rounded-full border-2 border-white bg-codice-green" />
                <div className="h-10 w-10 rounded-full border-2 border-white bg-codice-light" />
              </div>
            </section>

            <section className="rounded-xl border border-codice-dark/10 bg-white p-6 shadow-sm">
              <h2 className="mb-4 border-b border-codice-dark/10 pb-2 text-xl font-bold text-codice-dark">Acessos Recentes</h2>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border border-codice-dark/10 bg-codice-parchment/20 p-2 text-center transition hover:border-codice-green hover:bg-codice-green/5">
                  <span className="mb-1 text-2xl">📄</span>
                  <span className="text-xs font-bold text-codice-dark">Mapa de Sarmada</span>
                </div>
                <div className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border border-codice-dark/10 bg-codice-parchment/20 p-2 text-center transition hover:border-codice-green hover:bg-codice-green/5">
                  <span className="mb-1 text-2xl">🛡️</span>
                  <span className="text-xs font-bold text-codice-dark">Ficha: Ezequiel</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}