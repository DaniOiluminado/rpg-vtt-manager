'use client';

import { use, useEffect, useState, Suspense } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../../components/Header';

type Member = { user_id: string; role: string; profiles: { display_name: string; avatar_url: string } };
type Summary = {
  id: string; title: string; description: string; session_number: number;
  is_draft: boolean; players_can_edit: boolean; session_date: string;
  attendance: string[]; linked_entities: any[]; created_at: string;
};

export default function SummariesPageWrapper({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="min-h-screen bg-codice-parchment pt-20 text-center font-bold text-codice-dark">Folheando os anais...</div>}>
      <SummariesBoard campaignId={id} />
    </Suspense>
  );
}

function SummariesBoard({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMaster, setIsMaster] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Summary>>({});

  useEffect(() => {
    fetchData();
  }, [campaignId]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/'); return; }
    setCurrentUser(user);

    const { data: membersData } = await supabase
      .from('campaign_members')
      .select(`user_id, role, profiles(display_name, avatar_url)`)
      .eq('campaign_id', campaignId);

    if (membersData) {
      setMembers(membersData as any);
      const me = membersData.find(m => m.user_id === user.id);
      if (!me) { router.push('/'); return; }
      setIsMaster(me.role === 'mestre');
    }

    const { data: summariesData } = await supabase
      .from('session_summaries')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('session_number', { ascending: false });

    if (summariesData) setSummaries(summariesData as Summary[]);
    setLoading(false);
  };

  const handleCreateDraft = async () => {
    const nextSessionNumber = summaries.length > 0 ? Math.max(...summaries.map(s => s.session_number)) + 1 : 1;
    
    const { data: newSummary } = await supabase.from('session_summaries').insert([{
      campaign_id: campaignId,
      title: `Sessão ${nextSessionNumber}`,
      description: '',
      session_number: nextSessionNumber,
      is_draft: true,
      players_can_edit: false,
      session_date: new Date().toISOString().split('T')[0]
    }]).select().single();

    if (newSummary) {
      setSummaries([newSummary as Summary, ...summaries]);
      setEditingId(newSummary.id);
      setEditForm(newSummary);
    }
  };

  const handleSave = async () => {
    if (!editingId) return;
    
    const { error } = await supabase
      .from('session_summaries')
      .update(editForm)
      .eq('id', editingId);

    if (!error) {
      setSummaries(summaries.map(s => s.id === editingId ? { ...s, ...editForm } as Summary : s));
      setEditingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('O Mestre deseja realmente apagar este registro dos anais para sempre?')) return;
    
    const { error } = await supabase.from('session_summaries').delete().eq('id', id);
    if (!error) {
      setSummaries(summaries.filter(s => s.id !== id));
      if (editingId === id) setEditingId(null);
    }
  };

  const toggleAttendance = (userId: string) => {
    const current = editForm.attendance || [];
    if (current.includes(userId)) {
      setEditForm({ ...editForm, attendance: current.filter(id => id !== userId) });
    } else {
      setEditForm({ ...editForm, attendance: [...current, userId] });
    }
  };

  const visibleSummaries = summaries.filter(s => isMaster || !s.is_draft);

  const renderDescription = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      const match = part.match(/@\[(.*?)\]\((.*?)\)/);
      if (match) {
        return <span key={i} className="text-codice-green font-bold cursor-pointer hover:underline bg-codice-green/10 px-1 rounded">{match[1]}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (loading) return <div className="min-h-screen bg-codice-parchment pt-20 text-center font-bold text-codice-dark">Carregando os tomos...</div>;

  return (
    <div className="min-h-screen bg-codice-parchment flex flex-col">
      <Header />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <div className="mb-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-codice-dark/20 pb-4">
          <div>
            <Link href={`/campanha/${campaignId}`} className="mb-2 inline-block text-sm font-bold text-codice-dark/60 hover:text-codice-dark">← Voltar para a Campanha</Link>
            <h1 className="text-4xl font-black text-codice-dark">Diário de Campanha</h1>
          </div>
          {isMaster && (
            <button onClick={handleCreateDraft} className="rounded-md bg-codice-dark px-6 py-3 font-bold text-white hover:bg-codice-green transition shadow-md">
              + Registrar Sessão
            </button>
          )}
        </div>

        {visibleSummaries.length === 0 ? (
          <div className="py-12 text-center text-codice-dark/50">
            <p className="font-medium text-lg">As páginas do diário estão em branco.</p>
          </div>
        ) : (
          <div className="relative border-l-4 border-codice-dark/20 ml-4 space-y-12 pb-12">
            {visibleSummaries.map((summary) => {
              const isEditing = editingId === summary.id;
              const canUserEdit = isMaster || (!summary.is_draft && summary.players_can_edit);
              const isDraft = summary.is_draft;

              return (
                <div key={summary.id} className="relative pl-8">
                  <div className={`absolute -left-[14px] top-6 h-6 w-6 rounded-full border-4 border-codice-parchment ${isDraft ? 'bg-codice-red' : 'bg-codice-green'}`} />
                  
                  {isEditing ? (
                    // MODO EDIÇÃO
                    <div className="bg-white rounded-xl shadow-lg border-2 border-codice-green overflow-hidden">
                      <div className="p-6 space-y-4">
                        
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-codice-dark mb-1 uppercase">Título da Sessão</label>
                            <input value={editForm.title || ''} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full bg-codice-dark/5 rounded p-2 outline-none focus:border-codice-green font-bold text-lg" />
                          </div>
                          <div className="w-40">
                            <label className="block text-xs font-bold text-codice-dark mb-1 uppercase">Data</label>
                            <input type="date" value={editForm.session_date || ''} onChange={e => setEditForm({...editForm, session_date: e.target.value})} className="w-full bg-codice-dark/5 rounded p-2 outline-none font-medium text-sm" />
                          </div>
                        </div>

                        {/* Barra de Ferramentas Compacta */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-codice-dark/5 p-3 rounded-lg border border-codice-dark/10">
                          <div className="flex items-center gap-3">
                             <span className="text-xs font-bold text-codice-dark uppercase">Presentes:</span>
                             <div className="flex -space-x-2">
                                {members.map(m => {
                                  const isPresent = (editForm.attendance || []).includes(m.user_id);
                                  return (
                                    <button 
                                      key={m.user_id} 
                                      onClick={() => toggleAttendance(m.user_id)}
                                      title={m.profiles.display_name}
                                      className={`relative w-8 h-8 rounded-full border-2 border-white transition-all hover:z-10 hover:scale-110 ${isPresent ? 'grayscale-0 opacity-100 ring-2 ring-codice-green' : 'grayscale opacity-50'}`}
                                    >
                                      <img src={m.profiles.avatar_url} className="w-full h-full rounded-full bg-codice-dark object-cover" />
                                    </button>
                                  )
                                })}
                             </div>
                          </div>
                          
                          {isMaster && (
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-codice-dark/70">
                                <input type="checkbox" checked={!editForm.is_draft} onChange={e => setEditForm({...editForm, is_draft: !e.target.checked})} className="accent-codice-green" />
                                Público
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-codice-dark/70">
                                <input type="checkbox" checked={editForm.players_can_edit} onChange={e => setEditForm({...editForm, players_can_edit: e.target.checked})} className="accent-codice-green" disabled={editForm.is_draft} />
                                Edição Livre
                              </label>
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-bold text-codice-dark uppercase">Acontecimentos</label>
                            <span className="text-[10px] font-bold text-codice-dark/50 uppercase">Use @ para referenciar entidades (Em breve)</span>
                          </div>
                          <textarea value={editForm.description || ''} onChange={e => setEditForm({...editForm, description: e.target.value})} rows={8} className="w-full bg-codice-parchment/30 rounded border border-codice-dark/10 p-3 outline-none focus:border-codice-green text-codice-dark resize-y font-medium" placeholder="O que ocorreu neste dia?" />
                        </div>

                        <div className="border-t border-codice-dark/10 pt-4">
                          <label className="block text-xs font-bold text-codice-dark mb-3 uppercase">Cards Anexados (Demonstração)</label>
                          <div className="flex gap-4">
                            <div className="border border-codice-dark/10 rounded-lg p-2 bg-codice-dark/5 flex items-center gap-3 pr-8 relative cursor-pointer group">
                              <div className="text-2xl">⚔️</div>
                              <div>
                                <p className="text-xs font-black text-codice-dark group-hover:text-codice-green">A Lâmina Oblifferum</p>
                                <p className="text-[10px] font-bold uppercase text-codice-dark/50">Item Sagrado</p>
                              </div>
                              <button className="absolute right-2 top-2 text-codice-dark/30 hover:text-codice-red">✕</button>
                            </div>
                          </div>
                        </div>

                      </div>
                      
                      <div className="bg-codice-dark/5 p-4 flex justify-between items-center border-t border-codice-dark/10">
                        <div>
                          {isMaster && (
                            <button onClick={() => handleDelete(summary.id)} className="text-sm font-bold text-codice-red hover:underline">
                              Excluir Registro
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm font-bold text-codice-dark/60 hover:text-codice-dark">Cancelar</button>
                          <button onClick={handleSave} className="px-6 py-2 rounded bg-codice-green text-white font-bold hover:bg-codice-dark transition shadow">Salvar Manuscrito</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    
                    // MODO VISUALIZAÇÃO
                    <div className="bg-white rounded-xl shadow-sm border border-codice-dark/10 p-6 transition hover:shadow-md">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h2 className="text-2xl font-black text-codice-dark flex items-center gap-3">
                            <span className="text-codice-dark/40 font-medium">#{summary.session_number}</span> 
                            {summary.title}
                          </h2>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs font-bold uppercase text-codice-dark/50 bg-codice-dark/5 px-2 py-1 rounded">
                              {new Date(summary.session_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                            </span>
                            {isDraft && <span className="text-xs font-bold uppercase text-codice-red bg-codice-red/10 px-2 py-1 rounded">Rascunho Oculto</span>}
                            {!isDraft && summary.players_can_edit && <span className="text-xs font-bold uppercase text-codice-green bg-codice-green/10 px-2 py-1 rounded">Edição Livre</span>}
                          </div>
                        </div>

                        <div className="flex gap-3">
                          {canUserEdit && (
                            <button onClick={() => { setEditingId(summary.id); setEditForm(summary); }} className="text-sm font-bold text-codice-green hover:underline">
                              Editar
                            </button>
                          )}
                          {isMaster && !canUserEdit && (
                            <button onClick={() => handleDelete(summary.id)} className="text-sm font-bold text-codice-red hover:underline">
                              Excluir
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-codice-dark/80 whitespace-pre-wrap font-medium leading-relaxed my-6">
                        {summary.description ? renderDescription(summary.description) : <span className="italic text-codice-dark/30">Nenhum relato escrito...</span>}
                      </p>

                      <div className="flex flex-col sm:flex-row gap-6 mt-8 pt-6 border-t border-codice-dark/10">
                        {summary.attendance && summary.attendance.length > 0 && (
                          <div className="flex-1">
                            <span className="block text-[10px] font-bold text-codice-dark/50 uppercase mb-2">Com a presença de:</span>
                            <div className="flex -space-x-2">
                              {summary.attendance.map(id => {
                                const member = members.find(m => m.user_id === id);
                                if (!member) return null;
                                return <img key={id} src={member.profiles.avatar_url} title={member.profiles.display_name} className="w-8 h-8 rounded-full border-2 border-white bg-codice-dark object-cover hover:z-10 transition-transform hover:scale-110" />;
                              })}
                            </div>
                          </div>
                        )}

                        <div className="flex-1">
                          <span className="block text-[10px] font-bold text-codice-dark/50 uppercase mb-2">Anexos Mapeados:</span>
                          <div className="flex gap-2">
                            <div className="px-3 py-1.5 rounded bg-codice-dark/5 border border-codice-dark/10 flex items-center gap-2 cursor-pointer hover:border-codice-green transition">
                              <span className="text-sm">⚔️</span>
                              <span className="text-xs font-bold text-codice-dark">Oblifferum</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}