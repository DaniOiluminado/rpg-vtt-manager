'use client';

import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import Link from 'next/link';
import Cropper from 'react-easy-crop';

// --- Funções Auxiliares para o Corte da Imagem ---
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
// -------------------------------------------------

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Estados do Modal de Corte
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setImageSrc(url);
      setIsCropping(true);
      e.target.value = ''; // Reseta o input para permitir selecionar a mesma foto novamente se quiser
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
      setMessage({ type: 'error', text: 'Erro ao processar o enquadramento.' });
      setIsCropping(false);
    }
  };

  const checkUsernameAvailable = async (username: string) => {
    const { data } = await supabase.from('profiles').select('id').eq('username', username).single();
    return !data;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (mode === 'register') {
        const isFree = await checkUsernameAvailable(username);
        if (!isFree) throw new Error('Este username já está sendo usado por outro aventureiro.');

        let avatar_url = '';
        if (avatarFile) {
          const compressed = await imageCompression(avatarFile, { maxSizeMB: 0.2, maxWidthOrHeight: 400 });
          const fileName = `avatar-${Date.now()}.jpg`;
          await supabase.storage.from('avatars').upload(fileName, compressed);
          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
          avatar_url = data.publicUrl;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username, full_name: displayName, avatar_url } }
        });
        
        if (error) throw error;
        setMessage({ type: 'success', text: 'Conta forjada! Verifique seu e-mail para confirmar o acesso.' });
      
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/');
        router.refresh();
      
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setMessage({ type: 'success', text: 'As instruções de recuperação foram enviadas por corvo ao seu e-mail.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/` } });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-codice-dark p-6">
      <div className="w-full max-w-md rounded-2xl bg-codice-parchment p-8 shadow-2xl relative">
        <Link href="/" className="mb-6 block text-center text-3xl font-black text-codice-dark transition hover:text-codice-green">
          CódiceRPG
        </Link>

        <div className="mb-6 flex rounded-lg bg-codice-dark/10 p-1">
          <button onClick={() => { setMode('login'); setMessage({type:'', text:''}); }} className={`flex-1 rounded-md py-2 text-sm font-bold transition ${mode === 'login' ? 'bg-white text-codice-dark shadow' : 'text-codice-dark/50 hover:text-codice-dark'}`}>Entrar</button>
          <button onClick={() => { setMode('register'); setMessage({type:'', text:''}); }} className={`flex-1 rounded-md py-2 text-sm font-bold transition ${mode === 'register' ? 'bg-white text-codice-dark shadow' : 'text-codice-dark/50 hover:text-codice-dark'}`}>Cadastrar</button>
        </div>

        {message.text && (
          <div className={`mb-6 rounded-md p-3 text-sm font-bold ${message.type === 'error' ? 'bg-codice-red/10 text-codice-red' : 'bg-codice-green/10 text-codice-green'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          
          {mode === 'register' && (
            <>
              <div className="flex flex-col items-center justify-center gap-2 border-b border-codice-dark/10 pb-4">
                <label htmlFor="avatar" className="relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-codice-green bg-white hover:bg-codice-dark/5 transition">
                  {previewUrl ? (
                    <img src={previewUrl} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl text-codice-green">+</span>
                  )}
                  <input id="avatar" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
                <span className="text-xs font-bold text-codice-dark/60 uppercase">Sua Imagem</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-codice-dark mb-1 uppercase">Como quer ser chamado?</label>
                  <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ex: Ezequiel" required className="w-full rounded border border-codice-dark/20 p-2 outline-none focus:border-codice-green bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-codice-dark mb-1 uppercase">@Username Único</label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))} placeholder="ezequiel_oficial" required className="w-full rounded border border-codice-dark/20 p-2 outline-none focus:border-codice-green bg-white" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-codice-dark mb-1 uppercase">E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded border border-codice-dark/20 p-2 outline-none focus:border-codice-green bg-white" />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-xs font-bold text-codice-dark mb-1 uppercase">Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded border border-codice-dark/20 p-2 outline-none focus:border-codice-green bg-white" />
            </div>
          )}

          {mode === 'login' && (
            <button type="button" onClick={() => { setMode('forgot'); setMessage({type:'', text:''}); }} className="text-xs font-bold text-codice-green hover:underline">
              Esqueci minha senha
            </button>
          )}

          <button type="submit" disabled={loading} className="w-full rounded-md bg-codice-green py-3 font-bold text-white transition hover:bg-codice-dark disabled:opacity-50 mt-4">
            {loading ? 'Processando...' : mode === 'login' ? 'Acessar' : mode === 'register' ? 'Forjar Conta' : 'Recuperar Senha'}
          </button>
        </form>

        {mode !== 'forgot' && (
          <div className="mt-6 border-t border-codice-dark/10 pt-6">
            <button onClick={handleGoogleLogin} className="flex w-full items-center justify-center gap-3 rounded-md border border-codice-dark/20 bg-white py-3 font-bold text-codice-dark transition hover:bg-codice-dark/5">
              <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continuar com o Google
            </button>
          </div>
        )}
        {mode === 'forgot' && (
          <button onClick={() => setMode('login')} className="mt-4 w-full text-center text-sm font-bold text-codice-dark/60 hover:text-codice-dark">
            Voltar para o login
          </button>
        )}

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
                  aspect={1}
                  cropShape="round"
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
      </div>
    </div>
  );
}