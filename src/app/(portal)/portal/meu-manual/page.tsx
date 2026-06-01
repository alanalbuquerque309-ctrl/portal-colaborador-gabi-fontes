'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ManualPortalViewer } from '@/components/portal/ManualPortalViewer';
import { MANUAL_GERAL_COLABORADOR, manualPorSetor } from '@/lib/manual-por-setor';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

export default function MeuManualPage() {
  const router = useRouter();
  const [fase, setFase] = useState<'loading' | 'ok' | 'vazio'>('loading');
  const [titulo, setTitulo] = useState('');
  const [arquivo, setArquivo] = useState('');

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/perfil', { credentials: 'include' })
      .then((r) => r.json())
      .then(
        (data: {
          ok?: boolean;
          colaborador?: {
            setor?: string | null;
            role?: string | null;
            cargo?: string | null;
            onboarding_completo?: boolean;
            onboarding_manual_escolhido_file?: string | null;
          };
        }) => {
          if (cancel) return;
          if (!data.ok || !data.colaborador) {
            router.replace('/login');
            return;
          }
          const c = data.colaborador;
          const escolhido = c.onboarding_manual_escolhido_file?.trim();
          const porSetor = manualPorSetor(c.setor, c.role, c.cargo);
          let file: string | null = null;
          let tit = '';
          if (c.onboarding_completo && escolhido) {
            file = escolhido;
            tit = 'Meu manual de setor';
          } else if (porSetor?.file) {
            file = porSetor.file;
            tit = porSetor.titulo;
          }
          if (file) {
            setArquivo(file);
            setTitulo(tit || 'Meu manual');
            setFase('ok');
            return;
          }
          setFase('vazio');
        }
      )
      .catch(() => {
        if (!cancel) setFase('vazio');
      });
    return () => {
      cancel = true;
    };
  }, [router]);

  if (fase === 'loading') {
    return (
      <div className="flex justify-center py-16">
        <XicaraCarregando size="lg" label="Carregando seu manual…" />
      </div>
    );
  }

  if (fase === 'vazio') {
    return (
      <main className="max-w-lg mx-auto py-12 px-4 text-center space-y-4">
        <p className="text-cafeteria-700">
          Ainda não há um manual específico para o seu perfil. Consulte a biblioteca completa.
        </p>
        <Link
          href="/portal/manuais"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-dourado-base px-5 text-sm font-medium text-cream-100"
        >
          Abrir manuais
        </Link>
        <p className="text-sm text-cafeteria-600">
          O manual geral da cultura:{' '}
          <Link href="/portal/manuais" className="text-dourado-base font-medium underline">
            {MANUAL_GERAL_COLABORADOR.titulo}
          </Link>
        </p>
      </main>
    );
  }

  return <ManualPortalViewer titulo={titulo} arquivo={arquivo} voltarHref="/portal" voltarRotulo="Voltar ao portal" />;
}
