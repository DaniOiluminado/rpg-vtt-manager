'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function NewCampaignModal({ isOpen, onClose, userId }: { isOpen: boolean, onClose: () => void, userId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<'selecao' | 'jogador' | 'mestre'>('selecao');
  
  // Estados para Jogador
  const [inviteCode, setInviteCode] = useState('');
  
  // Estados para Mestre
  const [title, setTitle] = useState('');
  const [system, setSystem] = useState('D&D 5e');
  const [coverUrl, setCoverUrl] = useState('');
  const [nextSession, setNextSession] = useState('');
  const [description, setDescription] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Gera um código de 8 dígitos assim que o usuário escolhe ser Mestre
  useEffect(() => {
    if (step === 'mestre' && !generatedCode) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      setGeneratedCode(code);
    }
  }, [step]);

  const handleJoinCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 1. Busca a mesa pelo código
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();

    if (fetchError || !campaign) {
      setError('Código inválido ou mesa não encontrada.');
      setLoading(false);
      return;
    }

    // 2. Insere o jogador na mesa
    const { error: joinError } = await supabase
      .from('campaign_members')
      .insert([{ campaign_id: campaign.id, user_id: userId, role: 'jogador' }]);

    if (joinError) {
      setError('Você já está nesta mesa ou ocorreu um erro.');
      setLoading(false);
    } else {
      router.push(`/campanha/${campaign.id}`);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 1. Cria a campanha
    const { data: newCampaign, error: createError } = await supabase
      .from('campaigns')
      .insert([{ 
        title, 
        system, 
        cover_image: coverUrl, 
        next_session: nextSession || null, 
        description, 
        invite_code: generatedCode,
        owner_id: userId 
      }])
      .select()
      .single();

    if (createError) {
      setError(createError.message);
      setLoading(false);
      return;
    }

    // 2. Coloca o criador como Mestre na tabela de membros
    await supabase
      .from('campaign_members')
      .insert([{ campaign_id: newCampaign.id, user_id: userId, role: 'mestre' }]);

    router.push(`/campanha/${newCampaign.id}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl bg-codice-parchment p-6 shadow-2xl">
        
        {/* Botão Fechar */}
        <button onClick={onClose} className="absolute right-4 top-4 text-codice-dark/50 hover:text-codice-red">
          ✕
        </button>

        {error && <div className="mb-4 rounded bg-codice-red/10 p-3 text-sm text-codice-red">{error}</div>}

        {step === 'selecao' && (
          <div className="text-center">
            <h2 className="mb-6 text-2xl font-bold text-codice-dark">Nova Aventura</h2>
            <div className="flex flex-col gap-4">
              <button onClick={() => setStep('jogador')} className="rounded-md border-2 border-codice-green bg-transparent py-4 font-bold text-codice-green transition hover:bg-codice-green hover:text-codice-parchment">
                Tenho um Código de Convite
              </button>
              <button onClick={() => setStep('mestre')} className="rounded-md bg-codice-dark py-4 font-bold text-codice-parchment transition hover:bg-codice-green">
                Criar Nova Campanha
              </button>
            </div>
          </div>
        )}

        {step === 'jogador' && (
          <form onSubmit={handleJoinCampaign}>
            <button type="button" onClick={() => setStep('selecao')} className="mb-4 text-sm font-bold text-codice-green hover:underline">← Voltar</button>
            <h2 className="mb-4 text-xl font-bold text-codice-dark">Entrar em uma Mesa</h2>
            <p className="mb-4 text-sm text-codice-dark/70">Insira o código de 8 dígitos fornecido pelo seu Mestre.</p>
            <input
              type="text"
              maxLength={8}
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Ex: X9A2B4C1"
              className="mb-6 w-full rounded-md border border-codice-dark/20 bg-white p-3 text-center text-2xl font-bold text-codice-dark outline-none focus:border-codice-green"
              required
            />
            <button type="submit" disabled={loading || inviteCode.length < 8} className="w-full rounded-md bg-codice-green py-3 font-bold text-codice-parchment disabled:opacity-50 hover:bg-codice-dark">
              {loading ? 'Buscando...' : 'Entrar na Mesa'}
            </button>
          </form>
        )}

        {step === 'mestre' && (
          <form onSubmit={handleCreateCampaign} className="max-h-[75vh] overflow-y-auto pr-2">
            <button type="button" onClick={() => setStep('selecao')} className="mb-4 text-sm font-bold text-codice-green hover:underline">← Voltar</button>
            <h2 className="mb-6 text-xl font-bold text-codice-dark">Criar Campanha</h2>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-codice-dark">Imagem de Capa (URL)</label>
                <input type="url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." className="w-full rounded-md border border-codice-dark/20 p-2 outline-none focus:border-codice-green" />
              </div>
              
              <div>
                <label className="mb-1 block text-sm font-bold text-codice-dark">Nome da Campanha</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-codice-dark/20 p-2 outline-none focus:border-codice-green" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-bold text-codice-dark">Sistema</label>
                  <select value={system} onChange={(e) => setSystem(e.target.value)} className="w-full rounded-md border border-codice-dark/20 p-2 outline-none focus:border-codice-green">
                    <option>D&D 5e</option>
                    <option>Pathfinder 2e</option>
                    <option>Call of Cthulhu</option>
                    <option>Ordem Paranormal</option>
                    <option>Cyberpunk RED</option>
                    <option>Customizado</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-codice-dark">Próxima Sessão</label>
                  <input type="datetime-local" value={nextSession} onChange={(e) => setNextSession(e.target.value)} className="w-full rounded-md border border-codice-dark/20 p-2 text-sm outline-none focus:border-codice-green" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-codice-dark">Premissa / Sinopse</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full resize-none rounded-md border border-codice-dark/20 p-2 outline-none focus:border-codice-green" required />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-codice-dark">Código de Convite (Compartilhe com jogadores)</label>
                <div className="flex overflow-hidden rounded-md border border-codice-dark/20 bg-white">
                  <input type="text" value={generatedCode} readOnly className="w-full p-2 font-mono font-bold text-codice-green outline-none" />
                  <button type="button" onClick={() => navigator.clipboard.writeText(generatedCode)} className="bg-codice-dark/10 px-4 font-bold text-codice-dark hover:bg-codice-dark/20 transition">
                    Copiar
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="mt-4 w-full rounded-md bg-codice-dark py-3 font-bold text-codice-parchment transition hover:bg-codice-green disabled:opacity-50">
                {loading ? 'Forjando...' : 'Salvar Campanha'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}