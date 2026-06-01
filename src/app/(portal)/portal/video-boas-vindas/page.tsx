'use client';

import Link from 'next/link';
import { VideoBoasVindas } from '@/components/onboarding/VideoBoasVindas';
import { VIDEO_BOAS_VINDAS_TITULO } from '@/lib/video-boas-vindas';

export default function VideoBoasVindasPage() {
  return (
    <main className="max-w-3xl space-y-6 pb-24">
      <div>
        <Link href="/portal/manuais" className="text-sm text-dourado-base hover:underline font-medium">
          ← Voltar aos manuais
        </Link>
        <h1 className="text-2xl md:text-3xl font-display font-semibold text-cafeteria-900 mt-2">
          {VIDEO_BOAS_VINDAS_TITULO}
        </h1>
        <p className="text-cafeteria-600 mt-2 text-sm">
          No primeiro acesso você assiste até o fim e responde a 3 perguntas simples sobre o conteúdo.
          Depois, o vídeo fica aqui para reassistir quando quiser, como o manual da cultura.
        </p>
      </div>

      <div className="rounded-2xl border border-cafeteria-200 bg-white p-5 shadow-sm">
        <VideoBoasVindas modoBiblioteca assistidoCompleto />
      </div>
    </main>
  );
}
