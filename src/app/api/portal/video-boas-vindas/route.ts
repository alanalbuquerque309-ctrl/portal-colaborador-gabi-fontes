import { NextResponse } from 'next/server';
import { resolveUrlVideoBoasVindas } from '@/lib/video-boas-vindas';

/** URL pública do vídeo de boas-vindas (resolvida no servidor — evita env local errado no cliente). */
export async function GET() {
  const url = resolveUrlVideoBoasVindas();
  return NextResponse.json(
    { ok: true, url },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    }
  );
}
