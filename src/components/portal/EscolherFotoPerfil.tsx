'use client';

import { useRef, useState } from 'react';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

type Props = {
  nome?: string | null;
  fotoUrl?: string | null;
  onFotoEnviada: (url: string) => void;
  variant?: 'modal' | 'perfil';
};

export function EscolherFotoPerfil({ nome, fotoUrl, onFotoEnviada, variant = 'perfil' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const enviar = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErro('Selecione uma imagem (JPG, PNG ou WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErro('A imagem deve ter no máximo 5 MB.');
      return;
    }
    setErro('');
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append('foto', file);
      const res = await fetch('/api/portal/perfil/foto', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (data.ok && data.foto_url) {
        onFotoEnviada(String(data.foto_url));
      } else {
        setErro(data.erro || 'Não foi possível enviar a foto.');
      }
    } catch {
      setErro('Erro de conexão. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void enviar(file);
  };

  const inicial = nome?.charAt(0)?.toUpperCase() ?? '?';
  const grande = variant === 'modal' || variant === 'perfil';

  return (
    <div className={`flex flex-col items-center ${grande ? 'gap-4' : 'gap-2'}`}>
      <div className="relative">
        {fotoUrl ? (
          <img
            src={fotoUrl}
            alt="Sua foto de perfil"
            className={`rounded-full object-cover border-2 border-dourado-base shadow-md ${
              grande ? 'w-36 h-36 sm:w-40 sm:h-40' : 'w-32 h-32'
            }`}
          />
        ) : (
          <div
            className={`rounded-full bg-cream-200 flex items-center justify-center border-2 border-dashed border-dourado-base/70 ${
              grande ? 'w-36 h-36 sm:w-40 sm:h-40' : 'w-32 h-32'
            }`}
          >
            <span className={`text-coffee-200 font-display ${grande ? 'text-5xl' : 'text-4xl'}`}>{inicial}</span>
          </div>
        )}
        {enviando && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
            <XicaraCarregando size="sm" label="" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        disabled={enviando}
        className="sr-only"
        id="portal-foto-perfil-input"
      />

      <button
        type="button"
        disabled={enviando}
        onClick={() => inputRef.current?.click()}
        className={`w-full max-w-sm rounded-xl font-semibold text-cream-100 transition-colors disabled:opacity-50 ${
          grande
            ? 'bg-dourado-base hover:bg-dourado-400 px-5 py-4 text-base min-h-[52px] shadow-md'
            : 'bg-dourado-base hover:bg-dourado-400 px-4 py-2.5 text-sm min-h-[44px]'
        }`}
      >
        {enviando
          ? 'Enviando foto…'
          : fotoUrl
            ? 'Trocar foto na galeria'
            : 'Escolher foto na galeria'}
      </button>

      <p className="text-xs sm:text-sm text-cafeteria-600 text-center max-w-sm leading-relaxed px-1">
        {fotoUrl
          ? 'Foto salva. Você já pode continuar no portal.'
          : 'Toque no botão para abrir a galeria do celular e escolher sua foto.'}
      </p>

      {erro && <p className="text-sm text-red-600 text-center max-w-sm">{erro}</p>}
    </div>
  );
}
