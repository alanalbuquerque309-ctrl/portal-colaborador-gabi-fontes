'use client';

import { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ManualPortalViewer } from '@/components/portal/ManualPortalViewer';
import { MANUAL_GERAL_COLABORADOR, isManualArquivoPermitido } from '@/lib/manual-por-setor';
import { MANUAIS_SETORIAIS_BIBLIOTECA } from '@/lib/manuais-biblioteca-portal';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

function tituloDoArquivo(file: string): string {
  const bib = MANUAIS_SETORIAIS_BIBLIOTECA.find((m) => m.file === file);
  if (bib) return bib.titulo;
  if (file === MANUAL_GERAL_COLABORADOR.file) return MANUAL_GERAL_COLABORADOR.titulo;
  return file.replace(/\.html$/i, '');
}

function ManualConteudo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const file = searchParams.get('file')?.trim() ?? '';
  const tituloParam = searchParams.get('titulo')?.trim() ?? '';

  const permitido = useMemo(() => isManualArquivoPermitido(file), [file]);
  const titulo = tituloParam || tituloDoArquivo(file);

  if (!file || !permitido) {
    return (
      <main className="max-w-lg mx-auto py-12 px-4 text-center space-y-4">
        <p className="text-cafeteria-700">Manual não encontrado ou link inválido.</p>
        <Link
          href="/portal/manuais"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-dourado-base px-5 text-sm font-medium text-cream-100"
        >
          Ir para Manuais
        </Link>
        <button
          type="button"
          onClick={() => router.back()}
          className="block w-full text-sm text-dourado-base underline"
        >
          Voltar
        </button>
      </main>
    );
  }

  return (
    <ManualPortalViewer
      titulo={titulo}
      arquivo={file}
      voltarHref="/portal/manuais"
      voltarRotulo="Voltar aos manuais"
    />
  );
}

export default function PortalManualPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <XicaraCarregando size="lg" label="Carregando manual…" />
        </div>
      }
    >
      <ManualConteudo />
    </Suspense>
  );
}
