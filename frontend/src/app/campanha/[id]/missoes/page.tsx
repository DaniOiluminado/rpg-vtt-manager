'use client';

import { use, useEffect, useState, Suspense } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../../components/Header';
import imageCompression from 'browser-image-compression';

type Objective = { id: string; text: string; completed: boolean };
type Quest = {
  id: string; title: string; description: string; location: string;
  recommended_level: string; type: 'Principal' | 'Secundária';
  status: 'Não iniciada' | 'Em andamento' | 'Concluída';
  is_draft: boolean; master_notes: string; icon_url: string;
  objectives: Objective[]; created_at: string;
};

export default function QuestsPageWrapper({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="min-h-screen bg-codice-parchment pt-20 text-center font-bold text-codice-dark">Lendo pergaminhos...</div>}>
      <QuestBoard campaignId={id} />
    </Suspense>
  );
}

function QuestBoard({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuestId = searchParams.get('questId');

  const [quests, setQuests] = useState<Quest[]>([]);
  const [isMaster, setIsMaster] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'ativas' | 'concluidas' | 'rascunhos'>('ativas');
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState(''); // <--- Estado de erro adicionado

  const [mockEntities, setMockEntities] = useState([
    { id: 1, name: 'Rei Ezequiel (NPC)', icon: '👤', visible: true },
    { id: 2, name: 'Mapa das Cavernas', icon: '🗺️', visible: false }
  ]);

  useEffect(() => {
    fetchQuestsAndRole();
  }, [campaignId]);

  const fetchQuestsAndRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/'); return; }

    const { data: member } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single();

    if (!member) { router.push('/'); return; }
    setIsMaster(member.role === 'mestre');

    const { data: questsData } = await supabase
      .from('quests')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (questsData) {
      setQuests(questsData as Quest[]);
      
      if (questsData.length > 0) {
        if (urlQuestId) {
          const target = questsData.find(q => q.id === urlQuestId);
          if (target) {
            setSelectedQuest(target as Quest);
            if (target.is_draft) setActiveTab('rascunhos');
            else if (target.status === 'Concluída') setActiveTab('concluidas');
            else setActiveTab('ativas');
          }
        } else {
          const firstActive = questsData.find(q => !q.is_draft && q.status !== 'Concluída');
          setSelectedQuest((firstActive || questsData[0]) as Quest);
        }
      }
    }
    setLoading(false);
  };

  const handleUpdateQuest = async (updatedQuest: Quest) => {
    setSelectedQuest(updatedQuest);
    setQuests(quests.map(q => q.id === updatedQuest.id ? updatedQuest : q));
    
    await supabase
      .from('quests')
      .update({
        title: updatedQuest.title, description: updatedQuest.description,
        location: updatedQuest.location, recommended_level: updatedQuest.recommended_level,
        type: updatedQuest.type, status: updatedQuest.status,
        is_draft: updatedQuest.is_draft, master_notes: updatedQuest.master_notes,
        objectives: updatedQuest.objectives
      })
      .eq('id', updatedQuest.id);
  };

  const filteredQuests = quests.filter(q => {
    if (activeTab === 'rascunhos') return q.is_draft;
    if (activeTab === 'concluidas') return !q.is_draft && q.status === 'Concluída';
    return !q.is_draft && q.status !== 'Concluída';
  });

  if (loading) return <div className="min-h-screen bg-codice-parchment pt-20 text-center font-bold text-codice-dark">Lendo pergaminhos...</div>;

  return (
    <div className="min-h-screen bg-codice-parchment flex flex-col">
      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 flex flex-col h-[calc(100vh-80px)]">
        
        <div className="mb-6 flex items-center justify-between border-b border-codice-dark/20 pb-4">
          <div>
            <Link href={`/campanha/${campaignId}`} className="mb-2 inline-block text-sm font-bold text-codice-dark/60 hover:text-codice-dark">← Voltar para a Campanha</Link>
            <h1 className="text-3xl font-black text-codice-dark">Quadro de Missões</h1>
          </div>
          {isMaster && (
            <button onClick={() => { setIsModalOpen(true); setFormError(''); }} className="rounded-md bg-codice-green px-6 py-2 font-bold text-codice-parchment hover:bg-codice-dark transition">
              + Nova Missão
            </button>
          )}
        </div>

        <div className="flex flex-1 gap-8 min-h-0">
          
          <div className="w-1/3 flex flex-col border-r border-codice-dark/10 pr-6">
            <div className="flex gap-2 mb-4 border-b border-codice-dark/10">
              <button onClick={() => setActiveTab('ativas')} className={`pb-2 text-sm font-bold border-b-2 ${activeTab === 'ativas' ? 'border-codice-green text-codice-dark' : 'border-transparent text-codice-dark/50'}`}>Ativas</button>
              <button onClick={() => setActiveTab('concluidas')} className={`pb-2 text-sm font-bold border-b-2 ${activeTab === 'concluidas' ? 'border-codice-green text-codice-dark' : 'border-transparent text-codice-dark/50'}`}>Concluídas</button>
              {isMaster && (
                <button onClick={() => setActiveTab('rascunhos')} className={`pb-2 text-sm font-bold border-b-2 ${activeTab === 'rascunhos' ? 'border-codice-red text-codice-red' : 'border-transparent text-codice-dark/50'}`}>Rascunhos</button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {filteredQuests.length === 0 ? (
                <p className="text-sm font-medium text-codice-dark/50 text-center py-8">Nenhuma missão encontrada.</p>
              ) : (
                filteredQuests.map(quest => (
                  <button 
                    key={quest.id} 
                    onClick={() => setSelectedQuest(quest)}
                    className={`w-full text-left rounded-lg p-3 border transition ${selectedQuest?.id === quest.id ? 'bg-white border-codice-green shadow-sm' : 'bg-transparent border-codice-dark/10 hover:bg-white/50'}`}
                  >
                    <div className="flex items-start gap-3">
                      {quest.icon_url ? (
                        <img src={quest.icon_url} alt="Ícone" className="w-10 h-10 rounded bg-codice-dark/10 object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-codice-dark/10 flex items-center justify-center text-xl">📜</div>
                      )}
                      <div>
                        <h4 className="font-bold text-codice-dark truncate w-48">{quest.title}</h4>
                        <div className="flex gap-2 mt-1 text-[10px] font-bold uppercase">
                          <span className={quest.type === 'Principal' ? 'text-codice-red' : 'text-codice-dark/60'}>{quest.type}</span>
                          <span className="text-codice-green">{quest.status}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-8 pr-4">
            {selectedQuest ? (
              <div className="space-y-8">
                
                <section className="bg-white rounded-xl p-6 shadow-sm border border-codice-dark/10">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      {selectedQuest.icon_url && <img src={selectedQuest.icon_url} className="w-16 h-16 rounded-lg object-cover shadow" />}
                      <div>
                        {isMaster ? (
                          <input 
                            value={selectedQuest.title} 
                            onChange={(e) => handleUpdateQuest({...selectedQuest, title: e.target.value})}
                            className="text-3xl font-black text-codice-dark bg-transparent border-b border-transparent hover:border-codice-dark/20 focus:border-codice-green outline-none w-full"
                          />
                        ) : (
                          <h2 className="text-3xl font-black text-codice-dark">{selectedQuest.title}</h2>
                        )}
                        
                        <div className="flex gap-3 mt-2">
                          {isMaster ? (
                            <>
                              <select value={selectedQuest.type} onChange={(e) => handleUpdateQuest({...selectedQuest, type: e.target.value as any})} className="text-xs font-bold uppercase bg-codice-dark/5 rounded p-1 outline-none cursor-pointer">
                                <option>Principal</option><option>Secundária</option>
                              </select>
                              <select value={selectedQuest.status} onChange={(e) => handleUpdateQuest({...selectedQuest, status: e.target.value as any})} className="text-xs font-bold uppercase bg-codice-dark/5 rounded p-1 outline-none cursor-pointer">
                                <option>Não iniciada</option><option>Em andamento</option><option>Concluída</option>
                              </select>
                              {activeTab === 'rascunhos' && (
                                <button onClick={() => handleUpdateQuest({...selectedQuest, is_draft: false})} className="text-xs font-bold uppercase bg-codice-green text-white rounded px-2 p-1 hover:bg-codice-dark transition">
                                  Publicar
                                </button>
                              )}
                              {!selectedQuest.is_draft && (
                                <button onClick={() => handleUpdateQuest({...selectedQuest, is_draft: true})} className="text-xs font-bold uppercase bg-codice-red text-white rounded px-2 p-1 hover:bg-codice-dark transition">
                                  Reverter para Rascunho
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="text-xs font-bold uppercase bg-codice-dark/5 rounded px-2 py-1">{selectedQuest.type}</span>
                              <span className="text-xs font-bold uppercase bg-codice-dark/5 rounded px-2 py-1">{selectedQuest.status}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
                    <div>
                      <span className="block font-bold text-codice-dark/50 uppercase text-xs mb-1">Localização</span>
                      {isMaster ? (
                         <input value={selectedQuest.location} onChange={(e) => handleUpdateQuest({...selectedQuest, location: e.target.value})} placeholder="Ex: Cavernas do Eco" className="w-full bg-transparent border-b border-codice-dark/20 outline-none focus:border-codice-green font-medium text-codice-dark" />
                      ) : <span className="font-medium text-codice-dark">{selectedQuest.location || 'Desconhecido'}</span>}
                    </div>
                    <div>
                      <span className="block font-bold text-codice-dark/50 uppercase text-xs mb-1">Nível Recomendado</span>
                      {isMaster ? (
                         <input value={selectedQuest.recommended_level} onChange={(e) => handleUpdateQuest({...selectedQuest, recommended_level: e.target.value})} placeholder="Ex: Nível 3-4" className="w-full bg-transparent border-b border-codice-dark/20 outline-none focus:border-codice-green font-medium text-codice-dark" />
                      ) : <span className="font-medium text-codice-dark">{selectedQuest.recommended_level || 'N/A'}</span>}
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="block font-bold text-codice-dark/50 uppercase text-xs mb-2">Descrição</span>
                    {isMaster ? (
                      <textarea value={selectedQuest.description} onChange={(e) => handleUpdateQuest({...selectedQuest, description: e.target.value})} rows={4} placeholder="Descreva a premissa da missão..." className="w-full bg-codice-parchment/30 rounded border border-codice-dark/10 p-3 outline-none focus:border-codice-green text-codice-dark resize-none" />
                    ) : <p className="text-codice-dark whitespace-pre-wrap">{selectedQuest.description}</p>}
                  </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <section className="bg-white rounded-xl p-6 shadow-sm border border-codice-dark/10">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-codice-dark text-lg">Objetivos</h3>
                      {isMaster && (
                        <button 
                          onClick={() => handleUpdateQuest({...selectedQuest, objectives: [...selectedQuest.objectives, { id: Date.now().toString(), text: '', completed: false }]})}
                          className="text-xs font-bold text-codice-green hover:underline"
                        >+ Adicionar</button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {selectedQuest.objectives.length === 0 && <p className="text-sm text-codice-dark/50">Nenhum objetivo traçado.</p>}
                      {selectedQuest.objectives.map((obj, index) => (
                        <div key={obj.id} className="flex items-center gap-3">
                          <input type="checkbox" checked={obj.completed} onChange={(e) => {
                            const newObjs = [...selectedQuest.objectives];
                            newObjs[index].completed = e.target.checked;
                            handleUpdateQuest({...selectedQuest, objectives: newObjs});
                          }} className="w-4 h-4 cursor-pointer accent-codice-green" disabled={!isMaster} />
                          
                          {isMaster ? (
                            <input value={obj.text} onChange={(e) => {
                              const newObjs = [...selectedQuest.objectives];
                              newObjs[index].text = e.target.value;
                              handleUpdateQuest({...selectedQuest, objectives: newObjs});
                            }} placeholder="Descreva o objetivo..." className={`flex-1 bg-transparent border-b border-transparent outline-none focus:border-codice-green text-sm ${obj.completed ? 'line-through text-codice-dark/40' : 'text-codice-dark'}`} />
                          ) : (
                            <span className={`text-sm ${obj.completed ? 'line-through text-codice-dark/40' : 'text-codice-dark'}`}>{obj.text}</span>
                          )}
                          
                          {isMaster && (
                            <button onClick={() => handleUpdateQuest({...selectedQuest, objectives: selectedQuest.objectives.filter(o => o.id !== obj.id)})} className="text-codice-dark/30 hover:text-codice-red text-xs">✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="bg-white rounded-xl p-6 shadow-sm border border-codice-dark/10">
                    <h3 className="font-bold text-codice-dark text-lg mb-4">Entidades Anexadas</h3>
                    <div className="space-y-2">
                      {mockEntities.map(entity => (
                        <div key={entity.id} className="flex justify-between items-center bg-codice-parchment/30 p-2 rounded border border-codice-dark/5">
                          <div className="flex items-center gap-2">
                            <span>{entity.icon}</span>
                            <span className="text-sm font-bold text-codice-dark">{entity.name}</span>
                          </div>
                          {isMaster && (
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-codice-dark/60">
                              <input type="checkbox" checked={entity.visible} onChange={() => {
                                setMockEntities(mockEntities.map(e => e.id === entity.id ? {...e, visible: !e.visible} : e))
                              }} className="accent-codice-green" />
                              Visível
                            </label>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-xs font-bold text-codice-dark/40 text-center uppercase border-t border-codice-dark/5 pt-2">
                      (Integração com Cofre em breve)
                    </p>
                  </section>
                </div>

                {isMaster && (
                  <section className="bg-codice-dark/5 rounded-xl p-6 border border-codice-dark/10 border-l-4 border-l-codice-dark">
                    <h3 className="font-bold text-codice-dark text-lg mb-2 flex items-center gap-2">
                      <span>👁️</span> Notas do Mestre (Secretas)
                    </h3>
                    <textarea 
                      value={selectedQuest.master_notes} 
                      onChange={(e) => handleUpdateQuest({...selectedQuest, master_notes: e.target.value})}
                      rows={5} 
                      placeholder="Informações ocultas, armadilhas, segredos sobre esta missão..." 
                      className="w-full bg-white/50 rounded border border-codice-dark/10 p-3 outline-none focus:border-codice-dark text-sm text-codice-dark resize-none font-medium" 
                    />
                  </section>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center">
                <p className="text-codice-dark/50 font-medium">Selecione uma missão no quadro ou crie uma nova.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form onSubmit={async (e) => {
            e.preventDefault();
            setFormError(''); // Limpa o erro ao tentar de novo
            const form = e.target as any;
            let iconUrl = '';

            try {
              if (form.imageMode.value === 'upload' && form.fileInput.files[0]) {
                const file = form.fileInput.files[0];
                const compressed = await imageCompression(file, { maxSizeMB: 0.2, maxWidthOrHeight: 500 });
                const fileName = `quest-${Date.now()}.jpg`;
                const { error: uploadError } = await supabase.storage.from('campaign_covers').upload(fileName, compressed);
                if (uploadError) throw uploadError;
                const { data } = supabase.storage.from('campaign_covers').getPublicUrl(fileName);
                iconUrl = data.publicUrl;
              } else {
                iconUrl = form.urlInput.value;
              }

              const { data: newQuest, error: insertError } = await supabase.from('quests').insert([{
                campaign_id: campaignId,
                title: form.qTitle.value,
                type: form.qType.value,
                status: 'Não iniciada', // STATUS EXPLICITO
                icon_url: iconUrl,
                is_draft: true,
                description: '', location: '', recommended_level: '', master_notes: ''
              }]).select().single();

              if (insertError) {
                setFormError('Erro ao salvar no banco: ' + insertError.message);
              } else if (newQuest) {
                setQuests([newQuest as Quest, ...quests]);
                setActiveTab('rascunhos');
                setSelectedQuest(newQuest as Quest);
                setIsModalOpen(false);
              }
            } catch (err: any) {
              setFormError('Erro inesperado: ' + err.message);
            }
          }} className="relative w-full max-w-md bg-codice-parchment rounded-xl p-6 shadow-2xl">
            <button type="button" onClick={() => { setIsModalOpen(false); setFormError(''); }} className="absolute right-4 top-4 text-codice-dark/50 hover:text-codice-red">✕</button>
            <h2 className="mb-6 text-xl font-bold text-codice-dark">Iniciar Nova Missão</h2>
            
            {formError && (
              <div className="mb-4 rounded bg-codice-red/10 p-3 text-sm font-bold text-codice-red">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-codice-dark mb-1">Título</label>
                <input name="qTitle" type="text" required className="w-full rounded border border-codice-dark/20 p-2 outline-none focus:border-codice-green" />
              </div>
              <div>
                <label className="block text-sm font-bold text-codice-dark mb-1">Tipo</label>
                <select name="qType" className="w-full rounded border border-codice-dark/20 p-2 outline-none focus:border-codice-green">
                  <option value="Principal">Principal</option>
                  <option value="Secundária">Secundária</option>
                </select>
              </div>
              <div className="p-3 border border-codice-dark/10 bg-white/50 rounded">
                <label className="block text-sm font-bold text-codice-dark mb-2">Ícone da Missão</label>
                <div className="flex gap-4 mb-2">
                  <label className="text-sm"><input type="radio" name="imageMode" value="upload" defaultChecked className="mr-1 accent-codice-green"/> Upload</label>
                  <label className="text-sm"><input type="radio" name="imageMode" value="url" className="mr-1 accent-codice-green"/> URL</label>
                </div>
                <input name="fileInput" type="file" accept="image/*" className="w-full text-xs file:bg-codice-green file:text-white file:border-0 file:rounded file:px-2 file:py-1 hover:file:bg-codice-dark cursor-pointer" />
                <input name="urlInput" type="url" placeholder="Ou cole a URL..." className="mt-2 w-full text-sm rounded border border-codice-dark/20 p-1 outline-none focus:border-codice-green" />
              </div>
              <button type="submit" className="w-full bg-codice-dark text-white font-bold py-3 rounded hover:bg-codice-green transition mt-4">
                Criar Rascunho
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}