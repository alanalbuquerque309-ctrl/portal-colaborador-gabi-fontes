import type { SupabaseClient } from '@supabase/supabase-js';
import { extrairYoutubeVideoId, QUINTA_VIDEO_LIDERES_PADRAO } from '@/lib/graos/quinta-treino';

function envLimpo(valor: string | undefined | null): string {
  const v = String(valor ?? '').trim();
  if (!v || v.toLowerCase() === 'undefined' || v.toLowerCase() === 'null') return '';
  return v;
}

/** ID do vídeo de treino de liderança vigente (troca de URL = nova pendência). */
export function treinoLiderVideoIdAtual(): string | null {
  const urlEnv = envLimpo(
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_QUINTA_YOUTUBE_URL_LIDERES : ''
  );
  const urlRaw = urlEnv || QUINTA_VIDEO_LIDERES_PADRAO;
  return extrairYoutubeVideoId(urlRaw);
}

export async function liderConcluiuTreinoAtual(
  supabase: SupabaseClient,
  colaboradorId: string
): Promise<boolean> {
  const videoId = treinoLiderVideoIdAtual();
  if (!videoId) return true;

  const { data, error } = await supabase
    .from('treino_lider_conclusoes')
    .select('id')
    .eq('colaborador_id', colaboradorId)
    .eq('video_youtube_id', videoId)
    .maybeSingle();

  if (error) {
    if (/treino_lider_conclusoes|does not exist|schema cache/i.test(error.message)) return false;
    throw new Error(error.message);
  }

  return Boolean(data?.id);
}

export async function registrarConclusaoTreinoLider(
  supabase: SupabaseClient,
  colaboradorId: string
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const videoId = treinoLiderVideoIdAtual();
  if (!videoId) {
    return { ok: false, erro: 'Treino de liderança ainda não configurado.' };
  }

  const { error } = await supabase.from('treino_lider_conclusoes').upsert(
    {
      colaborador_id: colaboradorId,
      video_youtube_id: videoId,
      concluido_em: new Date().toISOString(),
    },
    { onConflict: 'colaborador_id,video_youtube_id' }
  );

  if (error) {
    if (/treino_lider_conclusoes|does not exist|schema cache/i.test(error.message)) {
      return {
        ok: false,
        erro: 'Tabela de conclusão ainda não existe no banco — aplique a migration 060.',
      };
    }
    return { ok: false, erro: error.message };
  }

  return { ok: true };
}
