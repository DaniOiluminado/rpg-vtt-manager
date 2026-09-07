'use client';

import { use, useEffect, useState, Suspense } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../../components/Header';

type Folder = { id: string; name: string; parent_id: string | null };
type Entity = {
  id: string; folder_id: string | null; name: string; type: string;
  description: string; image_url: string; is_visible_to_players: boolean;
};

const entityTypes = [
  { value: 'npc', label: 'NPC', icon: '👤' },
  { value: 'personagem', label: 'Personagem (Jogador)', icon: '🛡️' },
  { value: 'criatura', label: 'Criatura / Monstro', icon: '🐺' },
  { value: 'lugar', label: 'Lugar / Mapa', icon: '🗺️' },
  { value: 'item', label: 'Item / Relíquia', icon: '⚔️' },
  { value: 'documento', label: 'Documento / Lore', icon: '📜' },
  { value: 'magia', label: 'Magia / Habilidade', icon: '✨' },
];

export default function AcervoPageWrapper({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="min-h-screen bg-codice-parchment pt-20 text-center font-bold text-codice-dark">Abrindo as portas do Acervo...</div>}>
      <AcervoBoard campaignId={id} />
    </Suspense>
  );
}

function AcervoBoard({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlEntityId = searchParams.get('entity');
  
  const [folders, setFolders] = useState<Folder[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  
  const [isMaster, setIsMaster] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);

  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  
  // Tratamento de Erros Visuais
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    fetchAcervo();
  }, [campaignId]);

  const fetchAcervo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/'); return; }

    const { data: member } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single();

    if (!member) { router.push('/'); return; }
    const userIsMaster = member.role === 'mestre';
    setIsMaster(userIsMaster);

    const { data: foldersData } = await supabase
      .from('folders')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('name');
    if (foldersData) setFolders(foldersData as Folder[]);

    let query = supabase.from('entities').select('*').eq('campaign_id', campaignId).order('name');
    if (!userIsMaster) {
      query = query.eq('is_visible_to_players', true);
    }
    
    const { data: entitiesData } = await query;
    if (entitiesData) {
      setEntities(entitiesData as Entity[]);
      if (urlEntityId) {
        const target = entitiesData.find(e => e.id === urlEntityId);
        if (target) setSelectedEntity(target as Entity);
      }
    }

    setLoading(false);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    const form = e.target as any;
    const parentId = form.fParent.value === 'root' ? null : form.fParent.value;
    
    const { data: newFolder, error } = await supabase.from('folders').insert([{
      campaign_id: campaignId,
      name: form.fName.value,
      parent_id: parentId
    }]).select().single();

    if (error) {
      setModalError('Erro do Banco: ' + error.message);
      return;
    }

    if (newFolder) {
      setFolders([...folders, newFolder as Folder]);
      if (parentId && !expandedFolders.includes(parentId)) {
        setExpandedFolders([...expandedFolders, parentId]);
      }
      setIsFolderModalOpen(false);
    }
  };

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    const form = e.target as any;
    const folderId = form.eFolder.value === 'root' ? null : form.eFolder.value;
    
    const { data: newEntity, error } = await supabase.from('entities').insert([{
      campaign_id: campaignId,
      folder_id: folderId,
      name: form.eName.value,
      type: form.eType.value,
      is_visible_to_players: false,
      description: ''
    }]).select().single();

    if (error) {
      setModalError('Erro do Banco: ' + error.message);
      return;
    }

    if (newEntity) {
      setEntities([...entities, newEntity as Entity]);
      setSelectedEntity(newEntity as Entity);
      if (folderId && !expandedFolders.includes(folderId)) {
        setExpandedFolders([...expandedFolders, folderId]);
      }
      setIsEntityModalOpen(false);
    }
  };

  const handleUpdateVisibility = async (entity: Entity, isVisible: boolean) => {
    const { error } = await supabase.from('entities').update({ is_visible_to_players: isVisible }).eq('id', entity.id);
    if (!error) {
      setEntities(entities.map(e => e.id === entity.id ? { ...e, is_visible_to_players: isVisible } : e));
      if (selectedEntity?.id === entity.id) {
        setSelectedEntity({ ...selectedEntity, is_visible_to_players: isVisible });
      }
    }
  };

  const toggleFolder = (folderId: string) => {
    if (expandedFolders.includes(folderId)) {
      setExpandedFolders(expandedFolders.filter(id => id !== folderId));
    } else {
      setExpandedFolders([...expandedFolders, folderId]);
    }
  };

  const renderTree = (parentId: string | null = null, level: number = 0) => {
    const childFolders = folders.filter(f => f.parent_id === parentId);
    const childEntities = entities.filter(e => e.folder_id === parentId);

    if (parentId !== null && childFolders.length === 0 && childEntities.length === 0) {
      return (
        <div style={{ paddingLeft: `${(level * 12) + 24}px` }} className="py-1">
          <span className="text-[10px] italic text-codice-dark/40 uppercase">Pasta Vazia</span>
        </div>
      );
    }

    return (
      <div className="space-y-0.5">
        {childFolders.map(folder => {
          const isOpen = expandedFolders.includes(folder.id);
          return (
            <div key={folder.id} className="w-full">
              <div
                className="flex items-center justify-between py-1.5 pr-2 rounded hover:bg-codice-dark/10 cursor-pointer group transition-colors"
                style={{ paddingLeft: `${(level * 12) + 8}px` }}
                onClick={() => toggleFolder(folder.id)}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-[10px] text-codice-dark/40 w-3">{isOpen ? '▼' : '▶'}</span>
                  <span className="text-sm grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition">📂</span>
                  <span className="text-sm font-bold text-codice-dark truncate select-none">{folder.name}</span>
                </div>
                {isMaster && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setTargetFolderId(folder.id); setIsEntityModalOpen(true); setModalError(''); }} 
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-codice-dark/20 text-codice-dark hover:border-codice-green hover:text-codice-green font-bold" 
                      title="Nova Entidade aqui"
                    >
                      +Item
                    </button>
                  </div>
                )}
              </div>
              {isOpen && (
                <div className="mt-0.5">
                  {renderTree(folder.id, level + 1)}
                </div>
              )}
            </div>
          )
        })}
        
        {childEntities.map(entity => (
          <button
            key={entity.id}
            onClick={() => setSelectedEntity(entity)}
            className={`w-full text-left flex items-center gap-2 py-1.5 pr-2 rounded transition-colors group ${selectedEntity?.id === entity.id ? 'bg-codice-green text-white shadow-sm' : 'hover:bg-codice-dark/5 text-codice-dark/80'}`}
            style={{ paddingLeft: `${(level * 12) + 24}px` }}
          >
            <span className={`text-sm transition-transform ${selectedEntity?.id === entity.id ? 'scale-110' : 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100'}`}>
              {getEntityIcon(entity.type)}
            </span>
            <span className="text-xs font-bold truncate flex-1">{entity.name}</span>
            {isMaster && !entity.is_visible_to_players && (
              <span title="Oculto dos jogadores" className="text-[10px] opacity-60 ml-1">👁️‍🗨️</span>
            )}
          </button>
        ))}
      </div>
    );
  };

  const getEntityIcon = (type: string) => entityTypes.find(t => t.value === type)?.icon || '❓';
  const getEntityLabel = (type: string) => entityTypes.find(t => t.value === type)?.label || 'Desconhecido';

  if (loading) return <div className="min-h-screen bg-codice-parchment pt-20 text-center font-bold text-codice-dark">Abrindo as portas do Acervo...</div>;

  return (
    <div className="min-h-screen bg-codice-parchment flex flex-col h-screen overflow-hidden">
      <Header />

      <main className="flex-1 flex overflow-hidden">
        
        <div className="w-80 bg-codice-dark/5 border-r border-codice-dark/10 flex flex-col shadow-[inset_-4px_0_12px_rgba(0,0,0,0.02)]">
          <div className="p-6 border-b border-codice-dark/10 bg-codice-parchment/50">
            <Link href={`/campanha/${campaignId}`} className="mb-2 inline-block text-xs font-bold text-codice-dark/60 hover:text-codice-dark">← Voltar à Campanha</Link>
            <h1 className="text-2xl font-black text-codice-dark mb-4 flex items-center gap-2">
              🗄️ Acervo
            </h1>
            
            {isMaster && (
              <div className="flex gap-2">
                <button onClick={() => { setTargetFolderId(null); setIsEntityModalOpen(true); setModalError(''); }} className="flex-1 bg-codice-dark text-white text-xs font-bold py-2 rounded border border-codice-dark hover:bg-codice-green hover:border-codice-green transition shadow-sm">
                  + Nova Entidade
                </button>
                <button onClick={() => { setTargetFolderId(null); setIsFolderModalOpen(true); setModalError(''); }} className="flex-1 bg-white text-codice-dark text-xs font-bold py-2 rounded border border-codice-dark/20 hover:border-codice-dark transition shadow-sm">
                  + Nova Pasta
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {folders.length === 0 && entities.length === 0 ? (
              <div className="text-center py-8 text-codice-dark/40">
                <span className="text-3xl block mb-2">🕷️</span>
                <p className="text-xs font-medium uppercase">Nenhum registro encontrado.</p>
              </div>
            ) : (
              renderTree(null, 0)
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-codice-parchment p-8 relative">
          {selectedEntity ? (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
              
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-xl bg-white flex items-center justify-center text-4xl shadow-sm border border-codice-dark/10">
                    {getEntityIcon(selectedEntity.type)}
                  </div>
                  <div>
                    <h2 className="text-4xl font-black text-codice-dark drop-shadow-sm">{selectedEntity.name}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-bold uppercase text-codice-dark/60 bg-codice-dark/5 px-2 py-1 rounded">
                        {getEntityLabel(selectedEntity.type)}
                      </span>
                      {selectedEntity.folder_id && (
                        <span className="text-xs font-bold text-codice-dark/40 flex items-center gap-1">
                          Em: 📂 {folders.find(f => f.id === selectedEntity.folder_id)?.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {isMaster && (
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-full shadow-sm border border-codice-dark/10 hover:border-codice-green transition">
                    <input 
                      type="checkbox" 
                      checked={selectedEntity.is_visible_to_players} 
                      onChange={(e) => handleUpdateVisibility(selectedEntity, e.target.checked)} 
                      className="accent-codice-green w-4 h-4" 
                    />
                    <span className="text-[10px] font-black text-codice-dark uppercase">Público (Visível)</span>
                  </label>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-codice-dark/10 p-6 min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                {isMaster ? (
                  <div className="text-center z-10">
                    <span className="text-4xl block mb-4">⚒️</span>
                    <h3 className="font-bold text-codice-dark text-lg mb-2">A Forja está sendo aquecida</h3>
                    <p className="text-sm font-medium text-codice-dark/50 max-w-md mx-auto">
                      Em breve, você poderá escrever a Lore, adicionar imagens e desenhar a ficha de atributos desta entidade.
                    </p>
                  </div>
                ) : (
                  <div className="text-center z-10">
                    <p className="text-sm font-bold text-codice-dark/40">
                      Os segredos deste tomo ainda não foram revelados aos aventureiros.
                    </p>
                  </div>
                )}
              </div>
              
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-codice-dark/30 select-none">
              <span className="text-7xl mb-6 opacity-50">🗄️</span>
              <p className="font-black text-2xl uppercase tracking-widest text-codice-dark/20">Acervo Fechado</p>
              <p className="text-sm font-bold mt-2">Selecione uma entidade no índice lateral.</p>
            </div>
          )}
        </div>
      </main>

      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form onSubmit={handleCreateFolder} className="relative w-full max-w-sm bg-codice-parchment rounded-xl p-6 shadow-2xl">
            <button type="button" onClick={() => setIsFolderModalOpen(false)} className="absolute right-4 top-4 text-codice-dark/50 hover:text-codice-red font-bold">✕</button>
            <h2 className="mb-6 text-xl font-bold text-codice-dark flex items-center gap-2">📂 Nova Pasta</h2>
            
            {modalError && <div className="mb-4 bg-codice-red/10 text-codice-red text-xs font-bold p-2 rounded">{modalError}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-codice-dark mb-1 uppercase">Nome da Pasta</label>
                <input name="fName" type="text" required placeholder="Ex: NPCs Importantes" className="w-full rounded border border-codice-dark/20 p-2 outline-none focus:border-codice-dark bg-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-codice-dark mb-1 uppercase">Localização (Dentro de)</label>
                <select name="fParent" defaultValue={targetFolderId || 'root'} className="w-full rounded border border-codice-dark/20 p-2 outline-none focus:border-codice-dark bg-white text-sm">
                  <option value="root">Raiz do Acervo (Nenhuma)</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>📁 {f.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full bg-codice-dark text-white font-bold py-3 rounded hover:bg-codice-dark/80 transition mt-4">
                Criar Pasta
              </button>
            </div>
          </form>
        </div>
      )}

      {isEntityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form onSubmit={handleCreateEntity} className="relative w-full max-w-sm bg-codice-parchment rounded-xl p-6 shadow-2xl">
            <button type="button" onClick={() => setIsEntityModalOpen(false)} className="absolute right-4 top-4 text-codice-dark/50 hover:text-codice-red font-bold">✕</button>
            <h2 className="mb-6 text-xl font-bold text-codice-dark flex items-center gap-2">✨ Novo Registro</h2>
            
            {modalError && <div className="mb-4 bg-codice-red/10 text-codice-red text-xs font-bold p-2 rounded">{modalError}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-codice-dark mb-1 uppercase">Nome / Título</label>
                <input name="eName" type="text" required placeholder="Ex: A Lâmina Oblifferum" className="w-full rounded border border-codice-dark/20 p-2 outline-none focus:border-codice-green bg-white text-sm" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-codice-dark mb-1 uppercase">Tipo</label>
                  <select name="eType" className="w-full rounded border border-codice-dark/20 p-2 outline-none focus:border-codice-green bg-white text-sm">
                    {entityTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-codice-dark mb-1 uppercase">Pasta</label>
                  <select name="eFolder" defaultValue={targetFolderId || 'root'} className="w-full rounded border border-codice-dark/20 p-2 outline-none focus:border-codice-green bg-white text-sm">
                    <option value="root">Raiz</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full bg-codice-green text-white font-bold py-3 rounded hover:bg-codice-dark transition mt-4 shadow-sm">
                Forjar Entidade
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}