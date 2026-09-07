'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/Header';
import imageCompression from 'browser-image-compression';
import Cropper from 'react-easy-crop';

// --- Função Auxiliar para Extrair o Corte da Imagem ---
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Sem contexto de canvas');

  // Tamanho final fixo do Avatar (Alta qualidade, peso leve)
  canvas.width = 400;
  canvas.height = 400;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    400,
    400
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Erro no canvas'));
    }, 'image/jpeg', 0.9);
  });
}
// ------------------------------------------------------

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  
  // Estados de Imagem e Corte
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
          setProfile(data);
          setDisplayName(data.display_name || '');
          setUsername(data.username || '');
          setPreviewUrl(data.avatar_url || null);
        } else {
          // Se o perfil for antigo e não existir na tabela, puxa dados brutos do Google/Auth
          setDisplayName(user.user_metadata?.full_name || 'Aventureiro');
          setUsername(user.user_metadata?.username || `user_${Math.floor(Math.random() * 1000)}`);
          setPreviewUrl(user.user_metadata?.avatar_url || null);
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setImageSrc(url);
      setIsCropping(true); // Abre o modal de corte
      e.target.value = ''; // Reseta o input
    }
  };

  const confirmCrop = async () => {
    try {
      if (!imageSrc || !croppedAreaPixels) return;
      
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const file = new File([croppedBlob], `avatar.jpg`, { type: 'image/jpeg' });
      
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(croppedBlob));
      setIsCropping(false);
    } catch (e) {
      console.error(e);
      alert('Erro ao cortar a imagem.');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      if (username !== profile?.username) {
        const { data: nameCheck } = await supabase.from('profiles').select('id').eq('username', username).single();
        if (nameCheck) throw new Error('Este username já foi reivindicado por outro jogador.');
      }

      let avatar_url = profile?.avatar_url || previewUrl;

      if (avatarFile) {
        const compressed = await imageCompression(avatarFile, { maxSizeMB: 0.2, maxWidthOrHeight: 400 });
        const fileName = `avatar-${userId}-${Date.now()}.jpg`;
        await supabase.storage.from('avatars').upload(fileName, compressed, { upsert: true });
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        avatar_url = data.publicUrl;
      }

      // Upsert garante que a conta não quebre, quer já exista perfil ou não
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, display_name: displayName, username, avatar_url });

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Sua identidade foi atualizada nos anais de CódiceRPG.' });
      setProfile({ ...profile, display_name: displayName, username, avatar_url });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-codice-parchment pt-20 text-center font-bold text-codice-dark">Buscando identidade...</div>;

  return (
    <div className="min-h-screen bg-codice-parchment flex flex-col">
      <Header />
      
      <main className="mx-auto w-full max-w-2xl px-6 py-12 flex-1 relative">
        <h1 className="text-3xl font-black text-codice-dark mb-2">Seu Perfil</h1>
        <p className="text-sm font-medium text-codice-dark/60 mb-8 border-b border-codice-dark/10 pb-4">
          Como os outros aventureiros e mestres enxergam você.
        </p>

        {message.text && (
          <div className={`mb-6 rounded-md p-4 text-sm font-bold ${message.type === 'error' ? 'bg-codice-red/10 text-codice-red' : 'bg-codice-green/10 text-codice-green'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleUpdate} className="bg-white rounded-xl p-8 shadow-sm border border-codice-dark/10">
          
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 border-b border-codice-dark/10 pb-8">
            <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-codice-parchment shadow-md bg-codice-dark">
              {previewUrl ? (
                <img src={previewUrl} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-white font-bold">Sem Foto</div>
              )}
            </div>
            
            <div className="flex-1 w-full text-center sm:text-left">
              <label className="block text-xs font-bold text-codice-dark mb-2 uppercase">Alterar Foto</label>
              <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm text-codice-dark file:mr-4 file:rounded-md file:border-0 file:bg-codice-green file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-codice-dark cursor-pointer" />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-codice-dark mb-1 uppercase">Nome de Exibição</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="w-full rounded border border-codice-dark/20 p-3 outline-none focus:border-codice-green font-medium text-codice-dark" />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-codice-dark mb-1 uppercase">@Username Único</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))} required className="w-full rounded border border-codice-dark/20 p-3 outline-none focus:border-codice-green font-medium text-codice-dark" />
            </div>

            <button type="submit" disabled={saving} className="w-full rounded-md bg-codice-dark py-4 font-bold text-white transition hover:bg-codice-green disabled:opacity-50 mt-4">
              {saving ? 'Gravando nos registros...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>

        {/* MODAL DE CORTE DE IMAGEM */}
        {isCropping && imageSrc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md bg-codice-parchment rounded-xl overflow-hidden shadow-2xl flex flex-col">
              <div className="p-4 border-b border-codice-dark/10 flex justify-between items-center bg-white">
                <h3 className="font-bold text-codice-dark">Ajustar Enquadramento</h3>
                <button onClick={() => setIsCropping(false)} className="text-codice-dark/50 hover:text-codice-red font-bold">✕</button>
              </div>
              
              <div className="relative h-80 w-full bg-codice-dark">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1} // Força o corte quadrado 1:1
                  cropShape="round" // Mostra uma máscara redonda para prever o avatar
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
              
              <div className="p-4 bg-white flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-codice-dark uppercase">Zoom</span>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full accent-codice-green"
                  />
                </div>
                <button onClick={confirmCrop} className="w-full bg-codice-green text-white font-bold py-3 rounded hover:bg-codice-dark transition">
                  Confirmar Enquadramento
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}